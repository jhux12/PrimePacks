import React, { useState } from 'react';
import { Gift, Sparkles, X, Check, Lock, Unlock, Package, Zap } from 'lucide-react';
import { playHitChime, playGrailFanfare, playHapticTap, playPackRip } from '../utils/sound';
import { PrimePacksLogo } from './PrimePacksLogo';
import { fxSystem } from '../utils/interactiveFX';
import confetti from 'canvas-confetti';

interface DailyRewardsModalProps {
  lastClaimedAt: number | null;
  onClaimDaily: (amount: number) => void;
  onFaucetRefill: (amount: number) => void;
  onClose: () => void;
}

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  lastClaimedAt,
  onClaimDaily,
  onFaucetRefill,
  onClose
}) => {
  const [claimedDailyBonus, setClaimedDailyBonus] = useState(false);
  const [claimedDailyPack, setClaimedDailyPack] = useState(() => {
    return localStorage.getItem('crowncards_daily_pack_claimed') === new Date().toDateString();
  });

  const [depositAmount, setDepositAmount] = useState<number>(() => {
    const saved = localStorage.getItem('crowncards_deposited_today');
    return saved ? Number(saved) : 0;
  });

  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  const isBonusEligible = !lastClaimedAt || now - lastClaimedAt > dayInMs;
  const isPackUnlocked = depositAmount >= 20;

  const handleClaimBonus = (e: React.MouseEvent) => {
    if (!isBonusEligible) return;
    playHapticTap();
    const rect = e.currentTarget.getBoundingClientRect();
    fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 30);
    onClaimDaily(150);
    setClaimedDailyBonus(true);
    playGrailFanfare();
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const handleDeposit = (amt: number, e: React.MouseEvent) => {
    playHapticTap();
    const rect = e.currentTarget.getBoundingClientRect();
    fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 25);
    const newTotal = depositAmount + amt;
    setDepositAmount(newTotal);
    localStorage.setItem('crowncards_deposited_today', newTotal.toString());
    onFaucetRefill(amt);
    playHitChime();
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 }
    });
  };

  const handleRipDailyPack = (e: React.MouseEvent) => {
    if (!isPackUnlocked || claimedDailyPack) return;
    playHapticTap();
    playPackRip();
    const rect = e.currentTarget.getBoundingClientRect();
    fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 40);
    // Reward $75 + Free pack bonus to balance
    onFaucetRefill(75);
    setClaimedDailyPack(true);
    localStorage.setItem('crowncards_daily_pack_claimed', new Date().toDateString());
    playGrailFanfare();
    confetti({
      particleCount: 180,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#FFD700', '#FFA500', '#FFFFFF', '#EC4899', '#A855F7']
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="bg-[#090d18] border border-white/10 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Ambient glow in background */}
        <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <button
          onClick={() => {
            playHapticTap();
            onClose();
          }}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-md">
            <Gift className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white font-display">Daily Rewards & Packs</h3>
            <span className="text-[10px] text-slate-400 font-mono">Unlock exclusive free packs and login drops</span>
          </div>
        </div>

        {/* 1. DAILY PACK (UNLOCKED AFTER $20 IN DEPOSITS) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/60 via-[#101726] to-[#0a0f1d] border-2 border-amber-400/40 mb-4 relative overflow-hidden shadow-xl">
          <div className="flex items-start gap-3">
            {/* Prime Pack Thumbnail */}
            <div className="relative shrink-0 w-16 h-20 rounded-xl overflow-hidden border border-[#00F076]/40 shadow-lg bg-gradient-to-b from-[#0d121f] to-[#060a12] flex flex-col items-center justify-center p-1.5">
              <PrimePacksLogo variant="icon" size="sm" glow={true} />
              <span className="text-[8px] font-black text-[#00F076] font-display mt-1">PRIME</span>
              {isPackUnlocked ? (
                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center font-bold text-[9px]">
                  ✓
                </div>
              ) : (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-mono font-black text-amber-300 uppercase tracking-wider">
                  Daily Mystery Pack
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                Unlocks after <span className="text-amber-400 font-black font-mono">$20.00</span> in deposits today!
              </p>

              {/* Deposit Progress Bar */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                  <span>Progress</span>
                  <span className={isPackUnlocked ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    ${Math.min(20, depositAmount).toFixed(2)} / $20.00
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/60 border border-white/10 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      isPackUnlocked
                        ? 'bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_10px_#10b981]'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_10px_#f59e0b]'
                    }`}
                    style={{ width: `${Math.min(100, (depositAmount / 20) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button: Claim/Rip or Deposit */}
          <div className="mt-3.5">
            {isPackUnlocked ? (
              <button
                onClick={handleRipDailyPack}
                disabled={claimedDailyPack}
                className={`w-full py-2.5 rounded-xl text-xs font-black font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer active:scale-95 ${
                  claimedDailyPack
                    ? 'bg-slate-900 border border-white/10 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-amber-500/40 hover:brightness-110 animate-pulse'
                }`}
              >
                {claimedDailyPack ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Daily Pack Claimed Today!</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-black" />
                    <span>Rip Free Daily Pack Now</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDeposit(20, e)}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-display font-black text-xs shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer hover:brightness-110 text-center"
                >
                  Deposit $20 to Unlock
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. DAILY LOGIN COLLECTOR DROP ($150) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono font-bold text-amber-300 block">
                Daily Free Cash Drop
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Claim $150 balance every 24 hours
              </span>
            </div>
            <span className="font-mono text-base font-black text-amber-400">
              +$150.00
            </span>
          </div>

          <button
            onClick={handleClaimBonus}
            disabled={!isBonusEligible || claimedDailyBonus}
            className={`w-full mt-2.5 py-2 rounded-xl text-xs font-bold font-display flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              isBonusEligible && !claimedDailyBonus
                ? 'bg-white/10 hover:bg-white/15 text-white border border-white/20 cursor-pointer'
                : 'bg-slate-950 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {claimedDailyBonus ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Claimed for Today</span>
              </>
            ) : isBonusEligible ? (
              <span>Claim Daily $150</span>
            ) : (
              <span>Available Tomorrow</span>
            )}
          </button>
        </div>

        {/* 3. INSTANT DEPOSIT / REFILL CHIPS */}
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 font-mono">
            Instant Deposit & Refill
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[20, 50, 100].map((amt) => (
              <button
                key={amt}
                onClick={(e) => handleDeposit(amt, e)}
                className="py-2 px-2 rounded-xl bg-slate-900 border border-white/10 hover:border-amber-400/40 text-xs font-mono font-bold text-amber-400 hover:text-white transition-all flex flex-col items-center justify-center active:scale-95 cursor-pointer shadow-sm"
              >
                <span>+${amt}</span>
                <span className="text-[9px] text-slate-500 font-normal">
                  {amt >= 20 ? 'Unlocks Pack' : 'Instant'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
