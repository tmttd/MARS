FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app /app/app

# 출력 디렉토리 생성
RUN mkdir -p /app/outputs

EXPOSE 8000

# 실행 명령어 추가
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]