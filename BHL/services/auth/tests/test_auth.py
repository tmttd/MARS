import pytest
from fastapi import status
from datetime import datetime

def test_register_user(client):
    response = client.post(
        "/register",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "password": "newpass123",
            "role": "user"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@example.com"
    assert "id" in data

def test_register_duplicate_username(client):
    response = client.post(
        "/register",
        json={
            "username": "testuser",  # 이미 존재하는 사용자
            "email": "another@example.com",
            "password": "password123",
            "role": "user"
        }
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST

def test_login_success(client):
    response = client.post(
        "/token",
        data={
            "username": "testuser",
            "password": "testpass"
        }
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(client):
    response = client.post(
        "/token",
        data={
            "username": "testuser",
            "password": "wrongpass"
        }
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_get_current_user(client, test_user_token):
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"

def test_get_users_list_as_admin(client, admin_token):
    response = client.get(
        "/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2  # admin과 test user가 있어야 함

def test_get_users_list_as_user(client, test_user_token):
    response = client.get(
        "/users",
        headers={"Authorization": f"Bearer {test_user_token}"}
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

def test_unauthorized_access(client):
    response = client.get("/users/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED

def test_invalid_token(client):
    response = client.get(
        "/users/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED 