import os
from dotenv import load_dotenv

load_dotenv()

# OpenAI 설정
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GPT_MODEL = "gpt-4o-mini"

# 감정별 위험 가중치
EMOTION_WEIGHTS: dict = {
        "기쁨": -0.5,    # 성취감, 안도감 (유일한 마이너스 가중치: 이탈 위험도를 낮춤)
        "당황": 0.5,     # 에러 등 일시적 마찰 (낮은 가중치)
        "짜증": 1.2,     # 불만, 스트레스 누적
        "슬픔": 1.5,     # 우울, 상실감
        "불안": 1.8,     # 조급함, 뒤처진다는 두려움 (고위험)
        "막막함": 2.0    # 학습된 무기력, 번아웃, 포기 (최고 위험도)
    }

# 분석 설정값
ALPHA = 0.35
DELAY_PENALTY_MAX = 0.2
DROPOUT_BASE_PROB = 0.1


# app/core/config.py
class Settings(BaseSettings):
    # ...
    XGBOOST_MODEL_PATH: str = "assets/xgboost_dropout_model.json"