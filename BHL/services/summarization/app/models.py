from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field

class PropertyType(str, Enum):
    APARTMENT = "아파트"
    OFFICETEL = "오피스텔"
    REBUILDING = "재건축"
    COMPOSITE = "주상복합"
    COMMERCIAL = "상가"
    OFFICE = "사무실"
    OTHER = "기타"

class TransactionType(str, Enum):
    SALE = "매매"
    RENT = "전세"
    MONTHLY_RENT = "월세"
    LEASE = "임대"
    OTHER = "기타"

class OwnerInfo(BaseModel):
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None

class TenantInfo(BaseModel):
    tenant_name: Optional[str] = None
    tenant_contact: Optional[str] = None

# 매물 정보
class Properties(BaseModel):
    property_name: Optional[str] = Field(None, description="단지명")
    price: Optional[int] = Field(None, description="매매가 or 월세 (만원)")
    deposit: Optional[int] = Field(None, description="(전세, 월세인 경우) 보증금 (만원)")
    loan_info: Optional[str] = Field(None, description="대출 관련 정보")
    city: Optional[str] = Field(None, description="시")
    district: Optional[str] = Field(None, description="구")
    legal_dong: Optional[str] = Field(None, description="동")
    detail_address: Optional[str] = Field(None, description="상세주소(동 호수 or 번지)")
    transaction_type: Optional[TransactionType] = Field(None, description="거래 종류")
    property_type: Optional[PropertyType] = Field(None, description="매물 종류")
    floor: Optional[int] = Field(None, description="층")
    area: Optional[int] = Field(None, description="면적")
    premium: Optional[int] = Field(None, description="(상가인 경우) 권리금 (만원)")
    owner_property_memo: Optional[str] = Field(None, description="현재 매물에 대한 소유주 관련 메모")
    tenant_property_memo: Optional[str] = Field(None, description="현재 매물에 대한 세입자 관련 메모")
    owner_info: Optional[OwnerInfo] = Field(None, description="집주인 정보")
    tenant_info: Optional[TenantInfo] = Field(None, description="세입자 정보")
    memo: Optional[str] = Field(None, description="매물에 관한 메모")
    moving_date: Optional[str] = Field(None, description="입주가능일")

class PropertyExtraction(BaseModel):
    summary_title: str = Field(description="요약 제목")
    summary_content: str = Field(description="요약 내용")
    extracted_property_info: Optional[Properties] = Field(default_factory=Properties, description="추출된 매물 정보")