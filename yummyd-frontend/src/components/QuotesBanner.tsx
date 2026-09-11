import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

// 강사 이미지 자산 경로 (public 폴더 내 영어 파일명 사용)
const teacherKang = '/teacher/teacher_kang.png';
const teacherKim = '/teacher/teacher_kim.png';
const teacherPark = '/teacher/teacher_park.png';
const teacherJung = '/teacher/teacher_jung.png';
const teacherKwon = '/teacher/teacher_kwon.png';

interface BannerConfig {
  tag: string;
  text: string;
  author: string;
  image: string;
  bgColor: string;
  textColor: string;
}

const BANNERS: BannerConfig[] = [
  {
    tag: "INSTRUCTOR MESSAGE",
    text: "“여러분의 성장은 이미 시작되었습니다. 오늘 하루의 기록이 그 증거예요.”",
    author: "박병관 강사님",
    image: teacherPark,
    bgColor: "bg-brand-primary",
    textColor: "text-white"
  },
  {
    tag: "SPECIAL MESSAGE",
    text: "“코드 한 줄보다 중요한 건, 여러분의 마음을 돌보는 시간입니다.”",
    author: "강예진 강사님",
    image: teacherKang,
    bgColor: "bg-brand-yellow",
    textColor: "text-brand-primary"
  },
  {
    tag: "ENCOURAGEMENT",
    text: "“실패는 배움의 과정일 뿐입니다. 다시 일어서는 여러분을 응원합니다.”",
    author: "김민수 강사님",
    image: teacherKim,
    bgColor: "bg-brand-mint",
    textColor: "text-brand-primary"
  },
  {
    tag: "PROVERB",
    text: "“꾸준함이 비범함을 만듭니다. 오늘의 작은 한 걸음을 소중히 여겨주세요.”",
    author: "정형 강사님",
    image: teacherJung,
    bgColor: "bg-brand-orange",
    textColor: "text-white"
  },
  {
    tag: "MENTORING",
    text: "“어제보다 조금 더 나은 오늘의 나를 위해, 함께 달려가 봅시다.”",
    author: "권승호 강사님",
    image: teacherKwon,
    bgColor: "bg-brand-purple",
    textColor: "text-white"
  }
];

export default function QuotesBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % BANNERS.length);
    }, 10000); 
    return () => clearInterval(timer);
  }, []);

  const current = BANNERS[index];

  return (
    <div className={`w-full overflow-hidden ${current.bgColor} rounded-[2.5rem] shadow-2xl relative min-h-[260px] transition-colors duration-1000`}>
      
      {/* 텍스트 컨텐츠 레이어 */}
      <div className="relative w-full h-full p-10 md:p-16 flex flex-col justify-center z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${index}`}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            className={current.textColor}
          >
            <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60 mb-4 block">
              {current.tag}
            </span>
            <h2 className="font-black text-2xl md:text-3xl leading-tight tracking-tight max-w-[60%] break-keep">
              {current.text}
            </h2>
            <p className="mt-6 font-bold text-xl opacity-90">
              {current.author}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 강사 이미지 레이어 (우측 하단 완전 밀착) */}
      <div className="absolute right-0 bottom-0 h-full w-[45%] flex items-end justify-end pointer-events-none z-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={`img-${index}`}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-full w-full flex items-end justify-end"
          >
            <motion.img 
              src={current.image} 
              alt={current.author} 
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="h-[95%] w-full object-contain object-right-bottom drop-shadow-[-20px_10px_30px_rgba(0,0,0,0.2)]"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 배경 장식 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-white/20 rounded-full blur-[100px] rotate-45" />
        <div className="absolute bottom-[-20%] right-[-5%] w-[40%] h-[120%] bg-black/10 rounded-full blur-[80px]" />
      </div>
    </div>
  );
}
