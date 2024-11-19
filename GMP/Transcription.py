from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import logging
from datetime import datetime
import uuid
from pydantic import BaseModel
from .tasks import transcribe_audio as transcribe_audio_task

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# 환경 변수에서 설정 가져오기
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "mars_converter")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

app = FastAPI()

# MongoDB 연결
try:
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    transcripts = db.transcripts
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

# 업로드 디렉토리 생성
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    if not file.filename.endswith(('.wav', '.mp3', '.m4a')):
        raise HTTPException(status_code=400, detail="지원되지 않는 파일 형식입니다")
    
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
        transcript = {
            "job_id": job_id,
            "status": "pending",
            "input_file": input_path,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # MongoDB에 저장
        transcripts.insert_one(transcript)
        
        # Celery 작업 시작
        transcribe_audio_task.delay(
            job_id=job_id,
            input_path=input_path,
            db_connection_string=MONGODB_URI
        )
        
        return {"job_id": job_id, "status": "pending"}
        
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/transcript/{job_id}")
async def get_transcript(job_id: str):
    transcript = transcripts.find_one({"job_id": job_id})
    if not transcript:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
    
    if transcript["status"] == "completed":
        return JSONResponse({
            "job_id": transcript["job_id"],
            "status": transcript["status"],
            "text": transcript["text"]
        })
    
    return {
        "job_id": transcript["job_id"],
        "status": transcript["status"],
        "error": transcript.get("error")
    }

@app.get("/transcribe/{job_id}")
async def get_transcription_status(job_id: str):
    transcript = transcripts.find_one({"job_id": job_id})
    if not transcript:
        raise HTTPException(status_code=404, detail="변환 작업을 찾을 수 없습니다")
    
    # MongoDB 문서를 딕셔너리로 변환
    result = {
        "job_id": transcript["job_id"],
        "status": transcript["status"],
        "input_file": transcript["input_file"],
        "created_at": transcript["created_at"],
        "updated_at": transcript["updated_at"],
        "error": transcript.get("error"),
        "text": transcript.get("text")
    }
    
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

