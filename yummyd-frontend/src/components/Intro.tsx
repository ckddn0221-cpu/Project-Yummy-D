import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import logo from '../assets/yummyd_logo_full.png';

interface IntroProps {
  onComplete: () => void;
}

export default function Intro({ onComplete }: IntroProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500); // 애니메이션 총 시간 고려
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="intro"
        initial={{ opacity: 1 }}
        exit={{ 
          y: '-100%',
          transition: { duration: 0.8, ease: [0.76, 0, 0.24, 1] }
        }}
        className="fixed inset-0 z-[100] bg-brand-primary flex flex-col items-center justify-center overflow-hidden"
      >
        {/* Decorative Background Elements */}
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1.5, opacity: 0.1 }}
          transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
          className="absolute w-[600px] h-[600px] bg-white rounded-full blur-[120px]"
        />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mb-8"
          >
            <img src={logo} alt="Yummy Logo" className="w-32 h-32 object-contain drop-shadow-2xl" />
          </motion.div>

          <div className="overflow-hidden">
            <motion.h1
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              transition={{ delay: 0.8, duration: 0.8, ease: "circOut" }}
              className="text-4xl md:text-6xl font-black text-white tracking-tighter text-center leading-tight"
            >
              당신의 마음을 <br />
              <span className="text-brand-yellow">달콤하게</span> 보관하세요
            </motion.h1>
          </div>

          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ delay: 1.2, duration: 1.5, ease: "easeInOut" }}
            className="h-[2px] bg-white/20 mt-12 w-64 rounded-full overflow-hidden"
          >
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              className="h-full w-full bg-brand-yellow"
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 2 }}
          className="absolute bottom-12 text-white/60 font-bold tracking-[0.3em] text-xs uppercase"
        >
          Refining Your Emotions
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
