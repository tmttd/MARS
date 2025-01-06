from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date


class PropertyType(str, Enum):
    APARTMENT = "아파트"
    OFFICETEL = "오피스텔"
    HOUSE = "주택"
    COMMERCIAL = "상가"
    OTHER = "기타"


class PropertyInfo(BaseModel):
    property_type: Optional[PropertyType] = Field(None, description="매물 종류")
    # registration_date: Optional[date] = Field(None, description="접수일")
    price: Optional[int] = Field(None, description="매매가/임대가 (만원)")
    address: Optional[str] = Field(None, description="주소")
    business_type: Optional[str] = Field(None, description="업종 (상가인 경우)")
    building_name: Optional[str] = Field(None, description="오피스텔/아파트명 (오피스텔/아파트일 경우)")
    floor: Optional[int] = Field(None, description="층")
    dong: Optional[str] = Field(None, description="동")
    unit: Optional[str] = Field(None, description="호수")
    deposit: Optional[int] = Field(None, description="보증금 (만원)")
    monthly_rent: Optional[int] = Field(None, description="월세 (만원)")
    premium: Optional[int] = Field(None, description="권리금 (상가인 경우, 만원)")


class PersonInfo(BaseModel):
    name: Optional[str] = Field(None, description="성명")
    contact: Optional[str] = Field(None, description="연락처")
    property_address: Optional[str] = Field(None, description="매물주소")


class PropertyExtraction(BaseModel):
    property_info: Optional[PropertyInfo] = Field(default_factory=PropertyInfo, description="매물 정보")
    owner_info: Optional[PersonInfo] = Field(default_factory=PersonInfo, description="집주인 정보")
    tenant_info: Optional[PersonInfo] = Field(default_factory=PersonInfo, description="세입자 정보")
    summary: str = Field(description="요약")