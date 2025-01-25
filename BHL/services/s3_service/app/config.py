from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # AWS S3 설정
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-northeast-2")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "mars-audio-bucket")
    
    # URL 만료 시간 (초)
    PRESIGNED_URL_EXPIRATION: int = 3600  # 1시간

    class Config:
        env_file = ".env" 