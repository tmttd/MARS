from fastapi import FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from .models import Call, CallUpdate, Property, PropertyUpdate
import os
import uuid
from datetime import datetime, timezone, timedelta
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB 연결 설정
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://work-db:27017")
WORK_MONGODB_DB = os.getenv("WORK_MONGODB_DB", "mars_work_db")

# MongoDB 클라이언트 초기화
client = AsyncIOMotorClient(MONGODB_URL)
db = client[WORK_MONGODB_DB]

app = FastAPI(title="Database Service")

# CRUD for calls
@app.get("/calls/", response_model=dict)
async def list_calls(
    limit: Optional[int] = Query(10),
    offset: Optional[int] = Query(0),
    customer_contact: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None),
    recording_date: Optional[datetime] = Query(None),
    before_date: Optional[datetime] = Query(None),
    after_date: Optional[datetime] = Query(None)
):
    try:
        query = {}
        if customer_contact:
            query["customer_contact"] = customer_contact
        if customer_name:
            query["customer_name"] = customer_name
        if property_name:
            query["extracted_property_info.property_name"] = property_name
        if recording_date:
            query["recording_date"] = recording_date
        if before_date:
            query["recording_date"] = {"$lt": before_date}
        if after_date:
            query["recording_date"] = {"$gt": after_date}

        total_count = await db.calls.count_documents(query)

        calls = []
        # 여기서 정렬 조건을 추가 (예: recording_date 내림차순)
        cursor = db.calls.find(query).sort("recording_date", -1).skip(offset).limit(limit)
        async for call in cursor:
            calls.append(Call(**call))

        return {
            "results": calls,
            "totalCount": total_count
        }
    except Exception as e:
        logger.error(f"List calls error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



## 쓸 일 없음.
# @app.post("/calls/", response_model=Call)
# async def create_call(call: CallCreate):
#     try:
#         result = await db.calls.insert_one(call.model_dump())
#         created_call = await db.calls.find_one({"_id": result.inserted_id})
#         logger.info(f"Created Call: {created_call}")
#         return created_call
#     except Exception as e:
#         logger.error(f"Create call error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

@app.get("/calls/{call_id}", response_model=Call)
async def read_call(call_id: str):
    try:
        call = await db.calls.find_one({"job_id": call_id})
        if call is None:
            raise HTTPException(status_code=404, detail="Call not found")
        logger.info(f"Read Call: {call}")
        return call
    except Exception as e:
        logger.error(f"Read call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/calls/{call_id}", response_model=Call)
async def update_call(call_id: str, call_update: CallUpdate):
    try:
        result = await db.calls.update_one(
            {"job_id": call_id}, 
            {"$set": call_update.model_dump(exclude_unset=True)}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Call not found")
        updated_call = await db.calls.find_one({"job_id": call_id})
        logger.info(f"Updated Call: {updated_call}")
        return updated_call
    except Exception as e:
        logger.error(f"Update call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/calls/{call_id}")
async def delete_call(call_id: str):
    try:
        result = await db.calls.delete_one({"job_id": call_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Call not found")
        logger.info(f"Deleted Call: {call_id}")
        return {"detail": "Call deleted"}
    except Exception as e:
        logger.error(f"Delete call error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# CRUD for properties
@app.get("/properties/", response_model=dict)
async def list_properties(
    limit: int = Query(10),
    offset: int = Query(0),
    property_name: Optional[str] = None,
    owner_contact: Optional[str] = None,
    # 다른 필드 (city, district...) 필요한 경우 추가
):
    try:
        query = {}
        if property_name:
            # 부분 일치 검색을 위해서는 Regex 사용 가능: {'$regex': property_name, '$options': 'i'}
            query["property_name"] = {"$regex": property_name, "$options": "i"}

        if owner_contact:
            query["owner_contact"] = {"$regex": owner_contact, "$options": "i"}

        # total_count 계산
        total_count = await db.properties.count_documents(query)

        # 실제 데이터 조회 (정렬 필요하다면 .sort("created_at", -1) 등 추가)
        docs = []
        cursor = db.properties.find(query).skip(offset).limit(limit)
        async for doc in cursor:
            doc["property_id"] = str(doc["_id"])  # DB에서 _id → property_id
            doc.pop("_id", None)
            docs.append(doc)

        # 최종 반환 (dict 형태)
        return {
            "results": docs,
            "totalCount": total_count
        }

    except Exception as e:
        logger.error(f"List properties error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/properties/", response_model=PropertyUpdate)
async def create_property(property: PropertyUpdate):
    try:
        property_data = property.model_dump()
        property_data["property_id"] = str(uuid.uuid4())
        # 한국 시간대 (UTC+9)
        KST = timezone(timedelta(hours=9))

        # 현재 한국 시간 가져오기
        property_data["created_at"] = datetime.now(KST)
        result = await db.properties.insert_one(property_data)
        created_property = await db.properties.find_one({"property_id": property_data["property_id"]})
        logger.info(f"Created Property: {created_property}")
        return created_property
    except Exception as e:
        logger.error(f"Create property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/properties/{property_id}", response_model=Property)
async def read_property(property_id: str):
    try:
        property = await db.properties.find_one({"property_id": property_id})
        if property is None:
            raise HTTPException(status_code=404, detail="Property not found")
        logger.info(f"Read Property: {property}")
        return property
    except Exception as e:
        logger.error(f"Read property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/properties/{property_id}", response_model=Property)
async def update_property(property_id: str, property_update: PropertyUpdate):
    try:
        result = await db.properties.update_one(
            {"property_id": property_id}, 
            {"$set": property_update.model_dump(exclude_unset=True)}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Property not found")
        updated_property = await db.properties.find_one({"property_id": property_id})
        logger.info(f"Updated Property: {updated_property}")
        return updated_property
    except Exception as e:
        logger.error(f"Update property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    try:
        result = await db.properties.delete_one({"property_id": property_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Property not found")
        logger.info(f"Deleted Property: {property_id}")
        return {"detail": "Property deleted"}
    except Exception as e:
        logger.error(f"Delete property error: {e}")
        raise HTTPException(status_code=500, detail=str(e))