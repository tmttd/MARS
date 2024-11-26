from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class SummarizationRequest(BaseModel):
    text: str