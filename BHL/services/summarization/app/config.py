from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Summarization Service"

    # MongoDB 설정
    MONGODB_URI: str = "mongodb://localhost:27017/"
    MONGODB_DB: str = "summarization_db"
    
    # 작업 데이터베이스 설정
    WORK_MONGODB_URI: str = "mongodb://localhost:27017/"
    WORK_MONGODB_DB: str = "mars_work_db"
    
    # 디렉토리 설정
    UPLOAD_DIR: str = "/app/text_outputs"
    OUTPUT_DIR: str = "/app/summary_outputs"
    
    # API Gateway URL
    API_GATEWAY_URL: str = "http://api_gateway:8000"

    class Config:
        env_file = ".env"

settings = Settings()