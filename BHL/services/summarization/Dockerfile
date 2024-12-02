FROM python:3.13-slim

WORKDIR /app

# 시스템 의존성 설치 및 캐시 정리
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Poetry 설치 (선택사항)
# RUN pip install poetry

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드 복사
COPY app /app/app

# 포경 변수 설정
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# 헬스체크를 위한 포트 노출
EXPOSE $PORT

# 실행 명령어
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]