from celery import Celery
from datetime import datetime
from pymongo import MongoClient
from openai import OpenAI
import os
import logging
from .config import settings
from .models import PropertyExtraction
from .database import init_db, insert_extraction
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
        
        # SQLite 데이터베이스 초기화
        init_db()
        
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
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": """You are an AI assistant tasked with extracting structured real estate listing information from a phone call transcript. Your goal is to analyze the given transcript and convert the relevant information into a structured JSON format."""},
                {"role": "user", "content": f""" Here is the call transcript you need to analyze:

                <call_transcript>
                {text_to_summarize}
                </call_transcript>

                Please extract the following information from the transcript:

                1. property_type (매물 종류 [아파트, 오피스텔, 주텍, 상가, 기타])
                2. price (매매가 (만원))
                3. address (주소)
                4. business_type (업종 (상가인 경우))
                5. building_name (오피스텔/아파트명 (오피스텔/아파트일 경우))
                6. floor (층)
                7. dong (동)
                8. deposit (보증금 (만원))
                9. monthly_rent (월세 (만원))
                10. premium (권리금 (상가인 경우, 만원))
                11. name (세입자 및 주인 성명) 
                12. contact (연락처)
                13. property_address (매물주소)
                14. memo (메모)
                15. summary (통화 요약)

                Guidelines for extracting information:
                - If a piece of information is mentioned multiple times, use the most recent or most specific mention.
                - Convert any measurements or numbers to their appropriate formats (e.g., convert pyeong to square meters).
                - Your response must be in Korean.

                If any information is missing or uncertain:
                - Use Nonefor missing numeric values.
                - Use an None for missing string values.
                - If a value is uncertain but an estimate is provided, include the estimate and add a note about the uncertainty in the "memo" field.
                - If you're unsure about any information, include a note in the "비고" (Notes) field explaining the uncertainty."""}
            ],
            response_format=PropertyExtraction
        )
        
        extraction = completion.choices[0].message.parsed.model_dump()

        # MongoDB에 저장
        db.summaries.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "updated_at": datetime.utcnow(),
                    "extraction": extraction
                }
            }
        )
        
        # SQLite에도 저장
        insert_extraction(job_id, extraction)
        
        # 출력 파일 경로 설정
        output_file = os.path.join(settings.OUTPUT_DIR, f"{job_id}.json")
        
        # 요약 결과를 파일로 저장
        os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
        
        summary = {
            "job_id": job_id,
            "extraction": extraction,
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
            
        return {"status": "completed", "extraction": extraction}
        
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
