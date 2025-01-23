from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # MongoDB 설정
    MONGODB_URI: str = os.getenv("MONGODB_URI")
    MONGODB_DB: str = "transcription_db"
    WORK_MONGODB_DB: str = "mars_work_db"
    
    # 디렉토리 설정
    UPLOAD_DIR: str = "/app/audio_outputs"
    OUTPUT_DIR: str = "/app/text_outputs"
    
    # API 설정
    PROJECT_NAME: str = "Audio Transcription Service"
    
    # API Gateway URL
    API_GATEWAY_URL: str = "http://api_gateway:8000"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()  # Settings 인스턴스 생성