import { useState } from 'react';
import { useStore } from '../store/useStore';
import YummyCharacter from './YummyCharacter';
import { Sparkles, Send } from 'lucide-react';
import logo from '../assets/YummyD_logo.png';

export default function Dashboard() {
  const [inputText, setInputText] = useState('');
  const { addEmotion, setAnalyzing, isAnalyzing } = useStore();

  const handleAnalyze = () => {
    if (!inputText.trim()) return;
    
    // 분석 중 애니메이션 시작
    setAnalyzing(true);
    
    // 목업(Mock) 처리: 1.5초 후 분석 결과 완료 (임의의 색상 사탕 추가)
    setTimeout(() => {
      const colors = ['yellow', 'pink', 'mint'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      addEmotion(randomColor);
      setAnalyzing(false);
      setInputText('');
    }, 1500);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto p-6 md:p-12 flex flex-col md:flex-row gap-12 items-center">
      
      {/* Left Column: Character */}
      <div className="flex-1 flex justify-center items-center relative">
        {/* 장식용 스파클 요소 */}
        <div className="absolute top-10 right-10 text-brand-yellow animate-pulse">
           <Sparkles size={32} />
        </div>
        <div className="absolute bottom-20 left-10 text-brand-pink animate-pulse animation-delay-500">
           <Sparkles size={24} />
        </div>
        <YummyCharacter />
      </div>

      {/* Right Column: Input & Info */}
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <img src={logo} alt="Yummy:D" className="h-12 object-contain" />
          <h1 className="text-3xl font-extrabold text-brand-primary">Yummy:D</h1>
        </div>
        
        <div className="bg-white/60 p-6 rounded-2xl shadow-sm border border-brand-surface">
          <h2 className="text-xl font-bold mb-2">데일리 리플렉션</h2>
          <p className="text-sm text-brand-primary/70 mb-4">
            오늘 하루 배운 점이나 느꼈던 감정을 솔직하게 적어주세요. Yummy가 감정을 분석해 사탕으로 만들어 드립니다.
          </p>
          
          <textarea
            className="w-full p-4 bg-brand-bg border border-brand-surface rounded-xl outline-none focus:border-brand-mint focus:ring-2 focus:ring-brand-mint/20 transition-all resize-none min-h-[120px]"
            placeholder="예: 오늘은 리액트 상태 관리를 배웠는데 내용이 너무 어려워서 조금 우울했다..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isAnalyzing}
          />
          
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !inputText.trim()}
            className="mt-4 w-full py-3 px-6 bg-brand-primary text-brand-bg rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <span className="animate-pulse flex items-center gap-2">분석 중... <Sparkles size={18} /></span>
            ) : (
              <>저장하고 분석받기 <Send size={18} /></>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
