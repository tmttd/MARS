import boto3
import os
import tempfile
from ..config import Config

class S3Service:
    def __init__(self):
        self.session = boto3.Session(region_name=Config.AWS_REGION)
        self.s3 = self.session.client('s3')

    def download_file(self, bucket: str, key: str) -> str:
        """S3에서 파일을 임시 디렉토리에 다운로드"""
        try:
            # 파일 확장자 추출
            _, ext = os.path.splitext(key)
            # 임시 파일 생성
            temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
            
            # S3에서 파일 다운로드
            self.s3.download_file(bucket, key, temp_file.name)
            print(f"Downloaded file from s3://{bucket}/{key} to {temp_file.name}")
            
            return temp_file.name
        except Exception as e:
            print(f"Error downloading file from S3: {e}")
            return None 