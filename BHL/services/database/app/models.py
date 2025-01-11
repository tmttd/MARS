from pydantic import BaseModel

# Pydantic 모델 정의
class Call(BaseModel):
    customer_name: str
    customer_contact: str
    recording_date: str

class Property(BaseModel):
    name: str
    location: str
    price: float