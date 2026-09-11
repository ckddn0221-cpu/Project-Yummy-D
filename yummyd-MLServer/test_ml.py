import os
import sys
import json
from dotenv import load_dotenv

# 현재 디렉토리를 PYTHONPATH에 추가하여 app 패키지 참조 가능하도록 설정
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.ml_service import ml_pipeline
from app.models.schemas import ReflectionPayload

def test_ml_pipeline():
    print("="*50)
    print("🚀 [Yummy:D ML Engine] 정밀 진단 테스트 시작")
    print("="*50)

    # 1. 테스트 시나리오 데이터 준비 (부정적 감정 + 학습 부진 상황)
    test_payload = ReflectionPayload(
        reflection_id=101,
        UserId=7,
        EMO_emoji="😢",
        EMO_spell="슬픔",
        EMO_reflectionText="강의 내용이 너무 어렵고 따라가기 벅차네요. 그만두고 싶다는 생각이 듭니다.",
        EDU_goal="Pandas 데이터 처리 마스터",
        EDU_achievement="30%",
        EDU_learned="데이터 프레임 생성 방법",
        EDU_confused="Multi-index와 Groupby 연산이 너무 복잡함",
        EDU_review="복습을 못했습니다.",
        EDU_reflectionText="계속 뒤처지는 것 같아 불안하고 힘듭니다.",
        EDU_delay_minutes=120,
        EDU_textCount=45,
        cumulative_days=15,
        cumulative_absence_days=2,
        prev_cer=0.8,
        service_usage_frequency=5
    )

    try:
        # 2. 파이프라인 실행
        print(f"\n[Step 1] 파이프라인 구동 중... (입력 텍스트: '{test_payload.EMO_reflectionText}')")
        result = ml_pipeline.process_reflection(test_payload)

        # 3. 결과 분석 및 검증 (마크다운 표 형식 출력을 위한 데이터 정리)
        print("\n" + "="*50)
        print("📊 [분석 결과 리포트]")
        print("="*50)
        
        analysis_data = [
            ["항목", "결과값", "상태"],
            ["ERS (즉시 감정 위험도)", f"{result.ERS:.4f}", "⚠️ 높음" if result.ERS > 1.5 else "✅ 정상"],
            ["CER (누적 감정 위험도)", f"{result.CER:.4f}", "⚠️ 주의" if result.CER > result.ERS else "✅ 안정"],
            ["이탈 예측 확률 (Dropout)", f"{result.dropout_prob * 100:.2f}%", "🚨 위험" if result.is_danger else "✅ 안전"],
            ["AI 요약 결과", result.edu_summary[:30] + "...", "📝 생성됨"]
        ]

        # 간단한 표 출력
        for row in analysis_data:
            print(f"{row[0]:<20} | {row[1]:<15} | {row[2]}")

        print("\n[Step 2] 13개 세부 감정 확률분포 (KOTE)")
        emotions = {
            "Positive": result.happy_prob + result.fulfill_prob + result.relief_prob + result.gratitude_prob + result.proud_prob,
            "Negative": result.sad_prob + result.anxious_prob + result.defeat_prob + result.stress_prob + result.depressed_prob,
            "Others": result.embarrassed_prob + result.bored_prob + result.exhausted_prob
        }
        for k, v in emotions.items():
            print(f"- {k:<10}: {v:.4f}")

        # 4. 최종 무결성 검증 (Assertion)
        assert result.reflection_id == test_payload.reflection_id, "ID mismatch"
        assert result.dropout_prob >= 0 and result.dropout_prob <= 1.0, "Invalid probability range"
        assert len(result.edu_summary) > 0, "Summary generation failed"
        
        print("\n" + "="*50)
        print("✅ [검증 완료] 모든 ML 파이프라인이 정상적으로 동작합니다.")
        print("="*50)

    except Exception as e:
        print(f"\n❌ [테스트 실패] 에러 발생: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    # .env 파일 로드 확인
    load_dotenv()
    if not os.getenv("HF_TOKEN") or not os.getenv("OPENAI_API_KEY"):
        print("⚠️ [주의] .env 파일에 API 키가 설정되어 있지 않습니다. 로컬 테스트를 위해 가상의 응답을 생성할 수 있습니다.")
    
    test_ml_pipeline()
