from celery import Celery
from celery.signals import worker_ready
from datetime import datetime, timezone
from pymongo import MongoClient
from openai import OpenAI
import os
import logging
from httpx import AsyncClient
import asyncio
import json
from .config import settings
from .models import PropertyExtraction
from pydantic import ValidationError

UTC = timezone.utc
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
        'summarize_text': {'queue': 'summarization'},
        'retry_incomplete_jobs': {'queue': 'summarization'}
    },
    worker_log_level='INFO',
    worker_log_format='%(asctime)s - %(levelname)s - %(message)s',
    worker_task_log_format='%(asctime)s - %(levelname)s - %(message)s',
    # 주기적 작업(beat) 스케줄
    beat_schedule={
        # 매 30분마다 실행
        'retry-incomplete-jobs-every-30-minutes': {
            'task': 'retry_incomplete_jobs',
            'schedule': 1800.0,  # 1800초 = 30분
        },
    },
    timezone='UTC'
)

@celery.task(name='summarize_text')
def summarize_text(job_id: str, db_connection_string: str, work_db_connection_string: str, work_db_name: str, text_to_summarize: str):
    try:
        # MongoDB 연결 (로그용)
        client = MongoClient(db_connection_string)
        db = client[settings.MONGODB_DB]
        
        # 작업 데이터베이스 연결
        work_client = MongoClient(work_db_connection_string)
        work_db = work_client[work_db_name]
        
        # 작업 시작 로그
        now = datetime.now(UTC)
        logger.info(f"Summarize task 시작: job_id={job_id}")
        db.logs.update_one  (
            {"job_id": job_id},
            {
                "$set": {
                    "service": "summarization",
                    "event": "processing_started",
                    "status": "processing",
                    "timestamp": now,
                    "message": "텍스트 요약 처리 중",
                    "metadata": {
                        "created_at": now,
                        "updated_at": now
                    }
                }
            }
        )
            
        # OpenAI 클라이언트 초기화
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        
        # GPT를 사용한 텍스트 요약
        completion = openai_client.chat.completions.create( # <-- 'create' 사용
            model="o4-mini", # <-- 모델 이름 변경
            response_format={"type": "json_object"},# <`-- JSON 모드 지정
            reasoning_effort='medium',
            messages=[
                {"role": "system", "content": """You are an AI assistant specialized in real estate. Your goal is to provide quick yet comprehensive summaries of phone calls between a real estate agent and their client. This summary must help the agent identify key action items, property details, and next steps. 
                Additionally, you must parse the given conversation transcript and convert the relevant information into a structured JSON format **exactly matching** the following Pydantic model:

                ---
                class PropertyType(str, Enum):
                    APARTMENT = "아파트"
                    OFFICETEL = "오피스텔"
                    COMMERCIAL = "상가"
                    OTHER = "기타"

                class TransactionType(str, Enum):
                    SALE = "매매"
                    RENT = "전세"
                    MONTHLY_RENT = "월세"

                class OwnerInfo(BaseModel):
                    owner_name: Optional[str] = None
                    owner_contact: Optional[str] = None

                class TenantInfo(BaseModel):
                    tenant_name: Optional[str] = None
                    tenant_contact: Optional[str] = None

                # 매물 정보
                class Properties(BaseModel):
                    property_name: Optional[str] = Field(None, description="아파트명 또는 건물 이름 등")
                    price: Optional[int] = Field(None, description="매매가 or 월세 (만원)")
                    deposit: Optional[int] = Field(None, description="(전세, 월세인 경우) 보증금 (만원)")
                    loan_info: Optional[str] = Field(None, description="대출 관련 정보")
                    city: Optional[str] = Field(None, description="시")
                    district: Optional[str] = Field(None, description="구")
                    legal_dong: Optional[str] = Field(None, description="동")
                    detail_address: Optional[str] = Field(None, description="아파트 동 호수 or 번지(ex. 1동 1305호 or 123-23)")
                    transaction_type: Optional[TransactionType] = Field(None, description="거래 종류")
                    property_type: Optional[PropertyType] = Field(None, description="매물 종류")
                    area: Optional[int] = Field(None, description="면적(평)")
                    owner_property_memo: Optional[str] = Field(None, description="현재 매물에 대한 소유주 관련 메모")
                    tenant_property_memo: Optional[str] = Field(None, description="현재 매물에 대한 세입자 관련 메모")
                    owner_info: Optional[OwnerInfo] = Field(None, description="집주인 정보")
                    tenant_info: Optional[TenantInfo] = Field(None, description="세입자 정보")
                    moving_date: Optional[str] = Field(None, description="입주가능일")

                class PropertyExtraction(BaseModel):
                    summary_title: str = Field(description="요약 제목")
                    summary_content: str = Field(description="요약 내용")
                    extracted_property_info: Optional[Properties] = Field(default_factory=Properties, description="추출된 매물 정보")
                ---

                Your final response **must**:
                1. Always be in Korean.
                2. Strictly follow the above Pydantic model's JSON structure (use the same keys and nesting).
                3. If any value is missing or uncertain, set it to `null` (i.e., `None` in Python terms).
                4. Constrain `summary_title` to 20 characters or fewer.
                5. Include the key points listed in the user prompt under `summary_content`.
                6. Only use 평 measuring area.
                7. Handle monetary units in 만원.
                8. Resolve duplicate or conflicting information by using the most recent or most specific mention.
                9. Use ISO 8601 format (e.g., "2025-01-14") for all date fields.
                """},
                {"role": "user", "content": f"""
                 Below is a transcript of a phone call between a real estate agent and a client. Analyze this transcript and write it into a JSON structure that fits the given Pydantic model.

                **JSON Structure Details**:
                {{
                "summary_title": "통화 내용을 요약하는 20자 이내의 짧은 문구",
                "summary_content": "Briefly summarize the following five pieces of information from the agent's perspective.:\n 1. Property type/location\n 2. Customer requirements (price, terms, schedule, etc.)\n 3. Additional information to check/prepare\n 4. Next steps (additional contact, document preparation, etc.)\n 5. Special notes or issues"
                "extracted_property_info": {{
                    "property_name": "아파트명 또는 건물 이름 등",
                    "price": "매매가/임대가 (만원)",
                    "deposit": "(전세, 월세인 경우) 보증금 (만원)",
                    "loan_info": "대출 관련 정보",
                    "city": "시",
                    "district": "구",
                    "legal_dong": "동",
                    "detail_address": "아파트 동 호수 or 번지(ex. 1동 1305호 or 123-23)",
                    "transaction_type": "거래 종류",
                    "property_type": "매물 종류",
                    "area": "면적(평)",
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
                    "moving_date": "입주가능일"
                }}
                }}

                **Note**:
                - You must write all responses in Korean.
                - The unit of amount is based on 10,000 won. If necessary, you should omit '10,000 won' after the number, but please enter only integers for JSON values ​​(e.g. 1억원 → 10000 / 1000만원 → 1000 / 1억 5천 → 15000).
                - If the same information is mentioned multiple times, use the most specific information.
                - Please null out any missing or unclear information.
                - Please exclude unnecessary greetings, small talk, responses, etc. from the summary and include only the key content.
                - Please use ISO 8601 format (e.g., "2025-01-14") for all date fields.
                ---
                --- 녹취록 ---
                {text_to_summarize}
                --- 녹취록 끝 ---
                """}
            ]
        )
        logger.info(f"OpenAI API 호출 완료: job_id={job_id}")

        # ===== [수정됨] 결과 처리: JSON 파싱 및 Pydantic 검증 추가 =====
        response_content = completion.choices[0].message.content
        extraction_dict = {} # 파싱 결과를 저장할 딕셔너리
        property_extraction_obj = None # 검증된 Pydantic 객체를 저장할 변수

        try:
            extraction_dict = json.loads(response_content) # 1. JSON 문자열 파싱
            logger.info(f"JSON 파싱 성공: job_id={job_id}")

            # 2. Pydantic 모델로 유효성 검사 및 객체 생성
            property_extraction_obj = PropertyExtraction(**extraction_dict)
            logger.info(f"Pydantic 모델 검증 성공: job_id={job_id}")
            # DB 저장을 위해 다시 딕셔너리로 변환 (옵션: mode='json'은 datetime 등을 ISO 문자열로 변환)
            extraction_to_save = property_extraction_obj.model_dump(mode='json')

        except json.JSONDecodeError as e:
            logger.error(f"JSON 파싱 오류 (Job ID: {job_id}): {e}. 응답 내용(일부): {response_content[:500]}...")
            raise ValueError(f"OpenAI 응답 JSON 파싱 실패: {e}") # 오류 발생시켜 종료
        except ValidationError as e:
            logger.error(f"Pydantic 모델 검증 실패 (Job ID: {job_id}): {e}. 파싱된 내용: {extraction_dict}")
            # 모델 검증 실패 시 어떻게 처리할지 결정 필요
            # 예: 실패 상태로 업데이트하고 종료 or 파싱된 dict라도 저장 시도(위험)
            raise ValueError(f"OpenAI 응답 데이터 검증 실패: {e}") # 오류 발생시켜 종료
        except Exception as e:
             logger.error(f"파싱 또는 검증 중 예상치 못한 오류 (Job ID: {job_id}): {e}", exc_info=True)
             raise # 예상치 못한 오류는 그대로 발생

        if not isinstance(extraction_to_save, dict): # 최종 저장할 데이터 타입 확인
            logger.error(f"최종 저장 데이터가 dictionary가 아님 (Job ID: {job_id}).")
            raise TypeError("최종 저장 데이터 타입 오류")
        # ====================================================================
        
        # 이제 extraction_to_save 딕셔너리 사용
        try:
            # extracted_property_info가 없거나 dict가 아니면 초기화
            # model_dump 시 default_factory=Properties 로 인해 항상 dict가 존재할 것으로 기대됨
            if 'extracted_property_info' not in extraction_to_save or not isinstance(extraction_to_save.get('extracted_property_info'), dict):
                 extraction_to_save['extracted_property_info'] = {} # 안전장치

            extracted_info = extraction_to_save['extracted_property_info']
        
        # full_address 생성
            address_fields = ['city', 'district', 'legal_dong', 'detail_address']
            full_address_parts = [str(extracted_info.get(field, '') or '') for field in address_fields]
            extracted_info['full_address'] = ' '.join(full_address_parts).strip()
            logger.debug(f"full_address 생성됨: {extracted_info['full_address']} (Job ID: {job_id})")

            # owner_info 업데이트 (DB에서 고객 정보 가져와서)
            job_for_customer_info = work_db.calls.find_one({"job_id": job_id}, {"customer_name": 1, "customer_contact": 1})
            if job_for_customer_info:
                 customer_name = job_for_customer_info.get("customer_name", "")
                 customer_contact = job_for_customer_info.get("customer_contact", "")
                 # Pydantic 모델 사용 시 owner_info 는 Properties의 기본값(None) 또는 객체일 것임
                 if extracted_info.get('owner_info') is None:
                     extracted_info['owner_info'] = {} # 또는 OwnerInfo().model_dump()
                 elif not isinstance(extracted_info['owner_info'], dict):
                      extracted_info['owner_info'] = {} # 안전 장치

                 extracted_info['owner_info']['owner_name'] = customer_name # 덮어쓰기
                 # 연락처 포맷팅 (이전과 동일)
                 cleaned_owner_contact = ''.join(filter(str.isdigit, str(customer_contact)))
                 if cleaned_owner_contact.startswith('010') and len(cleaned_owner_contact) == 11: formatted_owner_contact = f"{cleaned_owner_contact[:3]}-{cleaned_owner_contact[3:7]}-{cleaned_owner_contact[7:]}"
                 elif cleaned_owner_contact.startswith('02') and (len(cleaned_owner_contact) in (9, 10)): formatted_owner_contact = f"02-{cleaned_owner_contact[2:-4]}-{cleaned_owner_contact[-4:]}"
                 elif len(cleaned_owner_contact) in (10, 11): formatted_owner_contact = f"{cleaned_owner_contact[:3]}-{cleaned_owner_contact[3:-4]}-{cleaned_owner_contact[-4:]}"
                 else: formatted_owner_contact = customer_contact
                 extracted_info['owner_info']['owner_contact'] = formatted_owner_contact
                 logger.debug(f"owner_info 업데이트됨 (Job ID: {job_id})")

            # tenant_contact 포맷팅 (이전과 동일)
            if extracted_info.get('tenant_info') is None: extracted_info['tenant_info'] = {}
            elif not isinstance(extracted_info.get('tenant_info'), dict): extracted_info['tenant_info'] = {}
            tenant_contact_raw = extracted_info.get('tenant_info', {}).get('tenant_contact', '')
            cleaned_tenant_contact = ''.join(filter(str.isdigit, str(tenant_contact_raw)))
            if cleaned_tenant_contact.startswith('010') and len(cleaned_tenant_contact) == 11: formatted_tenant_contact = f"{cleaned_tenant_contact[:3]}-{cleaned_tenant_contact[3:7]}-{cleaned_tenant_contact[7:]}"
            elif cleaned_tenant_contact.startswith('02') and len(cleaned_tenant_contact) in (9, 10): formatted_tenant_contact = f"02-{cleaned_tenant_contact[2:-4]}-{cleaned_tenant_contact[-4:]}"
            elif len(cleaned_tenant_contact) in (10, 11): formatted_tenant_contact = f"{cleaned_tenant_contact[:3]}-{cleaned_tenant_contact[3:-4]}-{cleaned_tenant_contact[-4:]}"
            else: formatted_tenant_contact = tenant_contact_raw
            extracted_info['tenant_info']['tenant_contact'] = formatted_tenant_contact
            logger.debug(f"tenant_contact 포맷팅됨 (Job ID: {job_id})")

        except Exception as e:
            logger.error(f"후처리 중 오류 발생 (Job ID: {job_id}): {e}", exc_info=True)
            # 후처리 실패 시에도 일단 검증된/파싱된 내용 저장 시도
        # ====================================================================
                
        # 작업 데이터 업데이트 (검증 후 다시 딕셔너리로 변환된 객체 사용)
        logger.info(f"작업 DB 업데이트 시도: job_id={job_id}")
        update_result = work_db.calls.update_one(
            {"job_id": job_id},
            {"$set": extraction_to_save} # <-- Pydantic 검증 후 dict 사용
        )
        logger.info(f"작업 DB 업데이트 완료: matched={update_result.matched_count}, modified={update_result.modified_count} (job_id={job_id})")

        # 작업 완료 로그 (기존 로직 유지)
        now = datetime.now(UTC)
        db.logs.update_one(
            {"job_id": job_id, "service": "summarization"},
            {"$set": {"event": "summarization_completed", "status": "completed", "timestamp": now, "message": "텍스트 요약 및 검증 완료", "metadata.updated_at": now}} # 메시지 변경
        )
            
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
        
        return {"status": "completed", "extracted_property_info": extraction_to_save}
        
    except Exception as e:
        logger.error(f"요약 중 오류 발생: {str(e)}")
        try:
            # 오류 로그 기록
            now = datetime.now(UTC)
            db.logs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "service": "summarization",
                        "event": "error",
                        "status": "failed",
                        "timestamp": now,
                        "message": f"요약 실패: {str(e)}",
                        "metadata": {
                            "updated_at": now
                        }
                    }
                },
                upsert=True
            )
        except Exception as inner_e:
            logger.error(f"오류 상태 업데이트 실패: {str(inner_e)}")
        finally:
            client.close()
            work_client.close()
        raise
    
