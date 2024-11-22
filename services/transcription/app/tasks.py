from celery import Celery
from datetime import datetime
from pymongo import MongoClient
import whisper
import os
import logging
from pathlib import Path

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
    result_serializer='json'
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
        
        # Whisper 모델 로드
        logger.info("Whisper 모델 로드 중...")
        model = whisper.load_model("base", download_root=str(WHISPER_CACHE_DIR))
        
        # 음성-텍스트 변환
        logger.info(f"변환 중: {input_path}")
        result = model.transcribe(input_path)
        
        if not result or 'text' not in result:
            raise ValueError("변환 실패: 텍스트 출력 없음")
            
        transcribed_text = result['text']
        
        # 성공 상태 업데이트
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