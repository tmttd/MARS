from celery import Celery
from datetime import datetime
from pymongo import MongoClient
import os
import logging
from httpx import AsyncClient
import asyncio
import torch
from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor, pipeline
import gc
import json
from pathlib import Path
from .config import settings

# 로깅 설정 수정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Whisper 모델 캐시 디렉토리 설정
WHISPER_CACHE_DIR = Path("/app/whisper_cache")
WHISPER_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Celery 설정
celery = Celery('transcription')
celery.conf.update(
    broker_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    task_default_queue='transcription',
    task_routes={
        'transcribe_audio': {'queue': 'transcription'}
    },
    worker_log_level='INFO',  # 워커 로그 레벨을 INFO로 설정
    worker_log_format='%(asctime)s - %(levelname)s - %(message)s',
    worker_task_log_format='%(asctime)s - %(levelname)s - %(message)s'
)

# 전역 변수로 모델과 파이프라인 선언
model = None
pipe = None

def initialize_model():
    global model, pipe
    
    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    torch_dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    
    logger.info(f"모델 초기화 중... (device: {device})")
    
    model_id = "openai/whisper-large-v3-turbo"
    
    # 기본 모델 로드
    model = AutoModelForSpeechSeq2Seq.from_pretrained(
        model_id, 
        torch_dtype=torch_dtype,
        low_cpu_mem_usage=True,
        cache_dir=str(WHISPER_CACHE_DIR)
    )
    
    model.to(device)
    
    # CPU 최적화 설정 - 스레드 수 증가
    torch.set_num_threads(10)  # CPU 스레드 수를 10개로 설정
    torch.set_grad_enabled(False)
    
    processor = AutoProcessor.from_pretrained(model_id, cache_dir=str(WHISPER_CACHE_DIR))
    
    pipe = pipeline(
        "automatic-speech-recognition",
        model=model,
        tokenizer=processor.tokenizer,
        feature_extractor=processor.feature_extractor,
        chunk_length_s=10,
        stride_length_s=2,
        batch_size=8,
        return_timestamps=True,
        torch_dtype=torch_dtype,
        device=device,
        generate_kwargs={
            "language": "ko",
            "task": "transcribe",
            "use_cache": True
        }
    )

@celery.task(name='transcribe_audio')
def transcribe_audio(job_id: str, input_path: str, db_connection_string: str):
    try:
        logger.info(f"음성-텍스트 변환 시작: job {job_id}")
        
        # MongoDB 연결
        client = MongoClient(db_connection_string)
        db = client.transcription_db

        # 상태 업데이트: 처리 중
        db.transcripts.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "processing",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # 파일 존재 확인
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"오디오 파일을 찾을 수 없습니다: {input_path}")
        
        # 메모리 정리
        gc.collect()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        # 모델이 초기화되지 않았다면 초기화
        global model, pipe
        if model is None or pipe is None:
            initialize_model()
        
        # 음성-텍스트 변환
        logger.info(f"변환 중: {input_path}")
        result = pipe(input_path)
        
        # 타임스탬프가 있는 청크들을 시간순으로 정렬하고 처리
        if isinstance(result, dict) and 'chunks' in result:
            # 청크들을 시작 시간 기준으로 정렬
            sorted_chunks = sorted(result['chunks'], key=lambda x: x.get('timestamp', (0, 0))[0])
            
            # 중복 제거와 함께 청크 텍스트 결합
            transcribed_text = ""
            last_end_time = 0
            
            for chunk in sorted_chunks:
                start_time, end_time = chunk.get('timestamp', (0, 0))
                text = chunk['text'].strip()
                
                # 시간 순서가 맞고 의미 있는 텍스트가 있는 경우만 추가
                if start_time >= last_end_time and text:
                    transcribed_text += " " + text
                    last_end_time = end_time
        else:
            transcribed_text = result.get('text', '').strip()
            
        if not transcribed_text:
            raise ValueError("변환 실패: 텍스트 출력 없음")
        
        # 출력 디렉토리 확인 및 생성
        output_dir = Path(settings.OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{job_id}.txt"
        
        # 텍스트 파일로 저장
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                json.dump({
                    "job_id": job_id,
                    "text": transcribed_text,
                    "created_at": datetime.utcnow().isoformat(),
                    "input_file": input_path
                }, f, ensure_ascii=False, indent=2)
            logger.info(f"텍스트 파일 저장 완료: {output_path}")
        except Exception as save_error:
            logger.error(f"텍스트 파일 저장 실패: {str(save_error)}")
            raise
        
        # MongoDB 업데이트
        db.transcripts.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "output_file": str(output_path),  # 파일 경로만 저장
                    "updated_at": datetime.utcnow()
                }
            }
        )

        # 웹훅 호출을 위한 비동기 함수
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{settings.API_GATEWAY_URL}/webhook/transcription/{job_id}",
                    json={"status": "completed"}
                )

        # 비동기 웹훅 호출 실행
        asyncio.run(send_webhook())
        
        # 작업 완료 후 메모리 정리
        gc.collect()
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        return {"status": "completed", "text": transcribed_text}
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
        try:
            db.transcripts.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        except Exception as update_error:
            logger.error(f"오류 상태 업데이트 실패: {str(update_error)}")
        raise
    
# task 함수를 변수에 할당하여 export
transcribe_audio_task = celery.task(name='transcribe_audio', bind=True)(transcribe_audio)
