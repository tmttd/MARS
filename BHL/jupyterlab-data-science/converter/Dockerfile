FROM python:3.8-slim

WORKDIR /app

# 의존성 설치
COPY requirements.txt ./
RUN apt-get update && apt-get install -y ffmpeg && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /var/lib/apt/lists/*

# 소스 코드는 컨테이너에 복사하지 않습니다. (볼륨 마운트로 대체)

EXPOSE 5000

CMD ["python", "app.py"]