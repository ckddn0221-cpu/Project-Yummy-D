import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import { 
  Sparkles, Image as ImageIcon, X, Heart, BookOpen, Target, 
  CheckCircle2, MessageSquare, PlusCircle, Star, Cloud, 
  Zap, Compass, Rocket, Quote, Wand2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import yummyPure from '../assets/yummyd_character_pure.png';
import yummyWink from '../assets/yummyd_character_wink.png';

// 캔디 이모지 자산 임포트
import candyHappy from '../assets/candyEmoji_happy.png';
import candyNormal from '../assets/candyEmoji_normal.png';
import candySad from '../assets/candyEmoji_sad.png';
import candyTired from '../assets/candyEmoji_tired.png';
import candyAngry from '../assets/candyEmoji_angry.png';

// ─── 타입 ───────────────────────────────────────────────
type EmotionKey = 'happy' | 'normal' | 'sad' | 'tired' | 'angry';
type SpellType = 'positive' | 'neutral' | 'negative' | 'burnout' | 'anger';
type AchievementKey = 'clear' | 'half' | 'little' | 'retry';

interface Spell {
  icon: string;
  main: string;
  placeholder: string;
}

// ─── 데이터 ──────────────────────────────────────────────
const EMOTIONS: { key: EmotionKey; img: string; label: string; spellType: SpellType }[] = [
  { key: 'happy',  img: candyHappy,   label: '좋아요',   spellType: 'positive' },
  { key: 'normal', img: candyNormal,  label: '보통이요',  spellType: 'neutral'  },
  { key: 'sad',    img: candySad,     label: '슬퍼요',   spellType: 'negative' },
  { key: 'tired',  img: candyTired,   label: '지쳐요',   spellType: 'burnout'  }, // candyAnxious -> candyTired 교정
  { key: 'angry',  img: candyAngry,   label: '짜증나요',  spellType: 'anger'    },
];

const SPELL_ICONS = ['⭐', '🌟', '✨', '🌈', '🍀', '🌊', '🕊️', '🌙', '💫', '🌿'];

const SPELL_DATA: Record<SpellType, string[]> = {
  positive: [
    '나는 지금 이 순간을 온전히 누릴 자격이 있다',
    '이 기분은 내가 살아있다는 증거야',
    '좋은 일은 계속해서 내게로 흘러온다',
    '잘 되는 건 당연한 일이야, 나니까',
    '나는 지금 충분히 빛나고 있다',
    '오늘의 나는 어제보다 한 뼘 더 자랐다',
    '나는 사랑받고 있고, 사랑을 줄 수 있다',
    '이 에너지가 오래도록 나와 함께하기를',
    '나는 내가 원하는 삶의 방향으로 가고 있다',
    '오늘의 이 감정을 기억하자, 반드시 다시 돌아올 거야',
  ],
  neutral: [
    '굳이 특별한 감정을 만들지 않아도 돼',
    '그냥 존재하는 것만으로도 오늘은 합격이야',
    '설레지 않아도 내 하루는 충분히 유효하다',
    '조용한 날들이 쌓여서 단단한 내가 만들어진다',
    '지금 이 평온함, 나쁘지 않아',
    '드라마틱하지 않아도 나는 잘 살아가고 있다',
    '오늘은 아무 색도 아닌 날, 그래도 나쁘지 않아',
    '아무것도 느끼지 못하는 것도 하나의 감정이야',
    '지금 이 무감각은 쉬어가는 중인 거야',
    '작은 것 하나에만 집중해보자, 지금 이 온도, 이 숨소리',
  ],
  negative: [
    '지금 힘든 게 맞아, 괜찮지 않아도 돼',
    '이 슬픔은 내가 무언가를 소중히 여긴다는 뜻이야',
    '울어도 괜찮아, 눈물은 막힌 것을 흘려보내는 거야',
    '이 감정도 지나간다, 모든 건 흐른다',
    '나는 이 슬픔에 삼켜지지 않는다',
    '슬픔을 느낀다는 건 내가 아직 살아있다는 거야',
    '지금 당장 해결하지 않아도 된다',
    '이 어둠 속에서도 나는 나를 잃지 않는다',
    '나는 나를 포기하지 않는다',
    '나에게 다정하게 대해줄 사람은 먼저 나 자신이야',
  ],
  burnout: [
    '숨 한 번 쉬자, 그것만으로 충분해',
    '나는 지금까지 정말 많이 버텨왔다',
    '쉬는 것도 하나의 일이야, 죄책감 갖지 않아도 돼',
    '오늘의 나는 여기까지만, 그것으로 충분히 잘 했어',
    '지친 나를 몰아붙이지 않겠다',
    '내 몸과 마음이 쉬고 싶다고 말하는 거야, 들어줄게',
    '모든 걸 다 잘할 필요는 없어',
    '잠깐 멈추는 건 포기가 아니야',
    '나는 소진되면서까지 증명할 것이 없다',
    '지금 이 피로는, 내가 열심히 살아온 증거야',
  ],
  anger: [
    '짜증나는 게 맞아, 그럴 만 하니까',
    '이 감정은 신호야, 내가 뭔가를 원하고 있다는 뜻이야',
    '지금 이 불쾌함은 내가 예민한 게 아니라 당연한 반응이야',
    '나는 이 감정에 끌려다니지 않겠다',
    '심호흡 한 번, 지금 이 순간만 넘기면 돼',
    '모든 걸 참을 필요는 없지만, 내가 다치지 않는 방식으로 풀자',
    '짜증은 에너지야, 잘 쓰면 나를 움직이는 힘이 돼',
    '지금 나를 힘들게 하는 것에 끌려다니지 않겠다',
    '이 감정도 잠시 후엔 옅어진다',
    '나는 나의 짜증을 판단하지 않겠다, 그냥 느끼고 보내줄게',
  ],
};

const SPELL_PLACEHOLDER_MAP: Record<string, string> = {
  '나는 지금 이 순간을 온전히 누릴 자격이 있다':       '지금 이 순간, 어떤 기분이 느껴지나요?',
  '이 기분은 내가 살아있다는 증거야':                   '오늘 살아있음을 느끼게 해준 것이 있나요?',
  '좋은 일은 계속해서 내게로 흘러온다':                 '오늘 나에게 흘러온 작은 좋은 일을 적어볼까요?',
  '잘 되는 건 당연한 일이야, 나니까':                   '오늘 나답게 잘 해낸 것, 하나만 써봐요',
  '나는 지금 충분히 빛나고 있다':                       '지금 내가 빛난다고 느끼는 이유가 있나요?',
  '오늘의 나는 어제보다 한 뼘 더 자랐다':               '어제와 달라진 오늘의 내가 느껴지나요?',
  '나는 사랑받고 있고, 사랑을 줄 수 있다':              '오늘 사랑을 느낀 순간이 있었나요?',
  '이 에너지가 오래도록 나와 함께하기를':               '지금 이 에너지로 하고 싶은 게 있나요?',
  '나는 내가 원하는 삶의 방향으로 가고 있다':           '지금 나는 어디로 향하고 있는 것 같나요?',
  '오늘의 이 감정을 기억하자, 반드시 다시 돌아올 거야': '지금 이 감정을 미래의 나에게 한 마디로 남겨봐요',
  '굳이 특별한 감정을 만들지 않아도 돼':                '특별하지 않은 오늘, 그냥 있는 그대로 적어봐요',
  '그냥 존재하는 것만으로도 오늘은 합격이야':           '오늘 존재하면서 한 것 중 하나만 적어볼까요?',
  '설레지 않아도 내 하루는 충분히 유효하다':            '설레진 않았지만, 오늘 있었던 일을 담담하게 적어봐요',
  '조용한 날들이 쌓여서 단단한 내가 만들어진다':        '요즘 조용히 쌓이고 있는 것이 있나요?',
  '지금 이 평온함, 나쁘지 않아':                        '지금 이 고요함 속에서 뭐가 느껴지나요?',
  '드라마틱하지 않아도 나는 잘 살아가고 있다':          '별일 없는 오늘, 그래도 내가 해낸 것은요?',
  '오늘의 아무 색도 아닌 날, 그래도 나쁘지 않아':      '오늘을 색으로 표현한다면 어떤 색일 것 같아요?',
  '아무것도 느끼지 못하는 것도 하나의 감정이야':        '지금 아무것도 느껴지지 않는다면, 그것도 써봐도 돼요',
  '지금 이 무감각은 쉬어가는 중인 거야':                '요즘 나의 마음이 쉬고 싶어하는 것 같나요?',
  '작은 것 하나에만 집중해보자, 지금 이 온도, 이 숨소리': '지금 이 순간 느껴지는 감각을 하나만 적어볼까요?',
  '지금 힘든 게 맞아, 괜찮지 않아도 돼':               '지금 힘든 것, 여기에 그냥 털어놓아도 괜찮아요',
  '이 슬픔은 내가 무언가를 소중히 여긴다는 뜻이야':    '지금 나에게 소중한 게 뭔지 느껴지나요?',
  '울어도 괜찮아, 눈물은 막힌 것을 흘려보내는 거야':   '지금 흘려보내고 싶은 것이 있나요?',
  '이 감정도 지나간다, 모든 건 흐른다':                 '지금 이 감정이 어디서 왔는지, 가만히 느껴봐요',
  '나는 이 슬픔에 삼켜지지 않는다':                     '지금 나를 붙잡고 있는 것이 무엇인가요?',
  '슬픔을 느낀다는 건 내가 아직 살아있다는 거야':       '지금 내 안에서 살아있는 감정을 적어봐요',
  '지금 당장 해결하지 않아도 된다':                     '지금 당장 해결하지 않아도 되는 것, 내려놓아봐요',
  '이 어둠 속에서도 나는 나를 잃지 않는다':             '지금 어둠 속에서도 내가 붙잡고 있는 것은요?',
  '나는 나를 포기하지 않는다':                          '지금 나 자신에게 해주고 말이 있나요?',
  '나에게 다정하게 대해줄 사람은 먼저 나 자신이야':     '지금 나에게 가장 필요한 다정한 말 한마디는요?',
  '숨 한 번 쉬자, 그것만으로 충분해':                   '숨을 고르고 나서, 지금 떠오르는 것을 적어봐요',
  '나는 지금까지 정말 많이 버텨왔다':                   '내가 버텨온 것들 중 하나만 꺼내봐요, 잘 해왔어요',
  '쉬는 것도 하나의 일이야, 죄책감 갖지 않아도 돼':    '요즘 쉬지 못하게 만드는 것이 있나요?',
  '오늘의 나는 여기까지만, 그것으로 충분히 잘 했어':         '오늘 내가 해낸 것 중 딱 하나만, 스스로 인정해줘요',
  '지친 나를 몰아붙이지 않겠다':                        '요즘 나를 가장 지치게 만드는 게 뭔가요?',
  '내 몸과 마음이 쉬고 싶다고 말하는 거야, 들어줄게':  '지금 몸과 마음이 원하는 게 뭔지 느껴지나요?',
  '모든 걸 다 잘할 필요는 없어':                        '요즘 내가 너무 많이 짊어지고 있는 것이 있나요?',
  '잠깐 멈추는 건 포기가 아니야':                       '지금 잠깐 멈추고 싶은 이유를 적어봐요',
  '나는 소진되면서까지 증명할 것이 없다':               '요즘 내가 누구에게, 무엇을 증명하려 했던 것 같나요?',
  '지금 이 피로는, 내가 열심히 살아온 증거야':          '오늘 이 피로를 만들어낸 나의 하루는 어땠나요?',
  '짜증나는 게 맞아, 그럴 만 하니까':                   '지금 뭐가 가장 짜증나나요? 여기선 솔직해도 돼요',
  '이 감정은 신호야, 내가 뭔가를 원하고 있다는 뜻이야': '지금 내가 진짜 원하는 게 뭔지 느껴지나요?',
  '지금 이 불쾌함은 내가 예민한 게 아니라 당연한 반응이야': '어떤 상황이 나를 불쾌하게 만들었나요?',
  '나는 이 감정에 끌려다니지 않겠다':                   '지금 이 감정을 어떻게 다루고 싶은가요?',
  '심호흡 한 번, 지금 이 순간만 넘기면 돼':             '숨 고르고 나서, 지금 딱 한 가지만 적어봐요',
  '모든 걸 참을 필요는 없지만, 내가 다치지 않는 방식으로 풀자': '나를 다치지 않게 이 감정을 풀 방법이 있을까요?',
  '짜증은 에너지야, 잘 쓰면 나를 움직이는 힘이 돼':    '이 에너지를 어디에 쓰고 싶은가요?',
  '지금 나를 힘들게 하는 것에 끌려다니지 않겠다':       '지금 나를 가장 힘들게 하는 것이 뭔지 써봐요',
  '이 감정도 잠시 후엔 옅어진다':                       '이 감정이 지나가고 나면 어떻게 되고 싶나요?',
  '나는 나의 짜증을 판단하지 않겠다, 그냥 느끼고 보내줄게': '지금 이 짜증을 그냥 여기에 내려놓아봐요',
};

const pickRandom = <T,>(arr: T[], count: number): T[] =>
  [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(count, arr.length));

const toSpells = (texts: string[], _spellType: SpellType | 'mixed' = 'mixed'): Spell[] =>
  texts.map((text, i) => ({
    icon: SPELL_ICONS[i % SPELL_ICONS.length],
    main: text,
    placeholder: SPELL_PLACEHOLDER_MAP[text] ?? '오늘 하루 어떤 감정이 가장 컸나요? 편하게 털어놔봐요 :)',
  }));

const ACHIEVEMENTS: Record<AchievementKey, { icon: JSX.Element; main: string; sub: string; color: string; activeColor: string }> = {
  clear:  { icon: <CheckCircle2 size={22} />, main: '완벽 이해',     sub: '오늘 목표 완벽 달성',      color: 'border-gray-100 bg-white text-gray-400', activeColor: 'border-brand-mint bg-brand-mint/10 text-brand-primary' },
  half:   { icon: <CheckCircle2 size={22} />, main: '절반 이해',     sub: '반은 됐어요, 나머지는 내일!', color: 'border-gray-100 bg-white text-gray-400', activeColor: 'border-brand-orange bg-brand-orange/10 text-brand-orange' },
  little: { icon: <CheckCircle2 size={22} />, main: '조금 알겠음',     sub: '방향은 잡혔어요',           color: 'border-gray-100 bg-white text-gray-400', activeColor: 'border-brand-sky bg-brand-sky/10 text-brand-sky' },
  retry:  { icon: <CheckCircle2 size={22} />, main: '다음에 다시',     sub: '오늘 좀 어려웠어요',      color: 'border-gray-100 bg-white text-gray-400', activeColor: 'border-brand-coral bg-brand-coral/10 text-brand-coral' },
};

// ─── 마법 입자 컴포넌트 ───────────────────────────────────
function MagicParticle({ containerWidth }: { containerWidth: number }) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0], 
            y: -60 - Math.random() * 40,
            x: (Math.random() - 0.5) * containerWidth,
            scale: [0, 1.2, 0.5]
          }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute left-1/2 top-1/2 text-brand-purple"
        >
          <Star size={12 + Math.random() * 8} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
}

