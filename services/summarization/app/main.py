from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from datetime import datetime
import os
import uuid
import logging
from .models import SummarizationRequest, Summary
from .tasks import summarize_text
import httpx
import asyncio

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "summarization_db")
TRANSCRIPTION_SERVICE_URL = os.getenv("TRANSCRIPTION_SERVICE_URL", "http://transcription:8001")

app = FastAPI(title="Text Summarization Service")

# MongoDB 연결
try:
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

@app.get("/health")
async def health_check():
    try:
        client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post("/summarize")
async def summarize(request: SummarizationRequest):
    try:
        # 작업 ID 생성
        job_id = str(uuid.uuid4())
        current_time = datetime.utcnow()
        
        # 작업 상태 저장
        summary_doc = {
            "job_id": job_id,
            "status": "pending",
            "original_text": request.text,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # MongoDB에 저장
        db.summaries.insert_one(summary_doc)
        
        # Celery 작업 시작
        summarize_text.delay(
            job_id=job_id,
            text=request.text,
            db_connection_string=MONGODB_URI
        )
        
        return {"job_id": job_id, "status": "pending"}
        
    except Exception as e:
        logger.error(f"Error in summarize: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summarize/{job_id}")
async def get_summary(job_id: str):
    try:
        summary = db.summaries.find_one({"job_id": job_id})
        if not summary:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
            
        return {
            "job_id": job_id,
            "status": summary["status"],
            "summary": summary.get("summary"),
            "error": summary.get("error")
        }
    except Exception as e:
        logger.error(f"Error in get_summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize-transcript/{transcript_id}")
async def summarize_transcript(transcript_id: str):
    try:
        # Transcription 서비스에서 텍스트 가져오기
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{TRANSCRIPTION_SERVICE_URL}/transcript/{transcript_id}",
                timeout=30.0
            )
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="텍스트 가져오기 실패"
                )
            
            transcript_data = response.json()
            
            if transcript_data["status"] != "completed":
                raise HTTPException(
                    status_code=400,
                    detail=f"텍스트 변환이 완료되지 않았습니다: {transcript_data['status']}"
                )
            
            # 요약 작업 시작
            job_id = str(uuid.uuid4())
            current_time = datetime.utcnow()
            
            summary_doc = {
                "job_id": job_id,
                "status": "pending",
                "original_text": transcript_data["text"],
                "created_at": current_time,
                "updated_at": current_time
            }
            
            # MongoDB에 저장
            summaries.insert_one(summary_doc)
            
            # Celery 작업 시작
            summarize_text.delay(
                job_id=job_id,
                text=transcript_data["text"],
                db_connection_string=MONGODB_URI
            )
            
            return {"job_id": job_id, "status": "pending"}
            
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Transcription 서비스 통신 오류: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error in summarize_transcript: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 