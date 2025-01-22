from fastapi import FastAPI, HTTPException, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import boto3
from botocore.config import Config
import logging
from typing import List, Dict, Optional
from .config import Settings
from .models import AudioFile, AudioFileList, AudioStreamResponse, UploadUrlRequest, UploadUrlResponse
from datetime import datetime, UTC
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse
from urllib.parse import unquote, quote
import base64
import os

# Error Codes
class ErrorCodes:
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    S3_ERROR = "S3_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"

# Error Response Model
class ErrorResponse(BaseModel):
    status: int
    message: str
    details: Optional[Dict] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

# Health Response Models
class ServiceHealth(BaseModel):
    status: str
    latency: Optional[float] = None
    error: Optional[str] = None

class HealthCheckResponse(BaseModel):
    status: str
    services: Dict[str, ServiceHealth]
    timestamp: str = Field(default_factory=lambda: datetime.now(UTC).isoformat())

logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = Settings()

logger.debug(f"S3 설정: region={settings.AWS_REGION}, bucket={settings.S3_BUCKET_NAME}")
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
    config=Config(signature_version='s3v4')
)

app = FastAPI(title="S3 Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    error_response = ErrorResponse(
        status=exc.status_code,
        message=str(exc.detail)
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.dict()
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    error_response = ErrorResponse(
        status=500,
        message="내부 서버 오류가 발생했습니다"
    )
    return JSONResponse(
        status_code=500,
        content=error_response.dict()
    )

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    health_status = {
        "status": "healthy",
        "services": {},
        "timestamp": datetime.now(UTC).isoformat()
    }
    
    # S3 상태 확인
    try:
        start_time = datetime.now()
        s3_client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        latency = (datetime.now() - start_time).total_seconds()
        
        health_status["services"]["s3"] = ServiceHealth(
            status="up",
            latency=latency
        )
    except Exception as e:
        health_status["services"]["s3"] = ServiceHealth(
            status="down",
            error=str(e)
        )
        health_status["status"] = "degraded"
    
    return HealthCheckResponse(**health_status)

@app.get("/audio/stream/{name}", response_model=AudioStreamResponse)
async def get_audio_stream(name: str, user_name: str = None):
    try:
        logger.info(f"오디오 스트림 요청: {name}")
        key = user_name + "/" + name
        
        try:
            # 파일 존재 여부 확인
            try:
                s3_client.head_object(
                    Bucket=settings.S3_BUCKET_NAME,
                    Key=key
                )
            except Exception as e:
                logger.error(f"S3에서 오디오 파일을 찾을 수 없음: {name}")
                raise HTTPException(
                    status_code=404,
                    detail="음성 파일을 찾을 수 없습니다"
                )
            
            # 파일 확장자에 따른 content-type 설정
            content_type = 'audio/x-m4a' if name.endswith('.m4a') else 'audio/wav'
            
            url = s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': settings.S3_BUCKET_NAME,
                    'Key': key,
                    'ResponseContentType': content_type,
                    'ResponseContentDisposition': 'inline'
                },
                ExpiresIn=settings.PRESIGNED_URL_EXPIRATION
            )
            
            return AudioStreamResponse(
                url=url,
                expires_in=settings.PRESIGNED_URL_EXPIRATION,
                content_type=content_type
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"S3 작업 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="스트리밍 URL 생성에 실패했습니다"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"음성 파일 스트리밍 처리 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="예기치 않은 오류가 발생했습니다"
        ) 

@app.post("/audio/upload/", response_model=UploadUrlResponse)
async def upload_audio(request: UploadUrlRequest):
    try:
        logger.info(f"Upload URL 요청: filename={request.filename}")
        
        try:
            # presigned URL 생성
            presigned_url = s3_client.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': settings.S3_BUCKET_NAME,
                    'Key': request.filename,
                    'ContentType': request.content_type
                },
                ExpiresIn=settings.PRESIGNED_URL_EXPIRATION
            )
            
            return UploadUrlResponse(
                upload_url=presigned_url,
                expires_in=settings.PRESIGNED_URL_EXPIRATION
            )
            
        except Exception as e:
            logger.error(f"Presigned URL 생성 중 오류 발생: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail="업로드 URL 생성에 실패했습니다"
            )
            
    except Exception as e:
        logger.error(f"Upload URL 요청 처리 중 오류 발생: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="예기치 않은 오류가 발생했습니다"
        )
