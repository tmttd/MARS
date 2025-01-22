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

    # 공개 경로는 인증 없이 통과
    PUBLIC_PATHS = ["/docs", "/login", "/register", "/health", "openapi.json"]
    if any(request.url.path.endswith(path) for path in PUBLIC_PATHS):
        return await call_next(request)

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

    return await call_next(request) 