import React, { useState, useRef } from 'react';
import { Pack } from '../types';
import { Sparkles, Zap, Flame } from 'lucide-react';
import { playHapticTap } from '../utils/sound';
import { PrimePacksLogo } from './PrimePacksLogo';

interface CrownFoilPackProps {
  pack: Pack;
  multiplierText?: string;
  multiplierCount?: number;
  isCenter?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showAura?: boolean;
}

export const CrownFoilPack: React.FC<CrownFoilPackProps> = ({
  pack,
  multiplierText,
  multiplierCount = 1,
  isCenter = true,
  size = 'lg',
  onClick,
  showAura = true
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [sheenPos, setSheenPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(true);

  // High-resolution authentic Crown Cards gold foil pack image
  const packImageUrl = pack.packCoverUrl || 'https://www.crowncards.io/_next/image?url=%2Fpacks%2Fgold.png&w=640&q=75';

  // Determine pack theme colors and multiplier badge
  const getPackTheme = () => {
    if (pack.price >= 6000) {
      return {
        borderColor: '#F59E0B',
        accentGlow: 'rgba(245, 158, 11, 0.75)',
        multiplier: 'APEX',
        neonClass: 'shadow-amber-500/50'
      };
    }
    if (pack.price >= 2500) {
      return {
        borderColor: '#C084FC',
        accentGlow: 'rgba(192, 132, 252, 0.7)',
        multiplier: '1000x',
        neonClass: 'shadow-purple-500/50'
      };
    }
    if (pack.price >= 500) {
      return {
        borderColor: '#F472B6',
        accentGlow: 'rgba(244, 114, 182, 0.7)',
        multiplier: '500x',
        neonClass: 'shadow-pink-500/50'
      };
    }
    if (pack.price >= 100) {
      return {
        borderColor: '#FB7185',
        accentGlow: 'rgba(251, 113, 133, 0.7)',
        multiplier: '250x',
        neonClass: 'shadow-rose-500/50'
      };
    }
    if (pack.price >= 25) {
      return {
        borderColor: '#A855F7',
        accentGlow: 'rgba(168, 85, 247, 0.65)',
        multiplier: '1000x',
        neonClass: 'shadow-purple-500/50'
      };
    }
    return {
      borderColor: '#38BDF8',
      accentGlow: 'rgba(56, 189, 248, 0.65)',
      multiplier: '100x',
      neonClass: 'shadow-sky-500/50'
    };
  };

  const theme = getPackTheme();
  const mult = multiplierText || theme.multiplier;

  // Handle interactive 3D pointer tilt & specular sheen tracking
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current || !isCenter) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -16;
    const rotateY = ((x - centerX) / centerX) * 16;

    setTilt({ x: rotateX, y: rotateY });
    setSheenPos({
      x: (x / rect.width) * 100,
      y: (y / rect.height) * 100
    });
  };

  const handlePointerLeave = () => {
    setTilt({ x: 0, y: 0 });
    setSheenPos({ x: 50, y: 50 });
    setIsHovered(false);
  };

  // Dimensions - enlarged for authentic booster pack presence
  const dims =
    size === 'lg'
      ? 'w-[250px] h-[375px] xs:w-[280px] xs:h-[420px]'
      : size === 'md'
      ? 'w-[185px] h-[278px] sm:w-[215px] sm:h-[322px]'
      : 'w-[135px] h-[202px]';

  return (
    <div
      ref={cardRef}
      onClick={() => {
        playHapticTap();
        onClick?.();
      }}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={handlePointerLeave}
      className={`relative ${dims} select-none transition-all duration-300 cursor-pointer ${
        isCenter ? 'scale-100 z-20' : 'scale-85 opacity-60 z-10'
      }`}
      style={{
        perspective: '1200px'
      }}
    >
      {/* 1. Multiplier Electric Plasma Aura when multiplier > 1 */}
      {isCenter && multiplierCount > 1 && showAura && (
        <div
          className="absolute -inset-2 rounded-none pointer-events-none animate-pulse blur-xl opacity-80"
          style={{
            background:
              multiplierCount >= 4
                ? 'radial-gradient(circle, #f59e0b 0%, #ef4444 65%, transparent 100%)'
                : 'radial-gradient(circle, #ec4899 0%, #a855f7 65%, transparent 100%)'
          }}
        />
      )}

      {/* 2. Floating Ambient Glow Drop Shadow */}
      <div
        className="absolute inset-0 rounded-none pointer-events-none transition-opacity duration-300"
        style={{
          boxShadow: isCenter
            ? `0 18px 40px -8px ${theme.accentGlow}, 0 0 30px -4px ${theme.accentGlow}`
            : `0 8px 20px -6px rgba(0,0,0,0.85)`
        }}
      />

      {/* 3. 3D Foil Wrapper Container (sharp rectangular borderless pack presentation) */}
      <div
        className={`w-full h-full rounded-none overflow-hidden flex flex-col justify-between relative transition-transform ease-out duration-150 ${
          isCenter ? 'hover:scale-[1.02]' : ''
        }`}
        style={{
          transform: isCenter
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${isHovered ? 18 : 0}px)`
            : undefined,
          transformStyle: 'preserve-3d',
          background: 'transparent'
        }}
      >
        {/* Authentic CrownCards Gold Foil Pack Image Artwork */}
        {imgLoaded ? (
          <img
            src={packImageUrl}
            alt={pack.name}
            onError={() => setImgLoaded(false)}
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none transition-transform duration-300"
            style={{
              transform: isHovered ? 'scale(1.04)' : 'scale(1.0)'
            }}
          />
        ) : (
          /* Fallback Stylized Metallic Foil Pack */
          <div className="absolute inset-0 bg-gradient-to-br from-[#0d1424] via-[#060a14] to-[#0a0f1d] flex flex-col items-center justify-center p-4">
            <PrimePacksLogo variant="full" size="md" glow={true} />
          </div>
        )}

        {/* Dynamic Holographic Specular Highlight following pointer/finger */}
        {isCenter && (
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-200"
            style={{
              opacity: isHovered ? 0.8 : 0.45,
              background: `radial-gradient(circle at ${sheenPos.x}% ${sheenPos.y}%, rgba(255,255,255,0.75) 0%, rgba(253,224,71,0.35) 25%, rgba(56,189,248,0.25) 45%, transparent 65%)`,
              mixBlendMode: 'color-dodge'
            }}
          />
        )}

        {/* Rainbow Prismatic Sheen Sweep */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none animate-shimmer"
          style={{
            background:
              'linear-gradient(125deg, transparent 20%, rgba(255,255,255,0.4) 38%, rgba(255,255,255,0.75) 42%, rgba(236,72,153,0.35) 46%, rgba(56,189,248,0.35) 50%, transparent 68%)',
            backgroundSize: '250% 250%',
            mixBlendMode: 'overlay'
          }}
        />

        {/* Pack overlays removed per user selection for an unobstructed pack presentation */}
      </div>
    </div>
  );
};
