from celery import Celery
from celery.signals import worker_ready
from datetime import datetime, timezone
from pymongo import MongoClient
import os
import logging
from httpx import AsyncClient
import asyncio
import gc
import json
from pathlib import Path
from .config import settings 
import requests                  # [MODIFIED] httpx → requests로 단순 POST
# ===== [MODIFIED] Cloudflare Workers 호출에 필요한 모듈 =====
import base64
# ===========================================================
from openai import OpenAI
from pydub import AudioSegment
from pydub.silence import split_on_silence
import math
import time

UTC = timezone.utc
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==== [MODIFIED] Cloudflare API 환경 변수 추가 ====
CLOUDFLARE_ACCOUNT_ID = os.getenv("CLOUDFLARE_ACCOUNT_ID")
CLOUDFLARE_API_TOKEN = os.getenv("CLOUDFLARE_API_TOKEN")
if not (CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN):
    raise ValueError("CLOUDFLARE_ACCOUNT_ID 또는 CLOUDFLARE_API_TOKEN이 설정되지 않았습니다")
# ==================================================

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8003")

celery = Celery('transcription')
celery.conf.update(
    broker_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    task_default_queue='transcription',
    task_routes={
        'transcribe_audio': {'queue': 'transcription'},
        'retry_incomplete_jobs': {'queue': 'transcription'}
    },
    beat_schedule={
        'retry-incomplete-jobs-every-30-minutes': {
            'task': 'retry_incomplete_jobs',
            'schedule': 1800.0,
        },
    },
    timezone='UTC'
)

