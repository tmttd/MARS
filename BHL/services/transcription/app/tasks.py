from celery import Celery
from datetime import datetime
from pymongo import MongoClient
import whisper
import os
import logging
from pathlib import Path
from .config import settings
from httpx import AsyncClient
import asyncio
import json

# 로깅 설정
logging.basicConfig(level=logging.INFO)
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
    }
)

@celery.task(name='transcribe_audio')
def transcribe_audio(job_id: str, input_path: str, db_connection_string: str):
    try:
        logger.info(f"음성-텍스트 변환 시작: job {job_id}")
        
        # MongoDB 연결
        client = MongoClient(db_connection_string)
        db = client.transcription_db
        
        # 출력 디렉토리 확인 및 생성
        output_dir = Path(settings.OUTPUT_DIR)
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{job_id}.txt"
        
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
        
        # Whisper 모델 로드
        logger.info("Whisper 모델 로드 중...")
        model = whisper.load_model("base", download_root=str(WHISPER_CACHE_DIR))
        
        # 음성-텍스트 변환
        logger.info(f"변환 중: {input_path}")
        result = model.transcribe(input_path)
        
        if not result or 'text' not in result:
            raise ValueError("변환 실패: 텍스트 출력 없음")
            
        transcribed_text = result['text']
        
        # 텍스트 파일로 저장
        try:
            with open(output_path, "w", encoding="utf-8") as f:
                # JSON 형식으로 메타데이터와 함께 저장
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

# 또는 다음과 같이 할 수도 있습니다:
# transcribe_audio_task = transcribe_audio
