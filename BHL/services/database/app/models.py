from pydantic import BaseModel, Field, ConfigDict, FieldValidationInfo, field_validator
from typing import Optional, List
from bson import ObjectId
from datetime import datetime

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

# call 정보

class ExtractedPropertyInfo(BaseModel):
    property_name: Optional[str] = None
    price: Optional[int] = None
    deposit: Optional[int] = None
    loan_info: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    legal_dong: Optional[str] = None
    detail_address: Optional[str] = None
    full_address: Optional[str] = None
    transaction_type: Optional[str] = None
    property_type: Optional[str] = None
    memo: Optional[str] = None
    floor: Optional[int] = None
    area: Optional[float] = None
    premium: Optional[int] = None
    owner_property_memo: Optional[str] = None
    tenant_property_memo: Optional[str] = None
    owner_info: Optional[OwnerInfo] = None
    tenant_info: Optional[TenantInfo] = None
    moving_date: Optional[datetime] = None

    @field_validator('price', 'deposit', 'floor', 'area', 'premium', mode='before')
    def convert_empty_string_to_none(cls, v):
        return None if v == '' else v

class Call(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    job_id: Optional[str] = None
    file_name: Optional[str] = None
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    recording_date: Optional[datetime] = None
    text: Optional[str] = None
    summary_title: Optional[str] = None
    summary_content: Optional[str] = None
    property_id: Optional[str] = None
    call_memo: Optional[str] = None    
    created_by: Optional[str] = None
    extracted_property_info: Optional[ExtractedPropertyInfo] = None    

    # Pydantic v2에서는 model_config 또는 ConfigDict를 사용
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
    )

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
    customer_name: Optional[str] = None
    customer_contact: Optional[str] = None
    text: Optional[str] = None
    summary_title: Optional[str] = None
    summary_content: Optional[str] = None
    property_id: Optional[str] = None
    call_memo: Optional[str] = None
    created_by: Optional[str] = None
    extracted_property_info: Optional[ExtractedPropertyInfo] = None

# property 정보
class PropertyInfo(BaseModel):
    property_name: Optional[str] = None
    price: Optional[int] = None
    deposit: Optional[int] = None
    loan_info: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    legal_dong: Optional[str] = None
    detail_address: Optional[str] = None
    full_address: Optional[str] = None
    transaction_type: Optional[str] = None
    property_type: Optional[str] = None
    memo: Optional[str] = None
    floor: Optional[int] = None
    area: Optional[float] = None
    premium: Optional[int] = None
    moving_date: Optional[datetime] = None
    owner_property_memo: Optional[str] = None
    tenant_property_memo: Optional[str] = None
    owner_info: Optional[OwnerInfo] = None
    tenant_info: Optional[TenantInfo] = None

    @field_validator('price', 'deposit', 'floor', 'area', 'premium', mode='before')
    def convert_empty_string_to_none(cls, v):
        return None if v == '' else v

class Property(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    property_id: str
    created_at: Optional[datetime] = None
    status: Optional[str] = None
    job_ids: Optional[List[str]] = Field(default_factory=list)
    created_by: Optional[str] = None
    property_info: Optional[PropertyInfo] = None
    summary_content: Optional[str] = None

    # Pydantic v2에서는 model_config 또는 ConfigDict를 사용
    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda dt: dt.isoformat() if dt else None
        }
    )

class PropertyUpdate(BaseModel):
    # id를 반드시 써야 한다면 아래와 같이 둡니다.
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    property_id: Optional[str] = None
    created_at: Optional[datetime] = None
    status: Optional[str] = None
    job_ids: Optional[List[str]] = Field(default_factory=list)
    property_info: Optional[PropertyInfo] = None
    summary_content: Optional[str] = None
    created_by: Optional[str] = None

    model_config = ConfigDict(
        arbitrary_types_allowed=True,
        json_encoders={
            ObjectId: str,
            datetime: lambda dt: dt.isoformat()
        }
    )
    