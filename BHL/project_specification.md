# MARS 프로젝트 명세서

## 1. 프로젝트 개요
MARS는 오디오/텍스트 처리를 위한 마이크로서비스 기반 API 시스템입니다.

## 2. 시스템 구성

### 2.1 마이크로서비스 구조
- **Converter 서비스** (포트: 8000): 오디오 파일 변환 및 처리
- **Transcription 서비스** (포트: 8001): Whisper 모델을 사용한 음성-텍스트 변환
- **Summarization 서비스** (포트: 8002): gpt-4o-mini를 활용한 텍스트 요약
- **Tasks 서비스**: Celery/Redis 기반 비동기 작업 처리

### 2.2 기술 스택
- **백엔드**: FastAPI (Python 3.7+)
- **데이터베이스**: MongoDB
- **메시지 브로커**: Redis/Celery
- **AI 모델**: 
  - OpenAI gpt-4o-mini (OpenAI 새 SDK 사용)
  - Whisper
- **인증**: SSL, API 키 인증

## 3. API 엔드포인트

### 3.1 Converter 서비스 (8000)
- `GET /`: 서비스 기본 정보
- `POST /convert`: 오디오 파일 변환 요청
- `GET /convert/{job_id}`: 변환 상태 및 결과 확인
- `GET /health`: 서비스 상태 확인 (MongoDB, 디렉토리 상태 포함)
- `GET /config`: 현재 설정 정보 확인

### 3.2 Transcription 서비스 (8001)
- `POST /transcribe`: 음성-텍스트 변환 요청 (.wav, .mp3, .m4a 지원)
- `GET /transcript/{job_id}`: 변환된 텍스트 조회
- `GET /transcribe/{job_id}`: 변환 작업 상태 확인

### 3.3 Summarization 서비스 (8002)
- `POST /summarize`: GPT-3.5 기반 텍스트 요약 요청
  - Request Body: `{"text": "요약할 텍스트"}`
  - Response: `{"job_id": "uuid", "summary": "요약된 텍스트"}`
- `GET /summarize/{job_id}`: 요약 결과 조회

## 4. 데이터 모델

### 4.1 AudioConversion
```python
class AudioConversion(BaseModel):
    job_id: str
    status: str
    input_file: str
    output_file: str | None = None
    format: str
    sample_rate: int # 16000 Hz
    channels: int # 1 (모노)
    bit_depth: int # 16
    file_size: int | None = None
    created_at: datetime
    updated_at: datetime
    error: str | None = None
```

### 4.2 SummarizationStatus
```python
class SummarizationStatus(BaseModel):
    job_id: str
    status: str  # "pending", "processing", "completed", "failed"
    original_text: str
    summary: str | None = None
    error: str | None = None
```

## 5. 환경 설정
### 5.1 데이터베이스 설정
- 각 마이크로서비스별 MongoDB 설정
  - Converter 서비스: MONGODB_DB="converter_db"
  - Transcription 서비스: MONGODB_DB="transcription_db"
  - Summarization 서비스: MONGODB_DB="summarization_db"
- MongoDB 연결 URI: MONGODB_URI="mongodb://localhost:27017/"

### 5.2 메시지 브로커 설정
- Redis 브로커 설정
  - broker_url='redis://localhost:6379/0'
  - result_backend='redis://localhost:6379/0'

### 5.3 파일 시스템 설정
- 파일 디렉토리 설정
  - UPLOAD_DIR="uploads"
  - OUTPUT_DIR="outputs"
- Whisper 모델 캐시 디렉토리 설정
  - WHISPER_CACHE_DIR="/app/whisper_cache"

### 5.4 API 설정
- OpenAI API 키 설정 (OPENAI_API_KEY)

### 5.5 오디오 변환 설정
- 출력 형식: WAV (16비트 PCM)
- 샘플레이트: 16kHz (Whisper 모델 최적화)
- 채널: 모노 (1채널)
- 비트 심도: 16비트
```

주요 변경사항:
1. 데이터베이스 설정을 각 마이크로서비스별로 분리하여 명확하게 정의
2. 환경 설정을 카테고리별로 구분하여 가독성 향상
3. 현재 구현된 아키텍처를 정확히 반영하도록 수정

이렇게 수정하면 현재 구현된 코드와 명세서가 일치하게 됩니다.

## 6. 구현된 기능
- [x] 기본 프로젝트 구조 설정
- [x] MongoDB 연결 및 에러 처리
- [x] OpenAI GPT-4o-mini 통합 (새 SDK 적용)
- [x] 오디오 변환 최적화 (WAV 형식 변환, 16kHz 샘플레이트 설정)
- [x] Summarization 서비스 구현 및 테스트
- [x] Transcription 서비스 완성
- [x] Converter 서비스 완성
- [x] 서비스 간 HTTP 통신 구현
- [ ] 전체 서비스 통합 테스트
- [ ] 테스트 자동화 구현


## 7. 보안
- 환경 변수를 통한 민감 정보 관리
- SSL 인증서 관리 및 보안 컨텍스트 설정
- API 키 인증
- 파일 업로드 제한 및 검증

## 8. 라이센스
MIT 라이센스

## 9. 시스템 요구사항
- Python 3.7+
- MongoDB
- Redis
- OpenAI API 접근 권한
- 필수 Python 패키지:
  - fastapi==0.104.1
  - uvicorn==0.24.0
  - python-dotenv==1.0.0
  - pymongo==4.6.0
  - celery==5.3.6
  - redis==5.0.1
  - openai-whisper==20231117
  - openai (최신 버전)

## 10. 변경 이력

### 11.22

- 서비스 간 HTTP 통신 구현
  - Transcription -> Converter 서비스 통신
  - Summarization -> Transcription 서비스 통신
  - httpx 라이브러리를 사용한 비동기 통신 구현
  - 작업 상태 폴링 메커니즘 추가

- 통합 테스트 프레임워크 구현
  - integration_test.py 추가
  - 전체 파이프라인 테스트 구현
  - 서비스 상태 확인 테스트 추가
  - 비동기 테스트 지원

### 필수 패키지 추가
- httpx==0.25.2
- pytest-asyncio==0.23.5
- pytest==7.4.3
