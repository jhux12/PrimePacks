import React, { useState } from 'react';
import { CardItem, InventoryCard } from '../types';
import { CardView } from './CardView';
import { ALL_CARDS } from '../data/cards';
import { playTick, playHitChime, playGrailFanfare, playHapticTap } from '../utils/sound';
import { fxSystem } from '../utils/interactiveFX';
import confetti from 'canvas-confetti';
import { TrendingUp, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface CardUpgraderProps {
  balance: number;
  inventory: InventoryCard[];
  initialCard?: CardItem | null;
  onDeductCoins: (amount: number) => boolean;
  onRemoveCardFromVault: (instanceId: string) => void;
  onAddCardToVault: (card: CardItem) => void;
}

export const CardUpgrader: React.FC<CardUpgraderProps> = ({
  balance,
  inventory,
  initialCard,
  onDeductCoins,
  onRemoveCardFromVault,
  onAddCardToVault
}) => {
  // Stake type: card or raw coins
  const [stakeType, setStakeType] = useState<'card' | 'coins'>(initialCard ? 'card' : 'coins');
  const [selectedInventoryCard, setSelectedInventoryCard] = useState<InventoryCard | null>(
    initialCard
      ? inventory.find((i) => i.card.id === initialCard.id) || null
      : inventory[0] || null
  );
  const [coinStake, setCoinStake] = useState<number>(25);

  // Target card from catalog
  const [targetCard, setTargetCard] = useState<CardItem>(
    ALL_CARDS.find((c) => c.id === 'charizard-ex-151-sir-psa10') || ALL_CARDS[0]
  );

  // Upgrader wheel state
  const [isSpinning, setIsSpinning] = useState(false);
  const [needleAngle, setNeedleAngle] = useState(0);
  const [rollDirection, setRollDirection] = useState<'under' | 'over'>('under');
  const [lastOutcome, setLastOutcome] = useState<'win' | 'lose' | null>(null);

  // Calculations
  const stakeValue =
    stakeType === 'card' && selectedInventoryCard
      ? selectedInventoryCard.card.value
      : coinStake;

  // House edge 5% for upgrader
  const rawChance = (stakeValue / targetCard.value) * 100 * 0.95;
  const winProbability = Math.min(Math.max(rawChance, 0.05), 90);
  const multiplier = (targetCard.value / Math.max(stakeValue, 1)).toFixed(2);

  const handleStartUpgrade = (e: React.MouseEvent) => {
    if (isSpinning) return;
    if (stakeType === 'card') {
      if (!selectedInventoryCard) return;
    } else {
      if (balance < coinStake) return;
    }

    playHapticTap();
    const rect = e.currentTarget.getBoundingClientRect();
    fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 20);

    setIsSpinning(true);
    setLastOutcome(null);

    // Roll random number 0 - 100
    const rolledResult = Math.random() * 100;
    const won =
      rollDirection === 'under'
        ? rolledResult <= winProbability
        : rolledResult >= 100 - winProbability;

    // Calculate needle rotation (3-5 full turns + target degrees)
    const targetSectorDeg = (rolledResult / 100) * 360;
    const totalRotation = needleAngle + 1440 + targetSectorDeg;
    setNeedleAngle(totalRotation);

    // Tick audio
    let tickCount = 0;
    const tickInterval = setInterval(() => {
      playTick();
      tickCount++;
      if (tickCount > 25) clearInterval(tickInterval);
    }, 120);

    setTimeout(() => {
      setIsSpinning(false);
      if (won) {
        setLastOutcome('win');
        playGrailFanfare();
        confetti({
          particleCount: 160,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#FFD700', '#10B981', '#38BDF8', '#EC4899']
        });

        // Consume stake
        if (stakeType === 'card' && selectedInventoryCard) {
          onRemoveCardFromVault(selectedInventoryCard.instanceId);
          setSelectedInventoryCard(null);
        } else {
          onDeductCoins(coinStake);
        }

        // Award target card
        onAddCardToVault(targetCard);
      } else {
        setLastOutcome('lose');
        playHitChime();

        // Consume stake on loss
        if (stakeType === 'card' && selectedInventoryCard) {
          onRemoveCardFromVault(selectedInventoryCard.instanceId);
          setSelectedInventoryCard(null);
        } else {
          onDeductCoins(coinStake);
        }
      }
    }, 4000);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24 select-none">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-7 h-7 text-amber-400" />
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            CARD UPGRADER LAB
          </h1>
          <div className="hidden xs:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
            <ShieldCheck className="w-3 h-3" />
            <span>PROVABLY FAIR</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Stake cards from your vault or raw balance to upgrade directly into high-tier Grails & PSA 10 Slabs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {/* LEFT COLUMN: YOUR STAKE */}
        <div className="order-1 lg:order-1 bg-[#090d18]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h2 className="text-sm font-bold text-white uppercase font-display tracking-wider">
              1. Choose Stake
            </h2>
            <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => {
                  playHapticTap();
                  setStakeType('coins');
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  stakeType === 'coins'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cash
              </button>
              <button
                onClick={() => {
                  playHapticTap();
                  setStakeType('card');
                }}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  stakeType === 'card'
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Vault Card
              </button>
            </div>
          </div>

          {stakeType === 'coins' ? (
            <div className="flex flex-col items-center py-4">
              <span className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">
                Stake Amount
              </span>
              <div className="text-3xl font-black font-mono text-amber-400 tabular-nums mb-4 drop-shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                ${coinStake.toLocaleString()}
              </div>

              {/* Quick Coin Buttons */}
              <div className="grid grid-cols-4 gap-2 w-full mb-4">
                {[10, 25, 50, 100, 250, 500, 1000, 2500].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => {
                      playHapticTap();
                      setCoinStake(amt);
                    }}
                    className={`min-h-[40px] py-2 rounded-xl text-xs font-mono font-bold transition-all active:scale-95 flex items-center justify-center border ${
                      coinStake === amt
                        ? 'bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>

              <input
                type="range"
                min="5"
                max={Math.min(targetCard.value - 1, Math.max(balance, 1000))}
                value={coinStake}
                onChange={(e) => setCoinStake(Number(e.target.value))}
                className="w-full h-2 accent-amber-500 cursor-pointer rounded-lg bg-slate-800"
              />
            </div>
          ) : (
            <div>
              {inventory.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  Your Vault is empty! Open some packs or switch to Cash stake.
                </div>
              ) : (
                <div>
                  <span className="text-xs text-slate-400 block mb-2 font-bold uppercase">
                    Select a card from Vault:
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                    {inventory.map((item) => (
                      <div
                        key={item.instanceId}
                        onClick={() => {
                          playHapticTap();
                          setSelectedInventoryCard(item);
                        }}
                        className={`p-2 rounded-2xl border cursor-pointer transition-all ${
                          selectedInventoryCard?.instanceId === item.instanceId
                            ? 'bg-amber-500/15 border-amber-400 shadow-md'
                            : 'bg-slate-900/60 border-white/10 hover:bg-slate-800'
                        }`}
                      >
                        <div className="w-full h-24 rounded-xl overflow-hidden mb-1.5 bg-black/40">
                          <img
                            src={item.card.imageUrl}
                            alt={item.card.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="text-[11px] font-bold text-slate-200 truncate">
                          {item.card.name}
                        </div>
                        <div className="text-[10px] font-mono text-amber-400 font-bold">
                          ${item.card.value.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CENTER COLUMN: THE WHEEL */}
        <div className="order-3 lg:order-2 bg-[#090d18]/90 border border-white/10 rounded-3xl p-6 shadow-2xl backdrop-blur-md flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-mono text-slate-400">
              Multiplier: <strong className="text-emerald-400 font-black">{multiplier}x</strong>
            </span>
            <span className="text-xs font-mono text-slate-400">
              Win Chance:{' '}
              <strong className="text-amber-400 font-black">{winProbability.toFixed(2)}%</strong>
            </span>
          </div>

          {/* Interactive Wheel Circle */}
          <div className="relative w-64 h-64 my-4 flex items-center justify-center">
            {/* SVG Circular Wedge */}
            <svg className="w-full h-full -rotate-90 select-none" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="transparent"
                stroke="#131b2e"
                strokeWidth="10"
              />
              {/* Highlighted Win Sector */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="transparent"
                stroke={rollDirection === 'under' ? '#10B981' : '#F59E0B'}
                strokeWidth="10"
                strokeDasharray={`${(winProbability / 100) * 264} 264`}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            </svg>

            {/* Rotating Needle */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform duration-[4000ms] cubic-bezier(0.1, 0.9, 0.2, 1)"
              style={{
                transform: `rotate(${needleAngle}deg)`
              }}
            >
              <div className="w-1.5 h-28 bg-amber-400 rounded-full shadow-[0_0_15px_#f59e0b] -translate-y-7 relative">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-amber-300 rotate-45 rounded-sm" />
              </div>
            </div>

            {/* Center Dial Hub */}
            <div className="absolute w-20 h-20 rounded-full bg-black/90 border-2 border-white/20 flex flex-col items-center justify-center shadow-xl">
              <span className="text-[10px] font-mono text-slate-400">CHANCE</span>
              <span className="text-sm font-black font-mono text-amber-400">
                {winProbability.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Roll Direction Under/Over */}
          <div className="flex items-center gap-2 mb-4 text-xs w-full max-w-xs">
            <button
              onClick={() => {
                playHapticTap();
                setRollDirection('under');
              }}
              className={`flex-1 min-h-[42px] px-3 py-2 rounded-xl border font-mono font-bold transition-all active:scale-95 ${
                rollDirection === 'under'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 text-slate-400 border-white/10'
              }`}
            >
              Roll Under ({winProbability.toFixed(1)}%)
            </button>
            <button
              onClick={() => {
                playHapticTap();
                setRollDirection('over');
              }}
              className={`flex-1 min-h-[42px] px-3 py-2 rounded-xl border font-mono font-bold transition-all active:scale-95 ${
                rollDirection === 'over'
                  ? 'bg-amber-500/20 text-amber-400 border-amber-400 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900 text-slate-400 border-white/10'
              }`}
            >
              Roll Over ({(100 - winProbability).toFixed(1)}%)
            </button>
          </div>

          {/* Upgrade Action CTA */}
          <button
            onClick={handleStartUpgrade}
            disabled={isSpinning || winProbability <= 0}
            className={`w-full min-h-[48px] py-3.5 px-6 rounded-2xl font-display font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
              !isSpinning && winProbability > 0
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black hover:brightness-110 shadow-amber-500/30 cursor-pointer'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span>{isSpinning ? 'SPINNING WHEEL...' : `UPGRADE NOW (${multiplier}x)`}</span>
          </button>

          {/* Outcome notification */}
          {lastOutcome && (
            <div
              className={`mt-3 text-xs font-bold font-mono px-3.5 py-2 rounded-xl border flex items-center gap-2 ${
                lastOutcome === 'win'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500'
              }`}
            >
              {lastOutcome === 'win' ? (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>UPGRADE SUCCESS! TARGET CARD ACQUIRED!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>UPGRADE MISSED! Stake consumed.</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: TARGET GRAIL CARD */}
        <div className="order-2 lg:order-3 bg-[#090d18]/90 border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h2 className="text-sm font-bold text-white uppercase font-display tracking-wider">
              2. Target Card
            </h2>
            <span className="text-xs font-mono text-amber-400 font-bold">
              ${targetCard.value.toLocaleString()}
            </span>
          </div>

          {/* Target Card Highlight */}
          <div className="flex justify-center mb-4">
            <CardView card={targetCard} size="md" />
          </div>

          {/* Select different grail */}
          <span className="text-xs text-slate-400 block mb-2 font-bold uppercase">
            Change Target Grail:
          </span>
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
            {ALL_CARDS.filter((c) => c.value >= 100)
              .sort((a, b) => a.value - b.value)
              .map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    playHapticTap();
                    setTargetCard(c);
                  }}
                  className={`p-2 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    targetCard.id === c.id
                      ? 'bg-amber-500/15 border-amber-400 shadow-md'
                      : 'bg-slate-900/60 border-white/10 hover:bg-slate-800'
                  }`}
                >
                  <div className="text-[11px] font-bold text-slate-200 truncate">{c.name}</div>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-slate-400 font-mono">{c.grade}</span>
                    <span className="font-mono text-amber-400 font-bold">
                      ${c.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
