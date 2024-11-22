from fastapi import FastAPI, UploadFile, File, HTTPException
from pymongo import MongoClient
from datetime import datetime
import os
import uuid
import logging
from .models import AudioConversion
from .tasks import convert_audio

# 로깅 설정
logging.basicConfig(level=logging.INFO)
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
        return {
            "status": "healthy",
            "database": "connected",
            "upload_dir": os.path.exists(UPLOAD_DIR),
            "output_dir": os.path.exists(OUTPUT_DIR)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/convert")
async def convert_audio_file(file: UploadFile = File(...)):
    try:
        # 작업 ID 생성
        job_id = str(uuid.uuid4())
        current_time = datetime.utcnow()
        
        # 파일 저장
        input_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
        with open(input_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # 작업 상태 저장
        conversion = {
            "job_id": job_id,
            "status": "pending",
            "input_file": input_path,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # MongoDB에 저장
        db.conversions.insert_one(conversion)
        
        # Celery 작업 시작
        convert_audio.delay(
            job_id=job_id,
            input_path=input_path,
            output_dir=OUTPUT_DIR,
            db_connection_string=MONGODB_URI
        )
        
        return {"job_id": job_id, "status": "pending"}
        
    except Exception as e:
        logger.error(f"Error in convert_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))