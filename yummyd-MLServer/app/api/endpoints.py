from fastapi import APIRouter, HTTPException
from app.models.schemas import ReflectionPayload, AnalysisResponse
from app.services.ml_service import ml_pipeline

# 라우터 인스턴스 생성
router = APIRouter()

@router.post("/analyze", response_model=AnalysisResponse)
def analyze_reflection(payload: ReflectionPayload):
    """
    Node.js 메인 서버로부터 회고 데이터를 수신하여 전체 ML 파이프라인을 구동합니다.
    """
    try:
        # ML 서비스 싱글톤 인스턴스의 process_reflection 호출
        result = ml_pipeline.process_reflection(payload)
        return result
        
    except Exception as e:
        # 파이프라인 내부 에러 발생 시 500 에러와 함께 원인 반환
        print(f"[ML Pipeline Error] {str(e)}")
        raise HTTPException(status_code=500, detail=f"ML 분석 처리 중 서버 내부 오류가 발생했습니다: {str(e)}")