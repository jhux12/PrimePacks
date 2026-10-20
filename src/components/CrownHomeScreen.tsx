import React, { useState, useRef, useEffect } from "react";
import { Pack, CardItem, InventoryCard } from "../types";
import { CrownFoilPack } from "./CrownFoilPack";
import { DarkMovingBackground, BackgroundTheme } from "./DarkMovingBackground";
import { CardView } from "./CardView";
import type { ManagedPack } from "../lib/catalog";
import { errorMessage } from "../lib/catalog";
import confetti from "canvas-confetti";
import {
  playHapticTap,
  playSwipeWhoosh,
  playMultiplierPowerup,
  playTurboSpark,
  playTick,
  playPackRip,
  playCardSpin,
  playGrailFanfare,
  playCoinClink,
  playHitChime,
  playRarityCycleTick,
} from "../utils/sound";
import { fxSystem, triggerRarityConfetti } from "../utils/interactiveFX";
import { PrimePacksLogo } from "./PrimePacksLogo";
import { CardInspectionModal } from "./CardInspectionModal";
import { PackVolatilityModal, VolatilityMode } from "./PackVolatilityModal";
import {
  Sparkles,
  Zap,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Archive,
  DollarSign,
  ArrowLeft,
  Maximize2,
  Eye,
  Info,
} from "lucide-react";

interface CrownHomeScreenProps {
  packs: Pack[];
  balance: number;
  onOpen: (
    pack: ManagedPack,
    quantity: number,
    requestId: string,
  ) => Promise<InventoryCard[]>;
  onSellCards: (items: InventoryCard[], requestId: string) => Promise<void>;
  onNavigateToUpgrader: (card: CardItem) => void;
  onRefillCoins: () => void;
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedPackId?: string | null;
  onClearSelectedPackId?: () => void;
}

type FlowStage = "BROWSE" | "RIPPING" | "REVEAL_SPIN" | "REVEALED";

interface CreditFloatingToast {
  id: string;
  amount: number;
  x: number;
  y: number;
}

// State for each active card in simultaneous multi-pack spin
interface ActiveSpinCard {
  card: CardItem;
  rarityColor: string;
  rarityName: string;
  isRevealed: boolean;
  isLocked: boolean;
  hasLanded: boolean;
  isFadingCover: boolean;
  spinDuration: number;
}

// Rarity Spectrum colors and ordering
const RARITY_SPECTRUM = [
  { name: "Common", color: "#94a3b8" },
  { name: "Rare", color: "#06b6d4" },
  { name: "Epic", color: "#a855f7" },
  { name: "Legendary", color: "#ec4899" },
  { name: "Grail", color: "#f59e0b" },
];

