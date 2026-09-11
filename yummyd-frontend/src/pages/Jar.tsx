import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Star, Sparkles, Quote, History, BrainCircuit, Package, Gamepad2, BookOpen, Heart, ChevronRight, RefreshCw, Pencil, Check, X, Calendar, Flame, TrendingUp } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import axios from 'axios';

export default function Jar() {
  const { user, emotions = [], collection = [], streakDays, fetchHistory, fetchMe, fetchCollection, drawItem, toggleEquip } = useStore();
  const location = useLocation();

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'edu' | 'emo'>('edu');

  // 드로우 애니메이션 상태
  const [phase, setPhase] = useState<'idle' | 'egg' | 'shake' | 'flash' | 'crack' | 'reveal'>('idle');
  const [result, setResult] = useState<any>(null);
  const [drawGrade, setDrawGrade] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawnItem, setLastDrawnItem] = useState<any>(null);
  const [currentAvatar, setCurrentAvatar] = useState<any>(null);
  const [flashLayers, setFlashLayers] = useState<string[]>([]);
  // 애니메이션 중 컬렉션 노출 제어: 캐릭터 reveal 전까지 뽑기 전 컬렉션 유지
  const [frozenCollection, setFrozenCollection] = useState<any[] | null>(null);
  const displayCollection = frozenCollection ?? collection;

  // 리마인드 상태 (오늘 날짜 기준 랜덤 EDU_confused)
  const [remindItem, setRemindItem] = useState<string | null>(null);

  // 수정 팝업 상태
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editText, setEditText] = useState('');

  // 감정 차트 모드
  const [chartMode, setChartMode] = useState<'week' | 'month'>('week');

  // 감정 달력 선택 날짜
  const [calendarDay, setCalendarDay] = useState<number | null>(null);

  // 히스토리 달력 필터
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [historyPage, setHistoryPage] = useState(1);

  // 탭 섹션 ref
  const eduRef = useRef<HTMLDivElement>(null);
  const emoRef = useRef<HTMLDivElement>(null);

  type Grade = 'common' | 'rare' | 'unique' | 'epic' | 'legend';
  const gradeSequence: Record<Grade, string[]> = {
    common: ['common'],
    rare: ['common', 'rare'],
    unique: ['common', 'rare', 'unique'],
    epic: ['common', 'rare', 'unique', 'epic'],
    legend: ['common', 'rare', 'unique', 'epic', 'legend']
  };

  const gradeColor = {
    common: "#ffffff",
    rare: "#60a5fa",
    unique: "#a78bfa",
    epic: "#fd4d08",
    legend: "#111111"
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
      fetchMe();
      fetchCollection();
    }
  }, [user?.id, location.key]);

  useEffect(() => {
    const equipped = collection.find(i => i.is_equipped);
    if (equipped) setCurrentAvatar(equipped.Collection);
  }, [collection]);

  // 오늘 날짜 기준 리마인드 항목 선택 (매일 초기화)
  useEffect(() => {
    const confusedItems = emotions
      .map((e: any) => e.EDU_confused)
      .filter(Boolean);
    if (confusedItems.length === 0) return;
    const todayIdx = new Date().getDate() % confusedItems.length;
    setRemindItem(confusedItems[todayIdx]);
  }, [emotions]);

  const handleDraw = async () => {
    if (isDrawing) return;
    setIsDrawing(true);
    // 뽑기 전 컬렉션 스냅샷 고정 (애니메이션 중 새 캐릭터 노출 방지)
    setFrozenCollection(collection);
    const res = await drawItem();
    if (!res.success) {
      alert(res.message);
      setIsDrawing(false);
      setFrozenCollection(null);
      return;
    }
    const sequence = gradeSequence[res.item.grade as Grade];
    const eggTime = 0;
    const shakeTime = 600;
    const crackTime = 1100;
    const flashStart = 1500;
    const revealTime = 1900 + sequence.length * 1100;
    const endTime = 4500 + sequence.length * 1100;

    setTimeout(() => setPhase("egg"), eggTime);
    setTimeout(() => setPhase("shake"), shakeTime);
    setTimeout(() => setPhase("crack"), crackTime);
    sequence.forEach((g, index) => {
      setTimeout(() => {
        setDrawGrade(g as Grade);
        setFlashLayers((prev) => [...prev, gradeColor[g as Grade]]);
        setPhase("flash");
      }, flashStart + index * 1100);
    });
    setTimeout(async () => {
      setResult(res.item);
      setDrawGrade(res.item.grade);
      setLastDrawnItem(res.item);
      setPhase("reveal");
      await fetchCollection();
      // reveal 후 최신 컬렉션으로 교체
      setFrozenCollection(null);
      setTimeout(() => setLastDrawnItem(null), 3000);
    }, revealTime);
    setTimeout(() => {
      setPhase("idle");
      setResult(null);
      setIsDrawing(false);
      setFlashLayers([]);
    }, endTime);
  };

  const handleTabClick = (tab: 'edu' | 'emo') => {
    setActiveTab(tab);
    const ref = tab === 'edu' ? eduRef : emoRef;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleEditSave = async () => {
    if (!editingItem) return;
    try {
      await axios.put(`/api/update/${editingItem.id}`, { text: editText });
      await fetchHistory();
      setEditingItem(null);
    } catch {
      alert('수정 중 오류가 발생했습니다.');
    }
  };

  const equippedItems = useMemo(() => collection.filter(i => i.is_equipped), [collection]);
  const currentColor = drawGrade ? gradeColor[drawGrade as keyof typeof gradeColor] : "#ffffff";

  // 전체 감정 키 목록 (Sequelize camelCase JS 속성명 기준)
  const ALL_EMOTION_KEYS = [
    { key: 'happyProb',       label: '행복',     color: '#7FDBCA' },
    { key: 'fulfillProb',     label: '성취',     color: '#4FD1A5' },
    { key: 'reliefProb',      label: '안도',     color: '#86EFAC' },
    { key: 'gratitudeProb',   label: '감사',     color: '#FCD34D' },
    { key: 'proudProb',       label: '자부심',   color: '#FB923C' },
    { key: 'sadProb',         label: '슬픔',     color: '#60A5FA' },
    { key: 'anxiousProb',     label: '불안',     color: '#A78BFA' },
    { key: 'defeatProb',      label: '좌절',     color: '#F87171' },
    { key: 'stressProb',      label: '스트레스', color: '#FF6B9D' },
    { key: 'embarrassedProb', label: '당황',     color: '#F9A8D4' },
    { key: 'boredProb',       label: '지루함',   color: '#94A3B8' },
    { key: 'exhaustedProb',   label: '지침',     color: '#FF9F43' },
    { key: 'depressedProb',   label: '우울',     color: '#818CF8' },
  ];

  // 평균 분포 기준 상위 5개 감정 선택
  const top5EmotionKeys = useMemo(() => {
    const sums: Record<string, number> = {};
    let count = 0;
    emotions.forEach((item: any) => {
      const a = item.Analysis;
      if (!a) return;
      count++;
      ALL_EMOTION_KEYS.forEach(({ key, label }) => {
        sums[label] = (sums[label] || 0) + (a[key] || 0);
      });
    });
    if (count === 0) return ALL_EMOTION_KEYS.slice(0, 5);
    return [...ALL_EMOTION_KEYS]
      .sort((a, b) => (sums[b.label] || 0) - (sums[a.label] || 0))
      .slice(0, 5);
  }, [emotions]);

  // 감정 차트 데이터: 최근 5개 회고 × 상위 5개 감정
  const chartData = useMemo(() => {
    const recent5 = [...emotions].slice(0, 5).reverse();
    return recent5.map((item: any) => {
      const analysis = item.Analysis;
      const day = new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      const entry: any = { day };
      // 5개 감정 합 기준 100% 정규화
      const total = analysis
        ? top5EmotionKeys.reduce((sum, { key }) => sum + (analysis[key] || 0), 0)
        : 0;
      top5EmotionKeys.forEach(({ key, label }) => {
        entry[label] = (analysis && total > 0) ? Math.round(((analysis[key] || 0) / total) * 100) : 0;
      });
      return entry;
    });
  }, [emotions, top5EmotionKeys]);

  // 감정 인사이트 계산
  const emotionInsight = useMemo(() => {
    const sums: Record<string, number> = {};
    let count = 0;
    emotions.forEach((item: any) => {
      const a = item.Analysis;
      if (!a) return;
      count++;
      ALL_EMOTION_KEYS.forEach(({ key, label }) => {
        sums[label] = (sums[label] || 0) + (a[key] || 0);
      });
    });
    if (count === 0) return null;
    const avgs = Object.entries(sums).map(([label, sum]) => ({ label, avg: sum / count }));
    avgs.sort((a, b) => b.avg - a.avg);
    const top = avgs[0];
    // 전체 감정 합 대비 긍정/부정 비율로 계산 (100% 초과 방지)
    const totalSum = Object.values(sums).reduce((s, v) => s + v, 0);
    const positiveSum = (sums['행복'] || 0) + (sums['성취'] || 0) + (sums['안도'] || 0) + (sums['감사'] || 0) + (sums['자부심'] || 0);
    const negativeSum = (sums['슬픔'] || 0) + (sums['불안'] || 0) + (sums['우울'] || 0) + (sums['좌절'] || 0);
    const positive = totalSum > 0 ? positiveSum / totalSum : 0;
    const negative = totalSum > 0 ? negativeSum / totalSum : 0;
    return { top, positive, negative, avgs };
  }, [emotions]);

  // 월별 차트 데이터: 이번 달 1~5주차 × 상위 5개 감정 평균 (선그래프용)
  const monthChartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // 이번 달 데이터만 필터
    const thisMonthItems = emotions.filter((item: any) => {
      const d = new Date(item.createdAt);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    // 주차 계산: 1일 기준 ceil(day / 7)
    const getWeek = (dateStr: string) => Math.ceil(new Date(dateStr).getDate() / 7);

    // 주차별 감정 합산
    const weekSums: Record<number, Record<string, number>> = {};
    const weekCounts: Record<number, number> = {};
    thisMonthItems.forEach((item: any) => {
      const a = item.Analysis;
      if (!a) return;
      const w = getWeek(item.createdAt);
      if (!weekSums[w]) { weekSums[w] = {}; weekCounts[w] = 0; }
      weekCounts[w]++;
      top5EmotionKeys.forEach(({ key, label }) => {
        weekSums[w][label] = (weekSums[w][label] || 0) + (a[key] || 0);
      });
    });

    // 최대 주차 결정 (이번 달 마지막 날 기준)
    const lastDay = new Date(year, month + 1, 0).getDate();
    const maxWeek = Math.ceil(lastDay / 7);

    return Array.from({ length: maxWeek }, (_, i) => {
      const w = i + 1;
      const entry: any = { week: `${w}주차` };
      const cnt = weekCounts[w] || 0;
      // 5개 감정 평균 합 기준 100% 정규화
      const weekTotal = cnt > 0
        ? top5EmotionKeys.reduce((sum, { label }) => sum + (weekSums[w]?.[label] || 0), 0) / cnt
        : 0;
      top5EmotionKeys.forEach(({ label }) => {
        const avg = cnt > 0 ? (weekSums[w]?.[label] || 0) / cnt : 0;
        entry[label] = weekTotal > 0 ? Math.round((avg / weekTotal) * 100) : 0;
      });
      return entry;
    });
  }, [emotions, top5EmotionKeys]);

  // 5가지 추가 인사이트
  const insightExtras = useMemo(() => {
    if (emotions.length === 0) return null;

    const POSITIVE_KEYS = ['happyProb', 'fulfillProb', 'reliefProb', 'gratitudeProb', 'proudProb'] as const;
    const NEGATIVE_KEYS = ['stressProb', 'anxiousProb', 'sadProb', 'defeatProb', 'depressedProb', 'exhaustedProb', 'embarrassedProb', 'boredProb'] as const;
    const KEY_TO_LABEL: Record<string, string> = {
      stressProb: '스트레스', anxiousProb: '불안', sadProb: '슬픔',
      defeatProb: '좌절', depressedProb: '우울', exhaustedProb: '지침',
      embarrassedProb: '당황', boredProb: '지루함',
    };
    const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

    // 2. 요일별 감정 패턴
    const dowSums: Record<number, Record<string, number>> = {};
    const dowCounts: Record<number, number> = {};
    emotions.forEach((item: any) => {
      const a = item.Analysis;
      if (!a) return;
      const dow = new Date(item.createdAt).getDay();
      if (!dowSums[dow]) { dowSums[dow] = {}; dowCounts[dow] = 0; }
      dowCounts[dow]++;
      NEGATIVE_KEYS.forEach(k => {
        dowSums[dow][k] = (dowSums[dow][k] || 0) + (a[k] || 0);
      });
    });
    let worstDow = -1, worstVal = -1, worstLabel = '스트레스';
    Object.entries(dowSums).forEach(([dowStr, sums]) => {
      const dow = Number(dowStr);
      const cnt = dowCounts[dow];
      NEGATIVE_KEYS.forEach(k => {
        const avg = (sums[k] || 0) / cnt;
        if (avg > worstVal) { worstVal = avg; worstDow = dow; worstLabel = KEY_TO_LABEL[k]; }
      });
    });
    const dowPattern = worstDow >= 0 ? `${DOW_LABELS[worstDow]}요일에 ${worstLabel}가 가장 높아요!` : null;

    // 3. 긍정지수 변화 추이
    const trendData = [...emotions].reverse().map((item: any) => {
      const a = item.Analysis;
      const day = new Date(item.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      const pos = a
        ? Math.round(POSITIVE_KEYS.reduce((s, k) => s + (a[k] || 0), 0) / POSITIVE_KEYS.length * 100)
        : 0;
      return { day, 긍정지수: pos };
    });

    // 4. 자주 쓴 키워드 — 학습 관련 필드(EDU_confused, EDU_goal)에서만 추출
    const stopWords = new Set([
      // 조사
      '이', '가', '은', '는', '을', '를', '의', '에', '와', '과', '도', '로', '으로', '에서', '에게', '한테', '부터', '까지', '만', '랑', '이랑',
      // 대명사
      '나', '나는', '내가', '내', '저', '저는', '제가', '우리', '나를', '저를',
      // 시간·빈도 부사
      '오늘', '내일', '어제', '이번', '다음', '지금', '아까', '방금', '아직', '벌써', '이미', '다시', '또', '계속', '항상', '매일', '보통', '가끔', '자주', '별로', '전혀', '조금', '특히', '주로',
      // 정도 부사
      '너무', '정말', '그냥', '좀', '많이', '어떻게', '왜', '빨리', '천천히', '확실히', '잘', '더', '안', '못',
      // 접속사·감탄사
      '그리고', '그런데', '하지만', '그래서', '근데', '아', '어', '음', '뭔가', '왠지',
      // 지시어
      '그게', '이게', '저게', '여기', '거기', '이렇게', '저렇게', '그렇게',
      // 의존명사
      '것', '수', '때', '점', '부분', '내용', '경우', '곳', '쪽',
    ]);
    const wordMap: Record<string, number> = {};
    emotions.forEach((item: any) => {
      // 학습 관련 필드만 사용 (어려운 내용 + 학습 목표)
      const texts = [item.EDU_confused, item.EDU_goal].filter(Boolean).join(' ');
      texts.split(/\s+/).forEach(word => {
        const clean = word.replace(/[^가-힣a-zA-Z]/g, '');
        if (clean.length < 2) return;
        if (stopWords.has(clean)) return;

        // 영문 단어: 의미없는 반복 문자열 제외 (aa, bb, aabb 등)
        const isEnglish = /^[a-zA-Z]+$/.test(clean);
        if (isEnglish) {
          if (clean.length < 3) return;                    // 2글자 이하 영문 제외
          if (/^(.)\1+$/.test(clean)) return;              // aaa, bbb 등 단일 문자 반복
          if (/^([a-zA-Z])\1{1,}([a-zA-Z])\2{1,}$/.test(clean)) return; // aabb, ccdd 등
        }

        // 한국어: 동사·형용사 어미 패턴 제외
        const isVerb =
          /다$/.test(clean) ||
          /[어아][요서]$/.test(clean) ||
          /[었겠]$/.test(clean) ||
          /[네지죠]$/.test(clean) ||
          /[고며]$/.test(clean) ||
          /니까$/.test(clean) ||
          /[도만]$/.test(clean) ||
          /한데$/.test(clean) ||
          /[같한운]$/.test(clean) ||
          /[던]$/.test(clean);
        if (isVerb) return;

        wordMap[clean] = (wordMap[clean] || 0) + 1;
      });
    });
    const keywords = Object.entries(wordMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w]) => w);

    // 5. 감정 히트맵 달력
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const firstDow = new Date(year, month, 1).getDay();
    const dateColorMap: Record<string, string> = {};
    emotions.forEach((item: any) => {
      const d = new Date(item.createdAt);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const key = d.getDate().toString();
      if (dateColorMap[key]) return;
      const a = item.Analysis;
      if (!a) { dateColorMap[key] = 'rgba(255,255,255,0.08)'; return; }
      const posScore = POSITIVE_KEYS.reduce((s, k) => s + (a[k] || 0), 0);
      const negScore = NEGATIVE_KEYS.reduce((s, k) => s + (a[k] || 0), 0);
      if (posScore > negScore) dateColorMap[key] = '#4FD1A5';
      else if (negScore > posScore * 1.2) dateColorMap[key] = '#F87171';
      else dateColorMap[key] = '#FCD34D';
    });

    return { dowPattern, trendData, keywords, dateColorMap, firstDow, lastDay, month };
  }, [emotions]);

  // 최신 GPT 요약
  const latestSummary = useMemo(() => {
    for (const item of emotions) {
      const summary = (item as any).Analysis?.gptEduSummary;
      if (summary) return summary;
    }
    return null;
  }, [emotions]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-[1400px] mx-auto px-6 py-10 font-brand-kor">
      <div className="flex gap-8 items-start justify-center">

        {/* ── 좌측 사이드바 (sticky) ── */}
        <aside className="w-[370px] shrink-0 sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto space-y-6 pb-6">

          {/* Candy Status */}
          <div className="bg-brand-surface/20 rounded-3xl p-7 border border-white/50 shadow-sm">
            <h3 className="text-xs font-black text-brand-primary/50 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Star size={14} className="text-brand-yellow fill-brand-yellow" /> Candy Status
            </h3>
            <div className="p-5 bg-white/60 rounded-2xl border border-white/40 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-mint/20 rounded-xl flex items-center justify-center shrink-0">
                <Gamepad2 size={22} className="text-brand-mint" />
              </div>
              <div>
                <p className="text-[11px] font-black text-brand-primary/50 uppercase tracking-widest">현재 캔디</p>
                <p className="text-3xl font-black text-brand-primary">{user?.current_candy_count || 0}개</p>
                <p className="text-[11px] text-brand-primary/40 mt-0.5">하루 최대 2개 적립</p>
              </div>
            </div>
          </div>

          {/* My Avatar */}
          <div className="bg-white rounded-3xl border-2 border-brand-surface p-6 shadow-md flex flex-col items-center relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3 self-start">
              <Package size={14} className="text-brand-primary" />
              <span className="text-xs font-black text-brand-primary uppercase">My Avatar</span>
            </div>
            <div className="w-40 h-40 flex items-center justify-center mb-4">
              {currentAvatar?.video_url ? (
                <video src={currentAvatar.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={currentAvatar?.image_url || "/yummyd_character_pure.png"} alt="Avatar" className="w-full h-full object-contain drop-shadow-lg" />
              )}
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={handleDraw} disabled={isDrawing}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow transition-all ${
                isDrawing ? 'bg-brand-surface text-brand-primary/30' : 'bg-brand-primary text-white hover:bg-brand-primary/90'
              }`}
            >
              <Sparkles className={isDrawing ? "animate-spin" : "text-brand-yellow"} size={16} />
              {isDrawing ? "뽑는 중..." : "캔디 2개로 랜덤 뽑기"}
            </motion.button>
            <AnimatePresence>
              {lastDrawnItem && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute inset-x-4 bottom-16 bg-white border-2 border-brand-yellow p-3 rounded-2xl shadow-xl z-20 text-center">
                  <p className="text-[10px] font-black text-brand-yellow uppercase">새로운 아바타!</p>
                  <p className="text-base font-black text-brand-primary">{lastDrawnItem.name}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* My Collection */}
          <div className="bg-brand-surface/5 rounded-3xl p-5 border border-brand-surface/20">
            <h4 className="text-xs font-black text-brand-primary/40 uppercase tracking-[0.15em] px-1 mb-3">
              My Collection ({displayCollection.length})
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {displayCollection.map((item) => {
                const avatar = item.Collection;
                return (
                  <motion.button key={item.id} whileHover={{ scale: 1.08 }}
                    onClick={async () => { await toggleEquip(item.collection_id); setCurrentAvatar(item.Collection); }}
                    className={`aspect-square rounded-xl border-2 overflow-hidden flex items-center justify-center transition-all relative ${
                      item.is_equipped ? 'border-brand-primary bg-brand-primary/10 shadow' : 'border-white bg-white/40 hover:bg-white'
                    }`}
                  >
                    {avatar?.video_url ? (
                      <video src={avatar.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : avatar?.image_url ? (
                      <img src={avatar.image_url} alt={avatar.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Sparkles size={14} className="text-brand-primary/30" />
                    )}
                    {item.is_equipped && (
                      <div className="absolute top-1 right-1 w-2 h-2 bg-brand-primary rounded-full" />
                    )}
                  </motion.button>
                );
              })}
              {displayCollection.length === 0 && (
                <div className="col-span-4 py-8 text-center text-brand-primary/30 text-xs font-bold">
                  아직 수집한 아이템이 없어요.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* ── 우측 메인 영역 ── */}
        <main className="w-[700px] shrink-0 space-y-6">

          {/* 상단 탭 버튼 - 화면 상단 고정 */}
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex gap-3 bg-brand-bg/90 backdrop-blur-md py-3 px-4 rounded-full shadow-xl border border-brand-surface">
            <button
              onClick={() => handleTabClick('edu')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                activeTab === 'edu' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white text-brand-primary/60 hover:text-brand-primary border border-brand-surface'
              }`}
            >
              <BookOpen size={16} /> 학습 내용 보기
            </button>
            <button
              onClick={() => handleTabClick('emo')}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm transition-all ${
                activeTab === 'emo' ? 'bg-brand-primary text-white shadow-lg' : 'bg-white text-brand-primary/60 hover:text-brand-primary border border-brand-surface'
              }`}
            >
              <Heart size={16} /> 감정 내용 보기
            </button>
          </div>

          {/* ── 학습 내용 섹션 ── */}
          <div ref={eduRef} className="space-y-6">
            <h2 className="text-xs font-black text-brand-primary/40 uppercase tracking-widest flex items-center gap-2">
              <BookOpen size={14} /> 학습 내용
            </h2>

            {/* Daily Briefing */}
            <div className="bg-white border-2 border-brand-surface rounded-3xl p-8 shadow-md">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-brand-primary/10 rounded-xl flex items-center justify-center">
                  <BrainCircuit size={16} className="text-brand-primary" />
                </div>
                <h3 className="text-base font-black text-brand-primary">Daily Briefing</h3>
                <span className="text-[10px] text-brand-primary/30 font-bold ml-1">AI 학습 요약</span>
              </div>
              {latestSummary ? (
                <div className="flex items-start gap-4">
                  <Quote size={20} className="text-brand-primary/20 fill-brand-primary/10 shrink-0 mt-1" />
                  <p className="text-sm font-medium text-brand-primary/80 leading-relaxed">{latestSummary}</p>
                </div>
              ) : (
                <p className="text-sm text-brand-primary/30 font-medium">아직 AI 분석 결과가 없어요. 회고를 작성하면 요약이 여기 표시됩니다.</p>
              )}
            </div>

            {/* 오늘의 리마인드 */}
            <div className="bg-brand-surface/30 border border-brand-surface rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-yellow/20 rounded-xl flex items-center justify-center">
                    <RefreshCw size={14} className="text-brand-orange" />
                  </div>
                  <h3 className="text-base font-black text-brand-primary">오늘의 리마인드</h3>
                  <span className="text-[10px] text-brand-primary/30 font-bold ml-1">매일 새로운 항목</span>
                </div>
              </div>
              {remindItem ? (
                <div className="bg-white rounded-2xl p-5 border border-brand-surface shadow-sm">
                  <p className="text-[10px] font-black text-brand-primary/40 uppercase tracking-widest mb-2">헷갈렸던 내용</p>
                  <p className="text-sm font-medium text-brand-primary leading-relaxed">💡 {remindItem}</p>
                </div>
              ) : (
                <p className="text-sm text-brand-primary/30 font-medium">회고에 헷갈리는 내용을 작성하면 매일 하나씩 리마인드해 드려요.</p>
              )}
            </div>

            {/* 기록 히스토리 */}
            <div className="bg-white border-2 border-brand-surface rounded-3xl p-8 shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-mint/20 rounded-xl flex items-center justify-center">
                    <History size={16} className="text-brand-mint" />
                  </div>
                  <h3 className="text-base font-black text-brand-primary">기록 히스토리</h3>
                </div>
                <div className="flex items-center gap-2">
                  {selectedDate && (
                    <button onClick={() => setSelectedDate('')}
                      className="text-[10px] font-black text-brand-primary/40 hover:text-brand-primary px-2 py-1 rounded-lg hover:bg-brand-surface transition-all">
                      초기화
                    </button>
                  )}
                  <div className="relative">
                    <button onClick={() => setCalendarOpen(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-black transition-all ${
                        selectedDate ? 'bg-brand-primary text-white border-brand-primary' : 'bg-brand-surface/40 text-brand-primary/60 border-brand-surface hover:border-brand-primary/30'
                      }`}>
                      <Calendar size={13} />
                      {selectedDate ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '날짜 조회'}
                    </button>
                    {calendarOpen && (
                      <div className="absolute right-0 top-10 z-50 bg-white rounded-2xl shadow-2xl border border-brand-surface p-3">
                        <input
                          type="date"
                          value={selectedDate}
                          onChange={e => { setSelectedDate(e.target.value); setCalendarOpen(false); setHistoryPage(1); }}
                          className="text-sm font-medium text-brand-primary outline-none px-2 py-1 rounded-lg border border-brand-surface focus:ring-2 focus:ring-brand-mint/30"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 달력 외부 클릭 시 닫기 */}
              {calendarOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setCalendarOpen(false)} />
              )}

              {(() => {
                const PER_PAGE = 5;
                const filtered = selectedDate
                  ? emotions.filter((item: any) => new Date(item.createdAt).toLocaleDateString('sv-SE') === selectedDate)
                  : emotions;
                const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
                const safePage = Math.min(historyPage, totalPages);
                const displayed = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

                if (filtered.length === 0) return (
                  <p className="text-sm text-brand-primary/30 font-medium text-center py-6">
                    {selectedDate ? '해당 날짜에 작성한 회고가 없어요.' : '아직 작성한 회고가 없어요.'}
                  </p>
                );
                return (
                  <>
                    <div className="space-y-3">
                      {displayed.map((item: any, idx: number) => (
                        <motion.div key={item.id || idx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="bg-brand-surface/20 rounded-2xl p-4 border border-transparent hover:border-brand-surface transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black text-brand-primary/40 uppercase mb-1">
                                {new Date(item.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </p>
                              <p className="text-sm font-medium text-brand-primary truncate">
                                {item.EDU_reflectionText || item.EMO_reflectionText || '내용 없음'}
                              </p>
                              {item.EDU_goal && (
                                <p className="text-[10px] text-brand-primary/40 mt-1 truncate">❕ {item.EDU_goal}</p>
                              )}
                            </div>
                            <button
                              onClick={() => { setEditingItem(item); setEditText(item.EDU_reflectionText || item.EMO_reflectionText || ''); }}
                              className="p-1.5 text-brand-primary/20 hover:text-brand-primary rounded-lg transition-colors shrink-0">
                              <Pencil size={13} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    {/* 페이지 탭 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-1.5 pt-4">
                        <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-black text-brand-primary/40 hover:text-brand-primary disabled:opacity-20 border border-brand-surface hover:border-brand-primary/20 transition-all">
                          ‹
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button key={p} onClick={() => setHistoryPage(p)}
                            className={`w-8 h-8 rounded-xl text-[11px] font-black transition-all ${
                              safePage === p
                                ? 'bg-brand-primary text-white shadow'
                                : 'text-brand-primary/40 hover:text-brand-primary border border-brand-surface hover:border-brand-primary/20'
                            }`}>
                            {p}
                          </button>
                        ))}
                        <button onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-black text-brand-primary/40 hover:text-brand-primary disabled:opacity-20 border border-brand-surface hover:border-brand-primary/20 transition-all">
                          ›
                        </button>
                        <span className="text-[10px] text-brand-primary/30 font-bold ml-1">{safePage} / {totalPages}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* ── 감정 내용 섹션 ── */}
          <div ref={emoRef} className="space-y-6 pt-4">
            <h2 className="text-xs font-black text-brand-primary/40 uppercase tracking-widest flex items-center gap-2">
              <Heart size={14} /> 감정 내용
            </h2>

            {/* 감정 차트 */}
            <div className="bg-white border-2 border-brand-surface rounded-3xl p-8 shadow-md">
              {/* 모드 버튼 */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setChartMode('week')}
                  className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
                    chartMode === 'week'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-brand-surface/50 text-brand-primary/50 hover:bg-brand-surface'
                  }`}
                >
                  주별 차트
                </button>
                <button
                  onClick={() => setChartMode('month')}
                  className={`px-3 py-1 rounded-full text-[11px] font-black transition-all ${
                    chartMode === 'month'
                      ? 'bg-brand-primary text-white shadow-sm'
                      : 'bg-brand-surface/50 text-brand-primary/50 hover:bg-brand-surface'
                  }`}
                >
                  월별 차트
                </button>
              </div>

              {/* 헤더 */}
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-brand-pink/20 rounded-xl flex items-center justify-center">
                  <ChevronRight size={16} className="text-brand-pink" />
                </div>
                <h3 className="text-base font-black text-brand-primary">감정 분포 차트</h3>
                <span className="text-[10px] text-brand-primary/30 font-bold ml-1">
                  {chartMode === 'week' ? '최근 5회 회고 기준' : `${new Date().getMonth() + 1}월 주차별 평균`}
                </span>
              </div>

              {/* 주별 차트 — 스택 바 */}
              {chartMode === 'week' && (
                chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700, fill: '#2D5A3D99' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#2D5A3D66' }} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                      <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #E5E7EB' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                      {top5EmotionKeys.map(({ label, color }, idx) => (
                        <Bar
                          key={label}
                          dataKey={label}
                          stackId="a"
                          fill={color}
                          radius={idx === top5EmotionKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-brand-primary/30 text-sm font-medium">
                    회고를 작성하면 감정 분포 차트가 여기에 표시됩니다.
                  </div>
                )
              )}

              {/* 월별 차트 — 선 그래프 */}
              {chartMode === 'month' && (
                monthChartData.some(d => top5EmotionKeys.some(({ label }) => d[label] > 0)) ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={monthChartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fontWeight: 700, fill: '#2D5A3D99' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#2D5A3D66' }} unit="%" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                      <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #E5E7EB' }} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                      {top5EmotionKeys.map(({ label, color }) => (
                        <Line
                          key={label}
                          type="monotone"
                          dataKey={label}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 4, fill: color, strokeWidth: 0 }}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[260px] flex items-center justify-center text-brand-primary/30 text-sm font-medium">
                    이번 달 회고 데이터가 없어요.
                  </div>
                )
              )}
            </div>

            {/* 감정 인사이트 */}
            <div className="bg-brand-primary text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center">
                    <Sparkles size={16} className="text-brand-yellow" />
                  </div>
                  <h3 className="text-base font-black">나의 감정 인사이트</h3>
                  <span className="text-[10px] text-white/40 font-bold ml-1">누적 데이터 기반</span>
                </div>

                {emotionInsight ? (
                  <div className="space-y-4">

                    {/* 연속기록 스트릭 + 요일별 패턴 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/10 rounded-2xl p-4 flex items-center gap-3">
                        <Flame size={22} className="text-brand-yellow shrink-0" />
                        <div>
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-0.5">연속 기록</p>
                          <p className="text-xl font-black text-brand-yellow">{streakDays}일 연속!</p>
                        </div>
                      </div>
                      <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">요일별 패턴</p>
                        <p className="text-xs font-black text-white leading-snug">
                          {insightExtras?.dowPattern ?? '데이터 분석 중...'}
                        </p>
                      </div>
                    </div>

                    {/* 가장 많이 느낀 감정 */}
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">가장 많이 느낀 감정</p>
                      <p className="text-2xl font-black text-brand-yellow">{emotionInsight.top.label}</p>
                      <p className="text-xs text-white/60 mt-0.5">평균 {Math.round(emotionInsight.top.avg * 100)}% 확률로 감지됨</p>
                    </div>

                    {/* 긍정 / 부정 지수 */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">긍정 지수</p>
                        <p className="text-xl font-black text-brand-mint">{Math.round(emotionInsight.positive * 100)}%</p>
                      </div>
                      <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">부정 지수</p>
                        <p className="text-xl font-black text-brand-pink">{Math.round(emotionInsight.negative * 100)}%</p>
                      </div>
                    </div>

                    {/* 감정변화추이 꺾은선 */}
                    {insightExtras && insightExtras.trendData.length > 1 && (
                      <div className="bg-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp size={13} className="text-brand-mint" />
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">긍정지수 변화 추이</p>
                        </div>
                        <ResponsiveContainer width="100%" height={110}>
                          <LineChart data={insightExtras.trendData} margin={{ top: 4, right: 8, left: -30, bottom: 0 }}>
                            <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                            <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} unit="%" domain={[0, 100]} />
                            <Tooltip
                              formatter={(v: any) => [`${v}%`, '긍정지수']}
                              contentStyle={{ borderRadius: 8, fontSize: 11, background: '#1E4D3A', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                            />
                            <Line type="monotone" dataKey="긍정지수" stroke="#4FD1A5" strokeWidth={2}
                              dot={{ r: 3, fill: '#4FD1A5', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* 자주 쓴 키워드 */}
                    {insightExtras && insightExtras.keywords.length > 0 && (
                      <div className="bg-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">자주 쓴 키워드</p>
                        <div className="flex flex-wrap gap-2">
                          {insightExtras.keywords.map((word, i) => (
                            <span key={i} className="px-3 py-1.5 bg-white/15 rounded-full text-xs font-black text-white">
                              #{word}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 감정 히트맵 달력 */}
                    {insightExtras && (() => {
                      const now = new Date();
                      const selectedReflection = calendarDay !== null
                        ? emotions.find((item: any) => {
                            const d = new Date(item.createdAt);
                            return d.getFullYear() === now.getFullYear()
                              && d.getMonth() === insightExtras.month
                              && d.getDate() === calendarDay;
                          })
                        : null;
                      return (
                        <div className="bg-white/10 rounded-2xl p-4">
                          <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
                            {insightExtras.month + 1}월 감정 달력
                            <span className="normal-case font-medium ml-1 text-white/20">(날짜 클릭 시 회고 확인)</span>
                          </p>
                          <div className="grid grid-cols-7 gap-1 text-center">
                            {['일','월','화','수','목','금','토'].map(d => (
                              <div key={d} className="text-[9px] font-black text-white/30 pb-1">{d}</div>
                            ))}
                            {Array.from({ length: insightExtras.firstDow }).map((_, i) => (
                              <div key={`e-${i}`} />
                            ))}
                            {Array.from({ length: insightExtras.lastDay }, (_, i) => {
                              const day = i + 1;
                              const color = insightExtras.dateColorMap[day.toString()];
                              const isToday = now.getDate() === day;
                              const isSelected = calendarDay === day;
                              const hasData = !!color;
                              return (
                                <div
                                  key={day}
                                  onClick={() => setCalendarDay(isSelected ? null : day)}
                                  className="aspect-square rounded-md flex items-center justify-center text-[9px] font-black transition-all"
                                  style={{
                                    background: color || 'rgba(255,255,255,0.05)',
                                    color: color ? '#1E4D3A' : 'rgba(255,255,255,0.2)',
                                    boxShadow: isSelected
                                      ? '0 0 0 2px #fff'
                                      : isToday
                                      ? '0 0 0 2px #FAC775'
                                      : 'none',
                                    cursor: hasData ? 'pointer' : 'default',
                                    opacity: calendarDay !== null && !isSelected ? 0.5 : 1,
                                  }}
                                >
                                  {day}
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex items-center gap-4 mt-3">
                            {[['#4FD1A5','긍정'],['#FCD34D','중립'],['#F87171','부정']].map(([c, label]) => (
                              <div key={label} className="flex items-center gap-1.5">
                                <div className="w-3 h-3 rounded-sm" style={{ background: c }} />
                                <span className="text-[9px] text-white/40 font-bold">{label}</span>
                              </div>
                            ))}
                          </div>

                          {/* 선택 날짜 회고 미리보기 */}
                          <AnimatePresence>
                            {calendarDay !== null && (
                              <motion.div
                                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-white/10 rounded-xl p-4 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-black text-white/60">
                                      {insightExtras.month + 1}월 {calendarDay}일 회고
                                    </p>
                                    <button
                                      onClick={() => setCalendarDay(null)}
                                      className="text-white/30 hover:text-white/70 transition-colors"
                                    >
                                      <X size={13} />
                                    </button>
                                  </div>
                                  {selectedReflection ? (
                                    <div className="space-y-2">
                                      {/* 감정 */}
                                      {(selectedReflection as any).EMO_emoji && (
                                        <div className="flex items-center gap-2">
                                          <span className="text-lg">{(selectedReflection as any).EMO_emoji}</span>
                                          <span className="text-xs font-black text-white/70">{(selectedReflection as any).EMO_spell}</span>
                                        </div>
                                      )}
                                      {/* 감정 일기 */}
                                      {(selectedReflection as any).EMO_reflectionText && (
                                        <div>
                                          <p className="text-[9px] font-black text-white/30 uppercase mb-1">감정 일기</p>
                                          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3">
                                            {(selectedReflection as any).EMO_reflectionText}
                                          </p>
                                        </div>
                                      )}
                                      {/* 학습 목표 */}
                                      {(selectedReflection as any).EDU_goal && (
                                        <div>
                                          <p className="text-[9px] font-black text-white/30 uppercase mb-1">학습 목표</p>
                                          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
                                            {(selectedReflection as any).EDU_goal}
                                          </p>
                                        </div>
                                      )}
                                      {/* 배운 것 */}
                                      {(selectedReflection as any).EDU_learned && (
                                        <div>
                                          <p className="text-[9px] font-black text-white/30 uppercase mb-1">배운 것</p>
                                          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
                                            {(selectedReflection as any).EDU_learned}
                                          </p>
                                        </div>
                                      )}
                                      {/* 헷갈린 것 */}
                                      {(selectedReflection as any).EDU_confused && (
                                        <div>
                                          <p className="text-[9px] font-black text-white/30 uppercase mb-1">헷갈린 것</p>
                                          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-2">
                                            {(selectedReflection as any).EDU_confused}
                                          </p>
                                        </div>
                                      )}
                                      {/* 학습 회고 */}
                                      {(selectedReflection as any).EDU_reflectionText && (
                                        <div>
                                          <p className="text-[9px] font-black text-white/30 uppercase mb-1">학습 회고</p>
                                          <p className="text-[11px] text-white/70 leading-relaxed line-clamp-3">
                                            {(selectedReflection as any).EDU_reflectionText}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-white/30 font-medium">이 날은 작성된 회고가 없어요.</p>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })()}

                    <p className="text-xs text-white/50 leading-relaxed">
                      {emotionInsight.positive > emotionInsight.negative
                        ? `전반적으로 긍정적인 감정 상태를 유지하고 있어요. ${emotionInsight.top.label} 감정이 가장 두드러지게 나타나고 있습니다.`
                        : `최근 부정적인 감정이 다소 높게 나타나고 있어요. 야미가 당신의 마음을 응원하고 있어요.`
                      }
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-white/40 font-medium">회고를 작성하면 감정 인사이트가 여기에 표시됩니다.</p>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ── 수정 팝업 모달 ── */}
      <AnimatePresence>
        {editingItem && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setEditingItem(null)}>
            <motion.div
              className="bg-white rounded-3xl shadow-2xl w-[560px] max-w-[90vw] p-8 flex flex-col gap-5"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pencil size={16} className="text-brand-primary" />
                  <h3 className="text-base font-black text-brand-primary">회고 수정</h3>
                </div>
                <p className="text-[11px] text-brand-primary/40 font-medium">
                  {new Date(editingItem.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={10}
                className="w-full bg-brand-surface/30 rounded-2xl px-5 py-4 text-sm font-medium text-brand-primary outline-none focus:ring-4 focus:ring-brand-mint/20 resize-none leading-relaxed border border-brand-surface"
                placeholder="내용을 입력하세요."
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setEditingItem(null)}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black text-brand-primary/50 bg-brand-surface hover:bg-brand-surface/80 transition-all">
                  <X size={14} /> 취소
                </button>
                <button onClick={handleEditSave}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black text-white bg-brand-primary hover:bg-brand-primary/90 shadow transition-all">
                  <Check size={14} /> 저장
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 드로우 오버레이 애니메이션 ── */}
      <AnimatePresence>
        {phase !== 'idle' && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <AnimatePresence>
                {phase === 'flash' && (
                  <motion.div key={drawGrade}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: [0, 1, 0.8], scale: [0.8, 1.5, 1.2] }}
                    exit={{ opacity: 0, scale: 2, transition: { duration: 0.8 } }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="absolute flex items-center justify-center"
                  >
                    <div className="absolute w-[600px] h-[600px] rounded-full blur-[120px] opacity-60" style={{ background: currentColor }} />
                    <motion.div className="absolute w-[400px] h-[400px] rounded-full blur-[60px]"
                      style={{ background: `radial-gradient(circle, #ffffff 0%, ${currentColor} 70%)` }}
                      initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }} transition={{ duration: 0.5, ease: "backOut" }} />
                    <motion.div className="absolute rounded-full border-[10px]" style={{ borderColor: currentColor }}
                      initial={{ width: 100, height: 100, opacity: 1, borderWidth: "10px" }}
                      animate={{ width: 1000, height: 1000, opacity: 0, borderWidth: "1px" }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {phase !== 'reveal' && (
              <motion.div
                animate={
                  phase === 'shake' ? { rotate: [0, -10, 10, -8, 8, 0] } :
                  phase === 'flash' ? { opacity: 0.35, scale: 0.95 } :
                  phase === 'crack' ? { scale: [1, 1.05, 0.95, 0], opacity: [1, 1, 0] } : {}
                }
                transition={{ duration: 0.6 }} className="relative"
              >
                <div className="w-40 h-52 bg-white rounded-full shadow-2xl border-4 border-white" />
                {phase !== 'egg' && phase !== 'shake' && (
                  <motion.svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 120"
                    initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.25 }}>
                    <motion.path d="M10 60 L25 55 L40 65 L55 55 L70 65 L85 60"
                      stroke="gray" strokeWidth="2" fill="none" strokeLinecap="round" />
                  </motion.svg>
                )}
              </motion.div>
            )}

            {phase === 'reveal' && result && (
              <>
                <motion.div className="absolute w-[500px] h-[500px] rounded-full blur-[120px]"
                  style={{ background: currentColor }}
                  initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1.5, opacity: 0.4 }} transition={{ duration: 0.8 }} />
                <motion.div
                  initial={{ scale: 0.2, opacity: 0, rotate: -15, y: 50 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="relative z-50 flex flex-col items-center"
                >
                  <div className="bg-white/90 backdrop-blur-md p-5 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border-4 border-white w-80 overflow-hidden">
                    <div className="relative w-full aspect-square bg-gray-50 rounded-[2rem] overflow-hidden mb-6 shadow-inner flex items-center justify-center">
                      {result.video_url ? (
                        <video src={result.video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : result.image_url ? (
                        <img src={result.image_url} alt={result.name} className="w-full h-full object-contain p-4" />
                      ) : (
                        <Sparkles size={60} className="text-brand-primary/20" />
                      )}
                    </div>
                    <div className="text-center pb-2">
                      <p className="text-[11px] font-black text-brand-primary/30 uppercase tracking-[0.2em] mb-1">New Item Unlocked</p>
                      <h2 className="text-2xl font-black text-brand-primary leading-tight mb-1">{result.name}</h2>
                      <p className="text-[12px] font-bold opacity-50" style={{ color: currentColor }}>
                        {result.grade === 'legend' ? '✨ Legendary Discovery ✨' : 'Collection Updated'}
                      </p>
                    </div>
                  </div>
                  <div className="w-40 h-6 bg-black/20 blur-xl rounded-full mt-8" />
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
