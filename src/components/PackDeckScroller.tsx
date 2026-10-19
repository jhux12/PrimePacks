import React, { useState, useRef, useEffect } from 'react';
import { Pack, CardItem } from '../types';
import { playHapticTap } from '../utils/sound';
import {
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Layers,
  Percent,
  Flame,
  ShieldCheck,
  Check
} from 'lucide-react';

interface PackDeckScrollerProps {
  packs: Pack[];
  balance: number;
  onSelectPack: (pack: Pack) => void;
}

export const PackDeckScroller: React.FC<PackDeckScrollerProps> = ({
  packs,
  balance,
  onSelectPack
}) => {
  const [viewMode, setViewMode] = useState<'deck' | 'grid'>('deck');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'pokemon' | 'sports' | 'vintage'>('all');
  const [selectedPriceTarget, setSelectedPriceTarget] = useState<number | 'all'>('all');
  const [activeDeckIndex, setActiveDeckIndex] = useState<number>(0);

  const deckScrollRef = useRef<HTMLDivElement>(null);

  // Distinct price steps across packs ($1 to $6,000)
  const priceSteps = [1, 5, 15, 25, 45, 100, 250, 500, 750, 1200, 2500, 4000, 6000];

  // Filtered packs
  const filteredPacks = packs.filter((pack) => {
    if (selectedCategory !== 'all' && pack.category !== selectedCategory) return false;
    if (selectedPriceTarget !== 'all' && pack.price !== selectedPriceTarget) return false;
    return true;
  }).sort((a, b) => a.price - b.price);

  // Keep active deck index within range
  useEffect(() => {
    if (activeDeckIndex >= filteredPacks.length) {
      setActiveDeckIndex(Math.max(0, filteredPacks.length - 1));
    }
  }, [filteredPacks.length, activeDeckIndex]);

  // Scroll active pack into view in Deck Mode
  const scrollToPack = (index: number) => {
    playHapticTap();
    setActiveDeckIndex(index);
    if (deckScrollRef.current) {
      const container = deckScrollRef.current;
      const targetChild = container.children[index] as HTMLElement;
      if (targetChild) {
        targetChild.scrollIntoView({
          behavior: 'smooth',
          inline: 'center',
          block: 'nearest'
        });
      }
    }
  };

  const handlePriceScrub = (price: number | 'all') => {
    playHapticTap();
    setSelectedPriceTarget(price);
    if (price === 'all') {
      setActiveDeckIndex(0);
      return;
    }
    // Find index of first pack matching or closest to this price
    const matchIdx = filteredPacks.findIndex(p => p.price === price);
    if (matchIdx !== -1) {
      scrollToPack(matchIdx);
    }
  };

  return (
    <div className="w-full flex flex-col select-none">
      {/* 1. MINIMAL MOBILE HEADER & PRICE STATS */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              $1 TO $6,000 BOXES
            </span>
            <span className="text-xs text-slate-400 font-mono">
              · {filteredPacks.length} {filteredPacks.length === 1 ? 'Pack' : 'Packs'}
            </span>
          </div>

          {/* View Mode Switcher (Deck / Grid) */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
            <button
              onClick={() => {
                playHapticTap();
                setViewMode('deck');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                viewMode === 'deck'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Swipe Deck Mode"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Deck</span>
            </button>
            <button
              onClick={() => {
                playHapticTap();
                setViewMode('grid');
              }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                viewMode === 'grid'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Catalog Grid Mode"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Grid</span>
            </button>
          </div>
        </div>

        {/* 2. INTERACTIVE PRICE SCRUB BAR ($1 TO $6,000) */}
        <div className="bg-[#0c1018]/90 border border-slate-800/80 rounded-2xl p-3 sm:p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs mb-2.5">
            <span className="font-bold font-display uppercase tracking-wider text-slate-400 text-[11px]">
              Scroll by Pack Price:
            </span>
            <span className="font-mono text-amber-400 font-bold text-xs">
              {selectedPriceTarget === 'all'
                ? '$1 — $6,000 All Ranges'
                : `$${selectedPriceTarget.toLocaleString()} Target`}
            </span>
          </div>

          {/* Fast Horizontal Price Pills Scroller */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1">
            <button
              onClick={() => handlePriceScrub('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
                selectedPriceTarget === 'all'
                  ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              All ($1–$6k)
            </button>

            {priceSteps.map((price) => {
              const isSelected = selectedPriceTarget === price;
              const isWhale = price >= 2500;
              const formattedPrice = price >= 1000 ? `$${price / 1000}k` : `$${price}`;

              return (
                <button
                  key={price}
                  onClick={() => handlePriceScrub(price)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
                    isSelected
                      ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                      : isWhale
                      ? 'bg-purple-950/40 text-purple-300 border-purple-800/60 hover:border-purple-600'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {formattedPrice}
                </button>
              );
            })}
          </div>

          {/* Category Chips Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 mt-2 border-t border-slate-800/60">
            {(['all', 'pokemon', 'sports', 'vintage'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playHapticTap();
                  setSelectedCategory(cat);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all whitespace-nowrap shrink-0 active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'all' ? 'All Collections' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. VIEW 1: HERO SWIPE DECK MODE (Mobile-First Touch Carousel) */}
      {viewMode === 'deck' && (
        <div className="w-full flex flex-col items-center">
          {/* Deck Carousel Snap Row */}
          <div
            ref={deckScrollRef}
            className="w-full flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory py-2 px-1"
          >
            {filteredPacks.map((pack, idx) => {
              const maxVal = Math.max(...pack.items.map(i => i.value));
              const topPullCard = pack.items.find(i => i.value === maxVal);
              const multiplier = (maxVal / pack.price).toFixed(0);
              const isWhale = pack.price >= 2500;
              const isBudget = pack.price <= 25;

              return (
                <div
                  key={pack.id}
                  onClick={() => {
                    playHapticTap();
                    onSelectPack(pack);
                  }}
                  className="w-[88vw] max-w-[380px] shrink-0 snap-center group relative bg-[#0f141f] border border-slate-800 hover:border-amber-500/60 rounded-3xl p-5 sm:p-6 shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer active:scale-[0.98]"
                  style={{
                    boxShadow: `0 15px 35px -15px ${pack.colorAccent}30`
                  }}
                >
                  {/* Top Bar: Tier Badge & Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-700/80 uppercase">
                        {pack.tier.replace('_', ' ')}
                      </span>
                      {pack.badgeText && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono"
                          style={{
                            backgroundColor: `${pack.colorAccent}15`,
                            color: pack.colorAccent,
                            borderColor: `${pack.colorAccent}40`
                          }}
                        >
                          {pack.badgeText}
                        </span>
                      )}
                    </div>

                    {/* Prominent Price Tag */}
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] text-slate-400 font-mono font-bold uppercase">PRICE</span>
                      <span className="font-mono text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
                        ${pack.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Pack Visual Stand with 3D Foil & Top Chase Peek Behind */}
                  <div className="relative h-56 sm:h-64 flex items-center justify-center my-2">
                    {/* Top Chase Card Peek behind the pack */}
                    {topPullCard && (
                      <div className="absolute right-3 sm:right-6 w-28 sm:w-32 h-44 sm:h-48 rounded-xl overflow-hidden border-2 border-amber-400/70 shadow-2xl transform rotate-8 group-hover:rotate-12 transition-all duration-300 z-0">
                        <img
                          src={topPullCard.imageUrl}
                          alt={topPullCard.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[8px] font-bold font-mono text-amber-300 border border-amber-400/40">
                          {topPullCard.grade}
                        </div>
                      </div>
                    )}

                    {/* Main Pack Foil Wrapper (borderless, sharp edges) */}
                    <div
                      className="relative z-10 w-36 sm:w-40 h-52 sm:h-56 rounded-none overflow-hidden shadow-2xl flex flex-col items-center justify-between p-3.5 transform group-hover:scale-105 group-hover:-rotate-2 transition-all duration-300 select-none"
                      style={{
                        boxShadow: `0 15px 30px -10px ${pack.colorAccent}50`
                      }}
                    >
                      <img
                        src={pack.packCoverUrl}
                        alt={pack.name}
                        className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-85 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
                      <div className="holo-shine" />

                      {/* Top Crimp Seal */}
                      <div className="relative z-10 w-full flex items-center justify-between border-b border-white/20 pb-1.5">
                        <div className="w-3 h-0.5 rounded bg-white/40" />
                        <span className="text-[8px] tracking-widest uppercase font-mono font-bold text-amber-300">
                          AUTHENTIC SLAB
                        </span>
                        <div className="w-3 h-0.5 rounded bg-white/40" />
                      </div>

                      {/* Pack Center Emblem */}
                      <div className="relative z-10 flex flex-col items-center text-center">
                        <Sparkles
                          className="w-6 h-6 mb-1 drop-shadow"
                          style={{ color: pack.colorAccent }}
                        />
                        <span className="text-sm font-black text-white font-display leading-tight drop-shadow-md">
                          {pack.name}
                        </span>
                      </div>

                      {/* Bottom Crimp */}
                      <div className="relative z-10 w-full pt-1.5 border-t border-white/20 text-center">
                        <span className="text-[10px] font-mono font-bold text-slate-200">
                          {pack.items.length} CARDS INSIDE
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pack Information & Top Hit Highlight */}
                  <div className="mt-3">
                    <h3 className="text-lg font-black text-white font-display group-hover:text-amber-400 transition-colors">
                      {pack.name}
                    </h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                      {pack.description}
                    </p>

                    {/* Top Grail Callout Box */}
                    {topPullCard && (
                      <div className="mt-2.5 p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0 pr-1">
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold border border-amber-500/30 shrink-0">
                            {topPullCard.grade}
                          </span>
                          <span className="text-xs text-slate-200 font-medium truncate">
                            {topPullCard.name}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-black text-amber-400 shrink-0">
                          ${topPullCard.value.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Primary Touch Actions (48px Touch Target for iOS) */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playHapticTap();
                        onSelectPack(pack);
                      }}
                      className="flex-1 min-h-[48px] py-3 px-4 rounded-xl font-display font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-lg shadow-amber-500/25 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <span>Rip Pack (${pack.price.toLocaleString()})</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Dots / Glide Indicators */}
          <div className="flex items-center justify-center gap-1.5 mt-3 py-1">
            {filteredPacks.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToPack(i)}
                className={`h-1.5 rounded-full transition-all ${
                  activeDeckIndex === i
                    ? 'w-6 bg-amber-400'
                    : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                }`}
                aria-label={`Jump to pack ${i + 1}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. VIEW 2: COMPACT CATALOG GRID MODE */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {filteredPacks.map((pack) => {
            const maxVal = Math.max(...pack.items.map(i => i.value));
            const topPullCard = pack.items.find(i => i.value === maxVal);

            return (
              <div
                key={pack.id}
                onClick={() => {
                  playHapticTap();
                  onSelectPack(pack);
                }}
                className="group relative bg-[#0f141f] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3 sm:p-4 flex flex-col justify-between shadow-lg transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                {/* Header Price & Tier */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 uppercase">
                    {pack.tier.replace('_', ' ')}
                  </span>
                  <span className="font-mono text-sm sm:text-base font-black text-amber-400 tabular-nums">
                    ${pack.price.toLocaleString()}
                  </span>
                </div>

                {/* Pack Visual */}
                <div className="relative h-32 sm:h-36 flex items-center justify-center my-1">
                  <div
                    className="w-20 sm:w-24 h-28 sm:h-32 rounded-none overflow-hidden shadow-xl relative transform group-hover:scale-105 transition-all duration-300"
                  >
                    <img
                      src={pack.packCoverUrl}
                      alt={pack.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/70" />
                    <div className="absolute bottom-1.5 inset-x-1 text-center text-[10px] font-black text-white font-display truncate">
                      {pack.name}
                    </div>
                  </div>
                </div>

                {/* Info & Top Grail note */}
                <div className="mt-1">
                  <h4 className="text-xs sm:text-sm font-bold text-white font-display truncate group-hover:text-amber-400 transition-colors">
                    {pack.name}
                  </h4>
                  {topPullCard && (
                    <p className="text-[10px] text-amber-400 font-mono truncate mt-0.5">
                      Top: ${topPullCard.value.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Action CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    playHapticTap();
                    onSelectPack(pack);
                  }}
                  className="mt-3 w-full min-h-[38px] py-1.5 px-3 rounded-lg text-xs font-bold font-display bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-1 transition-all active:scale-95"
                >
                  <span>Open (${pack.price.toLocaleString()})</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
