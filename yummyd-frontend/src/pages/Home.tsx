import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import {
  ArrowRight, PenLine
} from 'lucide-react';
import { JarIcon } from '../assets/JarIcon';
import { Link, Navigate } from 'react-router-dom';
import YummyCharacter from '../components/YummyCharacter';
import QuotesBanner from '../components/QuotesBanner';
import { Pinky, Goldy } from '../components/EmotionBuddies';

const EMOTION_THEMES = [
  { label: 'MINT', color: 'text-brand-mint', deco: 'decoration-brand-yellow' },
  { label: 'PINK', color: 'text-brand-pink', deco: 'decoration-brand-sky' },
  { label: 'ORANGE', color: 'text-brand-orange', deco: 'decoration-brand-lime' },
  { label: 'PURPLE', color: 'text-brand-purple', deco: 'decoration-brand-gold' },
  { label: 'SKY', color: 'text-brand-sky', deco: 'decoration-brand-coral' },
  { label: 'LIME', color: 'text-brand-lime', deco: 'decoration-brand-hotpink' },
  { label: 'GOLD', color: 'text-brand-gold', deco: 'decoration-brand-emerald' },
  { label: 'EMERALD', color: 'text-brand-emerald', deco: 'decoration-brand-orange' },
];

const StudentDashboard = ({ user }: any) => {
  const currentCandyCount = user?.current_candy_count || 0;

  // 날짜 기반 해시로 매일 고정된 랜덤 테마 선택
  const getDailyTheme = () => {
    const today = new Date().toISOString().split('T')[0];
    const hash = today.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return EMOTION_THEMES[hash % EMOTION_THEMES.length];
  };

  const theme = getDailyTheme();

  return (
    <div className="space-y-12 max-w-6xl mx-auto px-6 pb-20">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center pt-8">
        <Pinky size={80} className="absolute top-0 left-[15%] opacity-10 -z-10 animate-bounce" />
        <Goldy size={70} className="absolute top-20 right-[10%] opacity-10 -z-10 animate-pulse" />

        <div className="flex flex-col items-center mb-6">
          <YummyCharacter />
        </div>

        <div className="space-y-4 px-4 max-w-4xl mx-auto mb-10">
          <motion.h1
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="text-4xl md:text-6xl font-black text-brand-primary tracking-tight"
          >
            오늘의 마음은 <span className={`${theme.color} uppercase underline ${theme.deco} decoration-8 underline-offset-8`}>{theme.label}</span>인가요?
          </motion.h1>
          <p className="text-brand-primary/50 font-bold text-xl md:text-2xl mt-4">
            유리병에 달콤한 <span className="text-brand-primary text-2xl">{currentCandyCount}개</span>의 감정이 소중히 담겨있어요.
          </p>
        </div>

        {/* 리뉴얼된 프리미엄 배너 (버튼 바로 위에 배치) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
          className="w-full max-w-5xl mx-auto mb-10"
        >
          <QuotesBanner />
        </motion.div>

        {/* 버튼 그룹 */}
        <div className="flex flex-col sm:flex-row gap-5 justify-center w-full max-w-2xl">
          <Link to="/reflection" className="flex-1 px-10 py-5 bg-brand-primary text-white rounded-[2rem] font-black flex items-center justify-center gap-3 hover:scale-105 transition-all shadow-2xl shadow-brand-primary/20 text-lg group">
            <PenLine size={24} className="group-hover:rotate-12 transition-transform" /> 
            지금 기록하기 
            <ArrowRight size={20} />
          </Link>
          <Link to="/jar" className="flex-1 px-10 py-5 bg-white text-brand-primary border-2 border-brand-surface rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-brand-surface transition-all shadow-xl text-lg">
            <JarIcon size={24} /> 유리병 확인하기
          </Link>
        </div>
      </section>
    </div>
  );
};


export default function Home() {
  const user = useStore((state) => state.user);
  const fetchHistory = useStore((state) => state.fetchHistory);
  const fetchBoard = useStore((state) => state.fetchBoard);

  useEffect(() => {
    if (user?.role === 'student') {
        fetchHistory();
    }
    fetchBoard();
  }, [user, fetchHistory, fetchBoard]);

  if ((user?.role as string) === 'institution' || user?.role === 'instructor') {
    return <Navigate to="/inboard" replace />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-0 min-h-screen"
    >
      <StudentDashboard user={user} />
    </motion.div>
  );
}
