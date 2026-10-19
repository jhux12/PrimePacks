import React, { useState } from 'react';
import { Gift, Copy, Check, Users, Sparkles, X } from 'lucide-react';
import { playHapticTap, playCoinClink } from '../utils/sound';
import { fxSystem } from '../utils/interactiveFX';

interface ReferModalProps {
  onClose: () => void;
  onClaimReferralBonus: (amount: number) => void;
}

export const ReferModal: React.FC<ReferModalProps> = ({ onClose, onClaimReferralBonus }) => {
  const [copied, setCopied] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const referralCode = 'CROWN-GRAIL-99';

  const handleCopy = (e: React.MouseEvent) => {
    playHapticTap();
    navigator.clipboard?.writeText?.(referralCode);
    setCopied(true);
    const rect = e.currentTarget.getBoundingClientRect();
    fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 15);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateFriend = (e: React.MouseEvent) => {
    playCoinClink();
    setClaimed(true);
    const rect = e.currentTarget.getBoundingClientRect();
    fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 25);
    onClaimReferralBonus(50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-[#090d18] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Ambient glow in background */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-400 flex items-center justify-center shadow-md">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white font-display">Refer a Collector</h3>
              <span className="text-[10px] text-slate-400 font-mono">Give $10, Get $10 bonus</span>
            </div>
          </div>
          <button
            onClick={() => {
              playHapticTap();
              onClose();
            }}
            className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-pink-950/40 via-[#130f24] to-[#090d18] border border-pink-500/30 text-center mb-5 relative overflow-hidden shadow-lg">
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 uppercase tracking-wider">
            GIVE $10, GET $10
          </span>
          <h4 className="text-xl font-black text-white font-display mt-2.5">
            Invite Friends & Rip Free Packs
          </h4>
          <p className="text-xs text-slate-300 mt-1.5">
            Share your unique invite code. When a friend signs up and opens their first pack, both of you earn $50 in free unsealing credits!
          </p>
        </div>

        {/* Code Box */}
        <div className="mb-5">
          <label className="text-[11px] font-bold text-slate-400 block mb-1.5 font-mono uppercase">
            Your Personal Code
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border border-white/10 font-mono text-sm font-bold text-amber-400 tracking-wider">
              {referralCode}
            </div>
            <button
              onClick={handleCopy}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-bold text-xs font-mono flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-md"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Demo Button to claim simulated referral */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleSimulateFriend}
            disabled={claimed}
            className={`w-full py-3 rounded-2xl text-xs font-bold font-display flex items-center justify-center gap-2 transition-all active:scale-95 ${
              claimed
                ? 'bg-slate-900 border border-white/10 text-emerald-400 cursor-default'
                : 'bg-slate-900 border border-white/10 hover:border-pink-500/40 text-pink-300 hover:text-white cursor-pointer shadow-md'
            }`}
          >
            {claimed ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Claimed $50 Referral Bonus!</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-pink-400" />
                <span>Simulate Friend Join (+$50 Instant Bonus)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
