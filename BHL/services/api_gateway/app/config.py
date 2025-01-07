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

    # 출력 디렉토리 경로 설정
    AUDIO_OUTPUT_DIR: str = "/app/audio_outputs"
    TEXT_OUTPUT_DIR: str = "/app/text_outputs"
    SUMMARY_OUTPUT_DIR: str = "/app/summary_outputs"

    # API 설정
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Audio Processing API Gateway"

    PROJECT_NAME: str = "API Gateway"
    MONGODB_URI: str = "mongodb://mongodb:27017/"
    MONGODB_DB: str = "api_gateway_db"
    WORK_MONGODB_URI: str = "mongodb://work-db:27017/"  # 추가
    WORK_MONGODB_DB: str = "mars_work_db"  # 추가
    CONVERTER_SERVICE_URL: str = "http://converter:8000"
    TRANSCRIPTION_SERVICE_URL: str = "http://transcription:8000"
    SUMMARIZATION_SERVICE_URL: str = "http://summarization:8000"
    S3_SERVICE_URL: str = "http://s3_service:8000"
    CALL_DB_URI: str = os.getenv("CALL_DB_URI", "mongodb://call-db:27017")
    CALL_DB_NAME: str = os.getenv("CALL_DB_NAME", "call_data_db")

    class Config:
        case_sensitive = True
        env_file = ".env"


settings = Settings()
