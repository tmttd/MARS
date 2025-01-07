from fastapi import FastAPI, UploadFile, File, HTTPException
from pymongo import MongoClient
from datetime import datetime, timezone
import os
import uuid
import logging
from .models import AudioConversion
from .tasks import celery, convert_audio_task
from .config import settings

UTC = timezone.utc
# 로깅 설정
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

# 환경 변수
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "converter_db")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "/app/outputs")

app = FastAPI(title="Audio Converter Service")

# MongoDB 연결
try:
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    work_client = MongoClient(settings.WORK_MONGODB_URI)
    work_db = work_client[settings.WORK_MONGODB_DB]
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

# 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.get("/health")
async def health_check():
    try:
        client.admin.command('ping')
        work_client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "work_database": "connected",
            "upload_dir": os.path.exists(UPLOAD_DIR),
            "output_dir": os.path.exists(OUTPUT_DIR)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/convert/{job_id}")
async def get_conversion_status(job_id: str):
    try:
        # 작업 데이터베이스에서 작업 상태 조회
        job = work_db.jobs.find_one({"job_id": job_id})
        
        if not job:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
            
        # converter 필드가 없거나 output_file이 없는 경우
        if not job.get("converter") or not job["converter"].get("output_file"):
            raise HTTPException(status_code=400, detail="변환이 아직 완료되지 않았습니다")
            
        # 파일 존재 확인
        output_file = job["converter"]["output_file"]
        if not os.path.exists(output_file):
            raise HTTPException(status_code=404, detail="변환된 파일을 찾을 수 없습니다")
        
        return {
            "job_id": job_id,
            "status": "completed",  # 파일이 존재하면 완료된 것으로 간주
            "output_file": output_file
        }
        
    except Exception as e:
        logger.error(f"상태 확인 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/convert")
async def convert_audio_endpoint(file: UploadFile = File(...), job_id: str = None):
    try:
        # job_id가 없으면 새로 생성
        if not job_id:
            job_id = str(uuid.uuid4())
            
        current_time = datetime.now(UTC)
        
        logger.info(f"새 변환 작업 시작: {job_id}")
        
        # 파일 저장
        input_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
        with open(input_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"파일 저장됨: {input_path}")
        
        # 작업 데이터 초기화/업데이트
        work_db.jobs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "job_id": job_id,
                    "converter": {
                        "input_file": input_path
                    }
                }
            },
            upsert=True
        )
        
        # 로그 기록
        db.logs.insert_one({
            "job_id": job_id,
            "service": "converter",
            "event": "processing_started",
            "status": "processing",
            "timestamp": current_time,
            "message": f"오디오 변환 시작: {input_path}",
            "metadata": {
                "created_at": current_time,
                "updated_at": current_time
            }
        })
        
        # Celery 작업 시작
        try:
            task = convert_audio_task.apply_async(
                args=[],
                kwargs={
                    'job_id': job_id,
                    'file_name': file.filename,
                    'input_path': input_path,
                    'output_dir': OUTPUT_DIR,
                    'db_connection_string': MONGODB_URI,
                    'work_db_connection_string': settings.WORK_MONGODB_URI,
                    'work_db_name': settings.WORK_MONGODB_DB
                },
                queue='converter'
            )
            logger.info(f"Celery 작업 시작됨: task_id={task.id}")
            
        except Exception as e:
            logger.error(f"Celery 작업 시작 실패: {str(e)}")
            raise

        return {"job_id": job_id, "status": "processing"}
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
        if 'input_path' in locals():
            try:
                os.remove(input_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))