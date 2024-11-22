from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class Transcript(BaseModel):
    job_id: str
    status: str
    input_file: str
    text: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    error: Optional[str] = None 