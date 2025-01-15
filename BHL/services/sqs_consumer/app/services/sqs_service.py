import boto3
import json
from typing import Optional, Dict, Any, List
from ..config import Config
from urllib.parse import unquote

class SQSService:
    def __init__(self):
        self.session = boto3.Session(
            region_name=Config.AWS_REGION,
            aws_access_key_id=Config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=Config.AWS_SECRET_ACCESS_KEY
        )
        self.sqs = self.session.client('sqs')
        self.queue_url = Config.SQS_QUEUE_URL
        
        # 큐 속성 설정 - ReceiveMessageWaitTimeSeconds를 20초로 설정
        try:
            self.sqs.set_queue_attributes(
                QueueUrl=self.queue_url,
                Attributes={
                    'ReceiveMessageWaitTimeSeconds': '20'  # Long Polling 설정
                }
            )
        except Exception as e:
            print(f"Warning: Could not set queue attributes: {e}")

    def receive_messages(self, max_messages: int = 10) -> List[Dict[str, Any]]:
        """SQS에서 여러 메시지를 수신
        Long Polling을 사용하여 최대 20초 동안 메시지가 있을 때까지 대기
        """
        try:
            response = self.sqs.receive_message(
                QueueUrl=self.queue_url,
                MaxNumberOfMessages=max_messages,
                AttributeNames=['All'],
                MessageAttributeNames=['All'],
                VisibilityTimeout=30,  # 메시지 처리 타임아웃 30초
                WaitTimeSeconds=20  # Long Polling
            )
            
            messages = response.get('Messages', [])
            if messages:
                print(f"Received {len(messages)} messages")
            return messages
            
        except Exception as e:
            print(f"Error receiving messages from SQS: {e}")
            return []

    def delete_message(self, receipt_handle: str) -> bool:
        """처리 완료된 메시지 삭제"""
        try:
            self.sqs.delete_message(
                QueueUrl=self.queue_url,
                ReceiptHandle=receipt_handle
            )
            return True
        except Exception as e:
            print(f"Error deleting message from SQS: {e}")
            return False

    def change_message_visibility(self, receipt_handle: str, visibility_timeout: int) -> bool:
        """메시지 가시성 타임아웃 변경"""
        try:
            self.sqs.change_message_visibility(
                QueueUrl=self.queue_url,
                ReceiptHandle=receipt_handle,
                VisibilityTimeout=visibility_timeout
            )
            return True
        except Exception as e:
            print(f"Error changing message visibility: {e}")
            return False

    def parse_s3_event(self, message: Dict[str, Any]) -> Optional[Dict[str, str]]:
        """S3 이벤트 메시지 파싱"""
        try:
            body = json.loads(message['Body'])
            
            for record in body['Records']:
                if (record.get('eventSource') == 'aws:s3' and 
                    record.get('eventName', '').startswith('ObjectCreated:')):
                    return {
                        'bucket': record['s3']['bucket']['name'],
                        'key': unquote(record['s3']['object']['key'])
                    }
            return None
        except Exception as e:
            print(f"Error parsing S3 event: {e}")
            return None 