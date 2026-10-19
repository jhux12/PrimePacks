import React, { useState, useEffect, useRef } from 'react';
import { CardItem } from '../types';
import { ALL_CARDS } from '../data/cards';
import { Sparkles, Flame, Crown, Clock, ChevronRight, Eye } from 'lucide-react';
import { playHapticTap } from '../utils/sound';

export interface LiveDropItem {
  id: string;
  card: CardItem;
  username: string;
  avatarUrl: string;
  timestamp: number; // epoch ms
  packName: string;
  isUserDrop?: boolean;
}

interface LiveRecentPullsTickerProps {
  userDrops?: CardItem[];
  onInspectCard: (card: CardItem) => void;
}

const SAMPLE_COMMUNITY_USERS = [
  { name: 'PokeCollector99', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80' },
  { name: 'ApexRips', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80' },
  { name: 'CrownWhale', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80&auto=format&fit=crop&q=80' },
  { name: 'SlabHunter', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=80&auto=format&fit=crop&q=80' },
  { name: 'KobeCollector24', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80' },
  { name: 'GengarKing', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=80&auto=format&fit=crop&q=80' },
  { name: 'MoonbreonLover', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&auto=format&fit=crop&q=80' },
  { name: 'VintageVault', avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=80&auto=format&fit=crop&q=80' }
];

const PACK_NAMES = [
  'Vintage Grails & 1st Editions',
  'Crown Super Whale VIP',
  '151 God Pack Ultra',
  'Prismatic Evolutions',
  'Pokémon Starter Pack',
  'Rookie Prizm Blaster'
];

export const LiveRecentPullsTicker: React.FC<LiveRecentPullsTickerProps> = ({
  userDrops = [],
  onInspectCard
}) => {
  const [drops, setDrops] = useState<LiveDropItem[]>(() => {
    // Generate initial realistic seed drops
    const initialCards = ALL_CARDS.filter(c => c.value >= 25).slice(0, 10);
    return initialCards.map((card, i) => {
      const user = SAMPLE_COMMUNITY_USERS[i % SAMPLE_COMMUNITY_USERS.length];
      return {
        id: `seed-drop-${i}`,
        card,
        username: user.name,
        avatarUrl: user.avatar,
        timestamp: Date.now() - (i * 35000 + Math.random() * 20000),
        packName: PACK_NAMES[i % PACK_NAMES.length],
        isUserDrop: false
      };
    });
  });

  const [filterMode, setFilterMode] = useState<'all' | 'high_roller' | 'grails'>('all');
  const [isPaused, setIsPaused] = useState(false);
  const marqueeRef = useRef<HTMLDivElement>(null);

  // Prepend new user drops when passed from CrownHomeScreen
  useEffect(() => {
    if (userDrops.length === 0) return;
    const latestUserDrop = userDrops[userDrops.length - 1];
    const newDrop: LiveDropItem = {
      id: `user-drop-${Date.now()}-${Math.random()}`,
      card: latestUserDrop,
      username: 'YOU',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&auto=format&fit=crop&q=80',
      timestamp: Date.now(),
      packName: 'Your Pack Rip',
      isUserDrop: true
    };

    setDrops(prev => [newDrop, ...prev.slice(0, 24)]);
  }, [userDrops]);

  // Periodic simulated community drops
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random card from high-value pool
      const pool = ALL_CARDS.filter(c => c.value >= 15);
      const randomCard = pool[Math.floor(Math.random() * pool.length)];
      const randomUser = SAMPLE_COMMUNITY_USERS[Math.floor(Math.random() * SAMPLE_COMMUNITY_USERS.length)];
      const randomPack = PACK_NAMES[Math.floor(Math.random() * PACK_NAMES.length)];

      const newDrop: LiveDropItem = {
        id: `sim-drop-${Date.now()}`,
        card: randomCard,
        username: randomUser.name,
        avatarUrl: randomUser.avatar,
        timestamp: Date.now(),
        packName: randomPack,
        isUserDrop: false
      };

      setDrops(prev => [newDrop, ...prev.slice(0, 24)]);
    }, 11000);

    return () => clearInterval(interval);
  }, []);

  // Filter drops based on selected tab
  const filteredDrops = drops.filter(d => {
    if (filterMode === 'grails') return d.card.value >= 1000 || d.card.rarity === 'Grail';
    if (filterMode === 'high_roller') return d.card.value >= 100;
    return true;
  });

  const formatTimeAgo = (timeMs: number) => {
    const sec = Math.max(1, Math.floor((Date.now() - timeMs) / 1000));
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    return `${min}m ago`;
  };

  return (
    <div className="w-full bg-[#070912]/95 border-b border-white/5 backdrop-blur-md select-none shrink-0 z-30 transition-all">
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 gap-2 border-b border-white/[0.03]">
        {/* Left: Live Drops Indicator */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="tracking-wider">LIVE DROPS</span>
          </div>

          <span className="hidden sm:inline text-xs text-slate-500 font-mono">
            Verified Community Pulls
          </span>
        </div>

        {/* Right: Quick Rarity Ticker Filters */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              playHapticTap();
              setFilterMode('all');
            }}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
              filterMode === 'all'
                ? 'bg-white/10 text-white font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              playHapticTap();
              setFilterMode('high_roller');
            }}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
              filterMode === 'high_roller'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <Flame className="w-2.5 h-2.5 text-amber-400" />
            <span>$100+</span>
          </button>
          <button
            onClick={() => {
              playHapticTap();
              setFilterMode('grails');
            }}
            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
              filterMode === 'grails'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-extrabold shadow-sm shadow-purple-500/20'
                : 'text-slate-400 hover:text-purple-300'
            }`}
          >
            <Crown className="w-2.5 h-2.5 text-purple-400" />
            <span>Grails</span>
          </button>
        </div>
      </div>

      {/* Ticker Row */}
      <div
        ref={marqueeRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-3 sm:px-4 touch-pan-x"
        style={{ scrollBehavior: 'smooth' }}
      >
        {filteredDrops.map((drop) => {
          const isGrail = drop.card.value >= 1000 || drop.card.rarity === 'Grail';
          const isHigh = drop.card.value >= 100;

          return (
            <div
              key={drop.id}
              onClick={() => {
                playHapticTap();
                onInspectCard(drop.card);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border shrink-0 transition-all cursor-pointer group active:scale-95 ${
                drop.isUserDrop
                  ? 'bg-gradient-to-r from-emerald-950/80 to-teal-950/60 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400/50'
                  : isGrail
                  ? 'bg-gradient-to-r from-purple-950/60 to-slate-900/80 border-purple-500/40 hover:border-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]'
                  : isHigh
                  ? 'bg-slate-900/80 border-amber-500/30 hover:border-amber-400/60'
                  : 'bg-[#0f1322]/80 border-white/5 hover:border-white/20'
              }`}
              title="Click to 3D Inspect Card"
            >
              {/* Card Mini Thumbnail */}
              <div className="relative w-8 h-11 rounded-md overflow-hidden bg-black/60 shrink-0 shadow">
                <img
                  src={drop.card.imageUrl}
                  alt={drop.card.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {drop.card.grade && (
                  <span className="absolute bottom-0 inset-x-0 bg-black/85 text-[7px] text-center font-mono font-bold text-slate-300">
                    {drop.card.grade}
                  </span>
                )}
              </div>

              {/* Drop Meta */}
              <div className="flex flex-col text-left">
                {/* User & Time */}
                <div className="flex items-center gap-1.5 text-[10px]">
                  {drop.isUserDrop ? (
                    <span className="font-mono font-black text-emerald-300 flex items-center gap-0.5">
                      <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                      YOU
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium truncate max-w-[70px]">
                      @{drop.username}
                    </span>
                  )}
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500 font-mono text-[9px]">
                    {formatTimeAgo(drop.timestamp)}
                  </span>
                </div>

                {/* Card Title */}
                <span className="text-xs font-bold text-white truncate max-w-[110px] sm:max-w-[130px] font-display">
                  {drop.card.name}
                </span>

                {/* Value & Inspect Cue */}
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <span
                    className={`font-mono text-xs font-black ${
                      isGrail
                        ? 'text-purple-300 drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]'
                        : isHigh
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    ${drop.card.value.toLocaleString()}
                  </span>

                  <Eye className="w-2.5 h-2.5 text-slate-500 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
