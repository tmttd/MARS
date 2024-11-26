from fastapi import FastAPI, UploadFile, File, HTTPException
from redis import Redis
from datetime import datetime, UTC
import httpx
import uuid
import json
import logging
from .config import Settings
from .models import ProcessingJob, StageStatus

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 환경 변수 설정
settings = Settings()

app = FastAPI(title="Audio Processing API Gateway")

# Redis 연결
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

@app.post("/process")
async def process_audio(file: UploadFile = File(...)):
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
                "summarization": StageStatus(status="pending")
            }
        )
        
        # Redis에 저장 시 모델의 json() 메서드 사용
        redis_client.set(f"job:{job_id}", job_status.model_dump_json())
        
        # 오디오 변환 서비스로 파일 전송
        async with httpx.AsyncClient() as client:
            files = {"file": (file.filename, file.file, file.content_type)}
            response = await client.post(
                f"{settings.CONVERTER_SERVICE_URL}/convert",
                files=files
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="오디오 변환 요청 실패")
            
            conversion_job = response.json()
            
            # 변환 작업 ID 저장
            job_status.stages.conversion.job_id = conversion_job["job_id"]
            job_status.updated_at = datetime.now(UTC)
            redis_client.set(f"job:{job_id}", job_status.model_dump_json())
        
        return {"job_id": job_id, "status": "processing"}
        
    except Exception as e:
        logger.error(f"처리 중 오류 발생: {str(e)}")
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
        job_status = redis_client.get(f"job:{job_id}")
        if not job_status:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
        
        job_status = json.loads(job_status)
            
        # 변환된 파일로 transcription 시작
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.TRANSCRIPTION_SERVICE_URL}/transcribe",
                json={"job_id": job_id}
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="텍스트 변환 요청 실패")
                
            transcription_job = response.json()
            
            # 작업 상태 업데이트
            job_status["stages"]["conversion"]["status"] = "completed"
            job_status["stages"]["transcription"]["job_id"] = transcription_job["job_id"]
            job_status["stages"]["transcription"]["status"] = "processing"
            job_status["updated_at"] = datetime.now(UTC)
            
            redis_client.set(f"job:{job_id}", json.dumps(job_status))
            
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"변환 웹훅 처리 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/webhook/transcription/{job_id}")
async def transcription_webhook(job_id: str):
    try:
        logger.info(f"텍스트 변환 완료 웹훅 수신: {job_id}")
        
        # Redis에서 작업 상태 조회
        job_status = redis_client.get(f"job:{job_id}")
        if not job_status:
            raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다")
            
        job_status = json.loads(job_status)
        
        # 텍스트 변환 결과 조회
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.TRANSCRIPTION_SERVICE_URL}/transcript/{job_id}"
            )
            
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="텍스트 변환 결과 조회 실패")
                
            transcript_data = response.json()
            
            # 요약 작업 시작
            summarize_response = await client.post(
                f"{settings.SUMMARIZATION_SERVICE_URL}/summarize",
                json={"text": transcript_data["text"]}
            )
            
            if summarize_response.status_code != 200:
                raise HTTPException(status_code=summarize_response.status_code, detail="요약 요청 실패")
                
            summarization_job = summarize_response.json()
            
            # 작업 상태 업데이트
            job_status["stages"]["transcription"]["status"] = "completed"
            job_status["stages"]["summarization"]["job_id"] = summarization_job["job_id"]
            job_status["stages"]["summarization"]["status"] = "processing"
            job_status["updated_at"] = datetime.now(UTC)
            
            redis_client.set(f"job:{job_id}", json.dumps(job_status))
            
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"텍스트 변환 웹훅 처리 중 오류 발생: {str(e)}")
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
        job_status["updated_at"] = datetime.now(UTC)
        
        redis_client.set(f"job:{job_id}", json.dumps(job_status))
        
        return {"status": "success"}
        
    except Exception as e:
        logger.error(f"요약 웹훅 처리 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))