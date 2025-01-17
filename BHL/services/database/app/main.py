from fastapi import FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from .models import Call, CallUpdate, Property, PropertyInfo, PropertyUpdate
from bson import ObjectId
import os
import uuid
from datetime import datetime
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
@app.get("/calls/", response_model=List[Call])
async def list_calls(
    limit: Optional[int] = Query(10),
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

        calls = []
        cursor = db.calls.find(query).limit(limit)
        async for call in cursor:
            calls.append(call)
        logger.info(f"Calls: {calls}")
        return calls
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
@app.get("/properties/", response_model=List[Property])
async def list_properties(
    limit: Optional[int] = Query(10),
    property_name: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    owner_name: Optional[str] = Query(None),
    tenant_name: Optional[str] = Query(None)
):
    try:
        query = {}
        if property_name:
            query["property_name"] = property_name
        if city:
            query["city"] = city
        if district:
            query["district"] = district
        if transaction_type:
            query["transaction_type"] = transaction_type
        if property_type:
            query["property_type"] = property_type
        if owner_name:
            query["owner_name"] = owner_name
        if tenant_name:
            query["tenant_name"] = tenant_name

        properties = []
        cursor = db.properties.find(query).limit(limit)
        async for property in cursor:
            property["id"] = str(property["_id"])
            del property["_id"]
            properties.append(property)
        logger.info(f"Properties: {properties}")
        return properties
    except Exception as e:
        logger.error(f"List properties error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/properties/", response_model=Property)
async def create_property(property: PropertyUpdate):
    try:
        property_data = property.model_dump()
        property_data["property_id"] = str(uuid.uuid4())[:16]  # uuid16 생성
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