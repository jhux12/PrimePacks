import React from 'react';

interface PrimePacksLogoProps {
  variant?: 'full' | 'icon' | 'wordmark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}

export const PrimePacksLogo: React.FC<PrimePacksLogoProps> = ({
  variant = 'full',
  size = 'md',
  className = '',
  glow = true
}) => {
  // Height sizing
  const heightClasses = {
    xs: 'h-6',
    sm: 'h-7',
    md: 'h-8 sm:h-9',
    lg: 'h-10 sm:h-12',
    xl: 'h-14 sm:h-16'
  }[size];

  // Neon green color code from official logo
  const neonGreen = '#e0bb64';

  if (variant === 'icon') {
    return (
      <div className={`relative inline-flex items-center shrink-0 ${heightClasses} ${className}`}>
        <svg
          viewBox="0 0 85 80"
          className="h-full w-auto aspect-[85/80] select-none pointer-events-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="prime-icon-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={neonGreen} floodOpacity={glow ? 0.6 : 0.2} />
            </filter>
            <linearGradient id="p-front-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#ECEFF4" />
            </linearGradient>
          </defs>

          {/* Card 1: Back Card in vibrant Neon Green tilted left */}
          <g transform="translate(6, 4) rotate(-16 28 40)">
            <rect
              x="8"
              y="12"
              width="30"
              height="54"
              rx="6"
              fill={neonGreen}
              filter={glow ? 'url(#prime-icon-glow)' : undefined}
            />
          </g>

          {/* Card 2: Middle Card in White with Neon Green Accent Edge tilted left */}
          <g transform="translate(13, 2) rotate(-8 32 40)">
            <rect
              x="10"
              y="10"
              width="31"
              height="56"
              rx="6"
              fill="#FFFFFF"
              stroke={neonGreen}
              strokeWidth="2.5"
            />
            <path
              d="M 14 12 L 37 12"
              stroke={neonGreen}
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>

          {/* Card 3: Front Stylized P Slab */}
          <g transform="translate(18, 0)">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M 12 8 C 12 5.8 13.8 4 16 4 H 46 C 58 4 67 13 67 25 C 67 37 58 46 46 46 H 29 V 68 C 29 70.2 27.2 72 25 72 H 16 C 13.8 72 12 70.2 12 68 V 8 Z M 29 18 V 32 H 44 C 48 32 51 29 51 25 C 51 21 48 18 44 18 H 29 Z"
              fill="url(#p-front-grad)"
              filter="drop-shadow(0px 3px 6px rgba(0,0,0,0.45))"
            />
          </g>
        </svg>
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div className={`inline-flex items-center font-display font-black tracking-tight leading-none ${className}`}>
        <span className="text-white text-lg sm:text-xl font-black">PRIME</span>
        <span
          className="ml-1 text-lg sm:text-xl font-black"
          style={{
            color: neonGreen,
            textShadow: glow ? `0 0 16px rgba(224, 187, 100, 0.35)` : undefined
          }}
        >
          PACKS
        </span>
      </div>
    );
  }

  // Full Logo: Emblem + "PRIME" (White) + "PACKS" (Neon Green)
  return (
    <div
      className={`relative inline-flex items-center gap-2 select-none shrink-0 ${heightClasses} ${className}`}
    >
      <svg
        viewBox="0 0 325 80"
        className="h-full w-auto select-none pointer-events-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="prime-full-neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={neonGreen} floodOpacity={glow ? 0.7 : 0.3} />
          </filter>
          <filter id="prime-p-drop" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="2" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.45" />
          </filter>
          <linearGradient id="p-front-grad-full" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EFF2F7" />
          </linearGradient>
        </defs>

        {/* 1. EMBLEM: Fanned Cards + Front P */}
        {/* Card 1: Back Card in vibrant Neon Green tilted left */}
        <g transform="translate(4, 4) rotate(-16 28 40)">
          <rect
            x="8"
            y="12"
            width="30"
            height="54"
            rx="6"
            fill={neonGreen}
            filter={glow ? 'url(#prime-full-neon-glow)' : undefined}
          />
        </g>

        {/* Card 2: Middle Card in White with Neon Green Accent Edge tilted left */}
        <g transform="translate(11, 2) rotate(-8 32 40)">
          <rect
            x="10"
            y="10"
            width="31"
            height="56"
            rx="6"
            fill="#FFFFFF"
            stroke={neonGreen}
            strokeWidth="2.5"
          />
          <path
            d="M 14 12 L 37 12"
            stroke={neonGreen}
            strokeWidth="4"
            strokeLinecap="round"
          />
        </g>

        {/* Card 3: Front Stylized P Slab */}
        <g transform="translate(16, 0)" filter="url(#prime-p-drop)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 12 8 C 12 5.8 13.8 4 16 4 H 46 C 58 4 67 13 67 25 C 67 37 58 46 46 46 H 29 V 68 C 29 70.2 27.2 72 25 72 H 16 C 13.8 72 12 70.2 12 68 V 8 Z M 29 18 V 32 H 44 C 48 32 51 29 51 25 C 51 21 48 18 44 18 H 29 Z"
            fill="url(#p-front-grad-full)"
          />
        </g>

        {/* 2. TYPOGRAPHY: PRIME (White) PACKS (Neon Green) */}
        <text
          x="88"
          y="53"
          fill="#FFFFFF"
          fontFamily="'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="900"
          fontSize="40"
          letterSpacing="-0.03em"
        >
          PRIME
        </text>

        <text
          x="200"
          y="53"
          fill={neonGreen}
          fontFamily="'Outfit', 'Plus Jakarta Sans', system-ui, sans-serif"
          fontWeight="900"
          fontSize="40"
          letterSpacing="-0.03em"
          filter={glow ? 'url(#prime-full-neon-glow)' : undefined}
        >
          PACKS
        </text>
      </svg>
    </div>
  );
};
