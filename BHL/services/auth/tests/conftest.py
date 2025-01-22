import pytest
from fastapi.testclient import TestClient
from pymongo import MongoClient
import os
from datetime import datetime

from main import app
from config import settings
from models import UserInDB, UserRole

# 테스트용 데이터베이스 설정
TEST_MONGODB_URL = "mongodb://localhost:27017"
TEST_DB_NAME = "test_auth_db"

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture(autouse=True)
def test_db():
    # 테스트용 MongoDB 클라이언트 생성
    client = MongoClient(TEST_MONGODB_URL)
    db = client[TEST_DB_NAME]
    
    # 기존 테스트 데이터 정리
    db.users.delete_many({})
    
    # 테스트용 관리자 계정 생성
    admin_user = {
        "_id": "admin_id",
        "username": "admin",
        "email": "admin@example.com",
        "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYAAAAAAAA",  # "adminpass"
        "role": UserRole.ADMIN,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    db.users.insert_one(admin_user)
    
    # 테스트용 일반 사용자 계정 생성
    test_user = {
        "_id": "user_id",
        "username": "testuser",
        "email": "test@example.com",
        "hashed_password": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNiAYAAAAAAAA",  # "testpass"
        "role": UserRole.USER,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    db.users.insert_one(test_user)
    
    yield db
    
    # 테스트 후 정리
    db.users.delete_many({})
    client.close()

@pytest.fixture
def test_user_token(client):
    response = client.post(
        "/token",
        data={
            "username": "testuser",
            "password": "testpass"
        }
    )
    return response.json()["access_token"]

@pytest.fixture
def admin_token(client):
    response = client.post(
        "/token",
        data={
            "username": "admin",
            "password": "adminpass"
        }
    )
    return response.json()["access_token"] 