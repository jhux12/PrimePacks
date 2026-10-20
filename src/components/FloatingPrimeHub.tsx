import React, { useState } from "react";
import {
  playHapticTap,
  playCoinClink,
  toggleSound as toggleAudio,
  isSoundEnabled,
} from "../utils/sound";
import {
  Sparkles,
  ShieldCheck,
  Gift,
  Coins,
  Volume2,
  VolumeX,
  X,
  Flame,
  ChevronRight,
  Layers,
  Zap,
  TrendingUp,
  Crown,
  Check,
} from "lucide-react";

export interface CategoryOption {
  id: string;
  label: string;
  subtitle: string;
  count: number;
  iconName: "all" | "pokemon" | "sports" | "vintage" | "whales";
}

interface FloatingPrimeHubProps {
  balance: number;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
  categories?: CategoryOption[];
  onNavigateToStore?: () => void;
  onNavigateToBattles?: () => void;
  onNavigateToUpgrader?: () => void;
  onRefillCoins: () => void;
  onOpenDailyRewards: () => void;
  onOpenProvablyFair: () => void;
  onOpenVault: () => void;
  vaultCount: number;
}

export const FloatingPrimeHub: React.FC<FloatingPrimeHubProps> = ({
  balance,
  activeCategory = "all",
  onSelectCategory,
  categories,
  onNavigateToStore,
  onNavigateToBattles,
  onNavigateToUpgrader,
  onRefillCoins,
  onOpenDailyRewards,
  onOpenProvablyFair,
  onOpenVault,
  vaultCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled);
  const toggleSound = () => setSoundEnabled(toggleAudio());

  const defaultCategories: CategoryOption[] = [
    {
      id: "all",
      label: "All Collections",
      subtitle: "Browse all mystery packs",
      count: 7,
      iconName: "all",
    },
    {
      id: "pokemon",
      label: "Pokémon TCG",
      subtitle: "Scarlet & Violet, 151, Japanese",
      count: 3,
      iconName: "pokemon",
    },
    {
      id: "sports",
      label: "Sports & Kabooms",
      subtitle: "NBA, NFL, Prizm & Downtown",
      count: 2,
      iconName: "sports",
    },
    {
      id: "vintage",
      label: "Vintage Grails",
      subtitle: "1st Edition Base Set & Relics",
      count: 1,
      iconName: "vintage",
    },
    {
      id: "whales",
      label: "High Roller & Whales",
      subtitle: "$1,000+ Legendary Grails",
      count: 1,
      iconName: "whales",
    },
  ];

  const categoryList = categories || defaultCategories;

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case "pokemon":
        return <Zap className="w-4 h-4 text-amber-400" />;
      case "sports":
        return <TrendingUp className="w-4 h-4 text-cyan-400" />;
      case "vintage":
        return <Crown className="w-4 h-4 text-purple-400" />;
      case "whales":
        return <Flame className="w-4 h-4 text-pink-400" />;
      case "all":
      default:
        return <Layers className="w-4 h-4 text-[#00F076]" />;
    }
  };

  const getActiveLabel = () => {
    switch (activeCategory) {
      case "pokemon":
        return "POKÉMON";
      case "sports":
        return "SPORTS";
      case "vintage":
        return "VINTAGE";
      case "whales":
        return "WHALES";
      case "all":
      default:
        return "ALL PACKS";
    }
  };

  return (
    <>
      {/* 1. FLOATING CATEGORY CHANGER ACTION ICON (Top-right on mobile, Bottom-right on desktop) */}
      <div className="fixed top-16 right-3 sm:top-auto sm:bottom-6 sm:right-6 z-40 flex flex-col items-end">
        {/* Expanded Category Switcher Card */}
        {isOpen && (
          <div
            className="mt-2 sm:mt-0 sm:mb-3 order-2 sm:order-1 w-72 sm:w-88 max-h-[72vh] overflow-y-auto rounded-2xl bg-[#090e1a]/95 backdrop-blur-2xl border border-[#00F076]/40 p-3.5 sm:p-4 shadow-[0_10px_40px_rgba(0,240,118,0.25)] animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#00F076]/20 border border-[#00F076]/40 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-[#00F076]" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white font-display leading-none">
                    Pack Categories
                  </h3>
                  <span className="text-[9px] font-mono text-slate-400">
                    Filter Store & 3D Carousels
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Switcher List */}
            <div className="flex flex-col gap-1.5 my-3">
              {categoryList.map((cat) => {
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      playHapticTap();
                      onSelectCategory?.(cat.id);
                      onNavigateToStore?.();
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all active:scale-98 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-[#00F076]/20 via-[#00F076]/10 to-transparent border-[#00F076] shadow-[0_0_15px_rgba(0,240,118,0.25)]"
                        : "bg-slate-900/80 border-white/5 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                          isSelected
                            ? "bg-[#00F076]/25 border-[#00F076]/60"
                            : "bg-slate-800 border-white/10"
                        }`}
                      >
                        {renderCategoryIcon(cat.iconName)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-display font-bold text-xs ${isSelected ? "text-[#00F076]" : "text-white"}`}
                          >
                            {cat.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 block line-clamp-1">
                          {cat.subtitle}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5">
                        {cat.count}
                      </span>
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-[#00F076] text-black flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Hub Shortcuts */}
            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  playCoinClink();
                  onRefillCoins();
                }}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Coins className="w-3.5 h-3.5 text-[#00F076]" />
                <span>Add store credit</span>
              </button>

              <button
                onClick={() => {
                  setIsOpen(false);
                  toggleSound();
                }}
                className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>{soundEnabled ? "Mute sound" : "Enable sound"}</span>
              </button>

              {onNavigateToBattles && (
                <button
                  onClick={() => {
                    playHapticTap();
                    setIsOpen(false);
                    onNavigateToBattles();
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Pack Battles</span>
                </button>
              )}

              {onNavigateToUpgrader && (
                <button
                  onClick={() => {
                    playHapticTap();
                    setIsOpen(false);
                    onNavigateToUpgrader();
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
                  <span>Card Upgrader</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floating Trigger Button: The Category Changer */}
        <button
          onClick={() => {
            playHapticTap();
            setIsOpen(!isOpen);
          }}
          className={`relative group w-12 h-12 sm:w-14 sm:h-14 rounded-full p-1 flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 cursor-pointer order-1 sm:order-2 ${
            isOpen
              ? "bg-[#00F076] rotate-90 shadow-[0_0_25px_rgba(0,240,118,0.8)]"
              : "bg-gradient-to-br from-[#0c1424] via-[#080d19] to-[#04070e] border-2 border-[#00F076]/80 hover:border-[#00F076] shadow-[0_0_20px_rgba(0,240,118,0.5)] hover:shadow-[0_0_30px_rgba(0,240,118,0.8)]"
          }`}
          title="Change Pack Category"
          aria-label="Change Pack Category"
        >
          {/* Subtle pulse ring (Child 1 of button) */}
          {!isOpen && (
            <div className="absolute inset-0 rounded-full border border-[#00F076] animate-ping opacity-30 pointer-events-none" />
          )}

          {isOpen ? (
            <X className="w-6 h-6 text-black stroke-[3]" />
          ) : (
            /* Child 2 of button (matches CSS selector 1) */
            <div className="relative flex items-center justify-center w-full h-full">
              {/* Child 1 of Child 2 (matches CSS selector 2) */}
              <div className="flex flex-col items-center justify-center transition-transform group-hover:scale-110">
                <Layers className="w-5 h-5 text-[#00F076] drop-shadow-[0_0_8px_rgba(0,240,118,0.8)]" />
                <span className="text-[7.5px] font-mono font-black text-[#00F076] tracking-tight uppercase leading-none mt-0.5">
                  {getActiveLabel()}
                </span>
              </div>

              {/* Category sparkle badge on top-right corner */}
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 border border-black flex items-center justify-center shadow-md">
                <Sparkles className="w-2.5 h-2.5 text-black" />
              </div>
            </div>
          )}
        </button>
      </div>
    </>
  );
};
