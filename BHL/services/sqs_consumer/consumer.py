import boto3
import json
import requests
import os
import tempfile
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

# AWS 클라이언트 초기화 - EC2 IAM 역할 사용
session = boto3.Session(region_name=os.getenv('AWS_REGION', 'ap-northeast-2'))
sqs = session.client('sqs')
s3 = session.client('s3')

def download_from_s3(bucket, key):
    """S3에서 파일을 임시 디렉토리에 다운로드"""
    try:
        # 파일 확장자 추출
        _, ext = os.path.splitext(key)
        # 임시 파일 생성
        temp_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        
        # S3에서 파일 다운로드
        s3.download_file(bucket, key, temp_file.name)
        print(f"Downloaded file from s3://{bucket}/{key} to {temp_file.name}")
        
        return temp_file.name
    except Exception as e:
        print(f"Error downloading file from S3: {e}")
        return None

def process_queue():
    queue_url = os.getenv('SQS_QUEUE_URL')
    api_endpoint = os.getenv('API_ENDPOINT')
    
    print("Starting SQS consumer service...")
    
    while True:
        try:
            # SQS에서 메시지 수신
            response = sqs.receive_message(
                QueueUrl=queue_url,
                MaxNumberOfMessages=1,
                WaitTimeSeconds=20
            )
            
            # 메시지가 있다면 처리
            if 'Messages' in response:
                for message in response['Messages']:
                    print(f"Processing message: {message['MessageId']}")
                    
                    try:
                        # 메시지 바디를 파싱 (직접 S3 이벤트 형식)
                        body = json.loads(message['Body'])
                        
                        for record in body['Records']:
                            # S3 이벤트인지 확인
                            if record.get('eventSource') == 'aws:s3' and record.get('eventName', '').startswith('ObjectCreated:'):
                                bucket = record['s3']['bucket']['name']
                                key = record['s3']['object']['key']
                                
                                print(f"Processing S3 event - Bucket: {bucket}, Key: {key}")
                                
                                # S3에서 파일 다운로드
                                temp_file_path = download_from_s3(bucket, key)
                                if temp_file_path:
                                    try:
                                        # multipart/form-data 형식으로 파일 전송
                                        with open(temp_file_path, 'rb') as file:
                                            files = {'file': (os.path.basename(key), file)}
                                            api_response = requests.post(
                                                api_endpoint,
                                                files=files
                                            )
                                        
                                        if api_response.status_code == 200:
                                            print(f"Successfully processed file: {key}")
                                            # 성공적으로 처리됐다면 메시지 삭제
                                            sqs.delete_message(
                                                QueueUrl=queue_url,
                                                ReceiptHandle=message['ReceiptHandle']
                                            )
                                        else:
                                            print(f"Failed to process file {key}. Status code: {api_response.status_code}")
                                            print(f"Response: {api_response.text}")
                                    finally:
                                        # 임시 파일 삭제
                                        try:
                                            os.unlink(temp_file_path)
                                        except Exception as e:
                                            print(f"Error deleting temporary file: {e}")
                                else:
                                    print(f"Failed to download file from S3: {bucket}/{key}")
                            else:
                                print(f"Skipping non-S3 creation event: {record.get('eventSource')} - {record.get('eventName')}")
                    except Exception as e:
                        print(f"Error processing message: {e}")
        except Exception as e:
            print(f"Error in main loop: {e}")

if __name__ == "__main__":
    process_queue() 