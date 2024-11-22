from celery import Celery
from datetime import datetime
from pymongo import MongoClient
from pydub import AudioSegment
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Celery 설정
celery = Celery('converter')
celery.conf.update(
    broker_url=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('REDIS_URL', 'redis://localhost:6379/0'),
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json'
)

@celery.task(name='convert_audio')
def convert_audio(job_id: str, input_path: str, output_dir: str, db_connection_string: str):
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
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # 파일 존재 확인
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"오디오 파일을 찾을 수 없습니다: {input_path}")
            
        # 출력 파일 경로 설정 (wav로 통일)
        output_filename = f"{job_id}.wav"
        output_path = os.path.join(output_dir, output_filename)
        
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
        
        # 성공 상태 업데이트
        db.conversions.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "output_file": output_path,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
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
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        except Exception as update_error:
            logger.error(f"오류 상태 업데이트 실패: {str(update_error)}")
        raise