import React, { useState, useEffect, useRef } from 'react';
import { CardItem } from '../types';
import { PrimePacksLogo } from './PrimePacksLogo';
import { playHapticTap, playGrailFanfare, playHitChime, playCoinClink } from '../utils/sound';
import {
  X,
  Sparkles,
  ShieldCheck,
  DollarSign,
  Archive,
  Share2,
  Check,
  Maximize2
} from 'lucide-react';

interface CardInspectionModalProps {
  card: CardItem;
  isOpen: boolean;
  onClose: () => void;
  onKeep?: () => void;
  onSell?: (card: CardItem) => void;
  isSold?: boolean;
  isVaulted?: boolean;
}

export const CardInspectionModal: React.FC<CardInspectionModalProps> = ({
  card,
  isOpen,
  onClose,
  onKeep,
  onSell,
  isSold = false,
  isVaulted = false
}) => {
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50 });
  const [isCopied, setIsCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Trigger hit audio chime
    if (card.rarity === 'Grail' || card.rarity === 'Secret Rare' || card.rarity === 'Legendary') {
      playGrailFanfare();
    } else {
      playHitChime();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, card.rarity, onClose]);

  if (!isOpen) return null;

  const isGraded = card.grade !== 'Raw';
  const isPsa = card.grade.startsWith('PSA');

  // Handle 3D Tilt interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    const tiltX = (x - 0.5) * 32;
    const tiltY = (0.5 - y) * 32;
    setTilt({
      x: tiltX,
      y: tiltY,
      glareX: Math.round(x * 100),
      glareY: Math.round(y * 100)
    });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50 });
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!cardRef.current || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = cardRef.current.getBoundingClientRect();
    const x = (touch.clientX - rect.left) / rect.width;
    const y = (touch.clientY - rect.top) / rect.height;

    const tiltX = (x - 0.5) * 24;
    const tiltY = (0.5 - y) * 24;
    setTilt({
      x: tiltX,
      y: tiltY,
      glareX: Math.round(x * 100),
      glareY: Math.round(y * 100)
    });
  };

  const handleShare = () => {
    playHapticTap();
    const text = `I just pulled a ${card.grade} ${card.name} (${card.set}) valued at $${card.value} on PrimePacks!`;
    navigator.clipboard?.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const rarityColor = {
    Common: '#94a3b8',
    Uncommon: '#10b981',
    Rare: '#06b6d4',
    Epic: '#a855f7',
    'Ultra Rare': '#a855f7',
    Legendary: '#ec4899',
    'Secret Rare': '#ec4899',
    Grail: '#f59e0b'
  }[card.rarity] || '#06b6d4';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-2xl animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm sm:max-w-md lg:max-w-4xl max-h-[92vh] flex flex-col lg:flex-row items-center justify-start lg:justify-center gap-4 sm:gap-6 p-4 sm:p-6 lg:p-8 bg-[#090d16]/98 border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky/Fixed Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 w-9 h-9 rounded-full bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg border border-white/10"
          title="Close Inspection"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. 3D INTERACTIVE CARD VIEWER CONTAINER - Scaled to fit mobile screens */}
        <div className="flex flex-col items-center justify-center pt-2 sm:pt-0 select-none w-full max-w-xs sm:max-w-sm shrink-0">
          <div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
            className="relative cursor-grab active:cursor-grabbing w-48 sm:w-64 lg:w-72 h-72 sm:h-96 lg:h-[420px] rounded-2xl transition-transform duration-100 ease-out touch-pan-y"
            style={{
              perspective: '1200px',
              transform: `rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`
            }}
          >
            {/* Acrylic Graded Slab Enclosure */}
            <div
              className="w-full h-full rounded-2xl p-2 sm:p-2.5 flex flex-col relative overflow-hidden border-2 shadow-2xl backdrop-blur-xl"
              style={{
                borderColor: `${rarityColor}80`,
                boxShadow: `0 0 35px ${rarityColor}40, inset 0 0 20px rgba(255,255,255,0.08)`,
                background: isGraded
                  ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))'
                  : 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(7, 10, 19, 0.98))'
              }}
            >
              {/* Dynamic Rainbow Holographic Foil Sheen */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl mix-blend-color-dodge opacity-60 z-20 transition-opacity"
                style={{
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.85) 0%, rgba(0, 240, 118, 0.4) 25%, rgba(168, 85, 247, 0.3) 50%, rgba(245, 158, 11, 0.25) 75%, transparent 100%)`
                }}
              />

              {/* Specular Edge Highlight */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl border border-white/20 z-20"
                style={{
                  background: `linear-gradient(${tilt.x * 2}deg, rgba(255,255,255,0.15), transparent 60%)`
                }}
              />

              {/* Graded Slab Label Header */}
              {isGraded && (
                <div
                  className={`w-full rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 mb-1.5 sm:mb-2 border flex items-center justify-between shrink-0 z-10 shadow-md ${
                    isPsa
                      ? 'bg-red-700/90 border-red-500/80 text-white'
                      : 'bg-black/95 border-amber-500/80 text-amber-300'
                  }`}
                >
                  <div className="flex flex-col truncate pr-1">
                    <span className="text-[9px] sm:text-[10px] font-black tracking-wider leading-none">
                      {isPsa ? 'PSA AUTHENTIC' : 'BGS 10 BLACK LABEL'}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-mono text-white/80 font-semibold truncate mt-0.5">
                      {card.year} · {card.set}
                    </span>
                  </div>
                  <div className="flex flex-col items-end shrink-0 pl-1">
                    <span className="text-xs sm:text-sm font-black font-mono leading-none tracking-tight">
                      {card.grade.replace('PSA ', '').replace('BGS ', '')}
                    </span>
                    <span className="text-[7px] sm:text-[8px] font-mono opacity-70">
                      #{card.number}
                    </span>
                  </div>
                </div>
              )}

              {/* Card Artwork Image Container */}
              <div className="relative flex-1 w-full rounded-lg sm:rounded-xl overflow-hidden bg-black/60 border border-white/10 flex items-center justify-center min-h-0">
                <img
                  src={card.imageUrl}
                  alt={card.name}
                  className="w-full h-full object-contain p-1 rounded-md sm:rounded-lg"
                  loading="eager"
                />
              </div>

              {/* Bottom Slab Footer with Serial Barcode & Prime Packs Seal */}
              <div className="pt-1.5 sm:pt-2 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400 font-mono z-10 shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <PrimePacksLogo variant="icon" size="xs" glow={false} />
                  <span className="text-slate-300 font-bold uppercase tracking-wider text-[8px] sm:text-[9px]">
                    PRIME CERTIFIED
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-500">
                  <span>SN:</span>
                  <span className="font-mono text-slate-400 font-semibold">
                    {card.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-2 sm:mt-3 font-mono flex items-center gap-1.5">
            <Maximize2 className="w-3 h-3 text-emerald-400" />
            Drag or tilt card for 3D holographic sheen
          </span>
        </div>

        {/* 2. CARD DETAILS & ACTION PANEL - Fits cleanly on mobile screens */}
        <div className="flex-1 flex flex-col justify-between w-full min-w-0">
          <div>
            {/* Rarity & Category Header Badges */}
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
              <span
                className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider text-white flex items-center gap-1 shadow-sm"
                style={{
                  backgroundColor: rarityColor,
                  boxShadow: `0 0 12px ${rarityColor}60`
                }}
              >
                <Sparkles className="w-3 h-3" />
                {card.rarity}
              </span>

              <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-white/10">
                {card.category}
              </span>

              {isGraded && (
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {card.grade}
                </span>
              )}
            </div>

            {/* Card Title */}
            <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white font-display tracking-tight leading-snug">
              {card.name}
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5 sm:mt-1">
              {card.set} · #{card.number} · {card.year}
            </p>

            {/* Market Valuation Callout - Compact on mobile */}
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-900/80 border border-white/10 grid grid-cols-2 gap-2 sm:gap-4 items-center">
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Vault Market Value
                </span>
                <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  ${card.value.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                  Instant Cashout (95%)
                </span>
                <div className="text-base sm:text-lg lg:text-xl font-black font-mono text-teal-300">
                  ${(card.value * 0.95).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Authenticity & Provably Fair Assurance */}
            <div className="mt-2.5 sm:mt-4 p-2.5 sm:p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-200 font-bold text-[11px] sm:text-xs">Guaranteed Vault Authenticity:</span>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2 sm:line-clamp-none">
                  Cryptographically verified through Provably Fair SHA-256 RNG. Available for physical delivery or instant cashout.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons - 2 primary side-by-side on mobile, share pull adjacent */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1">
              {onKeep && (
                <button
                  onClick={() => {
                    playHapticTap();
                    onKeep();
                    onClose();
                  }}
                  disabled={isVaulted}
                  className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-display font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    isVaulted
                      ? 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300 cursor-default'
                      : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-600/30 active:scale-95'
                  }`}
                >
                  <Archive className="w-4 h-4 shrink-0" />
                  <span className="truncate">{isVaulted ? 'In Vault ✓' : 'Keep Vault'}</span>
                </button>
              )}

              {onSell && (
                <button
                  onClick={() => {
                    playCoinClink();
                    onSell(card);
                    onClose();
                  }}
                  disabled={isSold}
                  className={`py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-display font-black text-xs sm:text-sm flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                    isSold
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 cursor-default'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-400 text-white shadow-lg shadow-emerald-600/30 active:scale-95'
                  }`}
                >
                  <DollarSign className="w-4 h-4 shrink-0" />
                  <span className="truncate">{isSold ? 'Sold ✓' : `Cashout $${(card.value * 0.95).toFixed(0)}`}</span>
                </button>
              )}
            </div>

            <button
              onClick={handleShare}
              className="py-2.5 sm:py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-white/10 transition-colors cursor-pointer"
              title="Copy share link"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  <span>Share Pull</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
