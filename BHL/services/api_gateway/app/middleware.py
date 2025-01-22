from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
import httpx
import logging

logger = logging.getLogger(__name__)

def make_cors_aware_response(
    status_code: int, content: dict
):
    """CORS 헤더를 수동으로 달아주는 함수"""
    response = JSONResponse(
        status_code=status_code,
        content=content
    )
    # 필요한 CORS 헤더를 직접 설정
    response.headers["Access-Control-Allow-Origin"] = "http://localhost:3000"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    return response

async def auth_middleware(request: Request, call_next):
    # CORS preflight 요청 처리
    if request.method == "OPTIONS":
        return make_cors_aware_response(
            status_code=200,
            content={}
        )

    # 인증이 필요한 경로 prefix 정의
    PROTECTED_PATHS = [
        "/properties",  # 매물 관련 API - 개인정보와 매물 데이터 보호
        "/calls",      # 통화 관련 API - 통화 기록 보호
        "/users",      # 사용자 관련 API - 사용자 정보 보호
        "/audio/files" # 오디오 파일 목록 - 사용자별 파일 접근 제어
    ]
    
    # 인증이 필요없는 경로들
    PUBLIC_PATHS = [
        "/docs",              # API 문서
        "/login",            # 로그인
        "/register",         # 회원가입
        "/health",           # 헬스체크
        "openapi.json",      # API 스펙
        "/Total_Processing", # 음성 파일 처리 (SQS Consumer 사용)
        "/webhook",          # 서비스간 내부 통신
        "/status",           # 작업 상태 확인
        "/audio/stream",     # 오디오 스트리밍 (공개 URL)
        "/audio/upload",      # 파일 업로드 URL 생성
        "/job"
    ]

    # 공개 경로 체크
    if any(request.url.path.startswith(path) for path in PUBLIC_PATHS):
        return await call_next(request)
    
    # 보호된 경로 체크
    if any(request.url.path.startswith(path) for path in PROTECTED_PATHS):
        # Authorization 헤더 확인
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            return make_cors_aware_response(
                status_code=401,
                content={"detail": "로그인이 필요한 서비스입니다. 로그인 후 이용해주세요."}
            )

        try:
            # 토큰 검증
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    "http://auth:8000/users/me",
                    headers={"Authorization": auth_header}
                )
                
                if response.status_code != 200:
                    return make_cors_aware_response(
                        status_code=401,
                        content={"detail": "인증이 만료되었거나 유효하지 않습니다. 다시 로그인해주세요."}
                    )

                # 사용자 정보를 request.state에 저장
                request.state.user = response.json()
                
        except Exception as e:
            logger.error(f"인증 서비스 오류: {str(e)}")
            return make_cors_aware_response(
                status_code=500,
                content={"detail": "인증 서비스에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요."}
            )

    # 그 외의 경로는 인증 없이 통과
    return await call_next(request) 