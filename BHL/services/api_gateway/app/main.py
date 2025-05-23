from fastapi import FastAPI, UploadFile, File, HTTPException, Response, Query, Request, Body, Depends, Form
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from redis import Redis
from datetime import datetime, UTC
import httpx
import uuid
import json
import logging
import os
from .config import Settings
from .models import ProcessingJob, StageStatus, UploadRequest, RegisterRequest, LoginRequest
from .middleware import auth_middleware  # 미들웨어 임포트
from typing import List, Optional

# 로깅 설정
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 환경 변수 설정
settings = Settings()

app = FastAPI(title="Audio Processing API Gateway")

# 환경 변수 설정
DATABASE_SERVICE_URL = os.getenv("DATABASE_SERVICE_URL", "http://database:8000")

# 인증 미들웨어 등록
app.middleware("http")(auth_middleware)

# CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://43.203.64.254:3000", # 퍼블릭 IP 중 프론트엔드 포트 3000
                   "http://43.203.64.254", # 퍼블릭 IP
                   "http://ec2-43-203-64-254.ap-northeast-2.compute.amazonaws.com:3000", # 퍼블릭 DNS
                   "http://www.budongsan.solutions", # 배포 도메인
                   "http://localhost:3000"],  # 로컬 테스트용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Redis 연결
redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

# Auth 관련 설정
security = HTTPBearer()

@app.post("/Total_Processing")
async def Total_Processing(file: UploadFile = File(...), user_name: str = Form(...)):
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
            response = await client.post(
                f"{settings.CONVERTER_SERVICE_URL}/convert", files=files, params={"job_id": job_id, "user_name": user_name}
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, detail="오디오 변환 요청 실패"
                )

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

# 공통 헤더 전달을 위한 유틸리티 함수
async def proxy_request(method: str, url: str, **kwargs):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.request(method, url, **kwargs)
            return Response(content=response.content, status_code=response.status_code, headers=dict(response.headers))
        except httpx.RequestError as exc:
            logger.error(f"Request error: {exc}")
            raise HTTPException(status_code=500, detail="Internal server error") from exc

# ### Calls 엔드포인트 ###

# ### 통화 기록 조회(전체 조회, 필터링 조회 가능) 엔드포인트 ###

@app.get("/calls/", response_model=dict)
async def list_calls(
    request: Request,
    limit: Optional[int] = Query(10),
    offset: Optional[int] = Query(0),
    customer_contact: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None),
    recording_date: Optional[str] = Query(None),
    before_date: Optional[str] = Query(None),
    after_date: Optional[str] = Query(None),
    exclude_property_names: Optional[List[str]] = Query(None)
):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        
        params = {
            "limit": limit,
            "offset": offset,
            "customer_contact": customer_contact,
            "customer_name": customer_name,
            "property_name": property_name,
            "recording_date": recording_date,
            "before_date": before_date,
            "after_date": after_date,
            "exclude_property_names": exclude_property_names,
            "created_by": user_name  # 사용자 정보 추가
        }
        params = {k: v for k, v in params.items() if v is not None}
        url = f"{DATABASE_SERVICE_URL}/calls/"
        return await proxy_request("GET", url, params=params)
    except Exception as e:
        logger.error(f"List Calls error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/calls/", response_model=dict)
async def create_call(request: Request):
    try:
        data = await request.json()
        # 미들웨어에서 설정된 사용자 정보 사용
        data["created_by"] = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/calls/"
        return await proxy_request("POST", url, json=data)
    except Exception as e:
        logger.error(f"Create Call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/calls/{call_id}", response_model=dict)
async def read_call(call_id: str, request: Request):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/calls/{call_id}"
        params = {"created_by": user_name}
        return await proxy_request("GET", url, params=params)
    except Exception as e:
        logger.error(f"Read Call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/calls/{call_id}", response_model=dict)
async def update_call(call_id: str, request: Request):
    try:
        data = await request.json()
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/calls/{call_id}"
        params = {"created_by": user_name}
        return await proxy_request("PUT", url, json=data, params=params)
    except Exception as e:
        logger.error(f"Update Call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/calls/{call_id}")
