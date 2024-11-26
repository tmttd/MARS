from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Summarization Service"

    # MongoDB 설정
    MONGODB_URI: str = "mongodb://localhost:27017/"
    MONGODB_DB: str = "transcription_db"
    
    # 디렉토리 설정
    UPLOAD_DIR: str = "/app/text_outputs"
    OUTPUT_DIR: str = "/app/summary_outputs"
    
    # API Gateway URL
    API_GATEWAY_URL: str = "http://api_gateway:8000"

    class Config:
        env_file = ".env"

settings = Settings()