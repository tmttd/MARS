from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # MongoDB 설정
    MONGODB_URI: str = "mongodb://localhost:27017/"
    MONGODB_DB: str = "converter_db"
    
    # 작업 데이터베이스 설정
    WORK_MONGODB_URI: str = "mongodb://localhost:27017/"
    WORK_MONGODB_DB: str = "mars_work_db"
    
    # 디렉토리 설정
    UPLOAD_DIR: str = "/app/uploads"
    OUTPUT_DIR: str = "/app/audio_outputs"
    
    # API 설정
    PROJECT_NAME: str = "Audio Converter Service"
    API_GATEWAY_URL: str = "http://api_gateway:8000"
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()