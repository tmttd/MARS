from fastapi import FastAPI, HTTPException, Request
from pymongo import MongoClient
from datetime import datetime, UTC
import os
import logging
import json
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
    work_client = MongoClient(settings.MONGODB_URI)
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

@app.post("/summarize/{job_id}")
async def summarize(job_id: str, request: Request):
    try:
        current_time = datetime.now(UTC)
        
        # --- 요청 본문 처리 ---
        try:
            request_body = await request.json() # 요청 본문을 JSON으로 파싱 시도
            if not isinstance(request_body, dict):
                raise TypeError("요청 본문이 JSON 객체 형식이 아닙니다.")
            text_to_summarize = request_body.get("text") # 'text' 키 값 가져오기 (없으면 None)
            if text_to_summarize is None:
                raise ValueError("'text' 필드가 요청 본문에 누락되었습니다.")
            if not isinstance(text_to_summarize, str):
                 raise TypeError("'text' 필드의 값이 문자열이 아닙니다.")

        except json.JSONDecodeError:
            logger.error(f"Summarize 요청 본문 JSON 파싱 오류 (Job ID: {job_id})")
            raise HTTPException(status_code=400, detail="요청 본문이 유효한 JSON 형식이 아닙니다.")
        except (TypeError, ValueError) as e:
            logger.error(f"Summarize 요청 본문 내용 오류 (Job ID: {job_id}): {e}")
            raise HTTPException(status_code=400, detail=f"요청 본문 오류: {e}")
        except Exception as e: # 예상치 못한 오류 처리
             logger.error(f"Summarize 요청 본문 처리 중 오류 (Job ID: {job_id}): {e}", exc_info=True)
             raise HTTPException(status_code=400, detail="요청 본문 처리 중 오류가 발생했습니다.")
        # ---------------------------------------
        
        # 로그 기록
        logger.info(f"Summarize 요청 수신: job_id={job_id}, text_length={len(text_to_summarize)}")
        db.logs.update_one(
            {"job_id": job_id, "service": "summarization"},
            {
                "$set": {
                    "service": "summarization",
                    "event": "processing_started",
                    "status": "processing",
                    "timestamp": current_time,
                    "message": "요약 작업 시작됨",
                    "metadata.updated_at": current_time
                },
                "$setOnInsert": {
                    "service": "summarization",
                    "metadata.created_at": current_time
                }
            },
            upsert=True
        )
        
        # Celery 작업 시작 (다음 단계에서 text 전달하도록 수정 예정)
        summarize_text_task.apply_async(
            kwargs={
                'job_id': job_id,
                'db_connection_string': settings.MONGODB_URI,
                'work_db_connection_string': settings.MONGODB_URI,
                'work_db_name': settings.WORK_MONGODB_DB
                # 'text_to_summarize': text_to_summarize # <-- 다음 단계에서 추가
            },
            queue='summarization'
        )
        logger.info(f"Celery 작업 시작됨 (summarize_text): job_id={job_id}")

        return {"job_id": job_id, "status": "processing"}
            
    except HTTPException as http_exc:
        raise http_exc # 이미 발생한 HTTPException은 그대로 전달
    except Exception as e:
        logger.error(f"Summarize 엔드포인트 오류 (Job ID: {job_id}): {str(e)}", exc_info=True)
        # 오류 로그 DB 업데이트
        try:
            now = datetime.now(UTC)
            db.logs.update_one(
                {"job_id": job_id, "service": "summarization"},
                {"$set": {"status": "failed", "event": "error", "message": f"Summarize endpoint error: {str(e)}", "timestamp": now, "metadata.updated_at": now}},
                upsert=True
            )
        except Exception as inner_e:
             logger.error(f"오류 상태 업데이트 실패 (Job ID: {job_id}): {inner_e}")
        raise HTTPException(status_code=500, detail=f"Summarization 요청 처리 중 오류 발생: {str(e)}")