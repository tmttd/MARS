import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

class Config:
    AWS_REGION = os.getenv('AWS_REGION', 'ap-northeast-2')
    SQS_QUEUE_URL = os.getenv('SQS_QUEUE_URL')
    AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY')
    API_ENDPOINT = os.getenv('API_ENDPOINT', 'http://localhost:8000/Total_Processing')

    @classmethod
    def validate(cls):
        """필수 환경 변수 검증"""
        required_vars = ['SQS_QUEUE_URL', 'API_ENDPOINT']
        missing_vars = [var for var in required_vars if not getattr(cls, var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables: {', '.join(missing_vars)}") 