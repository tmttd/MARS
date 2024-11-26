from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Redis 설정
    REDIS_URL: str = "redis://redis:6379/0"
    
    # 마이크로서비스 URL 설정
    CONVERTER_SERVICE_URL: str = "http://converter:8000"
    TRANSCRIPTION_SERVICE_URL: str = "http://transcription:8000"
    SUMMARIZATION_SERVICE_URL: str = "http://summarization:8000"
    
    # API 설정
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Audio Processing API Gateway"

    class Config:
        case_sensitive = True
        env_file = ".env"