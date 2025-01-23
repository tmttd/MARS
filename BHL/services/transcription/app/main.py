from fastapi import FastAPI, UploadFile, File, HTTPException
from pymongo import MongoClient
from datetime import datetime, timezone
import os
import uuid
import logging
from .models import Transcript
from .tasks import celery, transcribe_audio_task
from .config import settings

UTC = timezone.utc
# 로깅 설정
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.PROJECT_NAME)

# MongoDB 연결
try:
    client = MongoClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB]
    work_client = MongoClient(settings.WORK_MONGODB_URI)
    work_db = work_client[settings.WORK_MONGODB_DB]
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

# 업로드 디렉토리 생성
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

@app.get("/health")
async def health_check():
    try:
        client.admin.command('ping')
        work_client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "work_database": "connected",
            "upload_dir": os.path.exists(settings.UPLOAD_DIR)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/transcribe")
async def transcribe_audio_endpoint(job_id: str):
    try:
        # 입력 파일 경로 확인
        input_file = os.path.join(settings.UPLOAD_DIR, f"{job_id}.wav")
        logger.info(f"처리 파일 경로: {input_file}, job_id: {job_id}")
        
        if not os.path.exists(input_file):
            raise HTTPException(status_code=404, detail="입력 파일을 찾을 수 없습니다")
            
        current_time = datetime.now(UTC)
        
        # 로그 기록
        db.logs.insert_one({
            "job_id": job_id,
            "service": "transcription",
            "event": "processing_started",
            "status": "processing",
            "timestamp": current_time,
            "message": f"음성-텍스트 변환 시작: {input_file}",
            "metadata": {
                "created_at": current_time,
                "updated_at": current_time
            }
        })
        
        # Celery 작업 시작
        try:
            task = transcribe_audio_task.apply_async(
                kwargs={
                    'job_id': job_id,
                    'input_path': input_file,
                    'output_dir': settings.OUTPUT_DIR,
                    'db_connection_string': settings.MONGODB_URI,
                    'work_db_connection_string': settings.WORK_MONGODB_URI,
                    'work_db_name': settings.WORK_MONGODB_DB
                },
                queue='transcription'
            )
            logger.info(f"Celery 작업 시작됨: {task.id}")
            
        except Exception as e:
            logger.error(f"Celery 작업 시작 실패: {str(e)}")
            raise
        
        return {"job_id": job_id, "status": "processing"}
        
    except Exception as e:
        logger.error(f"Transcribe 엔드포인트 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transcript/{job_id}")
async def get_transcript(job_id: str):
    try:
        logger.info(f"작업 상태 조회 시작: {job_id}")
        
        # MongoDB 연결 상태 확인
        try:
            client.admin.command('ping')
            work_client.admin.command('ping')
        except Exception as db_error:
            logger.error(f"MongoDB 연결 오류: {str(db_error)}")
            raise HTTPException(status_code=500, detail="데이터베이스 연결 오류")
            
        # 작업 조회
        job = work_db.calls.find_one({"job_id": job_id})
        logger.info(f"조회된 작업: {job}")
        
        if not job:
            logger.error(f"작업을 찾을 수 없음: {job_id}")
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
            
        # 파일 존재 확인
        log = db.logs.find_one({"job_id": job_id, "status": "completed"})
        if not log:
            raise HTTPException(status_code=404, detail="변환이 완료되지 않았습니다")
            
        response = {
            "job_id": job_id,
            "status": "completed",  # 파일이 존재하면 완료된 것으로 간주
            "text": job.get("text")
        }
        logger.info(f"응답 데이터: {response}")
        return response
        
    except Exception as e:
        logger.error(f"작업 상태 조회 중 오류 발생: {str(e)}, 타입: {type(e)}")
        if isinstance(e, HTTPException):
            raise
        raise HTTPException(status_code=500, detail=str(e))