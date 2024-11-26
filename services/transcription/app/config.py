from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    API_GATEWAY_URL: str = "http://api-gateway:8000"