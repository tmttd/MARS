from celery import Celery
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
import requests
from huggingface_hub import InferenceClient
from openai import OpenAI
from pydub import AudioSegment
from pydub.silence import split_on_silence
import math
import time

UTC = timezone.utc
# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수에서 필요한 값 로드
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
if not HUGGINGFACE_API_KEY:
    raise ValueError("HUGGINGFACE_API_KEY 환경 변수가 설정되지 않았습니다")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

# API Gateway URL 예시(필요 시 수정)
API_GATEWAY_URL = os.getenv("API_GATEWAY_URL", "http://localhost:8003")

# Celery 설정
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

@celery.task(name='transcribe_audio')
def transcribe_audio(job_id: str, input_path: str, output_dir: str, db_connection_string: str, work_db_connection_string: str, work_db_name: str):
    try:
        logger.info(f"작업 수신됨: task_id={celery.current_task.request.id}, job_id={job_id}")
        
        # MongoDB 연결 (로그용)
        client = MongoClient(db_connection_string)
        db = client.transcription_db
        
        # 작업 데이터베이스 연결
        work_client = MongoClient(work_db_connection_string)
        work_db = work_client[work_db_name]
        
        # 작업 시작 로그
        now = datetime.now(UTC)
        db.logs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "service": "transcription",
                    "event": "processing_started",
                    "input_path": input_path,
                    "status": "processing",
                    "timestamp": now,
                    "message": f"Transcribing audio file: {input_path}",
                    "metadata": {
                        "created_at": now,
                        "updated_at": now
                    }
                }
            }
        )
        
        # 파일 존재 확인
        if not os.path.exists(input_path):
            error_msg = f"오디오 파일을 찾을 수 없습니다: {input_path}"
            now = datetime.now(UTC)
            db.logs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "failed",
                        "timestamp": now,
                        "message": error_msg,
                        "metadata": {
                            "updated_at": now,
                        }
                    }
                }
            )
            raise FileNotFoundError(error_msg)

        # 음성-텍스트 변환
        logger.info(f"변환 중: {input_path}")
        whisper_client = InferenceClient(
            "openai/whisper-large-v3-turbo",
            token=os.getenv('HUGGINGFACE_API_KEY'),
            headers={"x-wait-for-model": "true"},
        )

        # 음성 파일 로드
        audio = AudioSegment.from_file(input_path)

        # 묵음 기준으로 파일 분할 (묵음이 1초 이상, -40 dBFS 이하일 때 분리)
        chunks = split_on_silence(
            audio,
            min_silence_len=1000,      # 1초 이상의 묵음
            silence_thresh=-40         # -40 dBFS 이하를 묵음으로 판단
        )

        logger.info(f"묵음 기준으로 {len(chunks)}개의 청크로 분할됨")

        # 시간 기준 병합 (약 3분 = 180000밀리초)
        target_duration = 180000  # 3분
        merged_chunks = []
        current_chunk = AudioSegment.empty()

        for chunk in chunks:
            # 현재 청크에 다음 청크를 추가해도 3분 미만이면 병합 계속
            if len(current_chunk) + len(chunk) <= target_duration:
                current_chunk += chunk
            else:
                # 3분을 초과하면 현재까지 병합된 청크 저장 후 새 청크 시작
                merged_chunks.append(current_chunk)
                current_chunk = chunk

        # 남은 부분 처리: 남은 current_chunk가 존재하면 추가
        if len(current_chunk) > 0:
            merged_chunks.append(current_chunk)

        logger.info(f"병합 후 청크 수: {len(merged_chunks)}개 (각 약 3분 단위)")

        segments_texts = []

        for idx, chunk in enumerate(merged_chunks):
            temp_segment_path = f"/tmp/{job_id}_chunk_{idx}.wav"
            chunk.export(temp_segment_path, format="wav")

            try:
                logger.info(f"청크 {idx+1}/{len(merged_chunks)} 변환 중...")
                segment_result = whisper_client.automatic_speech_recognition(temp_segment_path)
                segments_texts.append(segment_result.text)
            finally:
                if os.path.exists(temp_segment_path):
                    os.remove(temp_segment_path)
            time.sleep(1)  # 요청 간 딜레이

        transcribed_text = " ".join(segments_texts)
        logger.info(f"전체 음성 변환 완료: {len(merged_chunks)}개 청크 처리됨")
        logger.info(transcribed_text)
        
        
        # gpt-4o로 텍스트 보정하기
        # OpenAI 클라이언트 초기화
        openai_client = OpenAI(api_key=OPENAI_API_KEY)
        
        # 테스트용 예외 발생
        # raise Exception("test")
        
        # GPT를 사용한 텍스트 요약
        completion = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": f"""
                당신은 다음 전화 통화 녹취록(STT 출력)을 처리할 것입니다. 
                이 통화는 서울시 강남구 청담동 소재의 부동산(중개사)에서 사장님과 고객이 나눈 대화입니다. 
                아래의 지침을 엄격히 따라주세요:

                1. 원문 최대 보존
                - 원문에 기재된 표현, 단어, 어조를 최대한 그대로 유지해주세요.
                - 원문이 아무리 길어도 일부만 처리하지 말고 원문 전체를 최대한 출력해주세요.
                - 확실한 오류가 아니라면, 의심되는 부분도 가능한 한 원문 그대로 둡니다.
                - 데이터가 아무리 짧더라도 최선을 다해 처리해서 반환하세요. 추가 정보 요청은 절대 하지 마세요.
                
                2. 오류/불필요한 반복(환각) 최소 수정
                - 철자 오류가 섞인 반복(예: “청담동동동”처럼 철자가 엉켜서 반복된 경우)만 명백히 수정하거나 제거하세요.
                - 철자는 맞지만 의미 없이 기계적으로 반복된 구절(예: “있는 곳에 있는 곳에 있는 곳에…”가 문맥상 불필요하다고 확실히 보이면)도, 최소한으로만 정리하세요.
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
                …

                위의 지침을 바탕으로, 가능한 한 원문의 모든 내용을 그대로 살리되, 확실히 불필요한 반복이나 명백한 철자 오류, 리스트에 포함된 부동산 이름 교정 정도만 수행해 주세요.
                가장 중요한 것은 과잉 수정이나 삭제 없이, 원문에 최대한 가깝게 유지하는 것입니다.
                ---
                통화 녹취록:
                {transcribed_text}
                """},
            ],
        )
        
        refined_transcribed_text = completion.choices[0].message.content
        
        # 작업 데이터 업데이트
        work_db.calls.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "text": refined_transcribed_text
                }
            }
        )
        
        # 원본 파일 삭제
        os.remove(input_path)
        converted_path = input_path.replace('/app/audio_outputs', './datas/audio_converted')
        if os.path.exists(converted_path):
            os.remove(converted_path)
        logger.info(f"원본 파일 삭제 완료: {input_path}, {converted_path}")

        # 작업 완료 로그
        now = datetime.now(UTC)
        db.logs.update_one(
            {"job_id": job_id},
            {
                "$set": {   
                    "status": "completed",
                    "timestamp": now,
                    "message": "Transcription completed",
                    "metadata": {
                        "updated_at": now
                    }
                }
            }
        )
        
        # API Gateway에 웹훅 전송
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{settings.API_GATEWAY_URL}/webhook/transcription/{job_id}",
                    json={"status": "completed"}
                )
        
        asyncio.run(send_webhook())
        
        # 연결 종료
        client.close()
        work_client.close()
        
        return {"status": "completed", "text": refined_transcribed_text}
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
        try:
            # 오류 로그 기록
            now = datetime.now(UTC)
            db.logs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "service": "transcription",
                        "event": "error",
                        "status": "failed",
                        "timestamp": now,
                        "message": f"Transcription failed: {str(e)}",
                        "metadata": {
                            "updated_at": now,
                        }
                    }
                }
            )
        except Exception as inner_e:
            logger.error(f"오류 상태 업데이트 실패: {str(inner_e)}")
        finally:
            client.close()
            work_client.close()
        raise

# task 함수를 변수에 할당하여 export
transcribe_audio_task = celery.task(name='transcribe_audio', bind=True)(transcribe_audio)


@celery.task(name='retry_incomplete_jobs')
def retry_incomplete_jobs():
    """
    30분마다 실행되어, db.logs에서 'failed' 상태인 job_id를 찾고,
    아직 'completed' 로그가 없는 경우 다시 transcribe_audio 태스크를 재시도한다.
    """
    logger.info("===== 재시도 대상 작업 스캐닝 시작 =====")

    try:
        # 로그 DB 연결
        client = MongoClient(settings.MONGODB_URI)
        db = client.transcription_db
        work_db = client[settings.WORK_MONGODB_DB]

        # 'failed' 상태인 job 목록 추출
        failed_jobs = db.logs.find({"status": "failed"}).distinct("job_id")

        if not failed_jobs:
            logger.info("실패 상태의 작업이 없습니다.")
            return

        for job_id in failed_jobs:
            # 혹시 이미 "completed" 로그가 존재한다면(재시도 전에 해결된 경우) 스킵
            completed_log = db.logs.find_one({"job_id": job_id, "status": "completed"})
            if completed_log:
                logger.info(f"job_id={job_id} 는 이미 완료 로그가 있으므로 재시도하지 않음")
                continue

            # 재시도할 job의 입력값들(파일 경로 등)을 work_db에서 조회
            call_doc = work_db.calls.find_one({"job_id": str(job_id)})
            if not call_doc:
                logger.warning(f"work_db.calls에서 job_id={job_id} 관련 정보를 찾을 수 없어 재시도 불가")
                continue

            input_path = db.logs.find_one({"job_id": job_id, "status": "failed"})["input_path"]
            output_dir = db.logs.find_one({"job_id": job_id, "status": "failed"})["output_dir"]
            if not input_path or not output_dir:
                logger.warning(f"job_id={job_id} 의 input_path/output_dir 정보가 불충분하여 재시도 불가")
                continue

            logger.info(f"job_id={job_id} 재시도 수행")
            # transcribe_audio 태스크 재등록 (비동기)
            transcribe_audio_task.apply_async(args=[
                job_id,
                input_path,
                output_dir,
                settings.MONGODB_URI,
                settings.MONGODB_URI,
                settings.WORK_MONGODB_DB
            ])
    except Exception as e:
        logger.error(f"재시도 작업 처리 중 오류 발생: {str(e)}")
    finally:
        if 'client' in locals():
            client.close()

    logger.info("===== 재시도 대상 작업 스캐닝 종료 =====")
