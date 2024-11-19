from celery import Celery
from dotenv import load_dotenv
import os
import logging
import whisper
import ssl
import certifi
import urllib.request
from pathlib import Path
from datetime import datetime
from pymongo import MongoClient
from pydub import AudioSegment
import shutil

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# Celery 앱 생성
celery = Celery('GMP')

# Celery 기본 설정
celery.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/0',
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    broker_connection_retry_on_startup=True
)

# SSL 컨텍스트 설정
ssl_context = ssl.create_default_context(cafile=certifi.where())

# 원본 urlopen 함수 저장
original_urlopen = urllib.request.urlopen

def patched_urlopen(url, *args, **kwargs):
    if 'context' not in kwargs:
        kwargs['context'] = ssl_context
    return original_urlopen(url, *args, **kwargs)

# urlopen 패치
urllib.request.urlopen = patched_urlopen

# Whisper 모델 캐시 디렉토리 설정
WHISPER_CACHE_DIR = Path.home() / ".cache" / "whisper"
WHISPER_CACHE_DIR.mkdir(parents=True, exist_ok=True)

@celery.task(name='transcribe_audio')
def transcribe_audio(job_id: str, input_path: str, db_connection_string: str):
    try:
        logger.info(f"Starting transcription for job {job_id}")
        
        # MongoDB 연결
        client = MongoClient(db_connection_string)
        db = client.mars_converter
        
        # 상태 업데이트: 처리 중
        logger.info("Updating status to processing")
        db.transcripts.update_one(
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
            raise FileNotFoundError(f"Audio file not found: {input_path}")
        
        # Whisper 모델 로드
        logger.info("Loading Whisper model...")
        model = whisper.load_model("base", download_root=str(WHISPER_CACHE_DIR))
        
        # 오디오 파일 변환
        logger.info(f"Transcribing file: {input_path}")
        result = model.transcribe(input_path)
        
        if not result or 'text' not in result:
            raise ValueError("Transcription failed: No text output")
            
        transcribed_text = result['text']
        logger.info(f"Transcription completed. Text length: {len(transcribed_text)}")
        
        # 상태 업데이트: 완료
        db.transcripts.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "text": transcribed_text,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        logger.info(f"Job {job_id} completed successfully")
        return {"status": "completed", "text": transcribed_text}
        
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        try:
            db.transcripts.update_one(
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
            logger.error(f"Failed to update error status: {str(update_error)}")
        raise

@celery.task(name='convert_audio')
def convert_audio(job_id: str, input_path: str, output_dir: str, db_connection_string: str):
    try:
        logger.info(f"오디오 변환 시작: job {job_id}")
        
        # MongoDB 연결
        client = MongoClient(db_connection_string)
        db = client.mars_converter
        
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
        
        # 입력 파일 확장자 확인
        input_ext = os.path.splitext(input_path)[1].lower()
        
        # 출력 파일 경로 설정 (wav로 통일)
        output_filename = f"{job_id}.wav"
        output_path = os.path.join(output_dir, output_filename)
        
        # 오디오 파일 로드 및 변환
        try:
            # 오디오 로드
            audio = AudioSegment.from_file(input_path)
            
            # 모노로 변환 (스테레오인 경우)
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # 16kHz로 변환 (Whisper 모델에 최적화)
            audio = audio.set_frame_rate(16000)
            
            # WAV로 변환 및 저장 (16비트 PCM)
            audio.export(
                output_path,
                format="wav",
                parameters=[
                    "-acodec", "pcm_s16le",  # 16비트 PCM
                    "-ac", "1",              # 모노
                    "-ar", "16000"           # 16kHz
                ]
            )
            
        except Exception as conv_error:
            raise Exception(f"오디오 변환 실패: {str(conv_error)}")
        
        # 파일 크기 확인
        file_size = os.path.getsize(output_path)
        
        # 성공적으로 변환 완료
        db.conversions.update_one(
            {"job_id": job_id},
            {
                "$set": {
                    "status": "completed",
                    "output_file": output_path,
                    "file_size": file_size,
                    "format": "wav",
                    "sample_rate": 16000,
                    "channels": 1,
                    "bit_depth": 16,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # 입력 파일 삭제 (선택사항)
        # if os.path.exists(input_path) and input_path != output_path:
        #     os.remove(input_path)
        
        logger.info(f"WAV 변환 완료: job {job_id}")
        return {
            "status": "completed", 
            "output_file": output_path,
            "file_size": file_size,
            "format": "wav"
        }
        
    except Exception as e:
        logger.error(f"변환 중 오류 발생: {str(e)}")
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
        
        # 실패한 경우 임시 파일들 정리
        if os.path.exists(input_path):
            try:
                os.remove(input_path)
            except:
                pass
        raise