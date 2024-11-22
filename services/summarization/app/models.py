from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SummarizationRequest(BaseModel):
    text: str

class Summary(BaseModel):
    job_id: str
    status: str
    original_text: str
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    error: Optional[str] = None 