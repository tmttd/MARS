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
            model="gpt-4o",
            messages=[
                {"role": "system", "content": """You are an AI assistant specialized in real estate. Your goal is to provide quick yet comprehensive summaries of phone calls between a real estate agent and their client. This summary must help the agent identify key action items, property details, and next steps. 
                Additionally, you must parse the given conversation transcript and convert the relevant information into a structured JSON format **exactly matching** the following Pydantic model:

                ---
                class PropertyType(str, Enum):
                    APARTMENT = "아파트"
                    OFFICETEL = "오피스텔"
                    REBUILDING = "재건축"
                    COMPOSITE = "주상복합"
                    COMMERCIAL = "상가"
                    OFFICE = "사무실"
                    OTHER = "기타"

                class TransactionType(str, Enum):
                    SALE = "매매"
                    RENT = "전세"
                    MONTHLY_RENT = "월세"
                    LEASE = "임대"
                    OTHER = "기타"

                class OwnerInfo(BaseModel):
                    owner_name: Optional[str] = None
                    owner_contact: Optional[str] = None

                class TenantInfo(BaseModel):
                    tenant_name: Optional[str] = None
                    tenant_contact: Optional[str] = None

                # 매물 정보
                class Properties(BaseModel):
                    property_name: Optional[str] = Field(None, description="단지명")
                    price: Optional[int] = Field(None, description="매매가 or 월세 (만원)")
                    deposit: Optional[int] = Field(None, description="(전세, 월세인 경우) 보증금 (만원)")
                    loan_info: Optional[str] = Field(None, description="대출 관련 정보")
                    city: Optional[str] = Field(None, description="시")
                    district: Optional[str] = Field(None, description="구")
                    legal_dong: Optional[str] = Field(None, description="동")
                    detail_address: Optional[str] = Field(None, description="상세주소(동 호수 or 번지)")
                    transaction_type: Optional[TransactionType] = Field(None, description="거래 종류")
                    property_type: Optional[PropertyType] = Field(None, description="매물 종류")
                    floor: Optional[int] = Field(None, description="층")
                    area: Optional[int] = Field(None, description="면적")
                    premium: Optional[int] = Field(None, description="(상가인 경우) 권리금 (만원)")
                    owner_property_memo: Optional[str] = Field(None, description="현재 매물에 대한 소유주 관련 메모")
                    tenant_property_memo: Optional[str] = Field(None, description="현재 매물에 대한 세입자 관련 메모")
                    owner_info: Optional[OwnerInfo] = Field(None, description="집주인 정보")
                    tenant_info: Optional[TenantInfo] = Field(None, description="세입자 정보")
                    memo: Optional[str] = Field(None, description="매물에 관한 메모")
                    moving_date: Optional[str] = Field(None, description="입주가능일")

                class PropertyExtraction(BaseModel):
                    summary_title: str = Field(description="요약 제목")
                    summary_content: str = Field(description="요약 내용")
                    extracted_property_info: Optional[Properties] = Field(default_factory=Properties, description="추출된 매물 정보")
                ---

                Your final response **must**:
                1. Be in Korean.
                2. Strictly follow the above Pydantic model’s JSON structure (use the same keys and nesting).
                3. If any value is missing or uncertain, set it to `null` (i.e., `None` in Python terms).
                4. Constrain `summary_title` to 20 characters or fewer.
                5. Include the key points listed in the user prompt under `summary_content`.
                6. Convert any measurements (e.g., 평) to square meters (㎡) if applicable, and handle monetary units in 만원.
                7. Resolve duplicate or conflicting information by using the most recent or most specific mention.
                8. Use ISO 8601 format (e.g., "2025-01-14") for all date fields.
                """},
                {"role": "user", "content": f"""Below is a transcript of a phone call between a real estate agent and a client. Analyze this transcript and write it into a JSON structure that fits the given Pydantic model.

                **JSON Structure Details**:
                {{
                "summary_title": "통화 내용을 요약하는 20자 이내의 짧은 문구",
                "summary_content": "Briefly summarize the following five pieces of information from the agent's perspective.:\n 1. Property type/location\n 2. Customer requirements (price, terms, schedule, etc.)\n 3. Additional information to check/prepare\n 4. Next steps (additional contact, document preparation, etc.)\n 5. Special notes or issues"
                "extracted_property_info": {{
                    "property_name": "건물명",
                    "price": "매매가/임대가 (만원)",
                    "deposit": "(전세, 월세인 경우) 보증금 (만원)",
                    "loan_info": "대출 관련 정보",
                    "city": "시",
                    "district": "구",
                    "legal_dong": "동",
                    "detail_address": "상세주소(동 호수 or 번지)",
                    "transaction_type": "거래 종류",
                    "property_type": "매물 종류",
                    "floor": "층",
                    "area": "면적",
                    "premium": "권리금 (상가인 경우, 만원)",
                    "owner_property_memo": "현재 매물에 대한 소유주 관련 메모",
                    "tenant_property_memo": "현재 매물에 대한 세입자 관련 메모",
                    "owner_info": {{
                    "owner_name": "소유주 이름",
                    "owner_contact": "소유주 연락처",
                    }},
                    "tenant_info": {{
                    "tenant_name": "세입자 이름",
                    "tenant_contact": "세입자 연락처",
                    }},
                    "memo": "매물에 관한 메모",
                    "moving_date": "입주가능일"
                }}
                }}

                **Note**:
                - Please write all responses in Korean.
                - When mentioning 'pyeong', please convert 1 pyeong = approximately 3.306㎡.
                - The unit of amount is based on 10,000 won. If necessary, you can omit or write '10,000 won' after the number, but please enter only integers for JSON values ​​(e.g. 25 million won → 250).
                - If the same information is mentioned multiple times, use the most recent/specific information.
                - Please null out any missing or unclear information.
                - Please exclude unnecessary greetings, small talk, responses, etc. from the summary and include only the key content.
                - Please use ISO 8601 format (e.g., "2025-01-14") for all date fields.
                ---
                **call transcript**:
                {text_to_summarize}
                """}
            ],
            response_format=PropertyExtraction
        )
        
        extraction = completion.choices[0].message.parsed.model_dump()
        
        logger.info(f"extraction: {extraction}")
        
        # full_address 생성
        try:
            extracted_info = extraction.get('extracted_property_info', {})
            if not isinstance(extracted_info, dict):
                raise ValueError("extracted_property_info는 딕셔너리여야 합니다.")

            address_fields = ['city', 'district', 'legal_dong', 'detail_address']
            full_address_parts = [
                str(extracted_info.get(field, '') or '') for field in address_fields
            ]

            extraction['extracted_property_info']['full_address'] = ' '.join(full_address_parts).strip()
        except Exception as e:
            # 로깅 또는 에러 핸들링
            logger.error(f"full_address 생성 중 오류 발생: {e}")
            extraction['extracted_property_info']['full_address'] = ''
        
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
                "$set": extraction
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