# ==== [MODIFIED] Cloudflare Workers AI 호출 함수 ====
def cloudflare_whisper_transcribe(file_path: str) -> str:
    """
    파일을 읽어 Cloudflare Workers AI Whisper 모델로 전송 후 텍스트를 반환.
    오류 발생 시 구체적인 로깅 및 RuntimeError 발생.
    """
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/"
        f"{CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/openai/whisper" # 모델 버전 명시 제거 (최신 사용 권장) 또는 확인 후 명시
        # 모델명 확인 필요: '@cf/openai/whisper' 또는 '@cf/openai/whisper-large-v3' 등
        # 이전 코드: @cf/openai/whisper-large-v3-turbo (turbo가 붙는지 확인 필요)
    )
    # Cloudflare API 타임아웃: 필요시 조정
    timeout_seconds = 180

    try:
        with open(file_path, "rb") as f:
            audio_bytes = f.read()

        headers = {
            "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
            # Content-Type은 requests가 바이너리 데이터 전송 시 자동으로 설정하므로 명시 불필요
            # "Content-Type": "application/octet-stream" (필요시 명시 가능)
        }

        logger.debug(f"Cloudflare API 요청 시작: {url}")
        response = requests.post(url, headers=headers, data=audio_bytes, timeout=timeout_seconds)
        logger.debug(f"Cloudflare API 응답 수신: Status={response.status_code}")

        # === HTTP 상태 코드 확인 ===
        response.raise_for_status() # 200 OK가 아니면 HTTPError 발생

        # === 응답 JSON 파싱 및 결과 추출 ===
        try:
            result_json = response.json()
            # Cloudflare 응답 구조 확인 필요: 'result' 객체 안에 'text'가 있는지, 또는 최상위에 있는지
            if isinstance(result_json.get("result"), dict) and "text" in result_json["result"]:
                transcribed_text = result_json["result"]["text"]
            elif "text" in result_json: # 최상위 'text' 필드 확인 (이전 코드 방식)
                transcribed_text = result_json["text"]
            else:
                # 예상치 못한 JSON 구조
                error_msg = f"Cloudflare 응답 JSON 형식 오류: 'text' 필드를 찾을 수 없음. 응답: {response.text[:500]}..." # 전체 응답 로깅은 너무 길 수 있음
                logger.error(error_msg)
                raise RuntimeError(error_msg)

            if transcribed_text is None: # text 필드는 있으나 값이 null인 경우
                 logger.warning(f"Cloudflare API가 null 텍스트를 반환했습니다. 빈 문자열로 처리합니다. 응답: {response.text[:200]}")
                 return ""
            return str(transcribed_text) # 명시적으로 문자열 변환

        except requests.exceptions.JSONDecodeError as json_err:
            # 응답이 유효한 JSON이 아닌 경우
            error_msg = f"Cloudflare API 응답 JSON 파싱 실패: {json_err}. 응답 내용 (일부): {response.text[:500]}..."
            logger.error(error_msg)
            raise RuntimeError(error_msg) from json_err

    # === requests 라이브러리 관련 예외 처리 ===
    except requests.exceptions.HTTPError as http_err:
        # 4xx (클라이언트 오류), 5xx (서버 오류) 등 처리
        error_msg = f"Cloudflare API HTTP 오류 발생: {http_err}. 응답: {http_err.response.text[:500]}..."
        logger.error(error_msg)
        # 특정 상태 코드에 따른 추가 처리 가능 (예: 401 Unauthorized, 429 Rate Limit, 503 Service Unavailable)
        # if http_err.response.status_code == 429:
        #    logger.warning("Cloudflare API Rate Limit 초과 가능성 있음.")
        #    # 재시도 로직 고려 가능 (Celery 재시도 메커니즘 활용)
        raise RuntimeError(error_msg) from http_err # 상위 except 블록에서 잡도록 Runtime Error 발생

    except requests.exceptions.Timeout:
        # 타임아웃 발생
        error_msg = f"Cloudflare API 요청 시간 초과 ({timeout_seconds}초)"
        logger.error(error_msg)
        raise RuntimeError(error_msg) # Celery 재시도 유도

    except requests.exceptions.ConnectionError as conn_err:
        # 네트워크 연결 오류
        error_msg = f"Cloudflare API 연결 오류: {conn_err}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from conn_err # Celery 재시도 유도

    except requests.exceptions.RequestException as req_err:
        # 기타 requests 관련 예외 (상위 예외 클래스)
        error_msg = f"Cloudflare API 요청 중 알 수 없는 오류 발생: {req_err}"
        logger.error(error_msg)
        raise RuntimeError(error_msg) from req_err # Celery 재시도 유도

    # === 파일 처리 등 기타 예외 ===
    except IOError as io_err:
        # 파일 읽기 오류
        error_msg = f"오디오 파일 읽기 오류 ({file_path}): {io_err}"
        logger.error(error_msg)
        # 파일 오류는 재시도해도 해결되지 않을 가능성이 높음 (상위에서 FileNotFoundError와 유사하게 처리될 수 있음)
        raise RuntimeError(error_msg) from io_err
    except Exception as e:
        # 예상치 못한 모든 기타 오류
        error_msg = f"Cloudflare 처리 중 예상치 못한 내부 오류: {e}"
        logger.error(error_msg, exc_info=True) # 상세 스택 트레이스 로깅
        raise RuntimeError(error_msg) from e # 원본 예외 첨부

