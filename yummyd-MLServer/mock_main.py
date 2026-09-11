from fastapi import FastAPI
from pydantic import BaseModel
import random
import time

app = FastAPI()

class ReflectionPayload(BaseModel):
    student_id: int
    content: str
    delay_minutes: int
    prev_cer: float = 0.0

# 감정별 위험 가중치 (이탈 예측 핵심 변수)
EMOTION_WEIGHTS = {
    "happy": -0.5,      # 긍정적 (위험도 감소)
    "embarrassed": 0.5,  # 당황
    "angry": 1.2,       # 분노 (위험도 상승)
    "sad": 1.5,         # 슬픔
    "anxious": 1.8,     # 불안
    "heartache": 2.0    # 상심 (가장 높은 위험도)
}

@app.post("/api/ml/analyze")
async def analyze_reflection(payload: ReflectionPayload):
    # 1. 텍스트 분석 (규칙 기반 감정 추정)
    content = payload.content
    text_len = len(content)
    
    # 기본 감정 분포 생성
    emotions = {k: random.uniform(0.05, 0.2) for k in EMOTION_WEIGHTS.keys()}
    
    # 규칙 추가: 문장이 너무 짧으면 '슬픔/무기력' 가중치 부여
    if text_len < 10:
        emotions["sad"] += 0.4
        emotions["anxious"] += 0.2
    
    # 규칙 추가: 특정 키워드 반응
    if "어려워" in content or "모르겠어" in content:
        emotions["anxious"] += 0.3
    if "기뻐" in content or "좋아" in content:
        emotions["happy"] += 0.5

    # 2. 지표 계산
    dominant = max(emotions, key=emotions.get)
    # ERS (Daily Emotional Risk Score) 계산
    ers = sum(emotions[k] * EMOTION_WEIGHTS[k] for k in EMOTION_WEIGHTS.keys())
    
    # CER (Cumulative Emotional Risk Score) 계산 (EMA 방식 적용)
    # 이전 CER 비중 65%, 당일 ERS 비중 35%
    alpha = 0.35
    cer = (alpha * ers) + (1 - alpha) * payload.prev_cer
    
    # 3. 중도 이탈 확률 (Dropout Probability) 계산
    # 수식: 기본 확률 + (누적 위험도 * 0.2) + (지연 제출 시간 가중치)
    delay_penalty = (payload.delay_minutes / 1440) * 0.2 # 24시간 지연 시 0.2 가중치
    dropout_prob = min(0.99, max(0.01, 0.1 + (cer * 0.2) + delay_penalty))

    summary = f"오늘 당신의 마음에서는 '{dominant}' 사탕이 가장 크게 자라났네요."
    if cer > 1.5:
        summary += " 최근 힘든 마음이 계속되고 있는 것 같아요. 야미가 당신의 이야기를 더 들어줄게요."
    else:
        summary += " 안정적인 마음 상태를 유지하고 계시네요! 지금처럼만 나아가 보아요."

    return {
        "status": "success",
        "summary": summary,
        "emotions": {**emotions, "dominant": dominant},
        "risk_scores": {
            "ers": round(float(ers), 4),
            "cer": round(float(cer), 4),
            "dropout_prob": round(float(dropout_prob), 4)
        }
    }
