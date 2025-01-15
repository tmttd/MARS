import os
import signal
import time
import sys
from typing import Optional
from .config import Config
from .services.s3_service import S3Service
from .services.sqs_service import SQSService
from .services.api_service import APIService

class GracefulKiller:
    kill_now = False
    
    def __init__(self):
        signal.signal(signal.SIGINT, self.exit_gracefully)
        signal.signal(signal.SIGTERM, self.exit_gracefully)
    
    def exit_gracefully(self, *args):
        self.kill_now = True
        print("\nReceived shutdown signal. Finishing current tasks...")

class ConsumerService:
    def __init__(self):
        print("[DEBUG] Initializing ConsumerService...")
        self.s3_service = S3Service()
        self.sqs_service = SQSService()
        self.api_service = APIService()
        self.killer = GracefulKiller()
        
        self.last_successful_process_time = time.time()
        self.max_idle_time = 600
        print("[DEBUG] ConsumerService initialization completed")
    
    def process_message(self, message) -> bool:
        """단일 메시지 처리"""
        try:
            print(f"[DEBUG] Starting to process message: {message['MessageId']}")
            
            event_data = self.sqs_service.parse_s3_event(message)
            if not event_data:
                print("[DEBUG] Message skipped: Not an S3 creation event")
                return True
            
            bucket = event_data['bucket']
            key = event_data['key']
            print(f"[DEBUG] Parsed S3 event - Bucket: {bucket}, Key: {key}")
            
            print("[DEBUG] Extending message visibility timeout...")
            self.sqs_service.change_message_visibility(message['ReceiptHandle'], 300)
            
            print("[DEBUG] Downloading file from S3...")
            temp_file_path = self.s3_service.download_file(bucket, key)
            if not temp_file_path:
                print("[DEBUG] Failed to download file from S3")
                return False
            
            try:
                print("[DEBUG] Processing file through API...")
                success = self.api_service.process_file(temp_file_path, os.path.basename(key))
                if success:
                    print("[DEBUG] API processing successful, deleting message...")
                    self.sqs_service.delete_message(message['ReceiptHandle'])
                    self.last_successful_process_time = time.time()
                else:
                    print("[DEBUG] API processing failed")
                return success
            finally:
                print("[DEBUG] Cleaning up temporary file...")
                self.api_service.cleanup_temp_file(temp_file_path)
                
        except Exception as e:
            print(f"[DEBUG] Error in process_message: {str(e)}")
            return False
    
    def check_health(self) -> bool:
        """서비스 헬스 체크"""
        idle_time = time.time() - self.last_successful_process_time
        return idle_time < self.max_idle_time
    
    def run(self):
        """메인 실행 로직"""
        print("[DEBUG] Starting SQS consumer service main loop...")
        
        while not self.killer.kill_now:
            try:
                time.sleep(10)
                print("[DEBUG] Waiting for messages...")
                messages = self.sqs_service.receive_messages(max_messages=10)
                print(f"[DEBUG] Received {len(messages)} messages")
                
                for message in messages:
                    if self.killer.kill_now:
                        print("[DEBUG] Shutdown signal received during message processing")
                        break
                    self.process_message(message)
                
            except Exception as e:
                print(f"[DEBUG] Error in main loop: {str(e)}")
                time.sleep(1)
        
        print("[DEBUG] Graceful shutdown initiated...")

def run():
    # 환경 변수 검증
    Config.validate()
    
    # 서비스 시작
    consumer = ConsumerService()
    consumer.run()
    # print("Hello World")
if __name__ == "__main__":
    run() 