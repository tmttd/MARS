from fastapi import FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from typing import List, Optional
from models import Call, CallCreate, CallUpdate, Property, PropertyCreate, PropertyUpdate  # models.py에서 모델 가져오기
import os
from datetime import datetime

# MongoDB 연결 설정
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://work-db:27017")
WORK_MONGODB_DB = os.getenv("WORK_MONGODB_DB", "mars_work_db")

# MongoDB 클라이언트 초기화
client = AsyncIOMotorClient(MONGODB_URL)
db = client[WORK_MONGODB_DB]

app = FastAPI(title="Database Service")

# CRUD for calls

# 전체 통화 기록 조회 (최신 10개)
@app.get("/calls/all/", response_model=List[Call])
async def list_all_calls(limit: Optional[int] = Query(10)):
    calls = []
    async for call in db.calls.find().sort("created_at", -1).limit(limit):
        call["_id"] = str(call["_id"])  # ObjectId를 문자열로 변환
        calls.append(call)
    return calls

@app.post("/calls/", response_model=Call)
async def create_call(call: CallCreate):
    result = await db.calls.insert_one(call.model_dump())
    call.id = str(result.inserted_id)
    return call

@app.get("/calls/{call_id}", response_model=Call)
async def read_call(call_id: str):
    call = await db.calls.find_one({"_id": call_id})
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")
    call["_id"] = str(call["_id"])  # ObjectId를 문자열로 변환
    return call

@app.put("/calls/{call_id}", response_model=Call)
async def update_call(call_id: str, call_update: CallUpdate):
    result = await db.calls.update_one(
        {"_id": call_id}, 
        {"$set": call_update.model_dump(exclude_unset=True)}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Call not found")
    updated_call = await db.calls.find_one({"_id": call_id})
    updated_call["_id"] = str(updated_call["_id"])  # ObjectId를 문자열로 변환
    return updated_call

@app.delete("/calls/{call_id}")
async def delete_call(call_id: str):
    result = await db.calls.delete_one({"_id": call_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Call not found")
    return {"detail": "Call deleted"}

@app.get("/calls/", response_model=List[Call])
async def list_calls(
    customer_contact: Optional[str] = Query(None),
    customer_name: Optional[str] = Query(None),
    property_name: Optional[str] = Query(None),
    recording_date: Optional[datetime] = Query(None),
    before_date: Optional[datetime] = Query(None),
    after_date: Optional[datetime] = Query(None)
):
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
    async for call in db.calls.find(query):
        call["_id"] = str(call["_id"])  # ObjectId를 문자열로 변환
        calls.append(call)
    return calls

# CRUD for properties

# 전체 부동산 정보 조회 (최신 10개)
@app.get("/properties/all/", response_model=List[Property])
async def list_all_properties(limit: Optional[int] = Query(10)):
    properties = []
    async for property in db.properties.find().sort("created_at", -1).limit(limit):
        property["_id"] = str(property["_id"])  # ObjectId를 문자열로 변환
        properties.append(property)
    return properties

@app.post("/properties/", response_model=Property)
async def create_property(property: PropertyCreate):
    result = await db.properties.insert_one(property.model_dump())
    property_id = str(result.inserted_id)
    return {**property.model_dump(), "id": property_id}

@app.get("/properties/{property_id}", response_model=Property)
async def read_property(property_id: str):
    property = await db.properties.find_one({"_id": property_id})
    if property is None:
        raise HTTPException(status_code=404, detail="Property not found")
    property["_id"] = str(property["_id"])  # ObjectId를 문자열로 변환
    return property

@app.put("/properties/{property_id}", response_model=Property)
async def update_property(property_id: str, property_update: PropertyUpdate):
    result = await db.properties.update_one({"_id": property_id}, {"$set": property_update.dict(exclude_unset=True)})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    updated_property = await db.properties.find_one({"_id": property_id})
    updated_property["_id"] = str(updated_property["_id"])  # ObjectId를 문자열로 변환
    return updated_property

@app.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    result = await db.properties.delete_one({"_id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"detail": "Property deleted"}

@app.get("/properties/", response_model=List[Property])
async def list_properties(
    property_name: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    property_type: Optional[str] = Query(None),
    owner_name: Optional[str] = Query(None),
    tenant_name: Optional[str] = Query(None)
):
    query = {}
    
    if property_name:
        query["property_info.property_name"] = property_name
    if city:
        query["property_info.city"] = city
    if district:
        query["property_info.district"] = district
    if transaction_type:
        query["property_info.transaction_type"] = transaction_type
    if property_type:
        query["property_info.property_type"] = property_type
    if owner_name:
        query["property_info.owner_info.owner_name"] = owner_name
    if tenant_name:
        query["property_info.tenant_info.tenant_name"] = tenant_name


    properties = []
    async for property in db.properties.find(query):
        property["_id"] = str(property["_id"])  # ObjectId를 문자열로 변환
        properties.append(property)
    return properties