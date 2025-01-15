from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime

class StageStatus(BaseModel):
    status: str
    job_id: Optional[str] = None
    error: Optional[str] = None

class ProcessingJob(BaseModel):
    job_id: str
    status: str
    stages: Dict[str, StageStatus]
    created_at: datetime
    updated_at: datetime

class UploadRequest(BaseModel):
    filename: str
    content_type: str