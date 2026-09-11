from fastapi import FastAPI
from app.api import endpoints

# FastAPI 앱 초기화 및 메타데이터 설정
app = FastAPI(
    title="Yummy:D ML API Server",
    description="부트캠프 수강생 회고 기반 감정 분석 및 이탈 예측 시스템",
    version="1.0.0"
)

# API 라우터 등록 (엔드포인트 접두사 설정)
app.include_router(endpoints.router, prefix="/api/v1")

# 서버 상태 확인용 헬스 체크 엔드포인트
@app.get("/health")
def health_check():
    return {"status": "ok", "message": "Yummy:D ML Server is running perfectly."}

# uvicorn 실행 명령어 (터미널에서 실행):
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000