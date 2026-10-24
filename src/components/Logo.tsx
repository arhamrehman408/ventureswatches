import React from 'react';

interface LogoProps {
  className?: string;
  variant?: 'full' | 'mark' | 'text';
  mode?: 'dark' | 'light' | 'navy';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  variant = 'full',
  mode = 'navy',
  size = 'md'
}) => {
  // Determine color palette based on mode
  const strokeColor = mode === 'light' ? '#FFFFFF' : '#0B192C';
  const textColor = mode === 'light' ? '#FFFFFF' : '#0B192C';

  // Scale map
  const scaleMap = {
    sm: 'h-7',
    md: 'h-10 sm:h-12',
    lg: 'h-14 sm:h-16',
    xl: 'h-20 sm:h-24'
  };

  return (
    <div className={`inline-flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {variant !== 'text' && (
        <svg
          viewBox="0 0 240 220"
          className={`${scaleMap[size]} w-auto transition-colors duration-300 flex-shrink-0`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Exact Geometric V Emblem from Ventures Watches Logo */}
          <g stroke={strokeColor} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            {/* Left Arm Parallel Geometric Lines */}
            <path d="M 40 25 L 110 160 L 120 142 L 60 25" />
            <path d="M 58 35 L 112 142 M 72 35 L 112 115" />
            
            {/* Right Arm Parallel Geometric Lines */}
            <path d="M 200 25 L 130 160 L 120 142 L 180 25" />
            <path d="M 182 35 L 128 142 M 168 35 L 128 115" />

            {/* Additional Inner Geometric Stroke Detailing */}
            <path d="M 88 55 L 115 110" />
            <path d="M 152 55 L 125 110" />

            {/* Center Interlocking V Vertex Notch */}
            <path d="M 110 160 L 120 180 L 130 160" />
          </g>
        </svg>
      )}

      {variant !== 'mark' && (
        <div className="flex flex-col justify-center font-sans">
          <span
            className="font-bold text-xs sm:text-sm tracking-[0.28em] leading-tight transition-colors duration-300 uppercase"
            style={{ color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            VENTURES
          </span>
          <span
            className="text-[8px] sm:text-[9px] tracking-[0.45em] font-medium transition-colors duration-300 uppercase opacity-90 -mt-0.5"
            style={{ color: textColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            WATCHES
          </span>
        </div>
      )}
    </div>
  );
};