def transcribe_audio(job_id: str, input_path: str, output_dir: str,
                     db_connection_string: str, work_db_connection_string: str,
                     work_db_name: str):
    try:
        logger.info(f"작업 수신됨: job_id={job_id}")

        client = MongoClient(db_connection_string)
        db = client.transcription_db

        work_client = MongoClient(work_db_connection_string)
        work_db = work_client[work_db_name]

        now = datetime.now(UTC)
        db.logs.update_one(
            {"job_id": job_id},
            {"$set": {"service": "transcription",
                      "event": "processing_started",
                      "input_path": input_path,
                      "status": "processing",
                      "timestamp": now,
                      "message": f"Transcribing audio file: {input_path}",
                      "metadata": {"created_at": now, "updated_at": now}}}
        )

        # ===== [수정] 파일 존재 확인 및 초기 로그 (코드1 방식 반영) =====
        if not os.path.exists(input_path):
            error_msg = f"입력 오디오 파일을 찾을 수 없어 처리를 시작할 수 없습니다: {input_path}"
            logger.error(f"Job {job_id}: {error_msg}")
            # 로그 DB 업데이트
            db.logs.update_one(
                {"job_id": job_id, "service": "transcription"},
                {"$set": {"status": "failed_missing_input", "event": "error", "timestamp": now, "message": error_msg, "metadata.updated_at": now},
                 "$setOnInsert": {"service": "transcription"}},
                upsert=True
            )
            # ===== [추가됨] 작업 DB 상태 업데이트 =====
            work_db.calls.update_one(
                 {"job_id": job_id},
                 {"$set": {"transcription_status": "failed_missing_input", "updated_at": now}}
            )
            raise FileNotFoundError(error_msg)

        # 작업 시작 로그
        db.logs.update_one(
            {"job_id": job_id, "service": "transcription"},
            {"$set": {"event": "processing_started", "input_path": input_path, "status": "processing", "timestamp": now, "message": f"Transcribing audio file: {input_path}", "metadata.updated_at": now},
             "$setOnInsert": {"service": "transcription", "metadata.created_at": now}},
            upsert=True
        )

        logger.info(f"Job {job_id}: 변환 시작 - {input_path}")

        audio = AudioSegment.from_file(input_path)
        chunks = split_on_silence(audio, min_silence_len=1000,
                                  silence_thresh=-40, keep_silence=500)

        logger.info(f"Job {job_id}: 묵음 기준으로 {len(chunks)}개 청크로 분할됨")

        target_duration = 59999 # 1분 길이
        max_duration = 59999 # 1분 길이
        merged_chunks, current_chunk = [], AudioSegment.empty()
        chunk_index = 1
        for chunk in chunks:
            # 현재 청크와 다음 청크를 합쳤을 때 목표 길이를 넘지 않으면 합침
            if len(current_chunk) + len(chunk) <= target_duration:
                current_chunk += chunk
            # 넘으면, 기존 current_chunk를 저장하고 새 chunk 처리 시작
            else:
                # 기존에 병합중이던 청크가 있으면 저장
                if len(current_chunk) > 0:
                    merged_chunks.append(current_chunk)
                    logger.info(f"Job {job_id}: 병합된 청크 {chunk_index}: {len(current_chunk) / 1000:.2f} 초")
                    chunk_index += 1

                # 새 청크 자체가 최대 길이보다 긴 경우, 최대 길이로 분할하여 추가
                if len(chunk) > max_duration:
                    logger.info(f"Job {job_id}: 청크 길이가 최대({max_duration/1000}초) 초과하여 분할: {len(chunk) / 1000:.2f} 초")
                    split_chunks_list = list(chunk[::max_duration])
                    # ============================================
                    for i, split_chunk in enumerate(split_chunks_list): # 리스트 사용
                        # ===== [수정됨] 리스트의 길이를 사용 =====
                        if i < len(split_chunks_list) - 1 or len(split_chunk) > 100: # 예: 0.1초 이상일 때만
                           merged_chunks.append(split_chunk)
                           logger.info(f"Job {job_id}: 추가 분할된 청크 {chunk_index}: {len(split_chunk) / 1000:.2f} 초")
                           chunk_index += 1
                    current_chunk = AudioSegment.empty() # 분할했으므로 current_chunk 초기화
                # 새 청크가 최대 길이 이하면, 이것이 다음 병합의 시작이 됨
                else:
                    current_chunk = chunk

        # 루프 종료 후 마지막 남은 current_chunk 추가
        if len(current_chunk) > 0:
            merged_chunks.append(current_chunk)
            logger.info(f"Job {job_id}: 병합된 청크 {chunk_index}: {len(current_chunk) / 1000:.2f} 초")

        # ===== [수정됨] 로그 메시지 변경 =====
        logger.info(f"Job {job_id}: 병합 후 청크 수: {len(merged_chunks)}개 (각 약  단위)")
        # =====================================

        segments_texts = []
        for idx, chunk in enumerate(merged_chunks):
            temp_path = f"/tmp/{job_id}_chunk_{idx}.wav"
            chunk_duration_sec = len(chunk) / 1000.0
            logger.info(f"Job {job_id}: 청크 {idx+1}/{len(merged_chunks)} 저장: {temp_path}, 길이: {chunk_duration_sec:.2f}초")
            chunk.export(temp_path, format="wav")
            try:
                # === Cloudflare Workers 호출 ===
                logger.info(f"Job {job_id}: 청크 {idx+1}/{len(merged_chunks)} 변환 중...")
                seg_text = cloudflare_whisper_transcribe(temp_path)
                segments_texts.append(seg_text)
                logger.info(f"Job {job_id}: 청크 {idx+1} 변환 완료.")
            except Exception as e:
                logger.error(f"Job {job_id}: 청크 {idx+1}/{len(merged_chunks)} 변환 오류: {e}", exc_info=True)
                # 청크 처리 중 오류 발생 시 전체 Task 실패 처리 (아래 except 블록으로 전달)
                raise
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except OSError as rm_err:
                         logger.warning(f"Job {job_id}: 임시 파일 삭제 실패 {temp_path}: {rm_err}")

            # ===== [수정됨] time.sleep 시간 조정 (코드1과 일치 - 1초) =====
            time.sleep(0.5) # API 호출 간 간격 (Cloudflare 정책에 따라 조절 필요)
            # =======================================================

        transcribed_text = " ".join(segments_texts)
        logger.info(f"Job {job_id}: 전체 음성 변환 완료: {len(merged_chunks)}개 청크 처리됨")

        # GPT-4o로 텍스트 보정
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{
                "role": "system",
                "content": f"""
                당신은 다음 전화 통화 녹취록(STT 출력)을 처리할 것입니다. 
                이 통화는 서울시 강남구 청담동 소재의 부동산(중개사)에서 사장님과 고객이 나눈 대화입니다. 
                아래의 지침을 엄격히 따라주세요:

                1. 원문 최대 보존
                - 원문에 기재된 표현, 단어, 어조를 최대한 그대로 유지해주세요.
                - 원문이 아무리 길어도 일부만 처리하지 말고 원문 전체를 최대한 출력해주세요.
                - 확실한 오류가 아니라면, 의심되는 부분도 가능한 한 원문 그대로 둡니다.
                - 데이터가 아무리 짧더라도 최선을 다해 처리해서 반환하세요. 추가 정보 요청은 절대 하지 마세요.
                
                2. 오류/불필요한 반복(환각) 최소 수정
                - 철자 오류가 섞인 반복(예: "청담동동동"처럼 철자가 엉켜서 반복된 경우)만 명백히 수정하거나 제거하세요.
                - 철자는 맞지만 의미 없이 기계적으로 반복된 구절(예: "있는 곳에 있는 곳에 있는 곳에..."가 문맥상 불필요하다고 확실히 보이면)도, 최소한으로만 정리하세요.
                - 다만 실제 대화 맥락에서 강조하거나 습관적으로 반복한 표현이라면 그대로 두세요.
                - 애매한 경우에는 원문을 그대로 둡니다.
                
                3. 부동산 이름 표준화
                - 아래 리스트에 유사하게 들리는 부동산(아파트, 상가 등) 이름이 나오면, 가능한 한 명확하게 파악하여 해당 리스트 중 정확한 이름으로 표준화해 주세요.
                1) 아크로 삼성
                2) 청담 르엘
                3) 청담 삼익
                4) 엘프론트 청담
                5) 삼성 아이파크
                6) 청구
                7) 청담 자이
                8) 홍실
                9) 진흥
                10) 래미안 로이뷰
                
                - 만약 실제로는 다른 단어이거나, 리스트에 속하지 않는 이름으로 확실하게 보이면 그대로 두세요.

                4. 한국어 이외 텍스트 처리
                - 맥락상 불필요하고 의미 없는 외국어, 특수문자(예: 무작위 영문, 온갖 기호 등)만 제거합니다.
                - 부동산 가격이나 면적 등 맥락상 의미 있는 숫자, 브랜드명, 주소 내 영문 표기 등은 그대로 두세요.
                - 오타 및 맥락상 어색한 단어 명백한 오타나 맞춤법 오류라면 최소한으로 수정하되, 원문의 의미를 절대 바꾸지 마세요.
                - 정확한 오류인지 애매하면 원문 그대로 둡니다.
                
                5. 문장 가독성 개선
                - 문장의 가독성을 높이기 위해 최소한의 쉼표, 마침표 등 문장부호를 추가해 주세요.
                - 불필요한 어미나 접속어는 그대로 두고, 문장 구조 자체는 가능한 그대로 유지합니다.
                - 문장을 인식해서 하나의 문장이 끝날 때마다 줄바꿈을 수행합니다.

                6. 최종 출력물 형태
                - 최종 출력물은 다음과 같은 형태가 되어야 합니다:

                (원문 내용 중 문장1) \n
                (원문 내용 중 문장2) \n
                (원문 내용 중 문장3) \n
                ...

                위의 지침을 바탕으로, 가능한 한 원문의 모든 내용을 그대로 살리되, 확실히 불필요한 반복이나 명백한 철자 오류, 리스트에 포함된 부동산 이름 교정 정도만 수행해 주세요.
                가장 중요한 것은 과잉 수정이나 삭제 없이, 원문에 최대한 가깝게 유지하는 것입니다.
                ---
                통화 녹취록:
                {transcribed_text}
                """
            }],
        )
        refined_transcribed_text = completion.choices[0].message.content
        logger.info(f"Job {job_id}: GPT-4o 텍스트 보정 완료.")

        now = datetime.now(UTC)
        logger.info(f"Job {job_id}: 작업 DB 업데이트 시도...")
        work_db.calls.update_one(
            {"job_id": job_id},
            {"$set": {
                "text": refined_transcribed_text,
                "transcription_status": "completed", # <-- 상태 추가!
                "updated_at": now                  # <-- 시간 추가!
            }}
        )
        logger.info(f"Job {job_id}: 작업 DB 업데이트 완료.")
        
        # --- 원본 파일 삭제 (코드2 내용 유지, converted_path 부분은 6단계에서 정리) ---
        logger.info(f"Job {job_id}: 원본 파일 삭제 시도: {input_path}")
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
                logger.info(f"Job {job_id}: 원본 파일 삭제 완료: {input_path}")
            except OSError as remove_err:
                logger.warning(f"Job {job_id}: 원본 파일({input_path}) 삭제 실패: {remove_err}")
        converted_path = input_path.replace('/app/audio_outputs',
                                            './datas/audio_converted')
        
        # converted_path 삭제 로직 (6단계에서 제거 예정)
        converted_path = input_path.replace('/app/audio_outputs', './datas/audio_converted')
        if os.path.exists(converted_path):
             try:
                 os.remove(converted_path)
                 logger.info(f"Job {job_id}: 변환된 파일 삭제 완료: {converted_path}") # 로그 추가
             except OSError as remove_err:
                 logger.warning(f"Job {job_id}: 변환된 파일({converted_path}) 삭제 실패: {remove_err}") # 로그 추가

        # 작업 완료 로그
        now = datetime.now(UTC)
        db.logs.update_one(
            {"job_id": job_id, "service": "transcription"},
            {"$set": {"status": "completed", "event": "processing_completed", "timestamp": now, "message": "Transcription completed successfully", "metadata.updated_at": now}}
        )

        # API Gateway 웹훅 전송
        async def send_webhook():
             webhook_url = f"{settings.API_GATEWAY_URL}/webhook/transcription/{job_id}"
             logger.info(f"Job {job_id}: 웹훅 전송 시도: {webhook_url}")
             try:
                 async with AsyncClient(timeout=30.0) as client_async:
                     response = await client_async.post(webhook_url, json={"status": "completed"})
                     response.raise_for_status()
                     logger.info(f"Job {job_id}: 웹훅 전송 성공, status={response.status_code}")
             except Exception as webhook_error:
                 logger.error(f"Job {job_id}: 웹훅 전송 실패: {webhook_error}", exc_info=True)
        asyncio.run(send_webhook())

        return {"status": "completed", "text": refined_transcribed_text}

    except FileNotFoundError as e:
        logger.warning(f"Job {job_id}: 처리 중단 (FileNotFoundError - 이미 처리됨).")
    except Exception as e:
        logger.error(f"Job {job_id}: 변환 중 예상치 못한 오류 발생: {str(e)}", exc_info=True)
        try:
            # 실패 로그 DB 업데이트
            now = datetime.now(UTC)
            db.logs.update_one(
                {"job_id": job_id, "service": "transcription"},
                {"$set": {"event": "error", "status": "failed", "timestamp": now, "message": f"Transcription failed: {str(e)}", "metadata.updated_at": now}},
                upsert=True
            )
            # 작업 DB 상태 업데이트
            work_db.calls.update_one(
                 {"job_id": job_id},
                 {"$set": {"transcription_status": "failed", "updated_at": now}}
            )
        except Exception as inner_e:
            logger.error(f"Job {job_id}: 오류 상태 업데이트 실패: {str(inner_e)}")
        raise
    finally:
        # DB 연결 종료
        if client: client.close(); logger.debug(f"Job {job_id}: Log DB 연결 종료.")
        if work_client: work_client.close(); logger.debug(f"Job {job_id}: Work DB 연결 종료.")
        logger.info(f"Job {job_id}: 작업 완료 시도 (성공 또는 실패), job_id={job_id}")

