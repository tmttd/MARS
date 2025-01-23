from pydantic_settings import BaseSettings
from typing import Optional
import os

class Settings(BaseSettings):
    # MongoDB 설정
    MONGODB_URL: str = "mongodb://work-db:27017"
    DB_NAME: str = "mars_work_db"
    
    # JWT 설정
    JWT_SECRET_KEY: str = os.getenv("AUTH_SECRET_KEY", "your-super-secret-key-change-this-in-production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("AUTH_TOKEN_EXPIRE_MINUTES", "1440"))
    
    # CORS 설정
    CORS_ORIGINS: list = ["http://localhost:3000"]  # 실제 운영 환경에서는 특정 도메인으로 제한
    
    class Config:
        env_file = "../../.env"  # 상위 디렉토리의 .env 파일 참조

settings = Settings() 