export const CrownHomeScreen: React.FC<CrownHomeScreenProps> = ({
  packs,
  balance,
  onOpen,
  onSellCards,
  onNavigateToUpgrader: _onNavigateToUpgrader,
  onRefillCoins,
  activeCategory,
  onSelectCategory,
  selectedPackId,
  onClearSelectedPackId,
}) => {
  // Filter packs based on active category
  const visiblePacks = packs.filter((p) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "whales") return p.price >= 1000;
    return p.category === activeCategory;
  });

  // Active pack index & controls
  const [currentIndex, setCurrentIndex] = useState(0);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [isTurbo, setIsTurbo] = useState(false);
  const [currentTheme, setCurrentTheme] =
    useState<BackgroundTheme>("golden-horizon");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isOddsModalOpen, setIsOddsModalOpen] = useState(false);
  const currentPackOdds = { mode: "normal" as VolatilityMode };
  const [purchaseError, setPurchaseError] = useState("");
  const [busy, setBusy] = useState(false);
  const operation = useRef(false);
  const retry = useRef<{ key: string; id: string } | null>(null);
  const sellRetry = useRef<{ key: string; id: string } | null>(null);
  const [awards, setAwards] = useState<InventoryCard[]>([]);
  const sellAwards = async (items: InventoryCard[]) => {
    if (operation.current) return false;
    operation.current = true;
    setBusy(true);
    setPurchaseError("");
    const key = items
      .map((i) => i.instanceId)
      .sort()
      .join(",");
    if (sellRetry.current?.key !== key)
      sellRetry.current = { key, id: crypto.randomUUID() };
    try {
      await onSellCards(items, sellRetry.current.id);
      sellRetry.current = null;
      return true;
    } catch (e) {
      setPurchaseError(errorMessage(e));
      return false;
    } finally {
      operation.current = false;
      setBusy(false);
    }
  };
  const [previewCard, setPreviewCard] = useState<CardItem | null>(null);

  // In-Window Opening State
  const [flowStage, setFlowStage] = useState<FlowStage>("BROWSE");
  const [pulledCards, setPulledCards] = useState<CardItem[]>([]);
  const [tearProgress, setTearProgress] = useState(0);
  const [isDraggingSeam, setIsDraggingSeam] = useState(false);
  const [isFoilPeeling, setIsFoilPeeling] = useState(false);
  const [isCardEmerging, setIsCardEmerging] = useState(false);
  const [soldIndices, setSoldIndices] = useState<number[]>([]);
  const [vaultedIndices, setVaultedIndices] = useState<number[]>([]);
  const [creditToasts, setCreditToasts] = useState<CreditFloatingToast[]>([]);
  const [allResolvedMessage, setAllResolvedMessage] = useState<string | null>(
    null,
  );
  const [inspectingCard, setInspectingCard] = useState<CardItem | null>(null);
  const [inspectingCardIndex, setInspectingCardIndex] = useState<number | null>(
    null,
  );

  // Simultaneous multi-card spinning state
  const [spinCards, setSpinCards] = useState<ActiveSpinCard[]>([]);

  // Slider pill dragging ref
  const pillRef = useRef<HTMLDivElement>(null);
  const isDraggingPillRef = useRef(false);
  const seamRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up spin interval on unmount
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  // Select pack if requested externally
  useEffect(() => {
    if (selectedPackId) {
      const idx = visiblePacks.findIndex((p) => p.id === selectedPackId);
      if (idx !== -1) {
        setCurrentIndex(idx);
      }
      onClearSelectedPackId?.();
    }
  }, [selectedPackId, visiblePacks, onClearSelectedPackId]);

  // Reset carousel index when category changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [activeCategory]);

  const currentPack = visiblePacks[currentIndex] || visiblePacks[0] || packs[0];

  // Carousel navigation handlers
  const handlePrev = () => {
    if (operation.current) return;
    playSwipeWhoosh();
    setCurrentIndex((prev) =>
      prev === 0 ? visiblePacks.length - 1 : prev - 1,
    );
  };

  const handleNext = () => {
    if (operation.current) return;
    playSwipeWhoosh();
    setCurrentIndex((prev) =>
      prev === visiblePacks.length - 1 ? 0 : prev + 1,
    );
  };

  // Keyboard navigation for power users
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input,textarea,select,button,[role=dialog]")
      )
        return;
      if (flowStage !== "BROWSE") return;
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
      // Purchases require an explicit button click; keyboard navigation must not charge a wallet.
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, visiblePacks.length, flowStage]);

  // Touch Swipe on carousel (horizontal only, prevents vertical scroll lag)
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const diffX = touchStartX - e.changedTouches[0].clientX;
    const diffY = touchStartY - e.changedTouches[0].clientY;

    // Only swipe packs if horizontal movement is dominant, otherwise let vertical page scroll glide naturally
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.5) {
      if (diffX > 0) handleNext();
      else handlePrev();
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const MULTIPLIERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Multiplier click handler with interactive FX
  const handleMultiplierChange = (
    num: number,
    e?: React.MouseEvent | React.PointerEvent,
  ) => {
    playMultiplierPowerup(Math.min(5, Math.ceil(num / 2)));
    setMultiplier(num);
  };

  // Pointer drag/scrub handler for the sliding quantity selector pill
  const handlePillPointerDown = (e: React.PointerEvent) => {
    isDraggingPillRef.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
    handlePillPointerMove(e);
  };

  const handlePillPointerMove = (e: React.PointerEvent) => {
    if (!isDraggingPillRef.current && e.buttons !== 1) return;
    if (!pillRef.current) return;
    const rect = pillRef.current.getBoundingClientRect();
    const clampedX = Math.max(
      0,
      Math.min(e.clientX - rect.left, rect.width - 1),
    );
    const fraction = clampedX / (rect.width - 1);
    const slot = Math.min(10, Math.max(1, Math.round(fraction * 9) + 1));
    if (slot !== multiplier) {
      playTick(1 + slot * 0.1);
      playMultiplierPowerup(Math.min(5, Math.ceil(slot / 2)));
      setMultiplier(slot);
    }
  };

  const handlePillPointerUp = (e: React.PointerEvent) => {
    isDraggingPillRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  // Pricing & pulls calculations
  const totalPrice = (currentPack.price * multiplier).toFixed(2);
  const currentVolatility: VolatilityMode = currentPackOdds.mode;
  const minPull = Math.min(...currentPack.items.map((i) => i.value));
  const maxPull = Math.max(...currentPack.items.map((i) => i.value));
  const formattedMin =
    minPull < 1 ? `$${minPull.toFixed(2)}` : `$${minPull.toLocaleString()}`;
  const formattedMax = `$${maxPull.toLocaleString()}`;

  const categories = [
    { id: "all", label: "All Collections", count: packs.length },
    {
      id: "pokemon",
      label: "Pokémon TCG",
      count: packs.filter((p) => p.category === "pokemon").length,
    },
    {
      id: "sports",
      label: "Sports & Kabooms",
      count: packs.filter((p) => p.category === "sports").length,
    },
    {
      id: "vintage",
      label: "Vintage Grails",
      count: packs.filter((p) => p.category === "vintage").length,
    },
    {
      id: "whales",
      label: "High Roller & Whales",
      count: packs.filter((p) => p.price >= 1000).length,
    },
  ];

  const currentCategoryLabel =
    categories.find((c) => c.id === activeCategory)?.label || "All Collections";

  const themes: { id: BackgroundTheme; name: string; color: string }[] = [
    { id: "cosmic-nebula", name: "Cosmic Nebula", color: "#a855f7" },
    { id: "cyber-void", name: "Cyber Void", color: "#06b6d4" },
    { id: "golden-horizon", name: "Golden Horizon", color: "#f59e0b" },
    { id: "deep-aurora", name: "Deep Aurora", color: "#10b981" },
  ];

  // Helper to map card rarity to index in RARITY_SPECTRUM
  const getWinningRarityIndex = (rarity: string): number => {
    switch (rarity) {
      case "Grail":
        return 4;
      case "Legendary":
      case "Secret Rare":
        return 3;
      case "Epic":
      case "Ultra Rare":
        return 2;
      case "Rare":
        return 1;
      default:
        return 0; // Common
    }
  };

  // Map target card rarity to its true aura color
  const getTrueRarityColor = (rarity: string) => {
    switch (rarity) {
      case "Grail":
        return "#f59e0b";
      case "Legendary":
      case "Secret Rare":
        return "#ec4899";
      case "Epic":
      case "Ultra Rare":
        return "#a855f7";
      case "Rare":
        return "#06b6d4";
      case "Uncommon":
        return "#10b981";
      default:
        return "#94a3b8";
    }
  };

  // Dynamic duration for the SINGLE COHESIVE SPIN based on reward item rarity color
  // Longer durations for maximum suspense and a slower spin on the last revolution!
  const getSpinDurationForRarity = (rarity: string, value: number) => {
    if (rarity === "Grail" || value >= 25000) return 8.5; // Molten Gold: epic slow suspense
    if (rarity === "Legendary" || rarity === "Secret Rare" || value >= 5000)
      return 7.5; // Hot Pink: high-stakes slow-mo
    if (rarity === "Epic" || rarity === "Ultra Rare" || value >= 1000)
      return 6.5; // Purple: dramatic deceleration
    if (rarity === "Rare" || value >= 250) return 5.5; // Sapphire: deliberate slowdown
    if (rarity === "Uncommon") return 4.8; // Emerald: smooth suspense
    return 4.2; // Common: sustained clean spin
  };

  // START PACK OPENING RIGHT IN THE SAME WINDOW
  const handleStartRipInWindow = async () => {
    if (operation.current || !currentPack || flowStage !== "BROWSE") return;
    playHapticTap();

    const cost = currentPack.price * multiplier;
    if (balance < cost) {
      onRefillCoins();
      return;
    }

    operation.current = true;
    setBusy(true);
    setPurchaseError("");
    const key = `${currentPack.id}:${multiplier}`;
    if (retry.current?.key !== key)
      retry.current = { key, id: crypto.randomUUID() };
    let newCards: CardItem[];
    try {
      const items = await onOpen(
        currentPack as ManagedPack,
        multiplier,
        retry.current.id,
      );
      setAwards(items);
      newCards = items.map((i) => i.card);
      retry.current = null;
    } catch (e) {
      setPurchaseError(errorMessage(e));
      return;
    } finally {
      operation.current = false;
      setBusy(false);
    }

    setPulledCards(newCards);
    setSoldIndices([]);
    setVaultedIndices([]);
    setAllResolvedMessage(null);
    setTearProgress(0);
    setIsFoilPeeling(false);
    setIsCardEmerging(false);

    // Transition in-window flow straight to RIPPING
    setFlowStage("RIPPING");

    // If Turbo mode enabled, auto-rip after quick zoom
    if (isTurbo) {
      setTimeout(() => {
        executeRipFoil(newCards);
      }, 300);
    }
  };

  // EXECUTE FOIL RIP & LAUNCH SIMULTANEOUS SINGLE COHESIVE SPINS FOR ALL PACKS
  const executeRipFoil = (cardsToReveal = pulledCards) => {
    setTearProgress(100);
    setIsFoilPeeling(true);
    setIsCardEmerging(true);
    playPackRip();

    // Spawn rich celebratory burst from seam
    fxSystem.spawnBurst(
      window.innerWidth / 2,
      window.innerHeight * 0.42,
      "gold",
      30,
    );

    // 400ms for foil to peel and cards to emerge before starting the simultaneous 3D spins
    setTimeout(() => {
      setIsFoilPeeling(false);
      setIsCardEmerging(false);
      startSimultaneousSpins(cardsToReveal);
    }, 400);
  };

  // SIMULTANEOUS SINGLE COHESIVE SPIN FOR ALL PACKS (NO DOUBLE SPIN, ALL AT ONCE)
  const startSimultaneousSpins = (cardsToReveal: CardItem[]) => {
    setFlowStage("REVEAL_SPIN");

    // Audio & duration: highest tier rarity dictates the spin duration & suspense profile
    const topRarityCard = cardsToReveal.reduce((best, curr) => {
      return getWinningRarityIndex(curr.rarity) >
        getWinningRarityIndex(best.rarity)
        ? curr
        : best;
    }, cardsToReveal[0]);

    // Extended spin animation for suspenseful reveal
    const uniformDuration = isTurbo
      ? 2.2
      : getSpinDurationForRarity(topRarityCard.rarity, topRarityCard.value);

    // Initialize all card states
    const initialSpinCards: ActiveSpinCard[] = cardsToReveal.map((c) => {
      return {
        card: c,
        rarityColor: RARITY_SPECTRUM[0].color,
        rarityName: RARITY_SPECTRUM[0].name,
        isRevealed: false,
        isLocked: false,
        hasLanded: false,
        isFadingCover: false,
        spinDuration: uniformDuration,
      };
    });

    setSpinCards(initialSpinCards);

    playCardSpin(topRarityCard.rarity, uniformDuration);

    const lockDelay = uniformDuration * 0.45 * 1000;
    const landDelay = uniformDuration * 1000;

    // Stage 1: All cards lock onto their true rarity colors in unison during the final spin turns
    setTimeout(() => {
      setSpinCards((prev) =>
        prev.map((item, i) => {
          const c = cardsToReveal[i];
          if (!c) return item;
          return {
            ...item,
            isLocked: true,
            rarityColor: getTrueRarityColor(c.rarity),
            rarityName: c.rarity,
          };
        }),
      );
    }, lockDelay);

    // Stage 2: All cards land facing forward on their locked rarity mystery cover simultaneously
    setTimeout(() => {
      setSpinCards((prev) =>
        prev.map((item) => ({
          ...item,
          hasLanded: true,
        })),
      );
      playHapticTap();
    }, landDelay);

    // Stage 3 & 4: Staggered reveal cascade so each card pops with excitement, without peeking early
    cardsToReveal.forEach((c, idx) => {
      const stagger = cardsToReveal.length > 1 ? idx * 130 : 0;
      const fadeDelay = landDelay + 220 + stagger;
      const revealDelay = fadeDelay + 280;

      // Begin fading mystery cover
      setTimeout(() => {
        setSpinCards((prev) =>
          prev.map((item, i) => {
            if (i !== idx) return item;
            return {
              ...item,
              isFadingCover: true,
            };
          }),
        );
      }, fadeDelay);

      // Settle won card & trigger celebratory particles & audio
      setTimeout(() => {
        setSpinCards((prev) =>
          prev.map((item, i) => {
            if (i !== idx) return item;
            return {
              ...item,
              isRevealed: true,
            };
          }),
        );

        // Particle burst from card position
        const cardEl = cardRefs.current[idx];
        const rect = cardEl ? cardEl.getBoundingClientRect() : null;
        const burstX = rect
          ? rect.left + rect.width / 2
          : window.innerWidth / 2;
        const burstY = rect
          ? rect.top + rect.height / 2
          : window.innerHeight * 0.45;

        fxSystem.spawnRarityRevealBurst(burstX, burstY, c.rarity, c.value);
        triggerRarityConfetti(burstX, burstY, c.rarity, c.value);

        const isGrail = c.rarity === "Grail" || c.value >= 25000;
        const isLegendary =
          c.rarity === "Legendary" ||
          c.rarity === "Secret Rare" ||
          (c.value >= 5000 && !isGrail);
        const isEpic =
          c.rarity === "Epic" ||
          c.rarity === "Ultra Rare" ||
          (c.value >= 1000 && !isLegendary && !isGrail);
        const isRare =
          c.rarity === "Rare" ||
          (c.value >= 100 && !isEpic && !isLegendary && !isGrail);

        if (isGrail) {
          playGrailFanfare();
        } else if (isLegendary || isEpic) {
          playHitChime();
        } else if (isRare) {
          playTurboSpark();
        } else {
          playCoinClink();
        }
      }, revealDelay);
    });

    // When the final card completes its reveal
    const maxStagger =
      cardsToReveal.length > 1 ? (cardsToReveal.length - 1) * 130 : 0;
    const totalSpinAndFadeDelay = landDelay + 220 + maxStagger + 350;
    setTimeout(() => {
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
      setFlowStage("REVEALED");
    }, totalSpinAndFadeDelay);
  };

  // Seam drag rip handler
  const handleSeamTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDraggingSeam(true);
    updateSeamProgress(e);
  };

  const handleSeamTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingSeam) return;
    updateSeamProgress(e);
  };

  const handleSeamTouchEnd = () => {
    if (!isDraggingSeam) return;
    setIsDraggingSeam(false);
    if (tearProgress >= 80) {
      executeRipFoil();
    } else {
      setTearProgress(0);
    }
  };

  const updateSeamProgress = (e: React.TouchEvent | React.MouseEvent) => {
    if (!seamRef.current) return;
    const rect = seamRef.current.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const progress = Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100),
    );
    setTearProgress(progress);

    if (progress >= 85) {
      setIsDraggingSeam(false);
      executeRipFoil();
    }
  };

  // KEEP INDIVIDUAL CARD IN VAULT
  const handleKeepCard = (index: number) => {
    playHitChime();
    setVaultedIndices((prev) => {
      const next = [...prev, index];
      checkIfAllResolved(next, soldIndices);
      return next;
    });
  };

  // SELL INDIVIDUAL CARD
  const handleSellCard = async (
    card: CardItem,
    index: number,
    e?: React.MouseEvent,
  ) => {
    if (
      soldIndices.includes(index) ||
      vaultedIndices.includes(index) ||
      !awards[index]
    )
      return;
    if (!(await sellAwards([awards[index]]))) return;
    playCoinClink();
    setSoldIndices((prev) => {
      const next = [...prev, index];
      checkIfAllResolved(vaultedIndices, next);
      return next;
    });

    const clickX = e ? e.clientX : window.innerWidth / 2;
    const clickY = e ? e.clientY : window.innerHeight * 0.6;

    const cashout = Number((card.value * 0.95).toFixed(2));
    const newToast: CreditFloatingToast = {
      id: `toast-${Date.now()}-${Math.random()}`,
      amount: cashout,
      x: clickX,
      y: clickY - 10,
    };
    setCreditToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      setCreditToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 1500);
  };

  // KEEP ALL CARDS IN VAULT
  const handleKeepAll = () => {
    playHitChime();
    const allIndices = pulledCards.map((_, i) => i);
    setVaultedIndices(allIndices);

    setAllResolvedMessage(
      "All cards saved in vault! Returning to pack selection...",
    );
    setTimeout(() => {
      setFlowStage("BROWSE");
      setAllResolvedMessage(null);
    }, 1100);
  };

  // SELL ALL CARDS AT ONCE (95% CASHOUT)
  const handleSellAll = async (e?: React.MouseEvent) => {
    playCoinClink();
    const unsoldCards = pulledCards.filter(
      (_, i) => !soldIndices.includes(i) && !vaultedIndices.includes(i),
    );
    if (
      !(await sellAwards(
        awards.filter(
          (_, i) => !soldIndices.includes(i) && !vaultedIndices.includes(i),
        ),
      ))
    )
      return;

    const allIndices = pulledCards.map((_, i) => i);
    setSoldIndices(allIndices);

    const totalCashout = unsoldCards.reduce(
      (sum, c) => sum + c.value * 0.95,
      0,
    );

    const clickX = e ? e.clientX : window.innerWidth / 2;
    const clickY = e ? e.clientY : window.innerHeight * 0.5;

    if (totalCashout > 0) {
      const newToast: CreditFloatingToast = {
        id: `toast-all-${Date.now()}`,
        amount: Number(totalCashout.toFixed(2)),
        x: clickX,
        y: clickY - 15,
      };
      setCreditToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setCreditToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 1600);
    }

    setAllResolvedMessage(
      "All cards sold & credited! Returning to pack selection...",
    );
    setTimeout(() => {
      setFlowStage("BROWSE");
      setAllResolvedMessage(null);
    }, 1100);
  };

  // Check if all cards in the batch have been resolved (vaulted or sold)
  const checkIfAllResolved = (vaulted: number[], sold: number[]) => {
    const totalResolved = vaulted.length + sold.length;
    if (totalResolved >= pulledCards.length && pulledCards.length > 0) {
      setAllResolvedMessage(
        "All cards resolved! Returning to pack selection...",
      );
      setTimeout(() => {
        setFlowStage("BROWSE");
        setAllResolvedMessage(null);
      }, 1100);
    }
  };

  // Calculate total remaining sell value for un-resolved cards
  const remainingCards = pulledCards.filter(
    (_, i) => !soldIndices.includes(i) && !vaultedIndices.includes(i),
  );
  const remainingCashoutTotal = remainingCards
    .reduce((acc, c) => acc + c.value * 0.95, 0)
    .toFixed(2);

  // Foil pack cover image URL
  const goldPackImg = currentPack.packCoverUrl || "/pack-cover.svg";

  return (
    <div
      data-testid="original-pack-stage"
      className={`relative w-full flex flex-col select-none py-0 overflow-x-hidden ${
        flowStage === "BROWSE"
          ? "min-h-[calc(100dvh-3.75rem)] md:min-h-[calc(100dvh-4rem)] justify-between pb-16 md:pb-1"
          : "min-h-[calc(100dvh-3.75rem)] md:min-h-[calc(100dvh-4rem)] justify-start pb-20 md:pb-8"
      }`}
    >
      {purchaseError && (
        <div
          role="alert"
          className="relative z-50 p-4 text-red-300 bg-red-950/90"
        >
          {purchaseError}
        </div>
      )}
      {busy && (
        <div
          role="status"
          className="relative z-50 p-2 text-center text-emerald-300"
        >
          Processing securely…
        </div>
      )}
      {/* 1. DARK MOVING AMBIENT BACKGROUND */}
      <DarkMovingBackground theme={currentTheme} />

      {/* Floating Animated Credit Badges */}
      {creditToasts.map((toast) => (
        <div
          key={toast.id}
          className="fixed z-50 pointer-events-none animate-credit-float flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-950/95 border-2 border-emerald-400 text-emerald-300 font-mono font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.9)] backdrop-blur-md"
          style={{
            left: `${toast.x}px`,
            top: `${toast.y}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <DollarSign className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span>+${toast.amount.toFixed(2)} CREDITED</span>
        </div>
      ))}

      {/* 2. SUB-HEADER: Only back button when ripping/spinning/revealed */}
      {flowStage !== "BROWSE" && (
        <div className="relative z-30 flex items-center justify-start px-4 pt-1 mb-2 w-full max-w-md mx-auto shrink-0">
          <button
            onClick={() => {
              playHapticTap();
              setFlowStage("BROWSE");
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-slate-300 text-xs font-bold active:scale-95 transition-all cursor-pointer backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Packs</span>
          </button>
        </div>
      )}

      {/* 3. CENTER CONTENT AREA: BROWSE vs RIPPING vs SIMULTANEOUS SPINS (REDUCED PADDING TO ENLARGE PACK) */}
      <div className="relative z-20 flex-1 min-h-0 flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-1 py-0">
        {/* STAGE A: BROWSE PACKS (CLEAN, MINIMAL & ZERO OVERLAP) */}
        {flowStage === "BROWSE" && (
          <div className="w-full flex flex-col items-center justify-center animate-fade-in my-0 py-0 max-w-lg">
            {/* 3D PACK CAROUSEL - Swipes only trigger horizontally on the pack track */}
            <div
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="relative w-full h-[285px] sm:h-[325px] md:h-[345px] flex items-center justify-center perspective-[1200px] my-auto touch-pan-y overflow-hidden"
            >
              {/* Subtle navigation chevrons on left & right */}
              <button
                onClick={handlePrev}
                className="absolute left-0 z-40 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center backdrop-blur-md active:scale-90 transition-all cursor-pointer"
                title="Previous Pack"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleNext}
                className="absolute right-0 z-40 w-7 h-7 rounded-full bg-black/40 hover:bg-black/70 border border-white/10 text-slate-400 hover:text-white flex items-center justify-center backdrop-blur-md active:scale-90 transition-all cursor-pointer"
                title="Next Pack"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {visiblePacks.map((pack, index) => {
                const diff =
                  (index - currentIndex + visiblePacks.length) %
                  visiblePacks.length;
                let normalizedDiff = diff;
                if (normalizedDiff > visiblePacks.length / 2) {
                  normalizedDiff -= visiblePacks.length;
                }

                if (Math.abs(normalizedDiff) > 2) return null;

                const isActive = normalizedDiff === 0;
                const isPrev = normalizedDiff === -1;
                const isNext = normalizedDiff === 1;

                let translateX = "0%";
                let translateZ = "0px";
                let rotateY = "0deg";
                let scale = 1;
                let opacity = 1;
                let zIndex = 20;

                if (isActive) {
                  translateX = "0%";
                  translateZ = "40px";
                  rotateY = "0deg";
                  scale = 0.95;
                  opacity = 1;
                  zIndex = 30;
                } else if (isPrev) {
                  translateX = "-52%";
                  translateZ = "-90px";
                  rotateY = "24deg";
                  scale = 0.8;
                  opacity = 0.55;
                  zIndex = 10;
                } else if (isNext) {
                  translateX = "52%";
                  translateZ = "-90px";
                  rotateY = "-24deg";
                  scale = 0.8;
                  opacity = 0.55;
                  zIndex = 10;
                } else if (normalizedDiff === -2) {
                  translateX = "-90%";
                  translateZ = "-180px";
                  rotateY = "35deg";
                  scale = 0.65;
                  opacity = 0.25;
                  zIndex = 5;
                } else if (normalizedDiff === 2) {
                  translateX = "90%";
                  translateZ = "-180px";
                  rotateY = "-35deg";
                  scale = 0.65;
                  opacity = 0.25;
                  zIndex = 5;
                }

                return (
                  <div
                    key={pack.id}
                    onClick={() => {
                      if (!isActive) {
                        playSwipeWhoosh();
                        setCurrentIndex(index);
                      }
                    }}
                    style={{
                      transform: `translateX(${translateX}) translateZ(${translateZ}) rotateY(${rotateY}) scale(${scale})`,
                      opacity,
                      zIndex,
                      transition:
                        "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease",
                    }}
                    className="absolute cursor-pointer will-change-transform"
                  >
                    <CrownFoilPack
                      pack={pack}
                      size="md"
                      isCenter={isActive}
                      multiplierCount={isActive ? multiplier : 1}
                    />
                  </div>
                );
              })}
            </div>
            {/* The 1/8 bar above the quantity selector has been removed per request */}
          </div>
        )}

        {/* STAGE B: RIPPING STATE (ZOOMED PACK WITH FOIL TEAR) */}
        {flowStage === "RIPPING" && (
          <div className="w-full flex flex-col items-center justify-center relative py-1 animate-fade-in my-auto max-w-md">
            {/* Radiant golden aura */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-10">
              <div className="w-72 h-72 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-pink-500/20 blur-3xl animate-pulse" />
              <div className="absolute w-80 h-80 rounded-full border border-amber-400/20 animate-radiant-rays" />
            </div>

            {/* ZOOMED-IN PACK WITH INTERACTIVE FOIL TEAR SEAM */}
            <div className="relative flex flex-col items-center animate-pack-zoom filter drop-shadow-[0_25px_45px_rgba(245,158,11,0.5)]">
              {/* Emerging card sneak peek when foil peels */}
              {isCardEmerging && (
                <div className="absolute -top-12 z-0 animate-card-rise-from-pack">
                  <div className="w-56 h-80 rounded-none bg-gradient-to-b from-amber-500/30 via-slate-900 to-black border-2 border-amber-400/60 shadow-2xl flex items-center justify-center">
                    <Sparkles className="w-10 h-10 text-amber-300 animate-spin" />
                  </div>
                </div>
              )}

              {/* Foil Pack Container (sharp rectangular borderless pack image) */}
              <div
                className={`relative rounded-none overflow-hidden shadow-2xl bg-gradient-to-b from-amber-900/40 to-black z-10 transition-transform duration-300 ${
                  isFoilPeeling ? "scale-95 brightness-110" : ""
                }`}
              >
                {/* Pack Image with zoom scale */}
                <img
                  src={goldPackImg}
                  alt={currentPack.name}
                  className="w-60 sm:w-68 h-[310px] sm:h-[340px] object-cover pointer-events-none"
                />

                {/* Metallic Top Crimp & Tear Seam Guide */}
                <div
                  ref={seamRef}
                  onMouseDown={handleSeamTouchStart}
                  onMouseMove={handleSeamTouchMove}
                  onMouseUp={handleSeamTouchEnd}
                  onTouchStart={handleSeamTouchStart}
                  onTouchMove={handleSeamTouchMove}
                  onTouchEnd={handleSeamTouchEnd}
                  className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-amber-300/40 via-yellow-400/20 to-transparent flex flex-col justify-center cursor-ew-resize touch-none select-none px-3 ${
                    isFoilPeeling ? "animate-foil-peel pointer-events-none" : ""
                  }`}
                >
                  {/* Glowing Tear Progress Line */}
                  <div className="w-full h-1.5 rounded-full bg-black/60 border border-white/20 overflow-hidden relative shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 transition-all shadow-[0_0_12px_#f59e0b]"
                      style={{ width: `${tearProgress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono font-black text-yellow-300 uppercase tracking-widest mt-1.5 drop-shadow">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-300" />
                      <span>
                        {tearProgress > 0
                          ? `${Math.round(tearProgress)}% RIPPED`
                          : "SWIPE TO RIP"}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${
                          currentPackOdds.mode === "ultra"
                            ? "bg-purple-950/80 border-purple-400 text-purple-300"
                            : currentPackOdds.mode === "high"
                              ? "bg-amber-950/80 border-amber-400 text-amber-300"
                              : "bg-blue-950/80 border-blue-400 text-blue-300"
                        }`}
                      >
                        {currentPackOdds.mode === "ultra"
                          ? "⚡ ULTRA (15% GRAIL)"
                          : currentPackOdds.mode === "high"
                            ? "🔥 HIGH (4% GRAIL)"
                            : "PUBLISHED ODDS"}
                      </span>
                      <span>{multiplier}x PACK</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Prominent Quick-Rip Button */}
              {!isFoilPeeling && (
                <button
                  onClick={() => executeRipFoil()}
                  className="mt-3 px-6 py-2 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-display font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-95 transition-all flex items-center gap-2 cursor-pointer animate-pulse"
                >
                  <Zap className="w-4 h-4 fill-black" />
                  <span>Rip Foil Now</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE C & D: SIMULTANEOUS SINGLE COHESIVE SPINS FOR ALL SELECTED PACKS */}
        {(flowStage === "REVEAL_SPIN" || flowStage === "REVEALED") &&
          spinCards.length > 0 && (
            <div className="w-full flex flex-col items-center justify-center relative py-1 animate-fade-in my-auto">
              {/* Completion Banner if all items resolved */}
              {allResolvedMessage && (
                <div className="mb-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 font-mono text-xs font-bold animate-pulse shadow-lg">
                  {allResolvedMessage}
                </div>
              )}

              {/* Status indicator when spinning */}
              {flowStage === "REVEAL_SPIN" && (
                <div className="flex items-center gap-2 mb-2 px-3.5 py-1 rounded-full bg-black/80 border border-white/10 backdrop-blur-md shadow-md">
                  <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
                  <span className="text-xs font-mono font-bold text-slate-200">
                    {spinCards.length > 1
                      ? `Revealing ${spinCards.length} packs...`
                      : "Spinning reward item..."}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border ${
                      currentPackOdds.mode === "ultra"
                        ? "bg-purple-900/80 border-purple-400 text-purple-200"
                        : currentPackOdds.mode === "high"
                          ? "bg-amber-900/80 border-amber-400 text-amber-200"
                          : "bg-cyan-900/80 border-cyan-400 text-cyan-200"
                    }`}
                  >
                    {currentPackOdds.mode === "ultra"
                      ? "⚡ Ultra (15% Grail · 85% Common)"
                      : currentPackOdds.mode === "high"
                        ? "🔥 High Odds (4% Grail)"
                        : "Published Odds"}
                  </span>
                </div>
              )}

              {/* Results header with active odds indicator */}
              {flowStage === "REVEALED" && (
                <div className="flex items-center gap-2 mb-2 px-3.5 py-1 rounded-full bg-black/80 border border-white/10 backdrop-blur-md shadow-md">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Pulls from {currentPack.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border ${
                      currentPackOdds.mode === "ultra"
                        ? "bg-purple-900/80 border-purple-400 text-purple-200"
                        : currentPackOdds.mode === "high"
                          ? "bg-amber-900/80 border-amber-400 text-amber-200"
                          : "bg-cyan-900/80 border-cyan-400 text-cyan-200"
                    }`}
                  >
                    {currentPackOdds.mode === "ultra"
                      ? "⚡ Ultra Odds (15% Grail Rate)"
                      : currentPackOdds.mode === "high"
                        ? "🔥 High Odds"
                        : "Published Odds"}
                  </span>
                </div>
              )}

              {/* CARDS DISPLAY CONTAINER: DYNAMIC GRID / ROW SIZING BASED ON PACK COUNT */}
              <div
                className={`w-full flex items-center justify-center gap-2 sm:gap-3 py-1 flex-wrap ${
                  spinCards.length === 1
                    ? "max-w-xs"
                    : spinCards.length === 2
                      ? "max-w-md"
                      : spinCards.length <= 4
                        ? "max-w-xl"
                        : "max-w-3xl max-h-[62vh] overflow-y-auto p-1"
                }`}
              >
                {spinCards.map((sc, idx) => {
                  const isSold = soldIndices.includes(idx);
                  const isVaulted = vaultedIndices.includes(idx);
                  const isGrail =
                    sc.card.rarity === "Grail" || sc.card.value >= 25000;

                  // Responsive dimensions based on count
                  const cardWidthClass =
                    spinCards.length === 1
                      ? "w-64 h-[380px] xs:w-72 xs:h-[420px]"
                      : spinCards.length === 2
                        ? "w-40 h-[260px] xs:w-48 xs:h-[300px]"
                        : spinCards.length <= 4
                          ? "w-32 h-[210px] xs:w-38 xs:h-[245px]"
                          : spinCards.length <= 6
                            ? "w-28 h-[180px] xs:w-32 xs:h-[205px]"
                            : "w-24 h-[160px] xs:w-28 xs:h-[185px]";

                  const cardSizeProp =
                    spinCards.length === 1
                      ? "lg"
                      : spinCards.length === 2
                        ? "md"
                        : "sm";

                  return (
                    <div
                      key={sc.card.id + idx}
                      ref={(el) => {
                        cardRefs.current[idx] = el;
                      }}
                      className={`relative ${cardWidthClass} flex items-center justify-center select-none`}
                      style={{ perspective: "1200px" }}
                    >
                      {/* Dynamic Ambient Aura Glow behind each card (Hardware accelerated opacity pulse) */}
                      <div
                        className={`absolute inset-0 rounded-3xl blur-2xl pointer-events-none -z-10 transition-all duration-500 ${
                          !sc.isLocked && !sc.hasLanded
                            ? "animate-glow-pulse-smooth"
                            : ""
                        }`}
                        style={{
                          backgroundColor:
                            sc.isLocked || sc.hasLanded
                              ? sc.rarityColor
                              : "#4f46e5",
                          opacity: sc.isRevealed ? 0.65 : 0.45,
                          transform: sc.isRevealed
                            ? "scale(1.12)"
                            : "scale(1.05)",
                        }}
                      />

                      {/* 3D Luxury Spinning Card Body (GPU-Accelerated Keyframes with 3D Front & Back) */}
                      <div
                        className="relative w-full h-full rounded-2xl select-none luxury-card-rotor"
                        style={{
                          animation: `luxuryCardSpin ${sc.spinDuration}s cubic-bezier(0.16, 0.95, 0.28, 1) forwards`,
                        }}
                      >
                        {/* FRONT FACE OF 3D CARD (facing 0deg) */}
                        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden face-front">
                          {/* The Authentic Won Item Slab (mounted inside front face) */}
                          <div
                            onClick={() => {
                              if (flowStage === "REVEALED" && sc.isRevealed) {
                                playHapticTap();
                                setInspectingCard(sc.card);
                                setInspectingCardIndex(idx);
                              }
                            }}
                            className={`w-full h-full rounded-2xl overflow-hidden relative ${
                              flowStage === "REVEALED" && sc.isRevealed
                                ? "cursor-pointer group"
                                : ""
                            } ${sc.isRevealed ? "animate-won-card-pop" : ""}`}
                          >
                            <CardView
                              card={sc.card}
                              size={cardSizeProp}
                              className="w-full h-full"
                              showOdds={false}
                            />

                            {/* Quick 3D Inspection Badge on Won Card */}
                            {flowStage === "REVEALED" &&
                              sc.isRevealed &&
                              !isSold &&
                              !isVaulted && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playHapticTap();
                                    setInspectingCard(sc.card);
                                    setInspectingCardIndex(idx);
                                  }}
                                  className="absolute top-2 right-2 z-30 px-2 py-0.5 rounded-full bg-black/80 hover:bg-[#00F076] text-white hover:text-black border border-white/20 hover:border-[#00F076] text-[9px] font-mono font-bold flex items-center gap-1 shadow-lg transition-all cursor-pointer backdrop-blur-md opacity-90 group-hover:opacity-100 group-hover:scale-105"
                                  title="Inspect in 3D"
                                >
                                  <Maximize2 className="w-2.5 h-2.5" />
                                  <span>3D Inspect</span>
                                </div>
                              )}
                          </div>

                          {/* RARITY MYSTERY COVER (Visible throughout spin & landing, fades out smoothly upon reveal) */}
                          <div
                            className={`absolute inset-0 w-full h-full rounded-2xl border-2 sm:border-3 flex flex-col items-center justify-center overflow-hidden z-20 pointer-events-none transition-opacity duration-300 ease-out ${
                              sc.isFadingCover || sc.isRevealed
                                ? "opacity-0 pointer-events-none"
                                : "opacity-100"
                            }`}
                            style={{
                              borderColor: sc.isLocked
                                ? sc.rarityColor
                                : "#6366f1",
                              backgroundColor: "#0a0e1c",
                              boxShadow: sc.isLocked
                                ? `0 0 25px ${sc.rarityColor}80`
                                : "0 0 20px rgba(99,102,241,0.4)",
                            }}
                          >
                            {/* Radial gradient in current / winning rarity color */}
                            <div
                              className="absolute inset-0 transition-colors duration-300"
                              style={{
                                background: `radial-gradient(circle at center, ${sc.rarityColor}55 0%, ${sc.rarityColor}20 50%, transparent 85%)`,
                              }}
                            />

                            {/* Shimmer foil sweep */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none animate-shimmer" />

                            {/* Prime Emblem & Rarity Color Callout */}
                            <div className="relative z-10 flex flex-col items-center gap-1.5 sm:gap-2.5 px-3 text-center">
                              <div
                                className={`rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl transition-all duration-300 p-1.5 ${
                                  spinCards.length > 2
                                    ? "w-10 h-10"
                                    : "w-14 h-14"
                                }`}
                                style={{
                                  background: `linear-gradient(135deg, #0e1526 0%, #060a14 100%)`,
                                  border: `2px solid ${sc.rarityColor}`,
                                  boxShadow: `0 0 25px ${sc.rarityColor}90`,
                                }}
                              >
                                <PrimePacksLogo
                                  variant="icon"
                                  size={spinCards.length > 2 ? "xs" : "sm"}
                                  glow={true}
                                />
                              </div>

                              <span
                                className={`font-display font-black text-white tracking-widest drop-shadow-md ${
                                  spinCards.length > 2
                                    ? "text-[9px]"
                                    : "text-xs sm:text-sm"
                                }`}
                              >
                                PRIMEPACKS
                              </span>

                              {/* Rarity Color Badge */}
                              <div
                                className={`font-mono font-black uppercase tracking-wider px-2.5 py-1 rounded-full border-2 shadow-lg transition-all duration-300 flex items-center gap-1.5 ${
                                  spinCards.length > 2
                                    ? "text-[8px]"
                                    : "text-[11px] sm:text-xs"
                                }`}
                                style={{
                                  color: "#ffffff",
                                  borderColor: sc.rarityColor,
                                  backgroundColor: sc.rarityColor,
                                  boxShadow: `0 0 20px ${sc.rarityColor}80`,
                                }}
                              >
                                <Sparkles className="w-3 h-3 text-white" />
                                <span>{sc.rarityName}</span>
                              </div>

                              {sc.hasLanded &&
                                !sc.isFadingCover &&
                                !sc.isRevealed && (
                                  <span className="font-mono text-[9px] sm:text-[10px] text-white/90 font-bold uppercase tracking-wider animate-pulse mt-0.5">
                                    Revealing Item...
                                  </span>
                                )}
                            </div>
                          </div>
                        </div>

                        {/* BACK FACE OF 3D CARD (facing 180deg) - Exclusively branded PrimePacks */}
                        <div
                          className="absolute inset-0 w-full h-full rounded-2xl border-2 sm:border-3 border-amber-400/40 flex flex-col items-center justify-center overflow-hidden shadow-2xl z-10 face-back pointer-events-none"
                          style={{
                            backgroundColor: "#0a0d18",
                            background:
                              "radial-gradient(circle at center, #1e1b4b 0%, #090d1a 75%, #05070f 100%)",
                          }}
                        >
                          {/* Geometric luxury card back foil pattern */}
                          <div className="absolute inset-1.5 rounded-xl border border-amber-400/30 flex flex-col items-center justify-center p-3 bg-gradient-to-b from-white/[0.03] to-transparent">
                            <div className="w-12 h-12 rounded-full border border-amber-400/40 bg-amber-500/10 flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                              <PrimePacksLogo
                                variant="icon"
                                size="sm"
                                glow={true}
                              />
                            </div>
                            <span className="font-display font-black text-[10px] sm:text-xs tracking-[0.25em] text-amber-200/90 uppercase">
                              PRIMEPACKS
                            </span>
                            <span className="font-mono text-[8px] sm:text-[9px] text-amber-400/60 font-bold tracking-widest mt-0.5">
                              AUTHENTIC UNSEALED
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Individual Card Quick Action Overlay when revealed */}
                      {flowStage === "REVEALED" &&
                        sc.isRevealed &&
                        !isSold &&
                        !isVaulted &&
                        spinCards.length > 1 && (
                          <div className="absolute bottom-1 inset-x-1 flex items-center gap-1 z-30 animate-fade-in">
                            <button
                              onClick={() => handleKeepCard(idx)}
                              className="flex-1 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white font-bold text-[9px] sm:text-[10px] shadow active:scale-95 transition-all cursor-pointer"
                              title="Keep in Vault"
                            >
                              Vault
                            </button>
                            <button
                              onClick={(e) => handleSellCard(sc.card, idx, e)}
                              className="flex-1 py-1 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold text-[9px] sm:text-[10px] shadow active:scale-95 transition-all cursor-pointer"
                              title="Sell for 95%"
                            >
                              ${(sc.card.value * 0.95).toFixed(0)}
                            </button>
                          </div>
                        )}

                      {/* SOLD OVERLAY IF CASHED OUT */}
                      {isSold && (
                        <div className="absolute inset-0 rounded-2xl bg-emerald-950/85 backdrop-blur-sm border-2 border-emerald-400 flex flex-col items-center justify-center gap-1 z-30 animate-fade-in">
                          <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                            <Check className="w-5 h-5 stroke-[3]" />
                          </div>
                          <span className="font-display font-black text-emerald-300 text-xs sm:text-sm uppercase tracking-wider drop-shadow">
                            Sold ✓
                          </span>
                          <span className="font-mono text-[10px] text-emerald-400 font-bold">
                            +${(sc.card.value * 0.95).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {/* VAULTED OVERLAY IF KEPT */}
                      {isVaulted && (
                        <div className="absolute inset-0 rounded-2xl bg-indigo-950/85 backdrop-blur-sm border-2 border-indigo-400 flex flex-col items-center justify-center gap-1 z-30 animate-fade-in">
                          <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400 flex items-center justify-center text-indigo-300">
                            <Archive className="w-5 h-5" />
                          </div>
                          <span className="font-display font-black text-indigo-300 text-xs sm:text-sm uppercase tracking-wider drop-shadow">
                            Vaulted ✓
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ACTIONS BAR (BELOW THE REVEALED CARDS) */}
              {flowStage === "REVEALED" && (
                <div className="w-full flex items-stretch gap-2 sm:gap-3 mt-3 px-2 max-w-md animate-fade-in-up">
                  {/* KEEP ALL IN VAULT BUTTON */}
                  <button
                    onClick={handleKeepAll}
                    disabled={remainingCards.length === 0}
                    className={`flex-1 min-h-[48px] py-2 px-3 rounded-2xl font-display font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                      remainingCards.length === 0
                        ? "bg-slate-900 border-white/10 text-slate-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 border-indigo-400/40 text-white shadow-indigo-600/30"
                    }`}
                  >
                    <Archive className="w-4 h-4 text-indigo-300" />
                    <span>
                      {spinCards.length > 1
                        ? "Keep All in Vault"
                        : "Keep in Vault"}
                    </span>
                  </button>

                  {/* SELL ALL (95% CASHOUT) BUTTON */}
                  <button
                    onClick={(e) => handleSellAll(e)}
                    disabled={remainingCards.length === 0}
                    className={`flex-1 min-h-[48px] py-2 px-3 rounded-2xl font-display font-black text-xs sm:text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 border cursor-pointer ${
                      remainingCards.length === 0
                        ? "bg-slate-900 border-white/10 text-slate-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/50 text-white shadow-emerald-600/30"
                    }`}
                  >
                    <DollarSign className="w-4 h-4 text-emerald-300" />
                    <span>
                      {spinCards.length > 1
                        ? `Sell All for $${remainingCashoutTotal}`
                        : `Sell for $${remainingCashoutTotal}`}
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
      </div>

      {/* 4. CLEAN & SLEEK CONTROLS BELOW THE PACK (FITS IN ONE WINDOW DOWN TO BUY BUTTON) */}
      {flowStage === "BROWSE" && (
        <div className="relative z-30 flex flex-col items-center px-3 sm:px-4 w-full max-w-md mx-auto gap-1 sm:gap-1.5 pt-0 pb-0.5 sm:pb-1 shrink-0 select-none">
          {/* ROW 1: THE MULTIPLIER SLIDER WITH DOTS */}
          <div className="flex items-center justify-center gap-2.5 w-full">
            <span className="text-[11px] font-mono font-medium text-slate-400 select-none w-5 text-right">
              1x
            </span>

            {/* Pill Track */}
            <div
              ref={pillRef}
              onPointerDown={handlePillPointerDown}
              onPointerMove={handlePillPointerMove}
              onPointerUp={handlePillPointerUp}
              className="relative flex items-center justify-between p-1 rounded-full bg-[#111424]/90 border border-white/10 shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] w-56 sm:w-68 h-8 sm:h-9 select-none cursor-pointer touch-none"
              title="Slide or click to select pack quantity"
            >
              {/* Sliding Active White/Lavender Capsule Thumb */}
              <div
                className="absolute top-0.5 bottom-0.5 rounded-full bg-gradient-to-b from-[#FFFFFF] via-[#F8F9FE] to-[#ECEEF9] text-[#1E1B4B] font-extrabold font-mono text-xs shadow-[0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all duration-150 ease-out pointer-events-none z-10"
                style={{
                  width: "38px",
                  left: `calc(3px + ${(multiplier - 1) / 9} * (100% - 6px - 38px))`,
                }}
              >
                {multiplier}x
              </div>

              {/* 10 Step Dots */}
              {MULTIPLIERS.map((m) => {
                const isSelected = multiplier === m;
                return (
                  <div
                    key={m}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMultiplierChange(m, e);
                    }}
                    className="flex-1 h-full flex items-center justify-center relative z-0 cursor-pointer group"
                    title={`${m}x Multiplier`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-150 ${
                        isSelected
                          ? "opacity-0 scale-0"
                          : "bg-slate-400/40 group-hover:bg-slate-200 group-hover:scale-125"
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            <span className="text-[11px] font-mono font-medium text-slate-400 select-none w-5 text-left">
              10x
            </span>
          </div>

          {/* ROW 2: PACK TITLE & EYE BUTTON */}
          <div className="flex items-center justify-center gap-2 w-full">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight font-display text-center truncate">
              {currentPack.name}
            </h2>
            <button
              type="button"
              onClick={() => {
                playHapticTap();
                setIsOddsModalOpen(true);
              }}
              className="w-7 h-7 rounded-full bg-[#181B2B] hover:bg-[#23273e] border border-white/10 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              title="View Pack Odds & Details"
            >
              <Eye className="w-3.5 h-3.5 text-slate-300" />
            </button>
          </div>

          {/* ROW 3: STATS (MIN PULL, MAX PULL) & UTILITY BUTTONS (TURBO, SETTINGS) */}
          <div className="w-full flex items-center justify-between px-1 sm:px-2">
            {/* Left: Min & Max Pull Stats */}
            <div className="flex items-center">
              {/* Min Pull */}
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-semibold text-slate-400 mb-0.5">
                  Min Pull
                </span>
                <div className="flex items-baseline font-sans font-bold leading-none">
                  <span className="text-base sm:text-lg text-slate-300 font-bold mr-0.5">
                    $
                  </span>
                  <span className="text-lg sm:text-2xl text-slate-100 font-extrabold tracking-tight">
                    {minPull < 1
                      ? minPull.toFixed(2)
                      : minPull.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Vertical Divider */}
              <div className="h-7 w-[1px] bg-white/10 mx-3 sm:mx-4 shrink-0" />

              {/* Max Pull with Info Icon */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-slate-400 mb-0.5">
                  <span>Max Pull</span>
                  <button
                    type="button"
                    onClick={() => setIsOddsModalOpen(true)}
                    className="cursor-pointer hover:text-slate-200 transition-colors"
                    title="Max Pull Information"
                  >
                    <Info className="w-3 h-3 opacity-80" />
                  </button>
                </div>
                <div className="flex items-baseline font-sans font-bold leading-none">
                  <span className="text-base sm:text-lg font-bold bg-gradient-to-r from-[#FDE68A] to-[#F472B6] bg-clip-text text-transparent mr-0.5">
                    $
                  </span>
                  <span className="text-lg sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-[#FDE68A] via-[#F472B6] to-[#93C5FD] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(244,114,182,0.4)]">
                    {maxPull.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Odds Mode Pill, Turbo (Lightning) & Settings (Cog) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Odds Mode Pill */}
              <button
                type="button"
                onClick={() => {
                  playHapticTap();
                  setIsOddsModalOpen(true);
                }}
                className={`h-9 sm:h-10 px-2.5 sm:px-3 rounded-full border flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 text-[11px] sm:text-xs font-mono font-bold ${
                  currentPackOdds.mode === "ultra"
                    ? "bg-purple-950/80 hover:bg-purple-900 border-purple-400 text-purple-200 ring-1 ring-purple-400/50 shadow-purple-500/20"
                    : currentPackOdds.mode === "high"
                      ? "bg-amber-950/80 hover:bg-amber-900 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 shadow-amber-500/20"
                      : "bg-[#151726] hover:bg-[#1d2035] border-white/10 text-slate-300 hover:text-white"
                }`}
                title="View published pack odds"
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse shrink-0"
                  style={{
                    backgroundColor:
                      currentPackOdds.mode === "ultra"
                        ? "#ec4899"
                        : currentPackOdds.mode === "high"
                          ? "#f59e0b"
                          : "#38bdf8",
                  }}
                />
                <span className="uppercase tracking-wider">
                  {currentPackOdds.mode === "ultra"
                    ? "Ultra"
                    : currentPackOdds.mode === "high"
                      ? "High"
                      : "Published"}
                </span>
                <span className="text-[10px] opacity-75 font-normal hidden xs:inline">
                  {currentPackOdds.mode === "ultra"
                    ? "(15% Grail)"
                    : currentPackOdds.mode === "high"
                      ? "(4% Grail)"
                      : "Published"}
                </span>
              </button>

              {/* Turbo Lightning Button */}
              <button
                type="button"
                onClick={() => {
                  playTurboSpark();
                  setIsTurbo(!isTurbo);
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95 ${
                  isTurbo
                    ? "bg-amber-500/20 border-amber-400/80 text-amber-300 shadow-amber-500/25 ring-2 ring-amber-400/30"
                    : "bg-[#151726] hover:bg-[#1d2035] border-white/10 text-white"
                }`}
                title={isTurbo ? "Turbo Mode Enabled" : "Enable Turbo Mode"}
              >
                <Zap
                  className={`w-4 h-4 ${isTurbo ? "fill-amber-300 text-amber-300" : "text-white"}`}
                />
              </button>

              {/* Settings / Cog Button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    playHapticTap();
                    setIsOddsModalOpen(true);
                  }}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#151726] hover:bg-[#1d2035] border border-white/10 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg active:scale-95"
                  title="Pack Settings & Odds"
                >
                  <Settings className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* ROW 4: ACTION BUTTON: BUY BUTTON WITH EXPLICIT ODDS BADGE */}
          <div className="w-full pt-0.5">
            {/* Holographic Pastel Iridescent Buy Button */}
            <button
              type="button"
              disabled={busy}
              onClick={handleStartRipInWindow}
              className="w-full h-11 sm:h-12 py-2.5 px-4 sm:px-6 rounded-full flex items-center justify-between cursor-pointer transition-all active:scale-[0.98] shadow-[0_4px_25px_rgba(244,114,182,0.35)] hover:shadow-[0_6px_30px_rgba(244,114,182,0.5)] font-display font-extrabold text-sm sm:text-base text-[#2E0854] tracking-tight"
              style={{
                background:
                  "linear-gradient(105deg, #FFF3B0 0%, #FDE68A 20%, #FBCFE8 50%, #E9D5FF 75%, #BAE6FD 100%)",
              }}
            >
              <span>
                Buy for $
                {Number(totalPrice) % 1 === 0
                  ? Number(totalPrice).toString()
                  : Number(totalPrice).toFixed(2)}
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-black/15 text-[#2E0854] border border-black/10">
                {currentPackOdds.mode === "ultra"
                  ? "⚡ Ultra Odds (15% Grail)"
                  : currentPackOdds.mode === "high"
                    ? "🔥 High Odds (4% Grail)"
                    : "Published Odds"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 5. SWITCH CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-lg bg-[#0b0f19] border border-white/10 rounded-3xl p-5 sm:p-6 shadow-2xl relative">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white font-display">
                Select Pack Category
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      playHapticTap();
                      onSelectCategory(cat.id);
                      setIsCategoryModalOpen(false);
                      setCurrentIndex(0);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border text-left transition-all active:scale-98 cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-amber-500/20 via-yellow-400/20 to-amber-500/10 border-amber-400 shadow-lg shadow-amber-500/20"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <span className="font-display font-bold text-sm text-white block">
                        {cat.label}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {cat.count} Mystery Packs Available
                      </span>
                    </div>

                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 6. CHASE CARD PREVIEW MODAL */}
      {previewCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-fade-in"
          onClick={() => setPreviewCard(null)}
        >
          <div
            className="flex flex-col items-center gap-3 max-w-[92vw] max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <CardView
              card={previewCard}
              size="md"
              showOdds={false}
              className="w-52 h-76 sm:w-64 sm:h-96"
            />
            <button
              onClick={() => {
                playHapticTap();
                setPreviewCard(null);
              }}
              className="px-6 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-white/20 text-white font-bold text-xs uppercase tracking-wider shadow-lg active:scale-95 cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

      {/* 7. ESTIMATED ODDS & VALUES VOLATILITY CUSTOMIZER MODAL */}
      <PackVolatilityModal
        pack={currentPack}
        isOpen={isOddsModalOpen}
        currentVolatility={currentPackOdds.mode}
        onClose={() => setIsOddsModalOpen(false)}
      />

      {/* 8. 3D HOLOGRAPHIC CARD INSPECTION MODAL */}
      {inspectingCard && (
        <CardInspectionModal
          card={inspectingCard}
          isOpen={!!inspectingCard}
          onClose={() => {
            setInspectingCard(null);
            setInspectingCardIndex(null);
          }}
          onKeep={() => {
            if (inspectingCardIndex !== null) {
              handleKeepCard(inspectingCardIndex);
            }
          }}
          onSell={(c) => {
            if (inspectingCardIndex !== null) {
              handleSellCard(c, inspectingCardIndex);
            }
          }}
          isSold={
            inspectingCardIndex !== null &&
            soldIndices.includes(inspectingCardIndex)
          }
          isVaulted={
            inspectingCardIndex !== null &&
            vaultedIndices.includes(inspectingCardIndex)
          }
        />
      )}
    </div>
  );
};
