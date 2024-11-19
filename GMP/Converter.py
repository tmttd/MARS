from fastapi import FastAPI, UploadFile, File, HTTPException
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import logging
from pydantic import BaseModel
from datetime import datetime
import uuid
from .tasks import convert_audio as convert_audio_task

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# 환경 변수에서 설정 가져오기
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "mars_converter")  # 기본값 설정
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "outputs")

# 환경 변수 로드 확인
logger.info(f"MongoDB URI: {MONGODB_URI}")
logger.info(f"MongoDB DB: {MONGODB_DB}")
logger.info(f"Upload Directory: {UPLOAD_DIR}")
logger.info(f"Output Directory: {OUTPUT_DIR}")

# FastAPI 앱 초기화
app = FastAPI()

# MongoDB 연결
try:
    client = MongoClient(MONGODB_URI)
    if not isinstance(MONGODB_DB, str):
        raise TypeError(f"MONGODB_DB must be a string, got {type(MONGODB_DB)}")
    db = client[MONGODB_DB]
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

# 업로드 및 출력 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

class AudioConversion(BaseModel):
    job_id: str
    status: str
    input_file: str
    output_file: str | None = None
    created_at: datetime
    updated_at: datetime
    error: str | None = None

@app.get("/")
async def root():
    return {"message": "Audio Converter API"}

@app.get("/health")
async def health_check():
    try:
        # MongoDB 연결 상태 확인
        client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "upload_dir": os.path.exists(UPLOAD_DIR),
            "output_dir": os.path.exists(OUTPUT_DIR)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/config")
async def check_config():
    return {
        "mongodb_uri": MONGODB_URI,
        "mongodb_db": MONGODB_DB,
        "upload_dir": UPLOAD_DIR,
        "output_dir": OUTPUT_DIR
    }

@app.post("/convert")
async def convert_audio(file: UploadFile = File(...)):
    try:
        # 고유한 작업 ID 생성
        job_id = str(uuid.uuid4())
        current_time = datetime.utcnow()
        
        # 파일 저장
        file_extension = file.filename.split('.')[-1]
        input_path = os.path.join(UPLOAD_DIR, f"{job_id}.{file_extension}")
        
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
        convert_audio_task.delay(
            job_id=job_id,
            input_path=input_path,
            output_dir=OUTPUT_DIR,
            db_connection_string=MONGODB_URI
        )
        
        return {"job_id": job_id, "status": "pending"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/convert/{job_id}")
async def get_conversion_status(job_id: str):
    conversion = db.conversions.find_one({"job_id": job_id})
    if not conversion:
        raise HTTPException(status_code=404, detail="변환 작업을 찾을 수 없습니다")
    
    # MongoDB 문서를 딕셔너리로 변환하고 _id 필드 제거
    conversion_dict = {
        "job_id": conversion["job_id"],
        "status": conversion["status"],
        "input_file": conversion["input_file"],
        "output_file": conversion.get("output_file"),
        "created_at": conversion["created_at"].isoformat(),
        "updated_at": conversion["updated_at"].isoformat(),
        "error": conversion.get("error")
    }
    
    return conversion_dict

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

