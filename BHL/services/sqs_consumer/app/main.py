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
        self.s3_service = S3Service()
        self.sqs_service = SQSService()
        self.api_service = APIService()
        self.killer = GracefulKiller()
        
        # 헬스체크 상태
        self.last_successful_process_time = time.time()
        self.max_idle_time = 600  # 10분
        
    def process_message(self, message) -> bool:
        """단일 메시지 처리"""
        try:
            print(f"Processing message: {message['MessageId']}")
            
            # S3 이벤트 파싱
            event_data = self.sqs_service.parse_s3_event(message)
            if not event_data:
                print("Skipping non-S3 creation event")
                return True  # 메시지는 성공적으로 처리된 것으로 간주
            
            bucket = event_data['bucket']
            key = event_data['key']
            print(f"Processing S3 event - Bucket: {bucket}, Key: {key}")
            
            # 메시지 처리 시간이 길어질 것 같으면 가시성 타임아웃 연장
            self.sqs_service.change_message_visibility(message['ReceiptHandle'], 300)  # 5분으로 연장
            
            # S3에서 파일 다운로드
            temp_file_path = self.s3_service.download_file(bucket, key)
            if not temp_file_path:
                return False
            
            try:
                # API로 파일 처리
                success = self.api_service.process_file(temp_file_path, os.path.basename(key))
                if success:
                    self.sqs_service.delete_message(message['ReceiptHandle'])
                    self.last_successful_process_time = time.time()
                return success
            finally:
                # 임시 파일 정리
                self.api_service.cleanup_temp_file(temp_file_path)
                
        except Exception as e:
            print(f"Error processing message: {e}")
            return False
    
    def check_health(self) -> bool:
        """서비스 헬스 체크"""
        idle_time = time.time() - self.last_successful_process_time
        return idle_time < self.max_idle_time
    
    def run(self):
        """메인 실행 로직"""
        print("Starting SQS consumer service...")
        
        while not self.killer.kill_now:
            try:
                # Long Polling으로 메시지 수신 (최대 20초 대기)
                messages = self.sqs_service.receive_messages(max_messages=10)
                
                # 배치 처리
                for message in messages:
                    if self.killer.kill_now:
                        print("Shutdown signal received, stopping message processing")
                        break
                    self.process_message(message)
                
            except Exception as e:
                print(f"Error in main loop: {e}")
                time.sleep(1)  # 최소한의 대기 시간
        
        print("Shutting down gracefully...")

def run():
    # 환경 변수 검증
    Config.validate()
    
    # 서비스 시작
    consumer = ConsumerService()
    consumer.run()

if __name__ == "__main__":
    run() 