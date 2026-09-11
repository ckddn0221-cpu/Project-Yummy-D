import os
import torch
import joblib
import numpy as np
import pandas as pd
from openai import OpenAI
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from app.models.schemas import ReflectionPayload, AnalysisResponse, XGB_FEATURES_V6
from dotenv import load_dotenv

# .env 파일 활성화
load_dotenv()


# 환경 변수에서 Hugging Face 및 OpenAI 토큰 로드 (설정 파일이나 .env에서 관리 권장)
HF_TOKEN = os.getenv("HF_TOKEN")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# 키 누락 확인용 안전장치 (터미널에서 원인 파악 가능)
if not HF_TOKEN or not OPENAI_API_KEY:
    print("🚨 [경고] .env 파일에서 API 키를 찾을 수 없습니다! 서버가 정상 작동하지 않을 수 있습니다.")

class MLPipelineService:
    _instance = None

    # 싱글톤 패턴: 서버 가동 시 1회만 메모리에 적재
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLPipelineService, cls).__new__(cls)
            cls._instance._initialize_models()
        return cls._instance

    def _initialize_models(self):
        print("--- AI 모델 초기화 시작 ---")
        
        self.openai_client = OpenAI(api_key=OPENAI_API_KEY)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
        # 2. KoTE 모델 & 토크나이저 로드 (Step 1)
        self.kote_model_name = "searle-j/kote_for_easygoing_people"
        self.tokenizer = AutoTokenizer.from_pretrained(self.kote_model_name, token=HF_TOKEN)
        self.kote_model = AutoModelForSequenceClassification.from_pretrained(
            self.kote_model_name, 
            token=HF_TOKEN
        ).to(self.device)
        self.kote_model.eval() # 추론 모드로 전환 (Dropout 등 비활성화)

        # 3. XGBoost 및 전처리 객체 로드 (Step 3)
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        assets_dir = os.path.join(base_dir, "assets")
        self.scaler = joblib.load(os.path.join(assets_dir, "yummy_scaler6.pkl"))
        self.xgb_model = joblib.load(os.path.join(assets_dir, "yummy_xgb_model6.pkl"))
        print(f"--- AI 모델 초기화 완료 (Device: {self.device}) ---")

        # 13개 감정 라벨 매핑
        self.emotion_labels = [
            'happy_prob', 'fulfill_prob', 'relief_prob', 'gratitude_prob', 'proud_prob',
            'sad_prob', 'anxious_prob', 'defeat_prob', 'stress_prob', 'embarrassed_prob',
            'bored_prob', 'exhausted_prob', 'depressed_prob'
        ]

        # XGBoost v6 기대 피처 목록 (schemas.py 정의 상수 활용)
        self.xgb_features = XGB_FEATURES_V6
    
    def _generate_summary(self, payload: ReflectionPayload) -> str:
        """GPT-4o-mini를 이용한 학습 요약 로직"""
        
        # 1. 입력 데이터 조립 (값이 없는 None 필드는 제외 처리)
        raw_data = {
            "학습 목표": payload.EDU_goal,
            "성취도": payload.EDU_achievement,
            "배운 점": payload.EDU_learned,
            "헷갈리는 점": payload.EDU_confused,
            "복습 내용": payload.EDU_review,
            "회고 텍스트": payload.EDU_reflectionText
        }
        # None이 아닌 데이터만 문자열로 결합
        prompt_data = "\n".join([f"- {k}: {v}" for k, v in raw_data.items() if v])

        # 2. 시스템 프롬프트 (가이드라인 및 제한사항)
        system_prompt = """
        당신은 부트캠프 수강생의 일일 회고 데이터를 객관적으로 분석하고 요약하는 AI 교육 전문가입니다.
        
        [엄격한 제한사항 - 반드시 지킬 것]
        1. 제공된 수강생의 데이터만 기반으로 요약할 것 (외부 지식 개입 및 추측성 내용 절대 금지).
        2. 수강생의 학습 진척도와 보완해야 할 점을 중심으로 핵심만 요약할 것.
        3. 전체 길이는 반드시 3문장 이내(최대 150자)로 제한할 것.
        4. "안녕하세요", "요약해 드리겠습니다" 등 불필요한 인사말이나 부연 설명을 절대 포함하지 말 것.
        5. 문체는 객관적인 3인칭 시점으로 "~함", "~임", "~가 필요함"과 같은 명사형 종결어미를 사용할 것.
        """

        # 3. OpenAI API 호출
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt_data}
                ],
                temperature=0.2, # 창의성 제한 (0에 가까울수록 사실 기반 출력)
                max_tokens=150   # 출력 토큰 수 제한 (비용 및 지연 시간 방지)
            )
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            print(f"OpenAI API 호출 에러: {e}")
            return "요약 데이터를 생성하는 중 오류가 발생했습니다."

    def _extract_emotions(self, text: str) -> dict:
        """KoTE 모델을 이용한 13개 감정 확률 추론 로직"""
        # 토크나이징 (PyTorch 텐서 반환 및 디바이스 할당)
        inputs = self.tokenizer(
            text, 
            return_tensors="pt", 
            truncation=True, 
            max_length=512, 
            padding=True
        ).to(self.device)

        # 그래디언트 계산 비활성화 (메모리 절약 및 속도 향상)
        with torch.no_grad():
            outputs = self.kote_model(**inputs)
            logits = outputs.logits

            # 다중 라벨 분류(Multi-label)를 가정하여 Sigmoid 적용
            # 만약 단일 감정 분류라면 torch.softmax(logits, dim=1) 사용
            probabilities = torch.sigmoid(logits).squeeze().cpu().numpy()

        # 라벨과 확률값을 딕셔너리로 매핑하여 반환
        return {label: round(float(prob), 4) for label, prob in zip(self.emotion_labels, probabilities)}

    def _calculate_ers(self, emotions: dict) -> float:
        """
        [수식 1] ERS_t = Σ (w_c * p_c,t)
        13개 감정에 대한 가중치(w_c) 내적 합산 로직
        """
        # 가중치 딕셔너리 세팅 (위험도를 측정하므로 긍정은 마이너스, 부정은 플러스 가중치 부여)
        # ※ 실제 서비스 데이터에 맞춰 세밀한 튜닝(Weight Calibration)이 필요합니다.
        weights = {
            'happy_prob': -0.5, 
            'fulfill_prob': -0.5, 
            'relief_prob': -0.2,
            'gratitude_prob': -0.3, 
            'proud_prob': -0.4,
            'sad_prob': 1.0, 
            'anxious_prob': 1.2, 
            'defeat_prob': 1.5,
            'stress_prob': 1.0, 
            'embarrassed_prob': 0.5, 
            'bored_prob': 0.5,
            'exhausted_prob': 1.2, 
            'depressed_prob': 1.8  # 우울감에 가장 높은 위험도 가중치 부여
        }

        # 각 감정의 확률(p_c,t)과 가중치(w_c)를 곱하여 모두 더함
        ers_score = sum(weights[emo] * prob for emo, prob in emotions.items())

        # 위험도 점수가 음수로 내려가지 않도록 최솟값을 0으로 보정 (ReLU 함수 형태)
        return round(max(0.0, ers_score), 4)

    def _calculate_cer(self, current_ers: float, prev_cer: float) -> float:
        """
        [수식 2] CER_t = λ*ERS_t + (1-λ)*CER_t-1 * (1 + κ * I(ERS_t > θ))
        시계열 평활화 및 연속 발생 증폭 페널티 적용
        """
        # 하이퍼파라미터 설정 (문서 참조 및 스케일 고려)
        LAMBDA = 0.35  # λ: 현재 감정 반영률 (0~1)
        THETA = 1.5    # θ: 심각한 부정 상태 판별 임계치 (ERS 스케일에 맞게 조정 필요)
        KAPPA = 0.2    # κ: 연속 발생 증폭 계수 (Penalty factor)

        # 지시 함수 I(ERS_t > θ): 현재 ERS가 임계치를 넘으면 1, 아니면 0
        indicator = 1 if current_ers > THETA else 0

        # CER 공식 연산
        term1 = LAMBDA * current_ers
        term2 = (1 - LAMBDA) * prev_cer * (1 + (KAPPA * indicator))
        
        cer_score = term1 + term2

        return round(cer_score, 4)

    def process_reflection(self, payload: ReflectionPayload) -> AnalysisResponse:
        """전체 파이프라인 오케스트레이션"""
        
        # [Step 1] KOTE 감정 추론 (이모지와 텍스트를 결합하여 문맥 강화)
        combined_text = f"[{payload.EMO_emoji}] {payload.EMO_spell} {payload.EMO_reflectionText}"
        emotions = self._extract_emotions(combined_text)

        # [Step 2] GPT-4o-mini 요약 생성
        edu_summary = self._generate_summary(payload)

        # [Step 3] 감정 지표 연산 (수식 로직 반영 완료)
        current_ers = self._calculate_ers(emotions)
        cumulative_cer = self._calculate_cer(current_ers, payload.prev_cer)

        # [Step 3.1] XGBoost 이탈 예측 (v6 대응: 6개 피처 직접 입력)
        # 피처 데이터 구성 (모델이 기대하는 피처명으로 매핑)
        feature_data = {
            'cumulative_days': payload.cumulative_days,
            'cumulative_absence_days': payload.cumulative_absence_days,
            'reflection_delay_time': payload.EDU_delay_minutes,
            'reflection_word_count': payload.EDU_textCount,
            'service_usage_frequency': payload.service_usage_frequency,
            'cer_score': cumulative_cer
        }
        
        # DataFrame 생성 및 피처 순서 보장
        features_df = pd.DataFrame([feature_data])[self.xgb_features]
        
        # 스케일링 및 추론
        scaled_features = self.scaler.transform(features_df)
        dropout_prob = float(self.xgb_model.predict_proba(scaled_features)[0][1])

        # 최종 응답 객체 조립
        return AnalysisResponse(
            reflection_id=payload.reflection_id,
            UserId=payload.UserId,
            **emotions,
            ERS=current_ers,
            CER=cumulative_cer,
            dropout_prob=round(dropout_prob, 4),
            edu_summary=edu_summary,
            is_danger=bool(dropout_prob > 0.65)
        )

# API 라우터에서 쉽게 호출할 수 있도록 인스턴스화
ml_pipeline = MLPipelineService()