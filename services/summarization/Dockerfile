FROM python:3.9-slim

WORKDIR /app

# 필요한 Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY app /app/app

# 포트 설정
EXPOSE 8000

# 실행 명령어는 docker-compose에서 정의 