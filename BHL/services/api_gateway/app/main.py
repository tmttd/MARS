from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from redis import Redis
from datetime import datetime, UTC
import httpx
import uuid
import json
import logging
import os
from .config import Settings
from .models import ProcessingJob, StageStatus
from typing import List, Dict, Any
from pymongo import MongoClient

# 로깅 설정
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 환경 변수 설정
settings = Settings()

app = FastAPI(title="Audio Processing API Gateway")

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 프론트엔드가 실행되는 도메인
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용
    allow_headers=["*"],  # 모든 헤더 허용
)

# Redis 연결
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

# 환경 변수
SUMMARIZATION_SERVICE_URL = os.getenv(
    "SUMMARIZATION_SERVICE_URL", "http://summarization:8000"
)


@app.post("/Total_Processing")
async def Total_Processing(file: UploadFile = File(...)):
    try:
        job_id = str(uuid.uuid4())
        current_time = datetime.now(UTC)

        logger.info(f"새로운 처리 작업 시작: {job_id}")

        # Pydantic 모델 사용
        job_status = ProcessingJob(
            job_id=job_id,
            status="pending",
            created_at=current_time,
            updated_at=current_time,
            stages={
                "conversion": StageStatus(status="pending"),
                "transcription": StageStatus(status="pending"),
                "summarization": StageStatus(status="pending"),
            },
        )

        # Redis에 저장
        redis_result = redis_client.set(f"job:{job_id}", job_status.model_dump_json())
        logger.info(f"Redis 저장 결과: {redis_result}, job_id: {job_id}")

        # 오디오 변환 서비스로 파일 전송 (job_id 포함)
        async with httpx.AsyncClient() as client:
            files = {"file": (file.filename, file.file, file.content_type)}
            params = {"job_id": job_id}  # job_id를 쿼리 파라미터로 전달
            response = await client.post(
                f"{settings.CONVERTER_SERVICE_URL}/convert", files=files, params=params
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, detail="오디오 변환 요청 실패"
                )

            conversion_job = response.json()

            # 상태 업데이트
            job_status.stages["conversion"].status = "processing"
            job_status.updated_at = datetime.now(UTC)
            redis_result = redis_client.set(
                f"job:{job_id}", job_status.model_dump_json()
            )
            logger.info(f"Redis 업데이트 결과: {redis_result}")

        return {"job_id": job_id, "status": "processing"}

    except Exception as e:
        logger.error(f"처리 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    try:
        job_status = redis_client.get(f"job:{job_id}")
        if not job_status:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

        return json.loads(job_status)

    except Exception as e:
        logger.error(f"상태 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/conversion/{job_id}")
async def conversion_webhook(job_id: str):
    try:
        logger.info(f"변환 완료 웹훅 수신: {job_id}")

        # Redis에서 작업 상태 조회
        job_status_str = redis_client.get(f"job:{job_id}")
        logger.info(f"Redis에서 조회된 작업 상태: {job_status_str}")

        if not job_status_str:
            return {"status": "ignored", "detail": "작업을 찾을 수 없습니다"}

        job_status = json.loads(job_status_str)

        # Converter 서비스에서 변환 상태 확인
        async with httpx.AsyncClient() as client:
            conv_response = await client.get(
                f"{settings.CONVERTER_SERVICE_URL}/convert/{job_id}"
            )
            if conv_response.status_code != 200:
                raise HTTPException(
                    status_code=conv_response.status_code, detail="변환 상태 조회 실패"
                )

            conv_data = conv_response.json()
            converted_file_path = conv_data.get("output_file")

            # 파일 경로를 api_gateway의 마운트된 경로로 변환
            converted_file_path = converted_file_path.replace(
                "/app/audio_outputs", settings.AUDIO_OUTPUT_DIR
            )
            logger.info(f"변환된 파일 경로: {converted_file_path}")

            if not os.path.exists(converted_file_path):
                logger.error(f"파일이 존재하지 않음: {converted_file_path}")
                raise FileNotFoundError(
                    f"변환된 파일을 찾을 수 없습니다: {converted_file_path}"
                )

            # Transcription 서비스로 요청 전송
            # job_id를 쿼리 파라미터로 전달
            trans_response = await client.post(
                f"{settings.TRANSCRIPTION_SERVICE_URL}/transcribe",
                params={"job_id": job_id},  # job_id를 쿼리 파라미터로 추가
            )

            trans_response.raise_for_status()
            transcription_job = trans_response.json()

            # 작업 상태 업데이트
            job_status["stages"]["conversion"]["status"] = "completed"
            job_status["stages"]["transcription"]["job_id"] = transcription_job[
                "job_id"
            ]
            job_status["stages"]["transcription"]["status"] = "processing"
            job_status["updated_at"] = datetime.now(UTC).isoformat()

            redis_client.set(f"job:{job_id}", json.dumps(job_status))

        return {"status": "success"}

    except FileNotFoundError as e:
        logger.error(f"변환된 파일을 찾을 수 없음: {str(e)}")
        raise HTTPException(status_code=404, detail=str(e))

    except httpx.HTTPStatusError as e:
        logger.error(f"Transcription 서비스 오류 응답: {str(e)}")
        raise HTTPException(
            status_code=e.response.status_code, detail="텍스트 변환 요청 실패"
        )

    except Exception as e:
        logger.error(f"변환 웹훅 처리 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/transcription/{job_id}")
async def transcription_webhook(job_id: str):
    try:
        logger.info(f"텍스트 변환 완료 웹훅 수신: {job_id}")

        # Redis에서 작업 상태 조회
        job_status_str = redis_client.get(f"job:{job_id}")
        if not job_status_str:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

        job_status = json.loads(job_status_str)

        # 텍스트 변환 결과 조회
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.TRANSCRIPTION_SERVICE_URL}/transcript/{job_id}"
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail="텍스트 변환 결과 조회 실패",
                )

            transcript_data = response.json()

            # 텍스트 파일 경로 변환
            if "output_file" in transcript_data:
                transcript_data["output_file"] = transcript_data["output_file"].replace(
                    "/app/text_outputs", settings.TEXT_OUTPUT_DIR
                )

            # 요약 작업 시작
            summarize_response = await client.post(
                f"{settings.SUMMARIZATION_SERVICE_URL}/summarize/{job_id}",
                json={"text": transcript_data["text"]},
            )

            if summarize_response.status_code != 200:
                raise HTTPException(
                    status_code=summarize_response.status_code, detail="요약 요청 실패"
                )

            summarization_job = summarize_response.json()

            # 작업 상태 업데이트
            job_status["stages"]["transcription"]["status"] = "completed"
            job_status["stages"]["summarization"]["job_id"] = summarization_job[
                "job_id"
            ]
            job_status["stages"]["summarization"]["status"] = "processing"
            job_status["updated_at"] = datetime.now(UTC).isoformat()

            redis_client.set(f"job:{job_id}", json.dumps(job_status))

        return {"status": "success"}

    except Exception as e:
        logger.error(f"텍스트 변환 웹훅 처리 중 오류 발생: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/webhook/summarization/{job_id}")
async def summarization_webhook(job_id: str):
    try:
        logger.info(f"요약 완료 웹훅 수신: {job_id}")

        # Redis에서 작업 상태 조회
        job_status = redis_client.get(f"job:{job_id}")
        if not job_status:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

        job_status = json.loads(job_status)

        # 작업 상태 업데이트
        job_status["stages"]["summarization"]["status"] = "completed"
        job_status["status"] = "completed"
        # datetime 객체를 ISO 형식 문자열로 변환
        job_status["updated_at"] = datetime.now(UTC).isoformat()

        redis_client.set(f"job:{job_id}", json.dumps(job_status))

        return {"status": "success"}

    except Exception as e:
        logger.error(f"요약 웹훅 처리 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 프론트엔드를 위한 엔드포인트
@app.get("/extractions")
async def get_extractions():
    """프론트엔드를 위한 추출 데이터 조회 엔드포인트"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{SUMMARIZATION_SERVICE_URL}/extractions")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))


@app.put("/extractions/{job_id}")
async def update_extraction(job_id: str, extraction: dict):
    try:
        # 작업 데이터베이스 연결
        client = MongoClient(settings.WORK_MONGODB_URI)
        work_db = client[settings.WORK_MONGODB_DB]

        # 데이터 업데이트
        result = work_db.jobs.update_one(
            {"job_id": job_id}, {"$set": {"summarization.extraction": extraction}}
        )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")

        return {"status": "success", "message": "데이터가 업데이트되었습니다"}

    except Exception as e:
        logger.error(f"데이터 업데이트 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        client.close()


@app.get("/job/{job_id}")
async def get_job_status(job_id: str):
    try:
        # 작업 데이터베이스 연결
        client = MongoClient(settings.WORK_MONGODB_URI)
        work_db = client[settings.WORK_MONGODB_DB]

        # 각 컬렉션에서 job_id로 조회
        conversion = work_db.audio_conversions.find_one({"job_id": job_id}, {"_id": 0})
        transcription = work_db.transcriptions.find_one({"job_id": job_id}, {"_id": 0})
        summary = work_db.summaries.find_one({"job_id": job_id}, {"_id": 0})

        # 결과 조합
        result = {
            "job_id": job_id,
            "conversion": conversion,
            "transcription": transcription,
            "summary": summary,
        }

        return result

    except Exception as e:
        logger.error(f"작업 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        client.close()
