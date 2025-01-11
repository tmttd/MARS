from fastapi import FastAPI, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
import os

# MongoDB 연결 설정
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://work-db:27017")
WORK_MONGODB_DB = os.getenv("WORK_MONGODB_DB", "mars_work_db")

# MongoDB 클라이언트 초기화
client = AsyncIOMotorClient(MONGODB_URL)
db = client[WORK_MONGODB_DB]

app = FastAPI(title="Database Service")

# CRUD for calls
@app.post("/calls/", response_model=Call)
async def create_call(call: Call):
    result = await db.calls.insert_one(call.dict())
    call._id = str(result.inserted_id)
    return call

@app.get("/calls/{job_id}", response_model=Call)
async def read_call(job_id: str):
    call = await db.calls.find_one({"_id": job_id})
    if call is None:
        raise HTTPException(status_code=404, detail="Call not found")
    call["_id"] = str(call["_id"])
    return call

@app.put("/calls/{job_id}", response_model=Call)
async def update_call(job_id: str, call: Call):
    result = await db.calls.update_one({"_id": job_id}, {"$set": call.dict()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Call not found")
    return call

@app.delete("/calls/{job_id}")
async def delete_call(job_id: str):
    result = await db.calls.delete_one({"_id": job_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Call not found")
    return {"detail": "Call deleted"}

# CRUD for properties
@app.post("/properties/", response_model=Property)
async def create_property(property: Property):
    result = await db.properties.insert_one(property.dict())
    property._id = str(result.inserted_id)
    return property

@app.get("/properties/{property_id}", response_model=Property)
async def read_property(property_id: str):
    property = await db.properties.find_one({"_id": property_id})
    if property is None:
        raise HTTPException(status_code=404, detail="Property not found")
    property["_id"] = str(property["_id"])
    return property

@app.put("/properties/{property_id}", response_model=Property)
async def update_property(property_id: str, property: Property):
    result = await db.properties.update_one({"_id": property_id}, {"$set": property.dict()})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return property

@app.delete("/properties/{property_id}")
async def delete_property(property_id: str):
    result = await db.properties.delete_one({"_id": property_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Property not found")
    return {"detail": "Property deleted"}