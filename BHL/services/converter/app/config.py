from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_GATEWAY_URL: str = "http://api_gateway:8000"

settings = Settings()