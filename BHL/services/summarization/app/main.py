from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
from datetime import datetime
import os
import logging
from .models import PropertyExtraction
from .tasks import celery, summarize_text_task
from .config import settings
from .database import get_all_extractions, init_db
from fastapi.middleware.cors import CORSMiddleware

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "summarization_db")

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
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

# 애플리케이션 시작 시 SQLite 데이터베이스 초기화
@app.on_event("startup")
async def startup_event():
    try:
        init_db()
        logger.info("SQLite 데이터베이스 초기화 성공")
    except Exception as e:
        logger.error(f"SQLite 데이터베이스 초기화 실패: {str(e)}")
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

@app.get("/extractions")
async def get_extractions_endpoint():
    """모든 추출 데이터 조회"""
    try:
        extractions = get_all_extractions()
        return {"extractions": extractions}
    except Exception as e:
        logger.error(f"추출 데이터 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize/{job_id}")
async def summarize(job_id: str):
    try:
        # 입력 파일 경로 확인
        input_file = os.path.join(settings.UPLOAD_DIR, f"{job_id}.txt")
        if not os.path.exists(input_file):
            logger.error(f"입력 파일을 찾을 수 없음: {input_file}")
            raise HTTPException(status_code=404, detail="입력 파일을 찾을 수 없습니다")

        # 출력 디렉토리 확인 및 생성
        os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
        
        # 요약 작업 시작
        current_time = datetime.utcnow()
        
        summary_doc = {
            "job_id": job_id,
            "status": "pending",
            "created_at": current_time,
            "updated_at": current_time
        }
        
        # MongoDB에 저장
        db.summaries.insert_one(summary_doc)
        
        # Celery 작업 시작
        summarize_text_task.apply_async(
            kwargs={
                'job_id': job_id,
                'db_connection_string': MONGODB_URI
            },
            queue='summarization'
        )
        
        return {"job_id": job_id, "status": "pending"}
            
    except Exception as e:
        logger.error(f"Error in summarize_transcript: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))