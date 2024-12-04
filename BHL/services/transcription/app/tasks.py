from celery import Celery
from datetime import datetime, UTC
from pymongo import MongoClient
import os
import logging
from httpx import AsyncClient
import asyncio
from huggingface_hub import InferenceClient
import gc
import json
from pathlib import Path
from .config import settings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    worker_log_level='INFO',
    worker_log_format='%(asctime)s - %(levelname)s - %(message)s',
    worker_task_log_format='%(asctime)s - %(levelname)s - %(message)s'
)

@celery.task(name='transcribe_audio')
def transcribe_audio(job_id: str, input_path: str, output_dir: str, db_connection_string: str, work_db_connection_string: str, work_db_name: str):
    try:
        logger.info(f"작업 수신됨: task_id={celery.current_task.request.id}, job_id={job_id}")
        
        # MongoDB 연결 (로그용)
        client = MongoClient(db_connection_string)
        db = client.transcription_db
        
        # 작업 데이터베이스 연결
        work_client = MongoClient(work_db_connection_string)
        work_db = work_client[work_db_name]
        
        # 작업 시작 로그
        now = datetime.now(UTC)
        db.logs.insert_one({
            "job_id": job_id,
            "service": "transcription",
            "event": "processing_started",
            "status": "processing",
            "timestamp": now,
            "message": f"Transcribing audio file: {input_path}",
            "metadata": {
                "created_at": now,
                "updated_at": now
            }
        })
        
        # 파일 존재 확인
        if not os.path.exists(input_path):
            error_msg = f"오디오 파일을 찾을 수 없습니다: {input_path}"
            now = datetime.now(UTC)
            db.logs.insert_one({
                "job_id": job_id,
                "service": "transcription",
                "event": "error",
                "status": "failed",
                "timestamp": now,
                "message": error_msg,
                "metadata": {
                    "updated_at": now
                }
            })
            raise FileNotFoundError(error_msg)
        
        # 음성-텍스트 변환
        logger.info(f"변환 중: {input_path}")
        whisper_client = InferenceClient(
            "openai/whisper-large-v3-turbo",
            token="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",
        )
        transcribed_text = whisper_client.automatic_speech_recognition(input_path)
        logger.info(f"음성 변환 완료: {transcribed_text}")

        # 출력 파일 경로 설정
        output_file = os.path.join(output_dir, f"{job_id}.txt")
        os.makedirs(output_dir, exist_ok=True)
        
        # 텍스트 파일로 저장
        try:
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump({
                    "job_id": job_id,
                    "text": transcribed_text,
                    "created_at": datetime.now(UTC).isoformat(),
                    "input_file": input_path
                }, f, ensure_ascii=False, indent=2)
            logger.info(f"텍스트 파일 저장 완료: {output_file}")
        except Exception as save_error:
            logger.error(f"텍스트 파일 저장 실패: {str(save_error)}")
            raise
        
        # 작업 데이터 업데이트
        work_db.jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "transcription": {
                        "input_file": input_path,
                        "output_file": output_file,
                        "text": transcribed_text
                    }
                }
            }
        )
        
        # 작업 완료 로그
        now = datetime.now(UTC)
        db.logs.insert_one({
            "job_id": job_id,
            "service": "transcription",
            "event": "transcription_completed",
            "status": "completed",
            "timestamp": now,
            "message": f"Transcription completed: {output_file}",
            "metadata": {
                "updated_at": now
            }
        })
        
        # API Gateway에 웹훅 전송
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{settings.API_GATEWAY_URL}/webhook/transcription/{job_id}",
                    json={"status": "completed"}
                )
        
        asyncio.run(send_webhook())
        
        # 연결 종료
        client.close()
        work_client.close()
        
        return {"status": "completed", "text": transcribed_text}
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
        try:
            # 오류 로그 기록
            now = datetime.now(UTC)
            db.logs.insert_one({
                "job_id": job_id,
                "service": "transcription",
                "event": "error",
                "status": "failed",
                "timestamp": now,
                "message": f"Transcription failed: {str(e)}",
                "metadata": {
                    "error": str(e),
                    "updated_at": now
                }
            })
        except Exception as inner_e:
            logger.error(f"오류 상태 업데이트 실패: {str(inner_e)}")
        finally:
            client.close()
            work_client.close()
        raise

# task 함수를 변수에 할당하여 export
transcribe_audio_task = celery.task(name='transcribe_audio', bind=True)(transcribe_audio)