transcribe_audio_task = celery.task(name='transcribe_audio')(transcribe_audio)

@celery.task(name='retry_incomplete_jobs')
def retry_incomplete_jobs():
    logger.info("===== 재시도 및 누락 작업 스캐닝 시작 =====")
    try:
        client = MongoClient(settings.MONGODB_URI)
        db = client.transcription_db
        work_db = client[settings.WORK_MONGODB_DB]

        # === 재시도 대상 선정: status='failed', service='transcription' ===
        processed_or_active_jobs = set() # 이미 처리 중이거나 완료된 job_id 저장

        # === 1. 실패한 작업 재시도 (기존 로직 유지 및 개선) ===
        failed_jobs_cursor = db.logs.find(
            {"status": {"$in": ["failed", "failed_invalid_log"]}, "service": "transcription"}, # failed_invalid_log도 포함 고려
            {"job_id": 1, "_id": 0}
        )
        failed_job_ids = set([doc["job_id"] for doc in failed_jobs_cursor if "job_id" in doc])

        logger.info(f"재시도 대상 후보 'failed' job_id 수: {len(failed_job_ids)}")

        retry_count_failed = 0
        for job_id in failed_job_ids:
            # 이미 완료/진행중/입력없음 상태인지 확인
            existing_log = db.logs.find_one({
                "job_id": job_id,
                "service": "transcription",
                "status": {"$in": ["completed", "processing", "failed_missing_input"]} # <-- 진행중/완료/파일없음 상태 제외
            })
            if existing_log:
                logger.info(f"job_id={job_id}(failed): 이미 완료/진행중/파일없음({existing_log['status']}) 로그가 있으므로 재시도 스킵")
                processed_or_active_jobs.add(job_id) # 처리된 것으로 간주
                continue

            # 가장 최근 실패 로그 조회 (input_path 확인용)
            log_doc = db.logs.find_one(
                {"job_id": job_id, "status": {"$in": ["failed", "failed_invalid_log"]}, "service": "transcription"},
                sort=[("timestamp", -1)]
            )
            if not log_doc:
                 logger.warning(f"job_id={job_id}(failed): 실패 로그를 재조회할 수 없음 (스킵)")
                 continue

            input_path = log_doc.get("input_path")
            if not input_path:
                logger.warning(f"job_id={job_id}(failed): input_path 정보가 로그에 없어 재시도 불가.")
                # 상태 업데이트 로직은 유지해도 좋음 (failed_invalid_log)
                continue

            if os.path.exists(input_path):
                logger.info(f"job_id={job_id}(failed): 파일({input_path}) 존재 확인, 재시도 수행")
                if not hasattr(settings, 'OUTPUT_DIR'):
                     logger.error("설정(settings)에 OUTPUT_DIR이 정의되지 않았습니다. 재시도 불가.")
                     continue

                celery.send_task(
                    'transcribe_audio',
                    kwargs={
                        'job_id': job_id,
                        'input_path': input_path,
                        'output_dir': settings.OUTPUT_DIR,
                        'db_connection_string': settings.MONGODB_URI,
                        'work_db_connection_string': settings.MONGODB_URI,
                        'work_db_name': settings.WORK_MONGODB_DB
                    },
                    queue='transcription'
                )
                retry_count_failed += 1
                processed_or_active_jobs.add(job_id) # 재시도 큐에 넣었으므로 활성으로 간주
                logger.info(f"job_id={job_id}(failed): 재시도 태스크 큐에 등록됨.")
            else:
                logger.warning(f"job_id={job_id}(failed): 파일({input_path})이 존재하지 않아 재시도하지 않음. 상태 업데이트: failed_missing_input")
                now = datetime.now(UTC)
                db.logs.update_one(
                    {"_id": log_doc["_id"]},
                    {"$set": {"status": "failed_missing_input", "message": "재시도 중단: 원본 입력 파일 없음", "timestamp": now, "metadata.updated_at": now}}
                )
                processed_or_active_jobs.add(job_id) # 처리된 것으로 간주

        logger.info(f"실패 작업 재시도 완료: {retry_count_failed}건")

        # === 2. 누락된 작업 처리 (새로 추가된 로직) ===
        logger.info(f"누락 작업 스캔 시작: {settings.UPLOAD_DIR}")
        retry_count_missing = 0
        input_dir = settings.UPLOAD_DIR # transcription 서비스의 입력 디렉토리
        if not os.path.isdir(input_dir):
             logger.error(f"입력 디렉토리를 찾을 수 없습니다: {input_dir}. 누락 작업 스캔 중단.")
        else:
            for filename in os.listdir(input_dir):
                if filename.endswith(".wav"):
                    job_id_from_file = filename[:-4] # 확장자(.wav) 제거

                    # 이미 실패 처리 후 재시도 되었거나, 활성/완료 상태인지 확인
                    if job_id_from_file in processed_or_active_jobs:
                        logger.debug(f"job_id={job_id_from_file}(from file): 이미 처리/재시도 대상이므로 스킵.")
                        continue

                    # DB에서 해당 job_id에 대한 로그 확인 (처리중, 완료, 파일없음 등)
                    existing_log = db.logs.find_one({
                        "job_id": job_id_from_file,
                        "service": "transcription",
                        # 상태가 'pending' 이거나 아예 로그가 없는 경우만 처리 대상
                        # 이미 처리가 시작되었거나 완료/실패된 경우는 제외
                        "status": {"$in": ["processing", "completed", "failed", "failed_missing_input", "failed_invalid_log"]}
                    })

                    if existing_log:
                        logger.debug(f"job_id={job_id_from_file}(from file): DB에 관련 로그({existing_log['status']})가 존재하므로 스킵.")
                        processed_or_active_jobs.add(job_id_from_file) # 처리된 것으로 간주
                        continue

                    # 작업 DB(calls)에 해당 job_id 정보가 있는지 확인 (선택적이지만, 유효한 job인지 확인 가능)
                    call_doc = work_db.calls.find_one({"job_id": job_id_from_file})
                    if not call_doc:
                        logger.warning(f"job_id={job_id_from_file}(from file): 작업 DB(calls)에 정보가 없어 유효하지 않은 파일로 간주 (스킵).")
                        continue # 또는 파일을 삭제하거나 다른 처리를 할 수도 있음

                    # 여기까지 왔다면, 파일은 존재하고 관련 로그가 없는 누락된 작업으로 간주
                    file_path = os.path.join(input_dir, filename)
                    logger.info(f"job_id={job_id_from_file}(from file): 누락된 작업으로 판단, 처리 시작.")

                    if not hasattr(settings, 'OUTPUT_DIR'):
                         logger.error("설정(settings)에 OUTPUT_DIR이 정의되지 않았습니다. 누락 작업 처리 불가.")
                         continue

                    celery.send_task(
                        'transcribe_audio',
                        kwargs={
                            'job_id': job_id_from_file,
                            'input_path': file_path,
                            'output_dir': settings.OUTPUT_DIR,
                            'db_connection_string': settings.MONGODB_URI,
                            'work_db_connection_string': settings.MONGODB_URI,
                            'work_db_name': settings.WORK_MONGODB_DB
                        },
                        queue='transcription'
                    )
                    retry_count_missing += 1
                    processed_or_active_jobs.add(job_id_from_file) # 큐에 넣었으므로 활성으로 간주
                    logger.info(f"job_id={job_id_from_file}(from file): 누락 작업 태스크 큐에 등록됨.")

        logger.info(f"누락 작업 처리 완료: {retry_count_missing}건")

    except Exception as e:
        logger.error(f"재시도/누락 작업 처리 중 오류 발생: {str(e)}", exc_info=True)
    finally:
        if client:
            client.close()
            logger.debug("Retry/Missing task: DB 연결 종료.")
        total_retried = retry_count_failed + retry_count_missing
        logger.info(f"===== 재시도 및 누락 작업 스캐닝 종료 (총 {total_retried}건 큐 등록) =====")
        
@worker_ready.connect
def at_start(sender, **kwargs):
    logger.info("Celery 워커 준비 완료. 초기 재시도 작업 실행.")
    retry_incomplete_jobs.delay()