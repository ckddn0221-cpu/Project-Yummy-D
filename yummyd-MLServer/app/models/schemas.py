from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# ==========================================
# [ML Model Metadata] 모델 버전 및 피처 정의
# ==========================================
# XGBoost v6 모델에서 사용하는 핵심 피처 목록 (순서 엄수)
XGB_FEATURES_V6 = [
    'cumulative_days',           # 누적 수강 일수
    'cumulative_absence_days',   # 누적 결석 일수
    'reflection_delay_time',     # 회고 작성 지연 시간 (payload.EDU_delay_minutes와 매핑)
    'reflection_word_count',     # 회고 작성 단어 수 (payload.EDU_textCount와 매핑)
    'service_usage_frequency',   # 서비스 이용 빈도
    'cer_score'                  # 누적 감정 위험도 점수 (계산된 cumulative_cer)
]

# ==========================================
# [Request] Node.js -> ML 서버 요청 스키마 (원본 Reflections 데이터)
# ==========================================
class ReflectionPayload(BaseModel):
    reflection_id: int
    UserId: int
    
    # 1. 감정 데이터 (KOTE 입력용)
    EMO_emoji: str
    EMO_spell: str
    EMO_reflectionText: str
    EMO_image: Optional[str] = None
    
    # 2. 학습 데이터 (LLM 요약 입력용)
    EDU_goal: Optional[str] = None
    EDU_achievement: Optional[str] = None
    EDU_learned: Optional[str] = None
    EDU_confused: Optional[str] = None
    EDU_review: Optional[str] = None
    EDU_reflectionText: Optional[str] = None
    EDU_image: Optional[str] = None
    
    # 3. 메타 및 파생 데이터 (XGBoost v6 입력 및 CER 계산용)
    # ML Feature: reflection_delay_time
    EDU_delay_minutes: int = Field(default=0, ge=0)
    # ML Feature: reflection_word_count
    EDU_textCount: int = Field(default=0, ge=0)
    # ML Feature: cumulative_days
    cumulative_days: int = Field(default=1, ge=1)
    # ML Feature: cumulative_absence_days
    cumulative_absence_days: int = Field(default=0, ge=0)
    
    prev_cer: float = Field(default=0.0, ge=0.0) # ERS 누적 연산용 과거 데이터
    
    # ML Feature: service_usage_frequency
    service_usage_frequency: int = Field(default=0, ge=0) 

# ==========================================
# [Response] ML 서버 -> Node.js 최종 응답 스키마 (Analyses 테이블 1:1 매핑)
# ==========================================
class AnalysisResponse(BaseModel):
    # 식별자 (Analyses 테이블 PK/FK)
    reflection_id: int
    UserId: int
    
    # [Step 1] KOTE 추출 감정 확률 13종 (Analyses 테이블 컬럼과 동일)
    happy_prob: float
    fulfill_prob: float  # (주의: 원문 fufill_prob의 오타 교정)
    relief_prob: float
    gratitude_prob: float
    proud_prob: float
    sad_prob: float
    anxious_prob: float  # (주의: 원문 anxous_prob의 오타 교정)
    defeat_prob: float
    stress_prob: float
    embarrassed_prob: float
    bored_prob: float
    exhausted_prob: float
    depressed_prob: float
    
    # [Step 3] 감정 점수 및 최종 예측 결과 (Analyses 테이블 컬럼)
    ERS: float
    CER: float
    dropout_prob: float = Field(..., ge=0.0, le=1.0)
    
    # [추가 반환값] DB Analyses 테이블에는 없지만 클라이언트(프론트엔드/메인서버)에서 즉시 필요한 정보
    edu_summary: str      # Step 2: 학습 데이터 요약 텍스트
    is_danger: bool       # 알림 발송용 위험 플래그