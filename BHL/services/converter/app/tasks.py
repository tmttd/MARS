from celery import Celery
from datetime import datetime, timezone
from pymongo import MongoClient
from pydub import AudioSegment
import os
import logging
from httpx import AsyncClient
from .config import settings
import asyncio

UTC = timezone.utc
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
    task_default_queue='converter',
    task_queues={
        'converter': {
            'exchange': 'converter',
            'routing_key': 'converter',
        }
    },
    task_default_exchange='converter',
    task_default_routing_key='converter'
)

@celery.task(name='convert_audio')
def convert_audio(job_id: str, input_path: str, output_dir: str, db_connection_string: str, work_db_connection_string: str, work_db_name: str, user_name: str = None):
    try:
        logger.info(f"작업 수신됨: task_id={celery.current_task.request.id}, job_id={job_id}, user_name={user_name}", extra={"input_path": input_path})
        
        # MongoDB 연결 (로그용)
        client = MongoClient(db_connection_string)
        db = client.converter_db
        
        # 작업 데이터베이스 연결
        work_client = MongoClient(work_db_connection_string)
        work_db = work_client[work_db_name]
        
        # 파일 존재 확인
        if not os.path.exists(input_path):
            error_msg = f"오디오 파일을 찾을 수 없습니다: {input_path}"
            now = datetime.now(UTC)
            db.logs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "status": "failed",
                        "timestamp": now,
                        "message": error_msg,
                        "metadata": {
                            "updated_at": now,
                            "created_by": user_name
                        }
                    }
                })
            raise FileNotFoundError(error_msg)
            
        # 출력 파일 경로 설정
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
        
        # 원본 파일 삭제
        os.remove(input_path)
        logger.info(f"원본 파일 삭제 완료: {input_path}")
        
        # 작업 완료 로그
        now = datetime.now(UTC)
        db.logs.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "output_file": output_path,
                    "timestamp": now,
                    "message": f"Audio conversion completed: {output_path}",
                    "metadata": {
                        "updated_at": now,
                        "created_by": user_name
                    }
                }
            })
        
        # API Gateway에 웹훅 전송
        async def send_webhook():
            async with AsyncClient() as client:
                await client.post(
                    f"{settings.API_GATEWAY_URL}/webhook/conversion/{job_id}",
                    json={"status": "completed", "user_name": user_name}
                )
        
        asyncio.run(send_webhook())
        
        # 연결 종료
        client.close()
        work_client.close()
        
        return {"status": "completed", "output_file": output_path}
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
        try:
            # 오류 로그 기록
            now = datetime.now(UTC)
            db.logs.update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "event": "error",
                        "status": "failed",
                        "timestamp": now,
                        "message": f"Audio conversion failed: {str(e)}",
                        "metadata": {
                            "updated_at": now,
                            "created_by": user_name
                        }
                    }
                })
        except Exception as inner_e:
            logger.error(f"오류 상태 업데이트 실패: {str(inner_e)}")
        finally:
            client.close()
            work_client.close()
            if os.path.exists(input_path):
                try:
                    os.remove(input_path)
                except:
                    pass
        raise

# task 함수를 변수에 할당하여 export
convert_audio_task = celery.task(name='convert_audio', bind=True)(convert_audio)