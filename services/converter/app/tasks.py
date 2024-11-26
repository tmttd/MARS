from celery import Celery
from datetime import datetime, UTC
from pymongo import MongoClient
from pydub import AudioSegment
import os
import logging
from httpx import AsyncClient
from .config import Settings
import asyncio

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Celery 설정
celery = Celery('converter')
celery.conf.update(
    broker_url=os.getenv('REDIS_URL', 'redis://redis:6379/0'),
    result_backend=os.getenv('REDIS_URL', 'redis://redis:6379/0'),
    broker_connection_retry_on_startup=True,
    task_track_started=True,
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_default_queue='converter',  # 추가
    task_queues={  # 추가
        'converter': {
            'exchange': 'converter',
            'routing_key': 'converter',
        }
    },
    task_default_exchange='converter',  # 추가
    task_default_routing_key='converter'  # 추가
)

@celery.task(name='convert_audio', bind=True)
def convert_audio(self, job_id: str, input_path: str, output_dir: str, db_connection_string: str):
    logger.info(f"작업 수신됨: task_id={self.request.id}, job_id={job_id}")
    logger.info(f"Redis URL: {os.getenv('REDIS_URL')}")
    logger.info(f"입력 경로: {input_path}")
    logger.info(f"출력 디렉토리: {output_dir}")
    
    try:
        logger.info(f"오디오 변환 시작: job {job_id}")
        
        # MongoDB 연결
        client = MongoClient(db_connection_string)
        db = client.converter_db
        
        # 상태 업데이트: 처리 중
        db.conversions.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "processing",
                    "updated_at": datetime.now(UTC)
                }
            }
        )
        
        # 파일 존재 확인
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"오디오 파일을 찾을 수 없습니다: {input_path}")
            
        # 출력 파일 경로 설정 (wav로 통일)
        output_filename = f"{job_id}.wav"
        output_path = os.path.join(output_dir, output_filename)
        
        logger.info(f"변환 시작: {input_path} -> {output_path}")
        
        # 오디오 변환 처리
        audio = AudioSegment.from_file(input_path)
        audio = audio.set_channels(1)  # 모노로 변환
        audio = audio.set_frame_rate(16000)  # 16kHz로 변환
        
        # WAV로 저장
        audio.export(
            output_path,
            format="wav",
            parameters=["-acodec", "pcm_s16le"]
        )
        
        logger.info(f"변환 완료: {output_path}")
        
        # 성공 상태 업데이트
        db.conversions.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "output_file": output_path,
                    "updated_at": datetime.now(UTC)
                }
            }
        )
        
        logger.info(f"작업 완료: job {job_id}")
        
        # 작업 완료 후 웹훅 호출
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{Settings.API_GATEWAY_URL}/webhook/conversion/{job_id}",
                    json={"status": "completed"}
                )

        # 비동기 웹훅 호출 실행
        asyncio.run(send_webhook())
        
        return {"status": "completed", "output_file": output_path}
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
        # 오류 상태 업데이트
        try:
            db.conversions.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "failed",
                        "error": str(e),
                        "updated_at": datetime.now(UTC)
                    }
                }
            )
        except Exception as update_error:
            logger.error(f"오류 상태 업데이트 실패: {str(update_error)}")
        raise
    finally:
        client.close()  # MongoDB 연결 종료