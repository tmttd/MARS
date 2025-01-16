from pydantic import BaseModel, Field, FieldValidationInfo
from typing import Optional, List
from bson import ObjectId
from datetime import datetime, date

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, info: FieldValidationInfo):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, schema: dict) -> dict:
        schema['type'] = 'string'
        return schema

class OwnerInfo(BaseModel):
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None

class TenantInfo(BaseModel):
    tenant_name: Optional[str] = None
    tenant_contact: Optional[str] = None

class ExtractedPropertyInfo(BaseModel):
    property_name: Optional[str] = None
    price: Optional[int] = None
    deposit: Optional[int] = None
    loan_available: Optional[bool] = None
    city: Optional[str] = None
    district: Optional[str] = None
    legal_dong: Optional[str] = None
    detail_address: Optional[str] = None
    full_address: Optional[str] = None
    transaction_type: Optional[str] = None
    property_type: Optional[str] = None
    floor: Optional[int] = None
    area: Optional[int] = None
    premium: Optional[int] = None
    owner_property_memo: Optional[str] = None
    tenant_property_memo: Optional[str] = None
    owner_info: Optional[OwnerInfo] = None
    tenant_info: Optional[TenantInfo] = None
    memo: Optional[str] = None
    moving_date: Optional[date] = None

class Call(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    job_id: str
    customer_contact: str
    customer_name: str
    file_name: str
    recording_date: datetime
    text: str
    extracted_property_info: Optional[ExtractedPropertyInfo] = None
    summary_content: Optional[str] = None
    summary_title: Optional[str] = None
    property_id: Optional[str] = None

    class Config:
        allow_population_by_reference = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat()
        }

# class CallCreate(BaseModel):
#     job_id: str
#     customer_contact: str
#     customer_name: str = ""
#     file_name: str
#     recording_date: datetime
#     text: str
#     extracted_property_info: Optional[ExtractedPropertyInfo] = None
#     summary_content: Optional[str] = None
#     summary_title: Optional[str] = None

class CallUpdate(BaseModel):
    customer_contact: Optional[str] = None
    customer_name: Optional[str] = None
    text: Optional[str] = None
    extracted_property_info: Optional[ExtractedPropertyInfo] = None
    summary_content: Optional[str] = None
    summary_title: Optional[str] = None
    property_id: Optional[str] = None

class PropertyInfo(BaseModel):
    property_name: Optional[str] = None
    price: Optional[str] = None
    deposit: Optional[str] = None
    loan_available: Optional[bool] = None
    city: Optional[str] = None
    district: Optional[str] = None
    legal_dong: Optional[str] = None
    detail_address: Optional[str] = None
    full_address: Optional[str] = None
    transaction_type: Optional[str] = None
    property_type: Optional[str] = None
    floor: Optional[int] = None
    area: Optional[int] = None
    premium: Optional[int] = None
    owner_property_memo: Optional[str] = None
    tenant_property_memo: Optional[str] = None
    owner_info: Optional[OwnerInfo] = None
    tenant_info: Optional[TenantInfo] = None
    memo: Optional[str] = None
    moving_date: Optional[date] = None

class Property(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    property_id: str
    created_at: datetime
    property_info: PropertyInfo
    status: Optional[str] = None

    class Config:
        allow_population_by_reference = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

class PropertyUpdate(BaseModel):
    property_info: Optional[PropertyInfo] = None
    created_at: Optional[datetime] = None
    status: Optional[str] = None