// ─── 컴포넌트 ────────────────────────────────────────────
export default function Reflection() {
  const navigate = useNavigate();

  // 감정 섹션 상태
  const [selectedEmotion, setSelectedEmotion] = useState<EmotionKey | null>(null);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [showAllSpells, setShowAllSpells] = useState(false);
  const [displayedSpells, setDisplayedSpells] = useState<Spell[]>([]);
  const [extraSpells, setExtraSpells] = useState<Spell[]>([]);
  const [emotionOneLine, setEmotionOneLine] = useState('');
  const [emotionImage, setEmotionImage] = useState<string | null>(null);
  const [spellBurst, setSpellBurst] = useState(0);

  // 학습 섹션 상태
  const [todayGoal, setTodayGoal] = useState('');
  const [achievement, setAchievement] = useState<AchievementKey | null>(null);
  const [learned, setLearned] = useState('');
  const [confused, setConfused] = useState('');
  const [review, setReview] = useState('');
  const [freeText, setFreeText] = useState('');
  const [studyImage, setStudyImage] = useState<string | null>(null);

  // 공통 상태
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [charToggle, setCharToggle] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const emotionFileRef = useRef<HTMLInputElement>(null);
  const studyFileRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number | null>(null);

  const recordStartTime = () => {
    if (!startTimeRef.current) startTimeRef.current = Date.now();
  };

  const { user, setAnalyzing, isAnalyzing, fetchHistory, emotions } = useStore();

  const yesterdayReview = emotions[0]?.EDU_review ?? null;

  useEffect(() => {
    const checkStatus = async () => {
      if (isAnalyzing && user) {
        await fetchHistory();
        const last = emotions[0];
        if (last && last.createdAt) {
          const finishedAt = new Date(last.updatedAt).getTime();
          if (Date.now() - finishedAt < 60000) setAnalyzing(false);
        }
      }
    };
    checkStatus();
    if (isAnalyzing) {
      const timer = setTimeout(() => setAnalyzing(false), 30000);
      return () => clearTimeout(timer);
    }
  }, [isAnalyzing, user, fetchHistory, emotions, setAnalyzing]);

  useEffect(() => {
    let charInterval: ReturnType<typeof setInterval>;
    if (isTransitioning) {
      setCharToggle(true);
      charInterval = setInterval(() => {
        setCharToggle(prev => !prev);
      }, 700);
    }
    return () => clearInterval(charInterval);
  }, [isTransitioning]);

  const processImage = (file: File): Promise<string> => {
    setIsProcessing(true);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1200;
            let width = img.width;
            let height = img.height;
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setIsProcessing(false);
            resolve(dataUrl);
          } catch (err) { setIsProcessing(false); reject(err); }
        };
        img.onerror = () => { setIsProcessing(false); reject(new Error('이미지를 불러올 수 없습니다.')); };
      };
      reader.onerror = () => { setIsProcessing(false); reject(new Error('파일을 읽는 중 오류가 발생했습니다.')); };
    });
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      try { setter(await processImage(file)); }
      catch (error: unknown) { alert(error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.'); }
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      try { setEmotionImage(await processImage(file)); }
      catch (error: unknown) { alert(error instanceof Error ? error.message : '이미지 처리 중 오류가 발생했습니다.'); }
    }
  };

  const canSubmit = !isTransitioning && (
    !!selectedEmotion || !!emotionOneLine.trim() || !!todayGoal.trim() || !!learned.trim()
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (!user) return alert('로그인이 필요합니다.');

    const delaySeconds = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : 0;

    try {
      const response = await axios.post('/api/reflection', {
        userId: user.id,
        delayMinutes: delaySeconds,
        EMO_reflectionText: emotionOneLine,
        EDU_achievement: achievement,
        image: emotionImage,
        studyImage,
        emotionEmoji: selectedEmotion,
        selectedSpell: selectedSpell?.main ?? null,
        todayGoal,
        learned,
        confused,
        review,
        freeText,
      });

      if (response.data.success) {
        setIsTransitioning(true);
        setAnalyzing(true);
        setTimeout(() => {
          setIsTransitioning(false);
          navigate('/jar');
        }, 2000);
      }
    } catch (error) {
      console.error('Submission failed:', error);
      alert('회고 등록 중 오류가 발생했습니다.');
      setIsTransitioning(false);
    }
  };

  const handleMoreSpells = () => {
    if (showAllSpells) {
      setShowAllSpells(false);
      setExtraSpells([]);
    } else {
      const currentType = EMOTIONS.find(e => e.key === selectedEmotion)!.spellType;
      const otherTexts = Object.entries(SPELL_DATA)
        .filter(([type]) => type !== currentType)
        .flatMap(([, texts]) => texts);
      setExtraSpells(toSpells(pickRandom(otherTexts, 3), 'mixed'));
      setShowAllSpells(true);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-brand-bg font-brand-kor text-brand-primary overflow-x-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ── 배경 장식 ── */}
      <div className="fixed inset-0 pointer-events-none">
        <motion.div animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[15%] left-[10%] text-brand-purple/15">
          <Heart size={120} fill="currentColor" />
        </motion.div>
        <motion.div animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute top-[40%] right-[8%] text-brand-mint/15">
          <BookOpen size={160} fill="currentColor" />
        </motion.div>
        <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-[20%] left-[15%] text-brand-yellow/20">
          <Star size={100} fill="currentColor" />
        </motion.div>
        <motion.div animate={{ x: [0, 20, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-[60%] left-[5%] text-brand-sky/10">
          <Cloud size={140} fill="currentColor" />
        </motion.div>
      </div>

      {isTransitioning && (
        <div className="fixed inset-0 z-[200] bg-brand-bg flex flex-col items-center justify-center">
          <motion.div animate={{ y: [0, -25, 0] }} transition={{ duration: 1.2, repeat: Infinity }} className="mb-12 relative w-72 h-72">
            <AnimatePresence mode="wait">
              <motion.img key={charToggle ? 'pure' : 'wink'} src={charToggle ? yummyPure : yummyWink} alt="Yummy" className="w-full h-full object-contain absolute inset-0" />
            </AnimatePresence>
          </motion.div>
          <p className="text-3xl font-black text-brand-primary">오늘의 마음을 담고 있어요 🍬</p>
        </div>
      )}

      {/* ── 헤더 (가로폭 1000px로 확장) ── */}
      <div className="max-w-[1000px] mx-auto pt-16 px-6 relative z-10">
        <h1 className="text-4xl font-black mb-3 tracking-tight">오늘의 기록</h1>
        <p className="text-lg text-gray-500 font-medium text-left">나의 하루를 반짝이는 캔디로 채워보세요.</p>
      </div>

      {/* ── 메인 컨텐츠 (가로폭 1000px로 확장) ── */}
      <div className="max-w-[1000px] mx-auto px-6 py-12 pb-40 flex flex-col gap-24 relative z-10">
        
        {/* ── Section 1: 오늘의 감정 ── */}
        <section className="flex flex-col gap-8">
          <div className="px-2 text-left">
            <h2 className="text-2xl font-black text-brand-primary/80">오늘의 감정</h2>
            <div className="h-1.5 w-16 bg-brand-purple/30 mt-2 rounded-full" />
          </div>
          
          <div className="bg-white/85 backdrop-blur-md rounded-[3rem] p-10 md:p-14 shadow-xl shadow-brand-purple/5 border border-brand-purple/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110" />
            
            <div className="relative">
              <p className="text-xl font-bold text-gray-800 mb-8 text-left">지금 떠오르는 기분은 어떤가요?</p>
              
              <div className="flex justify-between gap-4 mb-12">
                {EMOTIONS.map((em) => (
                  <button
                    key={em.key}
                    onClick={() => {
                      setSelectedEmotion(em.key);
                      setSelectedSpell(null);
                      setDisplayedSpells(toSpells(pickRandom(SPELL_DATA[em.spellType], 3), em.spellType));
                    }}
                    className={`
                      flex-1 flex flex-col items-center gap-3 py-6 rounded-3xl border-2 transition-all duration-300
                      ${selectedEmotion === em.key
                        ? 'border-brand-purple bg-brand-purple/5 shadow-inner scale-105'
                        : 'border-transparent bg-brand-surface/40 hover:bg-brand-purple/5'}
                    `}
                  >
                    <motion.img 
                      src={em.img} 
                      alt={em.label} 
                      className="w-16 h-16 md:w-24 md:h-24 object-contain mb-1"
                      animate={selectedEmotion === em.key ? { scale: 1.2, rotate: [0, 5, -5, 0] } : {}}
                    />
                    <span className={`text-sm font-bold ${selectedEmotion === em.key ? 'text-brand-purple' : 'text-gray-400'}`}>
                      {em.label}
                    </span>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {selectedEmotion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8"
                  >
                    <p className="text-base font-bold text-brand-purple mb-8 flex items-center justify-start gap-2">
                      <Wand2 size={20} className="animate-pulse" /> 당신에게 전하는 따뜻한 주문을 외워보세요
                    </p>
                    <div className="grid grid-cols-1 gap-4 max-w-[600px] ml-0 px-4">
                      {[...displayedSpells, ...extraSpells].map((spell) => (
                        <button
                          key={spell.main}
                          onClick={() => {
                            setSelectedSpell(spell);
                            setSpellBurst(prev => prev + 1);
                          }}
                          className={`
                            relative px-6 py-4 rounded-[1.5rem] border-2 text-center transition-all duration-500 group
                            ${selectedSpell?.main === spell.main
                              ? 'border-brand-purple bg-white text-brand-purple shadow-[0_10px_25px_rgba(167,139,250,0.2)] scale-105 z-20'
                              : 'border-brand-purple/10 bg-brand-surface/30 text-gray-500 hover:border-brand-purple/20'}
                          `}
                        >
                          <Quote size={16} className={`absolute top-3 left-4 opacity-10 ${selectedSpell?.main === spell.main ? 'text-brand-purple opacity-30' : ''}`} />
                          <span className={`text-base font-black tracking-tight leading-relaxed ${selectedSpell?.main === spell.main ? 'text-lg' : ''}`}>
                            {spell.main}
                          </span>
                          <Quote size={16} className={`absolute bottom-3 right-4 opacity-10 rotate-180 ${selectedSpell?.main === spell.main ? 'text-brand-purple opacity-30' : ''}`} />
                          
                          {selectedSpell?.main === spell.main && (
                            <>
                              <MagicParticle key={spellBurst} containerWidth={150} />
                              <motion.div 
                                layoutId="shimmer"
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-brand-purple/5 to-transparent rounded-[1.5rem]"
                                animate={{ x: ['-100%', '100%'] }}
                                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                              />
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                    
                    <button
                      onClick={handleMoreSpells}
                      className="w-full mt-6 flex items-center justify-start gap-2 text-sm font-bold text-brand-purple/60 hover:text-brand-purple transition-colors py-2 px-4"
                    >
                      <RefreshCw size={14} className={showAllSpells ? 'rotate-180 transition-transform' : ''} />
                      {showAllSpells ? '주문 접기' : '다른 감정의 주문 소환하기'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-8 border-t border-brand-gray/30 text-left">
                <p className="text-base font-bold text-gray-500 mb-4 ml-1 flex items-center gap-2">
                  <MessageSquare size={18} /> 조금 더 자세히 들려주세요
                </p>
                <textarea
                  rows={5}
                  className="w-full bg-brand-surface/40 rounded-3xl p-6 text-lg text-gray-800 outline-none focus:ring-4 focus:ring-brand-purple/10 transition-all resize-none placeholder:text-gray-300 leading-relaxed"
                  placeholder={selectedSpell?.placeholder ?? '오늘의 감정을 자유롭게 적어보세요.'}
                  value={emotionOneLine}
                  onChange={e => setEmotionOneLine(e.target.value)}
                />
              </div>

              <div className="mt-6 flex items-center justify-start gap-4">
                <button
                  onClick={() => emotionFileRef.current?.click()}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:bg-brand-surface/60 transition-all"
                >
                  <ImageIcon size={18} /> 감정 사진 추가
                </button>
                <input type="file" ref={emotionFileRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setEmotionImage)} />
                {emotionImage && (
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-brand-purple/20">
                    <img src={emotionImage} className="w-full h-full object-cover" />
                    <button onClick={() => setEmotionImage(null)} className="absolute top-0 right-0 bg-black/60 text-white p-1 rounded-bl-xl"><X size={12} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 2: 학습 내용 정리 ── */}
        <section className="flex flex-col gap-8">
          <div className="px-2 text-left">
            <h2 className="text-2xl font-black text-brand-primary/80">학습 내용 정리</h2>
            <div className="h-1.5 w-16 bg-brand-mint/30 mt-2 rounded-full" />
          </div>

          <div className="bg-white/85 backdrop-blur-md rounded-[3rem] p-10 md:p-14 shadow-xl shadow-brand-mint/5 border border-brand-mint/10 relative overflow-hidden group">
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-mint/5 rounded-full -ml-32 -mb-32 transition-transform duration-700 group-hover:scale-110" />
            
            <div className="relative">
              {yesterdayReview && (
                <div className="bg-brand-mint/5 border border-brand-mint/20 rounded-[2rem] p-6 mb-10 flex gap-4 items-start shadow-inner">
                  <p className="text-lg text-gray-600 leading-relaxed text-left">
                    <Sparkles size={22} className="text-brand-mint inline-block mr-2" />
                    어제의 다짐을 기억하시나요? <br />
                    <span className="font-black text-brand-primary/80 text-xl ml-8">"{yesterdayReview}"</span>
                  </p>
                </div>
              )}

              <div className="mb-12 text-left">
                <p className="text-base font-bold text-gray-500 mb-4 ml-1 flex items-center gap-2">
                  <Target size={18} /> 오늘 꼭 해내고 싶었던 목표
                </p>
                <input
                  type="text"
                  className="w-full bg-brand-surface/40 rounded-2xl px-7 py-5 text-lg text-gray-800 outline-none focus:ring-4 focus:ring-brand-mint/10 transition-all font-medium"
                  placeholder="예) 알고리즘 2문제 풀기"
                  value={todayGoal}
                  onChange={e => { recordStartTime(); setTodayGoal(e.target.value); }}
                />
              </div>

              <div className="mb-12 text-left">
                <p className="text-base font-bold text-gray-500 mb-4 ml-1">오늘의 성취도</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(ACHIEVEMENTS).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => setAchievement(key as AchievementKey)}
                      className={`
                        flex flex-col items-center gap-3 px-4 py-6 rounded-2xl border-2 transition-all duration-300
                        ${achievement === key ? data.activeColor : data.color + ' hover:border-brand-gray/50'}
                      `}
                    >
                      <span className={achievement === key ? 'text-inherit' : 'text-gray-300'}>{data.icon}</span>
                      <div className="text-center">
                        <p className="text-base font-black">{data.main}</p>
                        <p className="text-[10px] opacity-60 font-medium">{data.sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-8 mb-12 text-left">
                <div className="group/item">
                  <p className="text-base font-black text-brand-mint mb-3 ml-2 flex items-center gap-2.5">
                    <Zap size={22} fill="currentColor" className="text-brand-yellow group-hover/item:rotate-12 transition-transform" /> 
                    오늘의 번뜩이는 발견
                  </p>
                  <input
                    type="text"
                    className="w-full bg-brand-surface/40 rounded-2xl px-7 py-5 text-lg text-gray-800 outline-none focus:ring-2 focus:ring-brand-mint/30 transition-all shadow-sm"
                    placeholder="새롭게 깨달은 사실이 있다면?"
                    value={learned}
                    onChange={e => { recordStartTime(); setLearned(e.target.value); }}
                  />
                </div>
                
                <div className="group/item">
                  <p className="text-base font-black text-brand-sky mb-3 ml-2 flex items-center gap-2.5">
                    <Compass size={22} className="group-hover/item:rotate-90 transition-transform duration-500" /> 
                    더 다듬어야 할 부분
                  </p>
                  <input
                    type="text"
                    className="w-full bg-brand-surface/40 rounded-2xl px-7 py-5 text-lg text-gray-800 outline-none focus:ring-2 focus:ring-brand-sky/30 transition-all shadow-sm"
                    placeholder="아직은 알쏭달쏭한 것이 있나요?"
                    value={confused}
                    onChange={e => { recordStartTime(); setConfused(e.target.value); }}
                  />
                </div>

                <div className="group/item">
                  <p className="text-base font-black text-brand-coral mb-3 ml-2 flex items-center gap-2.5">
                    <Rocket size={22} className="group-hover/item:-translate-y-1 group-hover/item:translate-x-1 transition-transform" /> 
                    내일의 도약을 위한 미션
                  </p>
                  <input
                    type="text"
                    className="w-full bg-brand-surface/40 rounded-2xl px-7 py-5 text-lg text-gray-800 outline-none focus:ring-2 focus:ring-brand-coral/30 transition-all shadow-sm"
                    placeholder="내일의 나에게 미션을 남겨보세요."
                    value={review}
                    onChange={e => { recordStartTime(); setReview(e.target.value); }}
                  />
                </div>
              </div>

              <div className="text-left">
                <p className="text-base font-bold text-gray-500 mb-4 ml-1">상세 내용 (메모)</p>
                <textarea
                  rows={10}
                  className="w-full bg-brand-surface/40 rounded-3xl p-6 text-base text-gray-800 outline-none focus:ring-4 focus:ring-brand-mint/10 transition-all resize-none leading-relaxed"
                  placeholder="공부한 내용이나 떠오른 아이디어를 자유롭게 적어보세요."
                  value={freeText}
                  onChange={e => { recordStartTime(); setFreeText(e.target.value); }}
                />
              </div>

              <div className="mt-6 flex items-center justify-start gap-4">
                <button
                  onClick={() => studyFileRef.current?.click()}
                  className="flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border-2 border-dashed border-gray-300 text-sm font-bold text-gray-500 hover:bg-brand-surface/60 transition-all"
                >
                  <ImageIcon size={18} /> 학습 자료 첨부
                </button>
                <input type="file" ref={studyFileRef} className="hidden" accept="image/*" onChange={e => handleImageUpload(e, setStudyImage)} />
                {studyImage && (
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-brand-mint/20">
                    <img src={studyImage} className="w-full h-full object-cover" />
                    <button onClick={() => setStudyImage(null)} className="absolute top-0 right-0 bg-black/60 text-white p-1 rounded-bl-xl"><X size={12} /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* ── 하단 플로팅 바 (가로폭 1000px로 확장) ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-brand-bg/90 backdrop-blur-xl border-t border-brand-gray/30 py-6 px-10 z-[150]">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between">
          <div className="hidden md:block">
            <p className="text-sm font-bold text-brand-primary/60 text-left">오늘의 모든 기록이 당신을 빛나게 할 거예요.</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="group flex items-center gap-4 px-16 py-5 bg-brand-primary text-brand-surface rounded-[2rem] font-black text-xl shadow-2xl shadow-brand-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale disabled:scale-100"
          >
            기록 완료하기
            <CheckCircle2 size={24} className="group-hover:rotate-12 transition-transform" />
          </button>
        </div>
      </div>

    </div>
  );
}
