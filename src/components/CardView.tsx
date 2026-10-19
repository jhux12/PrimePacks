import React, { useState } from 'react';
import { CardItem } from '../types';
import { ShieldCheck, Sparkles } from 'lucide-react';

interface CardViewProps {
  card: CardItem;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showOdds?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
  selected?: boolean;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  size = 'md',
  className,
  showOdds = false,
  interactive = true,
  onSelect,
  selected = false
}) => {
  const [imageError, setImageError] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false });

  const isGraded = card.grade !== 'Raw';
  const isPsa = card.grade.startsWith('PSA');
  const isBgs = card.grade.startsWith('BGS');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 18, y: -y * 18, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, active: false });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width - 0.5;
    const y = (touch.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: x * 18, y: -y * 18, active: true });
  };

  const handleTouchEnd = () => {
    setTilt({ x: 0, y: 0, active: false });
  };

  // Dimensions
  const sizeClasses = {
    sm: 'w-36 h-52 text-xs',
    md: 'w-48 h-72 text-sm',
    lg: 'w-64 h-96 text-base'
  }[size];

  // Rarity styling
  const rarityBorder = {
    Common: 'border-slate-800 hover:border-slate-700',
    Uncommon: 'border-emerald-900/60 hover:border-emerald-600',
    Rare: 'border-blue-900/60 hover:border-blue-500',
    Epic: 'border-purple-800/80 hover:border-purple-500 shadow-purple-950/40',
    Legendary: 'border-amber-600/80 hover:border-amber-400 shadow-amber-950/40',
    'Ultra Rare': 'border-purple-800/80 hover:border-purple-500 shadow-purple-950/40',
    'Secret Rare': 'border-amber-600/80 hover:border-amber-400 shadow-amber-950/40',
    Grail: 'border-amber-400 hover:border-yellow-300 shadow-amber-500/30'
  }[card.rarity] || 'border-slate-800';

  const rarityGlow = {
    Common: '',
    Uncommon: 'shadow-sm',
    Rare: 'shadow-md shadow-blue-500/10',
    Epic: 'shadow-lg shadow-purple-500/20',
    Legendary: 'shadow-xl shadow-amber-500/25',
    'Ultra Rare': 'shadow-lg shadow-purple-500/20',
    'Secret Rare': 'shadow-xl shadow-amber-500/25',
    Grail: 'shadow-2xl shadow-yellow-500/40 ring-1 ring-yellow-400/50'
  }[card.rarity] || '';

  return (
    <div
      onClick={onSelect}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative select-none transition-all duration-150 rounded-xl cursor-pointer ${className || sizeClasses} ${
        selected ? 'ring-2 ring-amber-400 scale-[1.02]' : ''
      }`}
      style={{
        perspective: '1000px',
        transform: tilt.active ? `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(1.03)` : 'none'
      }}
    >
      {/* Graded Slab Outer Acrylic Frame or Raw Card Frame */}
      <div
        className={`w-full h-full rounded-xl flex flex-col p-1.5 transition-all holo-card border ${rarityBorder} ${rarityGlow} ${
          isGraded
            ? 'bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-900 shadow-2xl backdrop-blur-md'
            : 'bg-slate-900/95'
        }`}
      >
        {/* Holographic light reflection */}
        <div className="holo-shine" />

        {/* Graded Header Slab Banner */}
        {isGraded && (
          <div
            className={`w-full rounded-t-lg px-2 py-1 mb-1 border flex items-center justify-between shrink-0 ${
              isPsa
                ? 'bg-red-700/90 border-red-500/60 text-white'
                : 'bg-black border-amber-500/60 text-amber-300'
            }`}
          >
            <div className="flex flex-col truncate pr-1">
              <span className="text-[10px] font-bold tracking-wider leading-none">
                {isPsa ? 'PSA AUTHENTIC' : 'BGS BLACK LABEL'}
              </span>
              <span className="text-[9px] opacity-80 truncate font-mono">{card.year} {card.set}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0 font-mono font-black text-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
              <span>{card.grade.replace('PSA ', '').replace('BGS ', '')}</span>
            </div>
          </div>
        )}

        {/* Card Artwork Window */}
        <div className="relative flex-1 rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center border border-white/5">
          {!imageError ? (
            <img
              src={card.imageUrl}
              alt={card.name}
              referrerPolicy="no-referrer"
              onError={() => setImageError(true)}
              className="w-full h-full object-contain p-1 transform transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
              <Sparkles className="w-8 h-8 text-amber-400 mb-2 opacity-70" />
              <p className="text-xs font-semibold text-slate-200 line-clamp-2">{card.name}</p>
              <p className="text-[10px] text-slate-400 mt-1">{card.set} · #{card.number}</p>
            </div>
          )}

          {/* Rarity Label Overlay on image bottom */}
          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px]">
            <span
              className={`font-medium ${
                card.rarity === 'Grail'
                  ? 'text-yellow-400 font-bold'
                  : card.rarity === 'Secret Rare'
                  ? 'text-amber-400 font-bold'
                  : card.rarity === 'Ultra Rare'
                  ? 'text-purple-300'
                  : 'text-slate-300'
              }`}
            >
              {card.rarity}
            </span>
            <span className="font-mono text-slate-400 text-[9px]">#{card.number}</span>
          </div>
        </div>

        {/* Card Info Footer */}
        <div className="mt-1.5 px-1 shrink-0">
          <div className="text-xs font-semibold text-slate-100 truncate" title={card.name}>
            {card.name}
          </div>
          <div className="flex items-center justify-between mt-0.5 text-[11px]">
            <span className="font-mono text-amber-400 font-bold tabular-nums">
              ${card.value.toLocaleString()}
            </span>
            {showOdds ? (
              <span className="font-mono text-slate-400 text-[10px]">
                {card.odds * 100 >= 1
                  ? `${(card.odds * 100).toFixed(2)}%`
                  : card.odds * 100 >= 0.1
                  ? `${(card.odds * 100).toFixed(2)}%`
                  : card.odds * 100 >= 0.01
                  ? `${(card.odds * 100).toFixed(3)}%`
                  : `${(card.odds * 100).toFixed(4)}%`}
              </span>
            ) : (
              <span className="text-slate-400 text-[10px] font-mono">
                ${card.usdValue.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
