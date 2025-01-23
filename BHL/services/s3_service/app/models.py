from pydantic import BaseModel
from datetime import datetime
from typing import List

class AudioFile(BaseModel):
    name: str
    s3_key: str
    s3_bucket: str
    user_name: str
    duration: float = 0
    format: str = "wav"
    sample_rate: int = 16000
    channels: int = 1
    created_at: datetime
    updated_at: datetime

class AudioFileList(BaseModel):
    files: List[AudioFile]
    total: int

class AudioStreamResponse(BaseModel):
    url: str
    expires_in: int
    content_type: str = "audio/wav" 

class UploadUrlRequest(BaseModel):
    filename: str
    content_type: str

class UploadUrlResponse(BaseModel):
    upload_url: str
    expires_in: int