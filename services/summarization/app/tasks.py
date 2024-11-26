from celery import Celery
from datetime import datetime
from pymongo import MongoClient
from openai import OpenAI
import os
import logging
from .config import Settings
from httpx import AsyncClient
import asyncio
# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# OpenAI API 키 확인
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

# Celery 설정
celery = Celery('summarization')
celery.conf.update(
    broker_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json'
)

@celery.task(name='summarize_text')
def summarize_text(job_id: str, text: str, db_connection_string: str):
    try:
        logger.info(f"텍스트 요약 시작: job {job_id}")
        
        # MongoDB 연결
        client = MongoClient(db_connection_string)
        db = client.summarization_db
        
        # 상태 업데이트: 처리 중
        db.summaries.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "processing",
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # OpenAI 클라이언트 초기화
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        
        # GPT를 사용한 텍스트 요약
        response = openai_client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "주어진 텍스트를 간단하게 요약해주세요."},
                {"role": "user", "content": text}
            ],
            max_tokens=150
        )
        
        summary = response.choices[0].message.content
        
        # 성공 상태 업데이트
        db.summaries.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "summary": summary,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{Settings.API_GATEWAY_URL}/webhook/summarization/{job_id}",
                    json={"status": "completed"}
                )

        asyncio.run(send_webhook())
        
        return {"status": "completed", "summary": summary}
        
    except Exception as e:
        logger.error(f"요약 중 오류 발생: {str(e)}")
        try:
            db.summaries.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        except Exception as update_error:
            logger.error(f"오류 상태 업데이트 실패: {str(update_error)}")
        raise 