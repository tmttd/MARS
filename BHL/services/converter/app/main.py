from fastapi import FastAPI, UploadFile, File, HTTPException
from pymongo import MongoClient
from datetime import datetime, UTC
import os
import uuid
import logging
from .models import AudioConversion
from .tasks import celery, convert_audio_task

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

@app.get("/convert/{job_id}")
async def get_conversion_status(job_id: str):
    try:
        # MongoDB에서 작업 상태 조회
        conversion = db.conversions.find_one({"job_id": job_id})
        
        if not conversion:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
            
        if conversion.get("status") != "completed":
            raise HTTPException(status_code=400, detail="변환이 아직 완료되지 않았습니다")
            
        # 파일 존재 확인
        output_file = conversion.get("output_file")
        if not output_file or not os.path.exists(output_file):
            raise HTTPException(status_code=404, detail="변환된 파일을 찾을 수 없습니다")
        
        return {
            "job_id": conversion["job_id"],
            "status": conversion["status"],
            "output_file": output_file,
            "created_at": conversion["created_at"].isoformat(),
            "updated_at": conversion["updated_at"].isoformat()
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
        logger.info(f"Redis URL: {os.getenv('REDIS_URL', 'redis://redis:6379/0')}")  # Redis URL 로깅
        # 파일 저장
        input_path = os.path.join(UPLOAD_DIR, f"{job_id}_{file.filename}")
        with open(input_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"파일 저장됨: {input_path}")
        
        # 작업 상태 저장
        conversion = {
            "job_id": job_id,
            "status": "pending",  # 명시적으로 status 필드 포함
            "input_file": input_path,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # MongoDB에 저장
        result = db.conversions.insert_one(conversion)
        logger.info(f"MongoDB에 저장됨: {result.inserted_id}")
        
        # Celery 작업 시작 전 로깅
        logger.info("Celery 작업 시작 시도...")
        try:
            task = convert_audio_task.apply_async(
                args=[],
                kwargs={
                    'job_id': job_id,
                    'input_path': input_path,
                    'output_dir': OUTPUT_DIR,
                    'db_connection_string': MONGODB_URI
                },
                queue='converter'  # 명시적으로 큐 지정
            )
            logger.info(f"Celery 작업 시작됨: task_id={task.id}")
            
        except Exception as e:
            logger.error(f"Celery 작업 시작 실패: {str(e)}")
            raise

        
        return {"job_id": job_id, "status": "pending"}
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
        if 'input_path' in locals():
            try:
                os.remove(input_path)
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))