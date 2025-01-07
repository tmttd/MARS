### 1. 헬스 체크 엔드포인트
```
GET /health
```
- **설명**: 서비스의 상태를 확인
- **응답 모델**: `HealthCheckResponse`
- **응답 예시**:
```json
{
    "status": "healthy",
    "services": {
        "s3": {
            "status": "up",
            "latency": 0.5,
            "error": null
        }
    },
    "timestamp": "2024-01-10T12:00:00Z"
}
```

### 2. 오디오 파일 목록 조회
```
GET /audio/files
```
- **설명**: S3 버킷에 저장된 모든 오디오 파일 목록 조회
- **응답 모델**: `AudioFileList`
- **지원 파일 형식**: `.wav`, `.m4a`
- **응답 예시**:
```json
{
    "files": [
        {
            "name": "example.wav",
            "s3_key": "example.wav",
            "s3_bucket": "mars-audiofile-bucket",
            "duration": 120.5,
            "format": "wav",
            "sample_rate": 16000,
            "channels": 1,
            "created_at": "2024-01-10T12:00:00Z",
            "updated_at": "2024-01-10T12:00:00Z"
        }
    ],
    "total": 1
}
```

### 3. 오디오 스트리밍 URL 생성
```
GET /audio/stream/{name}
```
- **설명**: 특정 오디오 파일의 스트리밍을 위한 pre-signed URL 생성
- **파라미터**:
  - `name`: 오디오 파일명 (확장자 포함 또는 미포함)
- **응답 모델**: `AudioStreamResponse`
- **지원 파일 형식**: `.wav`, `.m4a`
- **응답 예시**:
```json
{
    "url": "https://s3.amazonaws.com/...",
    "expires_in": 3600,
    "content_type": "audio/wav"
}
```
- **에러 응답**:
  - 404: 파일을 찾을 수 없음
  - 500: 서버 내부 오류

### 공통 사항
- **CORS**: 모든 오리진(`*`)에서 접근 가능
- **에러 응답 모델**: `ErrorResponse`
```json
{
    "status": 500,
    "message": "에러 메시지",
    "details": null,
    "timestamp": "2024-01-10T12:00:00Z"
}
```
- **인증**: AWS 자격 증명 필요 (서버 측에서 처리)
- **로깅**: 모든 요청에 대해 로깅 처리


### api_gateway에서 정의된 엔드포인트는 다음과 같습니다.

### 1. 오디오 파일 목록 조회
```
GET /audio/files
```
- **설명**: S3 버킷에 저장된 모든 오디오 파일 목록을 조회
- **요청 파라미터**: 없음
- **응답**: S3 서비스의 `/audio/files` 엔드포인트 응답을 그대로 전달
- **에러 응답**:
  - 500: 오디오 파일 목록을 가져오는 중 오류 발생

### 2. 오디오 스트리밍 URL 조회
```
GET /audio/stream/{name}
```
- **설명**: 특정 오디오 파일의 스트리밍 URL을 조회
- **요청 파라미터**:
  - `name`: 파일명 (Path Parameter)
- **응답**: S3 서비스의 `/audio/stream/{name}` 엔드포인트 응답을 그대로 전달
  ```json
  {
    "url": "스트리밍 URL",
    "expires_in": 3600,
    "content_type": "audio/wav"
  }
  ```
- **에러 응답**:
  - 404: 파일을 찾을 수 없음
  - 500: 스트리밍 URL 생성 중 오류 발생

### 공통 사항
- **베이스 URL**: `settings.S3_SERVICE_URL` (기본값: "http://s3_service:8000")
- **에러 처리**: 
  - S3 서비스의 에러 응답을 그대로 전달
  - 서비스 연결 실패 시 500 에러 반환
- **응답 형식**: JSON
- **CORS**: 모든 오리진(`*`) 허용