async def delete_call(call_id: str, request: Request):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/calls/{call_id}"
        params = {"created_by": user_name}
        return await proxy_request("DELETE", url, params=params)
    except Exception as e:
        logger.error(f"Delete Call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ### Properties 엔드포인트 ###
@app.get("/properties/", response_model=dict)
async def list_properties(
    request: Request,
    limit: Optional[int] = Query(10),
    offset: Optional[int] = Query(0),
    property_name: Optional[str] = Query(None),
    owner_contact: Optional[str] = Query(None),
    owner_name: Optional[str] = Query(None),
    detail_address: Optional[str] = Query(None),
    exclude_property_names: Optional[List[str]] = Query(None),
    status: Optional[str] = Query(None),
    ordering: Optional[str] = Query(None)
):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        
        params = {
            "limit": limit,
            "offset": offset,
            "property_name": property_name,
            "owner_contact": owner_contact,
            "owner_name": owner_name,
            "detail_address": detail_address,
            "exclude_property_names": exclude_property_names,
            "status": status,
            "ordering": ordering,
            "created_by": user_name  # 사용자 정보 추가
        }
        # None 값 필터링
        params = {k: v for k, v in params.items() if v is not None}

        url = f"{DATABASE_SERVICE_URL}/properties/"
        return await proxy_request("GET", url, params=params)
    except Exception as e:
        logger.error(f"List Properties error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/properties/", response_model=dict)
async def create_property(request: Request):
    try:
        data = await request.json()
        # 미들웨어에서 설정된 사용자 정보 사용
        data["created_by"] = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/properties/"
        return await proxy_request("POST", url, json=data)
    except Exception as e:
        logger.error(f"Create Property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/properties/{property_id}", response_model=dict)
async def read_property(property_id: str, request: Request):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/properties/{property_id}"
        params = {"created_by": user_name}
        return await proxy_request("GET", url, params=params)
    except Exception as e:
        logger.error(f"Read Property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/properties/{property_id}", response_model=dict)
async def update_property(property_id: str, request: Request):
    try:
        data = await request.json()
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/properties/{property_id}"
        params = {"created_by": user_name}
        return await proxy_request("PUT", url, json=data, params=params)
    except Exception as e:
        logger.error(f"Update Property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/properties/{property_id}")
async def delete_property(property_id: str, request: Request):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        url = f"{DATABASE_SERVICE_URL}/properties/{property_id}"
        params = {"created_by": user_name}
        return await proxy_request("DELETE", url, params=params)
    except Exception as e:
        logger.error(f"Delete Property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/audio/stream/{name}")
async def get_audio_stream(name: str, request: Request):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        # 오디오 스트림 URL 조회
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.S3_SERVICE_URL}/audio/stream/{name}", params={"user_name": user_name})
            response.raise_for_status()
            return response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"오디오 스트림 URL 조회 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="오디오 스트림 URL을 가져오는 중 오류가 발생했습니다"
        )
    
@app.post("/audio/upload/")
async def upload_file(upload_request: UploadRequest, request: Request):
    try:
        # 미들웨어에서 설정된 사용자 정보 사용
        user_name = request.state.user["username"]
        url = f"{settings.S3_SERVICE_URL}/audio/upload/"
        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                params={"user_name": user_name},
                json={
                    "filename": upload_request.filename,
                    "content_type": upload_request.content_type
                }
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        logger.error(f"파일 업로드 URL 생성 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 인증이 필요하지 않은 엔드포인트들
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/register")
async def register(request: RegisterRequest):
    try:
        # 비밀번호 확인
        if request.password != request.confirm_password:
            raise HTTPException(
                status_code=400,
                detail="비밀번호가 일치하지 않습니다"
            )
            
        # Auth 서비스로 전달할 데이터 준비
        register_data = {
            "username": request.username,
            "email": request.email,
            "password": request.password
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.AUTH_SERVICE_URL}/register",
                json=register_data,  # data 대신 json 사용
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code >= 400:
                error_detail = response.json().get("detail", "회원가입 실패")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=error_detail
                )
                
            return response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"회원가입 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다")

@app.post("/login")
async def login(request: LoginRequest):
    try:
        logger.info(f"로그인 시도: {request.username}")  # 로그 추가
        
        # form-data 형식으로 변환
        form_data = {
            "username": request.username,
            "password": request.password,
            "grant_type": "password"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.AUTH_SERVICE_URL}/token",
                data=form_data,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json"
                }
            )
            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail="아이디 또는 비밀번호가 올바르지 않습니다"
                )
            
            response.raise_for_status()
            return response.json()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"로그인 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다")

@app.get("/users/me")
async def get_current_user(request: Request):
    try:
        async with httpx.AsyncClient() as client:
            # 요청의 Authorization 헤더를 그대로 전달
            headers = {
                "Authorization": request.headers.get("Authorization"),
                "Accept": "application/json"
            }
            response = await client.get(
                f"{settings.AUTH_SERVICE_URL}/users/me",
                headers=headers
            )
            response.raise_for_status()
            return response.json()
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 정보 조회 중 오류 발생: {str(e)}")
        raise HTTPException(status_code=500, detail="사용자 정보 조회 중 오류가 발생했습니다")