# task 함수를 변수에 할당하여 export
summarize_text_task = celery.task(name='summarize_text', bind=True)(summarize_text)

@celery.task(name='retry_incomplete_jobs')
def retry_incomplete_jobs():
    """
    30분마다 실행되어, db.logs에서 'failed' 상태인 summarization 작업과
    work_db.calls에서 전사(text)가 완료되었으나 요약 결과(extracted_property_info)가 없는 경우
    작업을 찾아 다시 summarize_text 태스크를 재시도한다.
    """
    logger.info("===== 재시도 대상 작업 스캐닝 시작 =====")

    try:
        # 로그 DB 연결
        client = MongoClient(settings.MONGODB_URI)
        db = client[settings.MONGODB_DB]
        work_db = client[settings.WORK_MONGODB_DB]

        # 1. 로그에서 summarization 실패 상태의 job_id 집합
        failed_job_ids = set(db.logs.find({"service": "summarization", "status": "failed"}).distinct("job_id"))

        # 2. work_db.calls에서 전사 결과가 존재하면서 요약 결과가 없는 job_id 집합
        pending_job_ids = set(
            work_db.calls.find({
                "text": {"$ne": None},
                "summary_content": {"$exists": False}
            }).distinct("job_id")
        )

        # 두 집합의 합집합으로 재시도 대상 job_id 결정
        jobs_to_retry = failed_job_ids.union(pending_job_ids)

        if not jobs_to_retry:
            logger.info("재시도 대상 작업이 없습니다.")
            return
        
        processed_count = 0
        for job_id in jobs_to_retry:
            # 이미 "completed" 로그가 존재한다면(재시도 전에 해결된 경우) 스킵
            completed_log = db.logs.find_one({"job_id": job_id, "status": "completed"})
            if completed_log:
                logger.info(f"job_id={job_id} 는 이미 완료 로그가 있으므로 재시도하지 않음")
                continue

            # 재시도할 job의 입력값들을 work_db에서 조회
            call_doc = work_db.calls.find_one({"job_id": str(job_id)})
            if not call_doc:
                logger.warning(f"work_db.calls에서 job_id={job_id} 관련 정보를 찾을 수 없어 재시도 불가")
                continue

            # 전사 결과가 있어야 summarization 진행
            if call_doc.get("text") is None:
                logger.warning(f"job_id={job_id} 는 전사 결과가 없으므로 요약 재시도 대상에서 제외")
                continue

            # 만약 이미 요약 결과가 존재하면 재시도 대상에서 제외
            if "summary_content" in call_doc:
                logger.info(f"job_id={job_id} 는 이미 요약 결과가 존재하므로 재시도 대상에서 제외")
                continue

            logger.info(f"job_id={job_id} 재시도 수행 (요약 작업 실행)")
            # summarize_text 태스크 재등록 (비동기)
            summarize_text_task.apply_async(kwargs={
                'job_id': job_id,
                'db_connection_string': settings.MONGODB_URI,
                'work_db_connection_string': settings.MONGODB_URI,
                'work_db_name': settings.WORK_MONGODB_DB,
                'text_to_summarize': call_doc.get("text")
            }, queue='summarization')
            processed_count += 1
            # ====================================================================

    except Exception as e:
        logger.error(f"재시도 작업 처리 중 오류 발생: {str(e)}", exc_info=True) # <-- exc_info 추가
    finally:
        if client: client.close()
        logger.info(f"===== 재시도 대상 작업 스캐닝 종료 (총 {processed_count}건 큐 등록) =====") # <-- 처리 건수 로깅

    logger.info("===== 재시도 대상 작업 스캐닝 종료 =====")

@worker_ready.connect
def at_start(sender, **kwargs):
    """
    Celery 워커가 준비되면 즉시 retry_incomplete_jobs 태스크를 실행
    """
    logger.info("Celery 워커가 준비되었습니다. 초기 retry_incomplete_jobs 태스크를 실행합니다.")
    retry_incomplete_jobs.delay()