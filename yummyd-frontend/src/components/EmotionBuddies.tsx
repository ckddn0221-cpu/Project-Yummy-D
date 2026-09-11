import { motion } from 'framer-motion';

// 1. Pinky (Heart Candy - Love/Sweet)
export const Pinky = ({ size = 100, className = "" }) => (
  <motion.div 
    animate={{ y: [0, -10, 0], rotate: [-5, 5, -5] }}
    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
    className={`relative ${className}`}
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 170c-60-35-80-80-80-110 0-30 25-50 50-50 15 0 25 10 30 20 5-10 15-20 30-20 25 0 50 20 50 50 0 30-20 75-80 110z" fill="#FF6B9D" />
      <circle cx="75" cy="80" r="10" fill="white" opacity="0.4" />
      <path d="M140 60c5 5 10 15 5 25" stroke="white" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
      {/* Eyes */}
      <circle cx="80" cy="90" r="6" fill="#4A1D2E" />
      <circle cx="120" cy="90" r="6" fill="#4A1D2E" />
      <path d="M90 110c5 5 15 5 20 0" stroke="#4A1D2E" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </motion.div>
);

// 2. Goldy (Star Candy - Joy/Energy)
export const Goldy = ({ size = 100, className = "" }) => (
  <motion.div 
    animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
    transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
    className={`relative ${className}`}
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 20l25 60h65l-50 40 20 60-60-35-60 35 20-60-50-40h65z" fill="#FFD93D" />
      <path d="M100 50l10 30h30l-25 20 10 30-25-15-25 15 10-30-25-20h30z" fill="white" opacity="0.3" />
      {/* Eyes */}
      <circle cx="85" cy="105" r="5" fill="#5C4D0D" />
      <circle cx="115" cy="105" r="5" fill="#5C4D0D" />
      <circle cx="100" cy="120" r="8" fill="#FF6B9D" opacity="0.5" />
    </svg>
  </motion.div>
);

// 3. Minty (Round Candy - Calm/Peace)
export const Minty = ({ size = 100, className = "" }) => (
  <motion.div 
    animate={{ rotate: 360 }}
    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
    className={`relative ${className}`}
    style={{ width: size, height: size }}
  >
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="80" fill="#7FDBCA" />
      <circle cx="100" cy="100" r="60" stroke="white" strokeWidth="8" strokeDasharray="20 10" opacity="0.4" />
      <circle cx="100" cy="100" r="40" stroke="white" strokeWidth="4" opacity="0.2" />
      {/* Eyes and Smile */}
      <g transform="rotate(-360, 100, 100)">
        <circle cx="80" cy="90" r="6" fill="#1D3E38" />
        <circle cx="120" cy="90" r="6" fill="#1D3E38" />
        <path d="M85 115h30" stroke="#1D3E38" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  </motion.div>
);
