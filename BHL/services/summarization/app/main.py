from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from datetime import datetime, UTC
import os
import logging
from .models import PropertyExtraction
from .tasks import celery, summarize_text_task
from .config import settings
from fastapi.middleware.cors import CORSMiddleware

# 로깅 설정
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger(__name__)

app = FastAPI(title="Text Summarization Service")

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

@app.get("/health")
async def health_check():
    try:
        client.admin.command('ping')
        work_client.admin.command('ping')
        return {
            "status": "healthy",
            "database": "connected",
            "work_database": "connected"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

# @app.get("/extractions")
# async def get_extractions_endpoint():
#     """모든 추출 데이터 조회"""
#     try:
#         jobs = list(work_db.jobs.find(
#             {"summarization": {"$exists": True}},
#             {'_id': 0}
#         ))
#         extractions = [
#             {
#                 "job_id": job["job_id"],
#                 "extraction": job["summarization"]["extraction"]
#             }
#             for job in jobs
#             if "extraction" in job["summarization"]
#         ]
#         return {"extractions": extractions}
#     except Exception as e:
#         logger.error(f"추출 데이터 조회 중 오류 발생: {str(e)}")
#         raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize/{job_id}")
async def summarize(job_id: str):
    try:
        current_time = datetime.now(UTC)
        
        # 로그 기록
        db.logs.insert_one({
            "job_id": job_id,
            "service": "summarization",
            "event": "processing_started",
            "status": "processing",
            "timestamp": current_time,
            "message": "요약 작업 시작됨",
            "metadata": {
                "created_at": current_time,
                "updated_at": current_time
            }
        })
        
        # Celery 작업 시작
        summarize_text_task.apply_async(
            kwargs={
                'job_id': job_id,
                'db_connection_string': settings.MONGODB_URI,
                'work_db_connection_string': settings.WORK_MONGODB_URI,
                'work_db_name': settings.WORK_MONGODB_DB
            },
            queue='summarization'
        )
        
        return {"job_id": job_id, "status": "processing"}
            
    except Exception as e:
        logger.error(f"Error in summarize_transcript: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))