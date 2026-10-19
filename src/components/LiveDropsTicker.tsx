import React from 'react';
import { RecentPull } from '../types';
import { Sparkles, Trophy } from 'lucide-react';

interface LiveDropsTickerProps {
  recentPulls: RecentPull[];
  onCardClick?: (pull: RecentPull) => void;
}

export const LiveDropsTicker: React.FC<LiveDropsTickerProps> = ({ recentPulls, onCardClick }) => {
  return (
    <div className="w-full bg-[#07090e] border-b border-slate-800/80 overflow-hidden py-2 select-none">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-3">
        {/* Live indicator badge */}
        <div className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
          <span className="tracking-wide text-[11px]">LIVE VAULT PULLS</span>
        </div>

        {/* Scrolling or Flex horizontal cards */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-0.5">
          {recentPulls.map((pull) => {
            const isGrail = pull.card.rarity === 'Grail';
            const isSecret = pull.card.rarity === 'Secret Rare';

            return (
              <div
                key={pull.id}
                onClick={() => onCardClick?.(pull)}
                className={`flex items-center gap-2 shrink-0 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                  isGrail
                    ? 'bg-gradient-to-r from-amber-950/40 via-yellow-950/20 to-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/20'
                    : isSecret
                    ? 'bg-slate-900/90 border-purple-500/40 hover:border-purple-400'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* User avatar initial */}
                <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                  {pull.username.slice(0, 1).toUpperCase()}
                </div>

                {/* Card thumbnail */}
                <div className="w-6 h-8 rounded bg-black/40 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                  <img
                    src={pull.card.imageUrl}
                    alt={pull.card.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>

                {/* Details */}
                <div className="flex flex-col min-w-[90px] max-w-[140px]">
                  <span className="text-[10px] text-slate-400 truncate">{pull.username}</span>
                  <span className="text-xs font-semibold text-slate-200 truncate leading-tight">
                    {pull.card.name}
                  </span>
                </div>

                {/* Value */}
                <div className="flex items-center gap-1 font-mono text-xs font-bold shrink-0 ml-1">
                  {isGrail && <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />}
                  <span className={isGrail ? 'text-amber-400' : 'text-slate-200'}>
                    {pull.card.value.toLocaleString()} CC
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
