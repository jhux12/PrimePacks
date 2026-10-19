import React, { useState, useEffect, useRef } from 'react';
import { Pack, CardItem } from '../types';
import { CardView } from './CardView';
import { PrimePacksLogo } from './PrimePacksLogo';
import { rollCardFromPack, VolatilityMode } from '../utils/provablyFair';
import {
  playTick,
  playPackRip,
  playCardReveal,
  playHitChime,
  playGrailFanfare,
  playCoinClink,
  playHapticTap,
  playCardSpin
} from '../utils/sound';
import { fxSystem } from '../utils/interactiveFX';
import confetti from 'canvas-confetti';
import {
  X,
  Sparkles,
  Zap,
  RotateCcw,
  Percent,
  TrendingUp,
  PackageOpen,
  DollarSign,
  ShieldCheck,
  Check,
  Flame,
  Plus,
  Coins,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

interface PackOpenerModalProps {
  pack: Pack;
  balance: number;
  clientSeed: string;
  serverSeed: string;
  nonce: number;
  initialPackCount?: 1 | 2 | 3 | 4 | 5;
  initialFastOpen?: boolean;
  initialShowOdds?: boolean;
  autoStart?: boolean;
  onClose: () => void;
  onPullCards: (pulledCards: CardItem[], cost: number, newNonce: number) => void;
  onSellCard: (card: CardItem) => void;
  onNavigateToUpgrader: (card: CardItem) => void;
  onFaucetRefill?: (amount: number) => void;
}

type Stage = 'READY' | 'RIPPING' | 'SPINNING' | 'REVEALED';

interface CreditFloatingToast {
  id: number;
  amount: number;
  x: number;
  y: number;
}

export const PackOpenerModal: React.FC<PackOpenerModalProps> = ({
  pack,
  balance,
  clientSeed,
  serverSeed,
  nonce,
  initialPackCount = 1,
  initialFastOpen = false,
  initialShowOdds = false,
  autoStart = true,
  onClose,
  onPullCards,
  onSellCard,
  onNavigateToUpgrader,
  onFaucetRefill
}) => {
  const [packCount, setPackCount] = useState<1 | 2 | 3 | 4 | 5>(initialPackCount);
  const [fastOpen, setFastOpen] = useState(initialFastOpen);
  const [showOdds, setShowOdds] = useState(initialShowOdds);
  
  const totalCost = pack.price * packCount;
  const canAfford = balance >= totalCost;

  // Start directly in RIPPING state if autoStart & canAfford
  const [stage, setStage] = useState<Stage>(() => {
    if (initialShowOdds) return 'READY';
    return autoStart && canAfford ? 'RIPPING' : 'READY';
  });

  const [pulledCards, setPulledCards] = useState<CardItem[]>([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [tearProgress, setTearProgress] = useState(0);
  const [isDraggingSeam, setIsDraggingSeam] = useState(false);
  const [screenFlashing, setScreenFlashing] = useState(false);

  const [soldIndices, setSoldIndices] = useState<number[]>([]);
  const [isOpening, setIsOpening] = useState(false);

  // Credit added floating notification & live balance highlight
  const [creditToasts, setCreditToasts] = useState<CreditFloatingToast[]>([]);
  const [lastCreditAmount, setLastCreditAmount] = useState<number | null>(null);

  const packRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const hasInitializedRollRef = useRef(false);

  const goldPackImg = pack.packCoverUrl || '';

  // Prepare cards upfront using provably fair RNG respecting selected volatility odds
  const prepareRoll = (count: 1 | 2 | 3 | 4 | 5) => {
    let mode: VolatilityMode = 'normal';
    try {
      const saved = localStorage.getItem('primepacks_pack_volatility');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed[pack.id]?.mode) mode = parsed[pack.id].mode;
      }
      if (mode === 'normal') {
        const g = localStorage.getItem('primepacks_global_volatility') as VolatilityMode;
        if (g) mode = g;
      }
    } catch {
      // ignore
    }

    const newCards: CardItem[] = [];
    let currentNonce = nonce;
    for (let i = 0; i < count; i++) {
      const rolled = rollCardFromPack(
        pack.items,
        clientSeed,
        serverSeed,
        currentNonce,
        mode,
        15,
        pack.price
      );
      newCards.push(rolled);
      currentNonce++;
    }
    setPulledCards(newCards);
    setActiveCardIndex(0);
    setSoldIndices([]);
    return { newCards, endNonce: currentNonce };
  };

  // Celebration on big pulls
  const triggerCelebration = (cards: CardItem[]) => {
    const hasGrail = cards.some((c) => c.rarity === 'Grail' || c.value >= 25000);
    const hasSecret = cards.some(
      (c) => c.rarity === 'Secret Rare' || c.rarity === 'Ultra Rare' || c.value >= 500
    );

    if (hasGrail) {
      playGrailFanfare();
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#FFA500', '#FFFFFF', '#EC4899', '#A855F7']
      });
    } else if (hasSecret) {
      playHitChime();
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#6366F1', '#EC4899', '#38BDF8', '#FFD700']
      });
    } else {
      playCardReveal();
    }
  };

  // Execute unseal completion & start 3D spin reveal
  const completeRipAndSpin = (cardsToReveal: CardItem[]) => {
    setTearProgress(100);
    setScreenFlashing(true);
    setTimeout(() => setScreenFlashing(false), 500);

    // Unseal shockwave burst
    if (packRef.current) {
      const rect = packRef.current.getBoundingClientRect();
      fxSystem.spawnBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 'gold', 50);
    }

    const cost = pack.price * packCount;
    onPullCards(cardsToReveal, cost, nonce + packCount);

    // Transition to 3D SPIN stage
    setStage('SPINNING');

    // Highest rarity determines spin spectacle
    const topCard = cardsToReveal.reduce((best, c) => (c.value > best.value ? c : best), cardsToReveal[0]);
    playCardSpin(topCard?.rarity || 'Common');

    // Spin animation duration based on rarity (lengthened for suspense)
    const isGrail = topCard?.rarity === 'Grail' || topCard?.value >= 25000;
    const isRare = topCard?.rarity === 'Ultra Rare' || topCard?.rarity === 'Secret Rare' || topCard?.value >= 100;
    const spinDuration = isGrail ? 4500 : isRare ? 3200 : 2200;

    setTimeout(() => {
      setStage('REVEALED');
      setIsOpening(false);
      triggerCelebration(cardsToReveal);
    }, spinDuration);
  };

  // Start the unsealing sequence
  const startRipFlow = (count: 1 | 2 | 3 | 4 | 5, isFast: boolean) => {
    setIsOpening(true);
    const { newCards } = prepareRoll(count);

    if (isFast) {
      const cost = pack.price * count;
      onPullCards(newCards, cost, nonce + count);
      triggerCelebration(newCards);
      setStage('REVEALED');
      setIsOpening(false);
      return;
    }

    setStage('RIPPING');
    setTearProgress(0);
    playPackRip();

    if (packRef.current) {
      const rect = packRef.current.getBoundingClientRect();
      fxSystem.spawnBurst(rect.left + 40, rect.top + 50, 'gold', 20);
    }
  };

  // Auto-start on mount if autoStart is true
  useEffect(() => {
    if (autoStart && !initialShowOdds && !hasInitializedRollRef.current) {
      hasInitializedRollRef.current = true;
      if (canAfford) {
        startRipFlow(packCount, fastOpen);
      }
    }
  }, []);

  // Quick Rip button handler (ripping immediately without manual drag)
  const handleQuickRip = () => {
    if (isOpening && stage === 'RIPPING' && pulledCards.length > 0) {
      completeRipAndSpin(pulledCards);
      return;
    }
    if (!canAfford) return;
    const { newCards } = prepareRoll(packCount);
    setStage('RIPPING');
    let p = 0;
    playPackRip();
    const interval = setInterval(() => {
      p += 12;
      setTearProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          completeRipAndSpin(newCards);
        }, 150);
      }
    }, 25);
  };

  // Interactive Foil Seam Drag / Swipe Rip Handlers
  const handleSeamPointerDown = (clientX: number) => {
    setIsDraggingSeam(true);
    updateSeamProgress(clientX);
  };

  const handleSeamPointerMove = (clientX: number) => {
    if (!isDraggingSeam) return;
    updateSeamProgress(clientX);
  };

  const handleSeamPointerUp = () => {
    setIsDraggingSeam(false);
    if (tearProgress >= 80) {
      // Completed rip!
      completeRipAndSpin(pulledCards.length > 0 ? pulledCards : prepareRoll(packCount).newCards);
    }
  };

  const updateSeamProgress = (clientX: number) => {
    if (!seamRef.current) return;
    const rect = seamRef.current.getBoundingClientRect();
    const progress = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
    
    if (progress > tearProgress) {
      setTearProgress(progress);
      playTick(1 + (progress / 100) * 0.5);

      if (progress % 10 < 3) {
        fxSystem.spawnBurst(clientX, rect.top + rect.height / 2, 'gold', 8);
      }

      if (progress >= 95) {
        setIsDraggingSeam(false);
        completeRipAndSpin(pulledCards.length > 0 ? pulledCards : prepareRoll(packCount).newCards);
      }
    }
  };

  // Sell individual card with animated credit feedback
  const handleSellSingle = (card: CardItem, index: number, e: React.MouseEvent) => {
    if (soldIndices.includes(index)) return;
    const cashout = Math.floor(card.value * 0.95);

    // Audio & Haptics
    playCoinClink();
    playHapticTap();

    // Spawn gold sparks
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;
    fxSystem.spawnBurst(clickX, clickY, 'gold', 30);

    // Spawn animated floating credit toast
    const toastId = Date.now();
    setCreditToasts((prev) => [...prev, { id: toastId, amount: cashout, x: clickX, y: clickY }]);
    setLastCreditAmount(cashout);

    // Call app sell handler
    onSellCard(card);
    setSoldIndices((prev) => [...prev, index]);

    // Clean up toast after 1.8s
    setTimeout(() => {
      setCreditToasts((prev) => prev.filter((t) => t.id !== toastId));
      setLastCreditAmount(null);
    }, 1800);
  };

  // Sell all pulled cards with mass credit animation
  const handleSellAll = (e: React.MouseEvent) => {
    const unsoldCards = pulledCards.filter((_, idx) => !soldIndices.includes(idx));
    if (unsoldCards.length === 0) return;
    const totalCashout = Math.floor(unsoldCards.reduce((sum, c) => sum + c.value * 0.95, 0));

    playCoinClink();
    playHapticTap();

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = rect.left + rect.width / 2;
    const clickY = rect.top + rect.height / 2;
    fxSystem.spawnBurst(clickX, clickY, 'gold', 45);

    const toastId = Date.now();
    setCreditToasts((prev) => [...prev, { id: toastId, amount: totalCashout, x: clickX, y: clickY }]);
    setLastCreditAmount(totalCashout);

    unsoldCards.forEach((c) => onSellCard(c));
    setSoldIndices(pulledCards.map((_, i) => i));

    setTimeout(() => {
      setCreditToasts((prev) => prev.filter((t) => t.id !== toastId));
      setLastCreditAmount(null);
    }, 2000);
  };

  // Pricing calculations
  const totalPullValue = pulledCards.reduce((sum, c) => sum + c.value, 0);
  const totalSellValue = pulledCards.reduce(
    (sum, c, idx) => sum + (!soldIndices.includes(idx) ? Math.floor(c.value * 0.95) : 0),
    0
  );
  const profit = totalPullValue - totalCost;
  const returnMultiplier = totalCost > 0 ? (totalPullValue / totalCost).toFixed(1) : '1.0';

  // Active hero card for large display
  const heroCard = pulledCards[activeCardIndex] || pulledCards[0];
  const isHeroSold = soldIndices.includes(activeCardIndex);

  // Rarity styling helpers for spin animation
  const topPulledRarity = pulledCards.reduce((highest, c) => {
    if (c.rarity === 'Grail' || c.value >= 25000) return 'Grail';
    if (c.rarity === 'Secret Rare' || c.rarity === 'Ultra Rare' || c.value >= 100) {
      return highest === 'Grail' ? 'Grail' : 'Rare';
    }
    return highest;
  }, 'Common');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/92 backdrop-blur-2xl animate-fade-in select-none">
      {/* Screen flash on foil unseal */}
      {screenFlashing && (
        <div className="fixed inset-0 z-60 bg-gradient-to-b from-yellow-300 via-white to-amber-400 pointer-events-none animate-screen-flash" />
      )}

      {/* Floating Animated Credit Added Notification Toasts */}
      {creditToasts.map((toast) => (
        <div
          key={toast.id}
          className="fixed z-70 pointer-events-none transition-all duration-1000 transform -translate-x-1/2 -translate-y-16 animate-bounce"
          style={{ left: toast.x, top: toast.y }}
        >
          <div className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-500 text-black font-black font-mono text-base shadow-[0_0_30px_#10b981] border-2 border-white scale-110">
            <Coins className="w-5 h-5 text-black animate-spin" />
            <span>+${toast.amount.toLocaleString()} CREDITED TO ACCOUNT!</span>
          </div>
        </div>
      ))}

      <div className="relative w-full max-w-4xl max-h-[94vh] flex flex-col bg-[#070a12]/95 border border-white/10 rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Ambient Radial Spotlight Glow */}
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-30 animate-pulse"
          style={{ background: pack.colorAccent }}
        />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-amber-500/25 blur-3xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#090d18]/90 backdrop-blur-md relative z-20">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div
              className="w-3.5 h-8 rounded-full shrink-0 shadow-lg"
              style={{
                backgroundColor: pack.colorAccent,
                boxShadow: `0 0 14px ${pack.colorAccent}`
              }}
            />
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white font-display truncate">
                  {pack.name}
                </h2>
                <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                  {packCount}x {packCount === 1 ? 'PACK' : 'PACKS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">{pack.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Live Balance Pill with Green Credit Pulse */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-black text-xs transition-all duration-300 ${
                lastCreditAmount !== null
                  ? 'bg-emerald-500/30 border-emerald-400 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.5)] scale-105'
                  : 'bg-black/60 border-white/10 text-slate-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              {lastCreditAmount !== null && (
                <span className="text-emerald-400 font-bold ml-1 animate-pulse">
                  (+${lastCreditAmount.toLocaleString()})
                </span>
              )}
            </div>

            {/* Drop Rates Button */}
            <button
              onClick={() => {
                playHapticTap();
                setShowOdds(!showOdds);
              }}
              className={`hidden xs:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all border ${
                showOdds
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-900/80 text-slate-300 border-white/10 hover:bg-slate-800'
              }`}
            >
              <Percent className="w-3.5 h-3.5 text-amber-400" />
              <span>{showOdds ? 'Hide Odds' : 'Odds'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => {
                playHapticTap();
                onClose();
              }}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900/80 border border-white/10 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center relative z-10 min-h-[460px]">
          {showOdds ? (
            /* 1. Odds Transparency Table */
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
                    Provably Fair Drop Rates & Possible Cards
                  </h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {pack.items.length} Total Cards
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                {pack.items
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((item) => (
                    <CardView key={item.id} card={item} size="sm" showOdds />
                  ))}
              </div>
            </div>
          ) : stage === 'RIPPING' ? (
            /* 2. CINEMATIC PACK ZOOM-IN & INTERACTIVE FOIL RIP */
            <div className="flex flex-col items-center justify-center py-2 sm:py-4 w-full animate-fade-in">
              {/* Zoomed-in 3D Pack Container (sharp rectangular edges) */}
              <div
                ref={packRef}
                className="relative w-68 sm:w-80 h-98 sm:h-112 rounded-none overflow-hidden shadow-[0_0_80px_rgba(245,158,11,0.65)] border-3 border-amber-400/90 bg-slate-950 flex flex-col items-center justify-between p-4 animate-pack-zoom touch-none select-none"
              >
                {/* Pack Image with Foil Depth */}
                {goldPackImg ? (
                  <img
                    src={goldPackImg}
                    alt={pack.name}
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0d121f] via-[#060a12] to-[#080d17] flex flex-col items-center justify-center p-4">
                    <PrimePacksLogo variant="icon" size="lg" glow={true} />
                    <div className="flex items-center gap-1 font-display font-black text-sm tracking-tight leading-none mt-2">
                      <span className="text-white drop-shadow">PRIME</span>
                      <span className="text-[#00F076]">PACKS</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 mt-1">${pack.price.toFixed(2)}</span>
                  </div>
                )}

                {/* Top Crimp Separating & Peeling Back in 3D */}
                <div
                  className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-amber-400/40 via-yellow-200/20 to-transparent pointer-events-none transition-transform duration-100 ease-out"
                  style={{
                    transform: `translateY(-${(tearProgress / 100) * 16}px) rotate(${
                      (tearProgress / 100) * 4
                    }deg) rotateX(-${(tearProgress / 100) * 25}deg)`,
                    opacity: tearProgress > 0 ? 1 : 0.8
                  }}
                />

                {/* Holo Foil Dynamic Reflection */}
                <div className="holo-shine opacity-75 pointer-events-none" />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/75 pointer-events-none" />

                {/* Top Crimp: Interactive Foil Seam Rip Strip */}
                <div className="relative z-30 w-full mt-1 sm:mt-2">
                  <div className="flex items-center justify-between text-xs font-mono text-amber-300 font-black mb-1.5 drop-shadow">
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span>{tearProgress > 0 ? 'RIPPING FOIL...' : '👉 SWIPE TO RIP FOIL'}</span>
                    </span>
                    <span className="font-mono text-amber-400 text-sm">{tearProgress}%</span>
                  </div>

                  {/* Tactile Drag Seam Container */}
                  <div
                    ref={seamRef}
                    onMouseDown={(e) => handleSeamPointerDown(e.clientX)}
                    onMouseMove={(e) => handleSeamPointerMove(e.clientX)}
                    onMouseUp={handleSeamPointerUp}
                    onTouchStart={(e) => handleSeamPointerDown(e.touches[0].clientX)}
                    onTouchMove={(e) => handleSeamPointerMove(e.touches[0].clientX)}
                    onTouchEnd={handleSeamPointerUp}
                    className="relative w-full h-11 rounded-2xl bg-black/80 border-2 border-amber-400/80 p-1 shadow-[0_0_20px_rgba(245,158,11,0.5)] cursor-ew-resize flex items-center overflow-hidden active:border-white transition-colors"
                  >
                    {/* Glowing Laser Cut Seam Fill */}
                    <div
                      className="h-full rounded-xl bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400 transition-all duration-75 shadow-[0_0_25px_#f59e0b]"
                      style={{ width: `${tearProgress}%` }}
                    />

                    {/* Laser Cutter Spark Indicator / Notch */}
                    <div
                      className="absolute top-1 bottom-1 w-6 -ml-3 rounded-full bg-white shadow-[0_0_20px_#fff,0_0_35px_#f59e0b] flex items-center justify-center text-[10px] font-black text-black pointer-events-none"
                      style={{ left: `${Math.max(6, Math.min(94, tearProgress))}%` }}
                    >
                      ⚡
                    </div>

                    {/* Tear Here Label inside seam */}
                    {tearProgress === 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black font-mono tracking-widest text-amber-300 uppercase pointer-events-none animate-pulse">
                        ◀ DRAG TO RIP FOIL ▶
                      </span>
                    )}
                  </div>
                </div>

                {/* Center Suspense Energy Core */}
                <div className="relative z-10 flex flex-col items-center my-auto">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-3 border-amber-400 border-t-transparent animate-spin" />
                    <Sparkles className="w-12 h-12 text-amber-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <p className="text-xs font-mono text-amber-300 font-black tracking-wider mt-3 uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] animate-pulse">
                    UNLEASHING HOLY GRAIL CARDS...
                  </p>
                </div>

                {/* Bottom Quick-Rip & Provably Fair Banner */}
                <div className="relative z-20 w-full flex flex-col items-center gap-2">
                  <button
                    onClick={handleQuickRip}
                    className="w-full py-2.5 px-4 rounded-xl font-display font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black shadow-lg shadow-amber-500/40 hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-4 h-4 fill-black" />
                    <span>⚡ Quick Rip Foil</span>
                  </button>

                  <div className="text-[10px] font-mono text-emerald-400 bg-black/80 px-3 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1.5 shadow-md">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>PROVABLY FAIR VERIFIED PACK</span>
                  </div>
                </div>
              </div>
            </div>
          ) : stage === 'SPINNING' ? (
            /* 3. THRILLING RARITY-BASED 3D SPIN ANIMATION */
            <div className="flex flex-col items-center justify-center py-6 sm:py-10 w-full animate-fade-in relative">
              {/* Rotating Golden Sunburst Radiant Rays for Grail / Rare Hits */}
              {(topPulledRarity === 'Grail' || topPulledRarity === 'Rare') && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                  <div
                    className="w-96 h-96 sm:w-[500px] sm:h-[500px] rounded-full animate-radiant-rays opacity-70"
                    style={{
                      background:
                        topPulledRarity === 'Grail'
                          ? 'conic-gradient(from 0deg, rgba(245,158,11,0.5), transparent 30deg, rgba(234,179,8,0.6) 60deg, transparent 90deg, rgba(245,158,11,0.5) 120deg, transparent 150deg, rgba(234,179,8,0.6) 180deg, transparent 210deg, rgba(245,158,11,0.5) 240deg, transparent 270deg, rgba(234,179,8,0.6) 300deg, transparent 330deg, rgba(245,158,11,0.5) 360deg)'
                          : 'conic-gradient(from 0deg, rgba(236,72,153,0.4), transparent 45deg, rgba(168,85,247,0.5) 90deg, transparent 135deg, rgba(236,72,153,0.4) 180deg, transparent 225deg, rgba(168,85,247,0.5) 270deg, transparent 315deg, rgba(236,72,153,0.4) 360deg)'
                    }}
                  />
                </div>
              )}

              {/* Suspense Headline */}
              <div className="mb-6 text-center z-10 animate-pulse">
                <span
                  className={`text-xs sm:text-sm font-mono font-black uppercase tracking-widest px-4 py-1.5 rounded-full border shadow-lg ${
                    topPulledRarity === 'Grail'
                      ? 'bg-amber-500/25 border-amber-400 text-yellow-300 shadow-amber-500/40'
                      : topPulledRarity === 'Rare'
                      ? 'bg-purple-500/25 border-purple-400 text-pink-300 shadow-purple-500/40'
                      : 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  }`}
                >
                  {topPulledRarity === 'Grail'
                    ? '🔥 HOLY GRAIL INCOMING!'
                    : topPulledRarity === 'Rare'
                    ? '⚡ ULTRA RARE HIT REVEALING!'
                    : '✨ REVEALING CARDS...'}
                </span>
              </div>

              {/* 3D Spinning Card Element */}
              <div
                className={`relative z-20 ${
                  topPulledRarity === 'Grail'
                    ? 'spin-card-grail'
                    : topPulledRarity === 'Rare'
                    ? 'spin-card-rare'
                    : 'spin-card-common'
                }`}
              >
                <CardView card={heroCard} size="lg" />
              </div>
            </div>
          ) : stage === 'REVEALED' ? (
            /* 4. SAME FLOW: WON ITEM LARGE, LARGE KEEP & SELL BUTTONS, CREDIT ANIMATION */
            <div className="w-full flex flex-col items-center py-2 animate-fade-in">
              {/* Header Headline: Win Summary & Multiplier */}
              <div className="text-center mb-3 sm:mb-4">
                <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-mono font-black uppercase mb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>
                    {pulledCards.length > 1
                      ? `${pulledCards.length}x PACKS UNSEALED!`
                      : `${heroCard.rarity.toUpperCase()} HIT!`}
                  </span>
                </div>

                <h3 className="text-xl sm:text-3xl font-black text-white font-display tracking-tight drop-shadow-md">
                  {profit > 0 ? 'MASSIVE HIT! PROFIT UNLOCKED' : 'CARDS REVEALED & READY!'}
                </h3>

                <div className="flex items-center justify-center gap-2 mt-1.5 text-xs sm:text-sm font-mono">
                  <span className="text-slate-400">Total Pulled:</span>
                  <span className="font-black text-amber-400 tabular-nums text-sm sm:text-base">
                    ${totalPullValue.toLocaleString()}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span
                    className={`font-black px-2.5 py-0.5 rounded-full ${
                      profit >= 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {profit >= 0
                      ? `+$${profit.toLocaleString()} Profit (${returnMultiplier}x Return!)`
                      : `Cost: $${totalCost.toFixed(2)}`}
                  </span>
                </div>
              </div>

              {/* Multi-Pack Selector Strip (if user opened 2x to 5x packs) */}
              {pulledCards.length > 1 && (
                <div className="flex items-center gap-2 mb-3 max-w-full overflow-x-auto no-scrollbar py-1 px-2">
                  {pulledCards.map((c, idx) => {
                    const isSelected = idx === activeCardIndex;
                    const isSold = soldIndices.includes(idx);
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          playHapticTap();
                          setActiveCardIndex(idx);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/30 border-amber-400 text-white shadow-md'
                            : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>Card #{idx + 1}</span>
                        <span className="text-amber-400">${c.value.toLocaleString()}</span>
                        {isSold && <span className="text-emerald-400 font-bold">✓ Sold</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* WON ITEM IMAGE: PROMINENT & LARGE HERO CARD */}
              <div className="relative my-2 sm:my-3 flex flex-col items-center">
                {/* Aura ring behind the hero card */}
                <div
                  className="absolute -inset-6 rounded-3xl blur-2xl opacity-40 pointer-events-none"
                  style={{
                    background:
                      heroCard.rarity === 'Grail'
                        ? 'radial-gradient(circle, #f59e0b 0%, transparent 70%)'
                        : heroCard.rarity === 'Ultra Rare' || heroCard.rarity === 'Secret Rare'
                        ? 'radial-gradient(circle, #ec4899 0%, transparent 70%)'
                        : 'radial-gradient(circle, #06b6d4 0%, transparent 70%)'
                  }}
                />

                {/* Hero Card View */}
                <div className="relative z-10 transition-transform duration-300 transform hover:scale-102">
                  <CardView card={heroCard} size="lg" />

                  {/* Sold & Credited Overlay on Card */}
                  {isHeroSold && (
                    <div className="absolute inset-0 rounded-2xl bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center z-30 animate-fade-in border-2 border-emerald-400">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/25 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mb-2 shadow-[0_0_25px_#10b981]">
                        <Check className="w-8 h-8 stroke-[3]" />
                      </div>
                      <span className="text-base font-black font-mono text-emerald-400 uppercase tracking-wider drop-shadow">
                        SOLD & CREDITED ✓
                      </span>
                      <span className="text-xs font-mono text-slate-300 mt-1">
                        +${Math.floor(heroCard.value * 0.95).toLocaleString()} Added to Balance
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* LARGE KEEP & SELL BUTTONS TOOLBAR (IN THE EXACT SAME FLOW!) */}
              <div className="w-full max-w-xl flex flex-col gap-3 mt-3 sm:mt-5 pt-3 border-t border-white/10">
                {/* Primary Dual Actions: LARGE SELL BACK & LARGE KEEP IN VAULT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {/* LARGE SELL BACK BUTTON */}
                  <button
                    onClick={(e) => handleSellSingle(heroCard, activeCardIndex, e)}
                    disabled={isHeroSold}
                    className={`min-h-[58px] sm:min-h-[64px] px-6 rounded-2xl font-display font-black text-base sm:text-lg transition-all flex items-center justify-center gap-2.5 shadow-xl active:scale-98 cursor-pointer ${
                      isHeroSold
                        ? 'bg-slate-900/60 text-slate-500 border border-white/5 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-white shadow-emerald-950/60 border border-emerald-400/50'
                    }`}
                  >
                    <Coins className="w-5 h-5 text-white" />
                    <div className="flex flex-col text-left">
                      <span>{isHeroSold ? 'CREDITED ✓' : `SELL FOR $${Math.floor(heroCard.value * 0.95).toLocaleString()}`}</span>
                      <span className="text-[10px] font-mono font-normal opacity-90">Instant 95% Cashout Credit</span>
                    </div>
                  </button>

                  {/* LARGE KEEP IN VAULT BUTTON */}
                  <button
                    onClick={() => {
                      playHapticTap();
                      onClose();
                    }}
                    className="min-h-[58px] sm:min-h-[64px] px-6 rounded-2xl font-display font-black text-base sm:text-lg bg-slate-900/90 border-2 border-white/20 hover:border-amber-400 text-white hover:text-amber-300 transition-all flex items-center justify-center gap-2.5 shadow-xl active:scale-98 cursor-pointer"
                  >
                    <PackageOpen className="w-5 h-5 text-amber-400" />
                    <div className="flex flex-col text-left">
                      <span>KEEP IN VAULT</span>
                      <span className="text-[10px] font-mono font-normal text-slate-400">Save to My Collection</span>
                    </div>
                  </button>
                </div>

                {/* Secondary Row: Bulk Sell All (if multi-pack) & Instant Rip Again */}
                <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full pt-1">
                  {pulledCards.length > 1 && totalSellValue > 0 && (
                    <button
                      onClick={handleSellAll}
                      className="w-full sm:flex-1 min-h-[46px] px-4 rounded-xl text-xs font-bold font-mono bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-500/40 text-emerald-300 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                    >
                      <DollarSign className="w-4 h-4 text-emerald-400" />
                      <span>Sell All Remaining (${totalSellValue.toLocaleString()})</span>
                    </button>
                  )}

                  {/* RIP AGAIN BUTTON */}
                  <button
                    onClick={() => {
                      playHapticTap();
                      startRipFlow(packCount, fastOpen);
                    }}
                    disabled={!canAfford || isOpening}
                    className="w-full sm:flex-1 min-h-[46px] px-5 rounded-xl font-display font-black text-xs sm:text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-lg shadow-amber-500/30 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer hover:brightness-110"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>RIP AGAIN (${totalCost.toFixed(2)}) ⚡</span>
                  </button>

                  {/* Arena Upgrade Option */}
                  <button
                    onClick={() => {
                      playHapticTap();
                      onNavigateToUpgrader(heroCard);
                    }}
                    className="w-full sm:w-auto min-h-[46px] px-4 rounded-xl text-xs font-bold font-mono bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    <span>Upgrade in Arena</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 5. FALLBACK / INSUFFICIENT BALANCE SCREEN */
            <div className="flex flex-col items-center text-center max-w-lg py-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
                <PackageOpen className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white font-display mb-1">
                Refill Coins to Unseal
              </h3>
              <p className="text-xs text-slate-400 font-mono mb-4">
                This pack costs ${totalCost.toFixed(2)}. Your current balance is ${balance.toFixed(2)}.
              </p>

              {onFaucetRefill && (
                <button
                  onClick={() => {
                    playHapticTap();
                    onFaucetRefill(100);
                    setTimeout(() => {
                      startRipFlow(packCount, fastOpen);
                    }, 100);
                  }}
                  className="w-full max-w-xs min-h-[48px] py-3 px-6 rounded-2xl font-display font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-black shadow-lg shadow-emerald-500/30 hover:brightness-110 transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mb-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Claim Free $100 & Rip Immediately</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="text-xs text-slate-400 hover:text-white font-mono mt-2 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
