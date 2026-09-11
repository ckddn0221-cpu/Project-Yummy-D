import React from 'react';

interface JarIconProps {
  size?: number;
  className?: string;
}

export const JarIcon: React.FC<JarIconProps> = ({ size = 24, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M7 3h10" />
      <path d="M7 3a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2" />
      <path d="M17 3a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2" />
      <path d="M19 9v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
};
