FROM python:3.9-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# 필요한 Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY app /app/app

# 필요한 디렉토리 생성
RUN mkdir -p uploads outputs

# 포트 설정
EXPOSE 8000

# 실행 명령어는 docker-compose에서 정의 