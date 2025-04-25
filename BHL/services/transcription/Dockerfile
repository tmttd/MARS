FROM python:3.9-slim

WORKDIR /app

# 시스템 의존성 설치 (ffmpeg은 pydub에 필요하므로 유지)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
# --no-cache-dir 옵션은 이미지 크기를 줄이는 데 도움
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY app /app/app

# 필요한 디렉토리 생성 - [수정됨] whisper_cache 제거
# RUN mkdir -p uploads # 이 서비스에서 사용하지 않는다면 제거 가능
RUN mkdir -p /app/audio_outputs
RUN mkdir -p /app/text_outputs


# 환경 변수 설정
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# 포트 설정 (uvicorn 실행 시 사용)
EXPOSE 8000

# 실행 명령어는 docker-compose에서 정의