import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import logo from '../assets/YummyD_logo.png';

export default function YummyCharacter() {
  const { isAnalyzing } = useStore();

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Background Aura */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute w-64 h-64 bg-brand-mint rounded-full blur-[80px]"
      />

      {/* Mascot Container */}
      <motion.div
        animate={{
          y: isAnalyzing ? [-10, 10, -10] : [0, -20, 0],
          rotate: isAnalyzing ? [0, 5, -5, 0] : 0
        }}
        transition={{
          duration: isAnalyzing ? 0.5 : 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="relative z-10"
      >
        <img 
          src={logo} 
          alt="Yummy Mascot" 
          className="w-48 h-48 object-contain drop-shadow-[0_20px_50px_rgba(45,90,61,0.3)]" 
        />
        
        {/* Analyzing Effect */}
        {isAnalyzing && (
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 1, repeat: Infinity }}
            className="absolute inset-0 border-4 border-brand-mint rounded-full"
          />
        )}
      </motion.div>

      {/* <div className="mt-8 text-center relative z-10">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block px-4 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-brand-surface shadow-sm mb-3"
        >
          <span className="text-xs font-black text-brand-primary tracking-widest uppercase">
            {isAnalyzing ? 'Analyzing your mind...' : 'Always with you'}
          </span>
        </motion.div>
      </div> */}
    </div>
  );
}
