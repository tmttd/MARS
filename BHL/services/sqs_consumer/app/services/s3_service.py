import boto3
import os
import tempfile
from ..config import Config
from urllib.parse import unquote
from typing import Optional

class S3Service:
    def __init__(self):
        self.session = boto3.Session(region_name=Config.AWS_REGION)
        self.s3 = self.session.client('s3')

    def download_file(self, bucket: str, key: str) -> Optional[str]:
        """S3에서 파일을 임시 디렉토리에 다운로드"""
        try:
            # URL 디코딩
            decoded_key = unquote(key)
            
            # 임시 파일 경로 생성
            temp_file = f"/tmp/{os.path.basename(decoded_key)}"
            
            # 파일 다운로드
            self.s3.download_file(bucket, decoded_key, temp_file)
            return temp_file
        except Exception as e:
            print(f"Error downloading file from S3: {e}")
            return None