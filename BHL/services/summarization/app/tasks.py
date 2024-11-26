from celery import Celery
from datetime import datetime
from pymongo import MongoClient
from openai import OpenAI
import os
import logging
from .config import settings
from httpx import AsyncClient
import asyncio
import json
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
    broker_url=os.getenv('REDIS_URL', 'redis://redis:6379/0'),
    result_backend=os.getenv('REDIS_URL', 'redis://redis:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    task_default_queue='summarization',
    task_routes={
        'summarize_text': {'queue': 'summarization'}
    }
)

@celery.task(name='summarize_text')
def summarize_text(job_id: str, db_connection_string: str):
    try:
        logger.info(f"텍스트 요약 시작: job {job_id}")
        
        # 입력 파일 경로 설정
        input_file = os.path.join(settings.UPLOAD_DIR, f"{job_id}.txt")
        
        # 텍스트 파일 읽기
        with open(input_file, 'r', encoding='utf-8') as f:
            text_to_summarize = f.read()
            
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
                {"role": "system", "content": "주어진 텍스트는 부동산 거래 관련 문의 내용입니다.\
                    부동산 사장의 입장에서 도움이 될 만한 정보만 추려서 두 문장 내로 요약해주세요."},
                {"role": "user", "content": text_to_summarize}
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
        
        # 출력 파일 경로 설정
        output_file = os.path.join(settings.OUTPUT_DIR, f"{job_id}.json")
        
        # 요약 결과를 파일로 저장
        os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
        
        summary = {
            "job_id": job_id,
            "summary": summary,
            "created_at": datetime.utcnow().isoformat()
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)
            
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{settings.API_GATEWAY_URL}/webhook/summarization/{job_id}",
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
    
# task 함수를 변수에 할당하여 export
summarize_text_task = celery.task(name='summarize_text', bind=True)(summarize_text)

# 또는 다음과 같이 할 수도 있습니다:
# summarize_text_task = summarize_text
