from fastapi import FastAPI, UploadFile, File, HTTPException
from pymongo import MongoClient
from datetime import datetime
import httpx
import os
import uuid
import logging
from .models import Transcript
from .tasks import transcribe_audio
import asyncio

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "transcription_db")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
CONVERTER_URL = os.getenv("CONVERTER_SERVICE_URL", "http://converter:8000")

app = FastAPI(title="Audio Transcription Service")

# MongoDB 연결
try:
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

# 업로드 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.get("/health")
async def health_check():
    try:
        client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "upload_dir": os.path.exists(UPLOAD_DIR)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file.filename.endswith(('.wav', '.mp3', '.m4a')):
        raise HTTPException(status_code=400, detail="지원되지 않는 파일 형식입니다")
    
    try:
        # Converter 서비스에 변환 요청
        async with httpx.AsyncClient() as client:
            files = {"file": (file.filename, await file.read())}
            response = await client.post(
                f"{CONVERTER_URL}/convert",
                files=files,
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="오디오 변환 실패"
                )
            
            converter_data = response.json()
            converter_job_id = converter_data["job_id"]
            
            # 변환 완료 대기
            for _ in range(30):  # 최대 60초 대기
                status_response = await client.get(
                    f"{CONVERTER_URL}/convert/{converter_job_id}"
                )
                status_data = status_response.json()
                
                if status_data["status"] == "completed":
                    converted_file_path = status_data["output_file"]
                    break
                elif status_data["status"] == "failed":
                    raise HTTPException(
                        status_code=500,
                        detail=f"변환 실패: {status_data.get('error', '알 수 없는 오류')}"
                    )
                
                await asyncio.sleep(2)
            else:
                raise HTTPException(
                    status_code=408,
                    detail="변환 시간 초과"
                )
            
            # Transcription 작업 시작
            job_id = str(uuid.uuid4())
            current_time = datetime.utcnow()
            
            transcript = {
                "job_id": job_id,
                "status": "pending",
                "input_file": converted_file_path,
                "created_at": current_time,
                "updated_at": current_time
            }
            
            # MongoDB에 저장
            db.transcripts.insert_one(transcript)
            
            # Celery 작업 시작
            transcribe_audio.delay(
                job_id=job_id,
                input_path=converted_file_path,
                db_connection_string=MONGODB_URI
            )
            
            return {"job_id": job_id, "status": "pending"}
            
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Converter 서비스 통신 오류: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transcript/{job_id}")
async def get_transcript(job_id: str):
    try:
        transcript = db.transcripts.find_one({"job_id": job_id})
        if not transcript:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
            
        return {
            "job_id": job_id,
            "status": transcript["status"],
            "text": transcript.get("text"),
            "error": transcript.get("error")
        }
    except Exception as e:
        logger.error(f"Error in get_transcript: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 