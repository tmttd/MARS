from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # Redis 설정
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # 마이크로서비스 URL 설정
    CONVERTER_SERVICE_URL: str = os.getenv(
        "CONVERTER_SERVICE_URL", "http://converter:8000"
    )
    TRANSCRIPTION_SERVICE_URL: str = os.getenv(
        "TRANSCRIPTION_SERVICE_URL", "http://transcription:8000"
    )
    SUMMARIZATION_SERVICE_URL: str = os.getenv(
        "SUMMARIZATION_SERVICE_URL", "http://summarization:8000"
    )
    DATABASE_SERVICE_URL: str = os.getenv(
        "DATABASE_SERVICE_URL", "http://database:8000"
    )
    AUTH_SERVICE_URL: str = os.getenv(
        "AUTH_SERVICE_URL", "http://auth:8000"
    )
    
    S3_SERVICE_URL: str = "http://s3_service:8000"    

    # 출력 디렉토리 경로 설정
    AUDIO_OUTPUT_DIR: str = "/app/audio_outputs"

    # API 설정
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "API Gateway"

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
