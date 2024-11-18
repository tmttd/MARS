from celery import Celery
from dotenv import load_dotenv
import os
import logging
import whisper
import ssl
import certifi
import urllib.request
from pathlib import Path
from datetime import datetime
from pymongo import MongoClient

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# Celery 앱 생성
celery = Celery('GMP')

# Celery 기본 설정
celery.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    broker_connection_retry_on_startup=True
)

# SSL 컨텍스트 설정
ssl_context = ssl.create_default_context(cafile=certifi.where())

# 원본 urlopen 함수 저장
original_urlopen = urllib.request.urlopen

def patched_urlopen(url, *args, **kwargs):
    if 'context' not in kwargs:
        kwargs['context'] = ssl_context
    return original_urlopen(url, *args, **kwargs)

# urlopen 패치
urllib.request.urlopen = patched_urlopen

# Whisper 모델 캐시 디렉토리 설정
WHISPER_CACHE_DIR = Path.home() / ".cache" / "whisper"
WHISPER_CACHE_DIR.mkdir(parents=True, exist_ok=True)

@celery.task(name='transcribe_audio')
def transcribe_audio(job_id: str, input_path: str, db_connection_string: str):
    try:
        logger.info(f"Starting transcription for job {job_id}")
        
        # MongoDB 연결
        client = MongoClient(db_connection_string)
        db = client.mars_converter
        
        # 상태 업데이트: 처리 중
        logger.info("Updating status to processing")
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
            raise FileNotFoundError(f"Audio file not found: {input_path}")
        
        # Whisper 모델 로드
        logger.info("Loading Whisper model...")
        model = whisper.load_model("base", download_root=str(WHISPER_CACHE_DIR))
        
        # 오디오 파일 변환
        logger.info(f"Transcribing file: {input_path}")
        result = model.transcribe(input_path)
        
        if not result or 'text' not in result:
            raise ValueError("Transcription failed: No text output")
            
        transcribed_text = result['text']
        logger.info(f"Transcription completed. Text length: {len(transcribed_text)}")
        
        # 상태 업데이트: 완료
        db.transcripts.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "text": transcribed_text,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Job {job_id} completed successfully")
        return {"status": "completed", "text": transcribed_text}
        
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
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
            logger.error(f"Failed to update error status: {str(update_error)}")
        raise