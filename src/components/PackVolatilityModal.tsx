import React, { useState } from 'react';
import { Pack } from '../types';
import { X, Sparkles } from 'lucide-react';
import { playHapticTap, playSuccessChime } from '../utils/sound';
import { VolatilityMode } from '../utils/provablyFair';

export type { VolatilityMode };

interface PackVolatilityModalProps {
  pack: Pack;
  isOpen: boolean;
  currentVolatility: VolatilityMode;
  currentCustomOdds?: number;
  onClose: () => void;
  onApplyVolatility: (mode: VolatilityMode, customOdds?: number) => void;
}

interface TierOddsDisplay {
  name: string;
  minPrice: number;
  maxPrice: number;
  percentage: number;
  colorType: 'silver' | 'gold' | 'purple' | 'cyan' | 'empty';
}

export const PackVolatilityModal: React.FC<PackVolatilityModalProps> = ({
  pack,
  isOpen,
  currentVolatility,
  onClose,
  onApplyVolatility
}) => {
  const initialMode = currentVolatility === ('custom' as VolatilityMode) ? 'ultra' : currentVolatility;
  const [selectedMode, setSelectedMode] = useState<VolatilityMode>(initialMode);

  // Keep selectedMode in sync when opening modal or switching packs
  React.useEffect(() => {
    if (isOpen) {
      setSelectedMode(currentVolatility === ('custom' as VolatilityMode) ? 'ultra' : currentVolatility);
    }
  }, [isOpen, currentVolatility]);

  if (!isOpen) return null;

  const minPull = Math.min(...pack.items.map((i) => i.value));
  const maxPull = Number((pack.price * 4).toFixed(2));
  const packImg = pack.packCoverUrl || 'https://www.crowncards.io/_next/image?url=%2Fpacks%2Fgold.png&w=640&q=75';

  // Calculate tier distributions based on volatility mode (Normal, High, Ultra)
  const getTierBreakdown = (mode: VolatilityMode): TierOddsDisplay[] => {
    const p = pack.price;
    const maxVal = Number((p * 4).toFixed(2));

    if (mode === 'ultra') {
      // High-risk all-or-nothing: Common is 85%, Rare/Epic/Legendary at 0%, Grail at 15%
      return [
        {
          name: 'Common',
          minPrice: Number((p * 0.1).toFixed(2)),
          maxPrice: Number((p * 0.6).toFixed(2)),
          percentage: 85,
          colorType: 'silver'
        },
        {
          name: 'Rare',
          minPrice: 0,
          maxPrice: 0,
          percentage: 0,
          colorType: 'empty'
        },
        {
          name: 'Epic',
          minPrice: 0,
          maxPrice: 0,
          percentage: 0,
          colorType: 'empty'
        },
        {
          name: 'Legendary',
          minPrice: 0,
          maxPrice: 0,
          percentage: 0,
          colorType: 'empty'
        },
        {
          name: 'Grail',
          minPrice: Number((p * 2).toFixed(2)),
          maxPrice: maxVal,
          percentage: 15,
          colorType: 'gold'
        }
      ];
    }

    if (mode === 'high') {
      // High: Common 80%, Rare 7.7%, Epic 5.2%, Legendary 3.1%, Grail 4%
      return [
        {
          name: 'Common',
          minPrice: Number((p * 0.1).toFixed(2)),
          maxPrice: Number((p * 0.6).toFixed(2)),
          percentage: 80,
          colorType: 'silver'
        },
        {
          name: 'Rare',
          minPrice: Number((p * 0.8).toFixed(2)),
          maxPrice: Number((p * 1.5).toFixed(2)),
          percentage: 7.7,
          colorType: 'cyan'
        },
        {
          name: 'Epic',
          minPrice: Number((p * 1.6).toFixed(2)),
          maxPrice: Number((p * 2.3).toFixed(2)),
          percentage: 5.2,
          colorType: 'purple'
        },
        {
          name: 'Legendary',
          minPrice: Number((p * 2.4).toFixed(2)),
          maxPrice: Number((p * 3.2).toFixed(2)),
          percentage: 3.1,
          colorType: 'purple'
        },
        {
          name: 'Grail',
          minPrice: Number((p * 3.3).toFixed(2)),
          maxPrice: maxVal,
          percentage: 4,
          colorType: 'gold'
        }
      ];
    }

    // Default: 'normal'
    // Common is 60%, Rare is 29.6%, Epic is 7.9%, Legendary is 1.9%, Grail is 0.6%
    return [
      {
        name: 'Common',
        minPrice: Number((p * 0.1).toFixed(2)),
        maxPrice: Number((p * 0.6).toFixed(2)),
        percentage: 60,
        colorType: 'silver'
      },
      {
        name: 'Rare',
        minPrice: Number((p * 0.8).toFixed(2)),
        maxPrice: Number((p * 1.5).toFixed(2)),
        percentage: 29.6,
        colorType: 'cyan'
      },
      {
        name: 'Epic',
        minPrice: Number((p * 1.6).toFixed(2)),
        maxPrice: Number((p * 2.3).toFixed(2)),
        percentage: 7.9,
        colorType: 'purple'
      },
      {
        name: 'Legendary',
        minPrice: Number((p * 2.4).toFixed(2)),
        maxPrice: Number((p * 3.2).toFixed(2)),
        percentage: 1.9,
        colorType: 'purple'
      },
      {
        name: 'Grail',
        minPrice: Number((p * 3.3).toFixed(2)),
        maxPrice: maxVal,
        percentage: 0.6,
        colorType: 'gold'
      }
    ];
  };

  const tiers = getTierBreakdown(selectedMode);

  const handleApply = () => {
    playSuccessChime();
    onApplyVolatility(selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md bg-[#0b0e1b] border-t sm:border border-white/10 rounded-t-[28px] sm:rounded-2xl shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Top Handle for Sheet on Mobile */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Fixed Header Zone */}
        <div className="p-4 sm:p-5 pb-3 border-b border-white/5 shrink-0">
          {/* Pack Thumbnail (sharp rectangular edges) & Header */}
          <div className="flex items-center gap-3 mb-3 pr-8">
            <div className="w-13 h-17 sm:w-14 sm:h-18 rounded-none overflow-hidden shadow-lg border border-white/15 bg-black/60 shrink-0">
              <img src={packImg} alt={pack.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs text-slate-400 font-medium font-sans truncate">
                {pack.name} · ${pack.price.toLocaleString()}
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white font-display tracking-tight leading-snug">
                Estimated Odds &amp; Values
              </h3>
            </div>
          </div>

          {/* SET VOLATILITY Divider */}
          <div className="relative flex items-center justify-center my-2.5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative px-2.5 bg-[#0b0e1b] text-[10px] font-mono tracking-widest text-slate-400 font-bold uppercase">
              SET VOLATILITY
            </span>
          </div>

          {/* Volatility Segmented Control (Normal | High | Ultra) - 3 Options Only */}
          <div className="grid grid-cols-3 p-1 rounded-full bg-[#121526] border border-white/10">
            {(['normal', 'high', 'ultra'] as const).map((mode) => {
              const isSelected = selectedMode === mode;
              const label =
                mode === 'normal'
                  ? 'Normal'
                  : mode === 'high'
                  ? 'High'
                  : 'Ultra';

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    playHapticTap();
                    setSelectedMode(mode);
                  }}
                  className={`py-1.5 sm:py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white shadow-[0_0_15px_rgba(139,92,246,0.5)] font-extrabold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Tier Breakdown Body */}
        <div className="p-4 sm:p-5 pt-3 overflow-y-auto flex-1 flex flex-col gap-2.5">
          {tiers.map((tier) => {
            const hasOdds = tier.percentage > 0;

            return (
              <div key={tier.name} className="flex items-center justify-between text-left py-0.5">
                {/* Left: Tier Name and Value Range */}
                <div className="flex flex-col min-w-[100px]">
                  <span className="text-xs sm:text-sm font-bold text-slate-200 font-sans">
                    {tier.name}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-400">
                    ${tier.minPrice < 1 && tier.minPrice > 0 ? tier.minPrice.toFixed(2) : tier.minPrice.toLocaleString()} - ${tier.maxPrice < 1 && tier.maxPrice > 0 ? tier.maxPrice.toFixed(2) : tier.maxPrice.toLocaleString()}
                  </span>
                </div>

                {/* Right: Percentage Bar or 0% */}
                <div className="flex-1 flex justify-end items-center max-w-[200px]">
                  {hasOdds ? (
                    <div className="relative w-full h-7 sm:h-8 rounded-md overflow-hidden flex items-center justify-start px-2.5 bg-slate-900/60 border border-white/5">
                      {/* Filled Progress Bar */}
                      <div
                        className={`absolute inset-y-0 left-0 transition-all duration-300 ${
                          tier.colorType === 'gold'
                            ? 'bg-gradient-to-r from-[#B45309] via-[#D97706] to-[#FBBF24] opacity-90'
                            : tier.colorType === 'purple'
                            ? 'bg-gradient-to-r from-purple-800 to-indigo-600 opacity-90'
                            : tier.colorType === 'cyan'
                            ? 'bg-gradient-to-r from-teal-700 to-cyan-500 opacity-90'
                            : 'bg-gradient-to-r from-slate-700 via-slate-600 to-slate-400 opacity-90'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(14, tier.percentage))}%` }}
                      />
                      <span className="relative z-10 font-mono font-black text-xs text-white drop-shadow-md">
                        {tier.percentage % 1 === 0 ? tier.percentage : tier.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-slate-500 px-2">
                      0%
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Min Value & Max Pull (Strictly 4X Max Payout) */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-1">
            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Min Value:</span>
              <span className="text-sm sm:text-base font-bold text-white font-mono">
                ${minPull < 1 ? minPull.toFixed(2) : minPull.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 font-sans">
              <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Max Pull (4X):</span>
              <span className="text-base sm:text-lg font-black bg-gradient-to-r from-[#FDE68A] via-[#F472B6] to-[#93C5FD] bg-clip-text text-transparent font-mono drop-shadow-[0_0_12px_rgba(244,114,182,0.4)]">
                ${maxPull < 1 ? maxPull.toFixed(2) : maxPull.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* ALWAYS-VISIBLE STICKY APPLY BUTTON AT BOTTOM */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 bg-[#070a14] shrink-0">
          <button
            type="button"
            onClick={handleApply}
            className="w-full min-h-[46px] py-2.5 px-6 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(244,114,182,0.35)] hover:shadow-[0_6px_25px_rgba(244,114,182,0.5)] font-display font-extrabold text-sm sm:text-base text-[#2E0854] tracking-tight"
            style={{
              background: 'linear-gradient(105deg, #FFF3B0 0%, #FDE68A 20%, #FBCFE8 50%, #E9D5FF 75%, #BAE6FD 100%)'
            }}
          >
            Apply Odds
          </button>
        </div>
      </div>
    </div>
  );
};
