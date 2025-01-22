import os
import requests
from typing import Optional
from ..config import Config

class APIService:
    def __init__(self):
        self.api_endpoint = Config.API_ENDPOINT

    def process_file(self, file_path: str, user_name: str, original_filename: str) -> bool:
        """파일을 API로 전송하여 처리"""
        try:
            
            print(f"[DEBUG] original_filename: {original_filename}")
            print(f"[DEBUG] Attempting to call API at: {self.api_endpoint}")
            with open(file_path, 'rb') as file:
                files = {'file': (original_filename, file)}
                data = {
                    'user_name': user_name
                }
                response = requests.post(
                    self.api_endpoint,
                    files=files,
                    data=data
                )
            
            print(f"[DEBUG] API Response Headers: {response.headers}")
            print(f"[DEBUG] API Response Content: {response.content}")
            
            if response.status_code == 200:
                print(f"Successfully processed file: {original_filename}")
                return True
            else:
                print(f"Failed to process file {original_filename}. Status code: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except Exception as e:
            print(f"Error processing file through API: {e}")
            return False

    def cleanup_temp_file(self, file_path: str) -> None:
        """임시 파일 정리"""
        try:
            os.unlink(file_path)
        except Exception as e:
            print(f"Error deleting temporary file: {e}") 