from fastapi import FastAPI, HTTPException
from pymongo import MongoClient
import openai
from typing import Dict
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경 변수 로드
load_dotenv()

# 환경 변수에서 설정 가져오기
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DB = os.getenv("MONGODB_DB", "mars_converter")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY 환경 변수가 설정되지 않았습니다")

app = FastAPI()

# OpenAI API 키 설정
openai.api_key = OPENAI_API_KEY

# MongoDB 연결
try:
    client = MongoClient(MONGODB_URI)
    db = client[MONGODB_DB]
    summaries = db.summaries
    logger.info("MongoDB 연결 성공")
except Exception as e:
    logger.error(f"MongoDB 연결 실패: {str(e)}")
    raise

class SummarizationRequest(BaseModel):
    text: str

class SummarizationStatus(BaseModel):
    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    original_text: str
    summary: str | None = None
    error: str | None = None

@app.post("/summarize")
async def summarize_text(request: SummarizationRequest):
    try:
        # GPT API 호출
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "텍스트를 간단하게 요약해주세요."},
                {"role": "user", "content": request.text}
            ]
        )
        
        summary = response.choices[0].message.content
        job_id = str(uuid.uuid4())
        current_time = datetime.utcnow()
        
        # MongoDB에 저장
        job_status = {
            "job_id": job_id,
            "status": "completed",
            "original_text": request.text,
            "summary": summary,
            "created_at": current_time,
            "updated_at": current_time
        }
        
        summaries.insert_one(job_status)
        
        return {"job_id": job_id, "summary": summary}
        
    except Exception as e:
        logger.error(f"Error in summarize_text: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/summarize/{job_id}")
async def get_summary(job_id: str):
    summary = summaries.find_one({"job_id": job_id})
    if not summary:
        raise HTTPException(status_code=404, detail="요약을 찾을 수 없습니다")
    
    return {
        "job_id": summary["job_id"],
        "status": summary["status"],
        "original_text": summary["original_text"],
        "summary": summary.get("summary"),
        "created_at": summary["created_at"].isoformat(),
        "updated_at": summary["updated_at"].isoformat(),
        "error": summary.get("error")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
