from celery import Celery
from datetime import datetime, UTC
from pymongo import MongoClient
from openai import OpenAI
import os
import logging
from httpx import AsyncClient
import asyncio
import json
from .config import settings
from .models import PropertyExtraction

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
def summarize_text(job_id: str, db_connection_string: str, work_db_connection_string: str, work_db_name: str):
    try:
        # MongoDB 연결 (로그용)
        client = MongoClient(db_connection_string)
        db = client.summarization_db
        
        # 작업 데이터베이스 연결
        work_client = MongoClient(work_db_connection_string)
        work_db = work_client[work_db_name]
        
        # 작업 시작 로그
        now = datetime.now(UTC)
        db.logs.insert_one({
            "job_id": job_id,
            "service": "summarization",
            "event": "processing_started",
            "status": "processing",
            "timestamp": now,
            "message": "텍스트 요약 처리 중",
            "metadata": {
                "created_at": now,
                "updated_at": now
            }
        })
        
        # 작업 조회
        job = work_db.calls.find_one({"job_id": job_id})
        if not job:
            raise ValueError("작업을 찾을 수 없습니다")
            
        text_to_summarize = job.get("text")
            
        # OpenAI 클라이언트 초기화
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        
        # GPT를 사용한 텍스트 요약
        completion = openai_client.beta.chat.completions.parse(
            model="gpt-4o-mini",
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
                - Use None for missing numeric values.
                - Use None for missing string values.
                - If a value is uncertain but an estimate is provided, include the estimate and add a note about the uncertainty in the "memo" field.
                - If you're unsure about any information, include a note in the "비고" (Notes) field explaining the uncertainty."""}
            ],
            response_format=PropertyExtraction
        )
        
        extraction = completion.choices[0].message.parsed.model_dump()
        
        # # 출력 파일 경로 설정
        # output_file = os.path.join(settings.OUTPUT_DIR, f"{job_id}.json")
        # os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
        
        # # 요약 결과를 파일로 저장
        # summary = {
        #     "job_id": job_id,
        #     "extracted_property_info": extraction,
        #     "created_at": datetime.now(UTC).isoformat()
        # }
        
        # with open(output_file, 'w', encoding='utf-8') as f:
        #     json.dump(summary, f, ensure_ascii=False, indent=2)
            
        # 작업 데이터 업데이트
        work_db.calls.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "extracted_property_info": extraction
                }
            }
        )
        
        # 작업 완료 로그
        now = datetime.now(UTC)
        db.logs.insert_one({
            "job_id": job_id,
            "service": "summarization",
            "event": "summarization_completed",
            "status": "completed",
            "timestamp": now,
            "message": "텍스트 요약 완료",
            "metadata": {
                "updated_at": now
            }
        })
            
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{settings.API_GATEWAY_URL}/webhook/summarization/{job_id}",
                    json={"status": "completed"}
                )

        asyncio.run(send_webhook())
        
        # 연결 종료
        client.close()
        work_client.close()
        
        return {"status": "completed", "extracted_property_info": extraction}
        
    except Exception as e:
        logger.error(f"요약 중 오류 발생: {str(e)}")
        try:
            # 오류 로그 기록
            now = datetime.now(UTC)
            db.logs.insert_one({
                "job_id": job_id,
                "service": "summarization",
                "event": "error",
                "status": "failed",
                "timestamp": now,
                "message": f"요약 실패: {str(e)}",
                "metadata": {
                    "error": str(e),
                    "updated_at": now
                }
            })
        except Exception as inner_e:
            logger.error(f"오류 상태 업데이트 실패: {str(inner_e)}")
        finally:
            client.close()
            work_client.close()
        raise
    
# task 함수를 변수에 할당하여 export
summarize_text_task = celery.task(name='summarize_text', bind=True)(summarize_text)