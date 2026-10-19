/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Pack, CardItem, InventoryCard, UserStats } from './types';
import { PACKS, ALL_CARDS } from './data/cards';
import { CardInspectionModal } from './components/CardInspectionModal';
import { CardView } from './components/CardView';
import { PackOpenerModal } from './components/PackOpenerModal';
import { PackDeckScroller } from './components/PackDeckScroller';
import { CrownHomeScreen } from './components/CrownHomeScreen';
import { DarkMovingBackground } from './components/DarkMovingBackground';
import { InteractiveFXCanvas } from './components/InteractiveFXCanvas';
import { ReferModal } from './components/ReferModal';
import { ProfileModal } from './components/ProfileModal';
import { PackBattles } from './components/PackBattles';
import { CardUpgrader } from './components/CardUpgrader';
import { VaultInventory } from './components/VaultInventory';
import { ProvablyFairModal } from './components/ProvablyFairModal';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { PrimePacksLogo } from './components/PrimePacksLogo';
import { FloatingPrimeHub, CategoryOption } from './components/FloatingPrimeHub';
import { AdminPanelModal } from './components/AdminPanelModal';
import { AuthModal } from './components/AuthModal';
import { User as FirebaseUser } from 'firebase/auth';
import {
  subscribeToPackCustomizations,
  savePackCustomizationsToFirestore,
  subscribeToPackItems,
  savePackItemsToFirestore,
  deletePackItemsFromFirestore,
  subscribeToAuth
} from './lib/firebase';
import { generateRandomSeed } from './utils/provablyFair';
import { isSoundEnabled, toggleSound, playHapticTap, playSuccessChime } from './utils/sound';
import {
  Sparkles,
  Swords,
  TrendingUp,
  Package,
  PackageOpen,
  ShieldCheck,
  Volume2,
  VolumeX,
  Gift,
  Plus,
  Flame,
  ArrowRight,
  ExternalLink,
  Layers,
  Star,
  User,
  LayoutGrid,
  LogIn,
  LogOut
} from 'lucide-react';

export default function App() {
  // Navigation tabs: 'store' | 'battles' | 'upgrader' | 'vault'
  const [activeTab, setActiveTab] = useState<'store' | 'battles' | 'upgrader' | 'vault'>('store');
  const [storeViewMode, setStoreViewMode] = useState<'featured_crown' | 'catalog_scroller'>('featured_crown');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Modals for CrownCards reference UI
  const [isReferOpen, setIsReferOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [packOpenerCount, setPackOpenerCount] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [packOpenerTurbo, setPackOpenerTurbo] = useState<boolean>(false);
  const [packOpenerShowOdds, setPackOpenerShowOdds] = useState<boolean>(false);
  const [tickerInspectedCard, setTickerInspectedCard] = useState<CardItem | null>(null);
  const [liveUserPulls, setLiveUserPulls] = useState<CardItem[]>([]);

  // Sound state
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Economy & User Data (persisted in localStorage)
  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('crowncards_balance');
    return saved ? Number(saved) : 1000;
  });

  const [inventory, setInventory] = useState<InventoryCard[]>(() => {
    const saved = localStorage.getItem('crowncards_inventory');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    // Default starter cards in vault
    return [
      {
        instanceId: 'starter-1',
        card: ALL_CARDS.find(c => c.id === 'pikachu-ar-151')!,
        pulledAt: Date.now() - 3600000,
        packName: 'Spark Starter'
      },
      {
        instanceId: 'starter-2',
        card: ALL_CARDS.find(c => c.id === 'charizard-holo-celebrations')!,
        pulledAt: Date.now() - 7200000,
        packName: 'Crown Zenith'
      }
    ];
  });

  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('crowncards_stats');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      balance: 1000,
      totalPacksOpened: 2,
      bestPullValue: 110,
      battlesWon: 0,
      battlesPlayed: 0,
      totalValuePulled: 148,
      dailyClaimedAt: null
    };
  });

  // Provably Fair seeds
  const [clientSeed, setClientSeed] = useState(() => generateRandomSeed(16));
  const [serverSeed] = useState(() => generateRandomSeed(32));
  const [nonce, setNonce] = useState(1);

  // Modals
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState(false);
  const [isDailyRewardsOpen, setIsDailyRewardsOpen] = useState(false);

  // Card targeted for upgrader from other views
  const [upgraderTargetCard, setUpgraderTargetCard] = useState<CardItem | null>(null);

  // Real-time custom pack image URLs synced across devices via Firebase Firestore
  const [customPackUrls, setCustomPackUrls] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('primepacks_custom_pack_urls');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Real-time custom pack items (contained cards) synced across devices via Firebase Firestore
  const [customPackItems, setCustomPackItems] = useState<Record<string, CardItem[]>>(() => {
    const saved = localStorage.getItem('primepacks_custom_pack_items');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return {};
  });

  // Subscribe to real-time pack image updates from Firebase Firestore across all devices
  useEffect(() => {
    const unsubscribe = subscribeToPackCustomizations((cloudUrls) => {
      setCustomPackUrls(cloudUrls);
      localStorage.setItem('primepacks_custom_pack_urls', JSON.stringify(cloudUrls));
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Subscribe to real-time pack items updates from Firebase Firestore across all devices
  useEffect(() => {
    const unsubscribe = subscribeToPackItems((cloudItems) => {
      setCustomPackItems(cloudItems);
      localStorage.setItem('primepacks_custom_pack_items', JSON.stringify(cloudItems));
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Subscribe to Firebase Authentication state across the app
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleSaveCustomPackUrls = async (updated: Record<string, string>) => {
    // 1. Optimistically update local state & cache
    setCustomPackUrls(updated);
    localStorage.setItem('primepacks_custom_pack_urls', JSON.stringify(updated));
    // 2. Persist to Firestore database so all other devices receive the changes
    await savePackCustomizationsToFirestore(updated);
  };

  const handleSavePackItems = async (packId: string, items: CardItem[]) => {
    // 1. Optimistically update local state & cache
    setCustomPackItems((prev) => {
      const next = { ...prev, [packId]: items };
      localStorage.setItem('primepacks_custom_pack_items', JSON.stringify(next));
      return next;
    });
    // 2. Persist to Firestore
    await savePackItemsToFirestore(packId, items);
  };

  const handleResetPackItems = async (packId: string) => {
    // 1. Optimistically clear from local state & cache
    setCustomPackItems((prev) => {
      const next = { ...prev };
      delete next[packId];
      localStorage.setItem('primepacks_custom_pack_items', JSON.stringify(next));
      return next;
    });
    // 2. Delete from Firestore
    await deletePackItemsFromFirestore(packId);
  };

  // Merge custom pack URLs and custom pack items into PACKS
  const packsWithCustomUrls = useMemo(() => {
    return PACKS.map((p) => {
      const packCoverUrl = customPackUrls[p.id] || p.packCoverUrl;
      const items =
        customPackItems[p.id] && customPackItems[p.id].length > 0
          ? customPackItems[p.id]
          : p.items;
      return { ...p, packCoverUrl, items };
    });
  }, [customPackUrls, customPackItems]);

  const hubCategories: CategoryOption[] = useMemo(() => [
    {
      id: 'all',
      label: 'All Collections',
      subtitle: 'Browse all mystery packs',
      count: packsWithCustomUrls.length,
      iconName: 'all'
    },
    {
      id: 'pokemon',
      label: 'Pokémon TCG',
      subtitle: 'Scarlet & Violet, 151, Japanese',
      count: packsWithCustomUrls.filter((p) => p.category === 'pokemon').length,
      iconName: 'pokemon'
    },
    {
      id: 'sports',
      label: 'Sports & Kabooms',
      subtitle: 'NBA, NFL, Prizm & Downtown',
      count: packsWithCustomUrls.filter((p) => p.category === 'sports').length,
      iconName: 'sports'
    },
    {
      id: 'vintage',
      label: 'Vintage Grails',
      subtitle: '1st Edition Base Set & Relics',
      count: packsWithCustomUrls.filter((p) => p.category === 'vintage').length,
      iconName: 'vintage'
    },
    {
      id: 'whales',
      label: 'High Roller & Whales',
      subtitle: '$1,000+ Legendary Grails',
      count: packsWithCustomUrls.filter((p) => p.price >= 1000).length,
      iconName: 'whales'
    }
  ], [packsWithCustomUrls]);

  // Admin secret access: click bottom footer logo 5 times
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const adminTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleFooterLogoClick = () => {
    playHapticTap();
    if (adminTimerRef.current) clearTimeout(adminTimerRef.current);

    const nextCount = adminClickCount + 1;
    if (nextCount >= 5) {
      playSuccessChime();
      setIsAdminOpen(true);
      setAdminClickCount(0);
    } else {
      setAdminClickCount(nextCount);
      adminTimerRef.current = setTimeout(() => {
        setAdminClickCount(0);
      }, 2500);
    }
  };

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('crowncards_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('crowncards_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('crowncards_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  // Handler for opening pack
  const handlePullCards = (pulledCards: CardItem[], cost: number, newNonce: number) => {
    setBalance(prev => Math.max(0, prev - cost));
    setNonce(newNonce);

    // Add cards to inventory
    const newInventoryItems: InventoryCard[] = pulledCards.map((card, i) => ({
      instanceId: `inst-${Date.now()}-${i}-${Math.random()}`,
      card,
      pulledAt: Date.now(),
      packName: selectedPack?.name || 'Mystery Pack'
    }));

    setInventory(prev => [...newInventoryItems, ...prev]);

    // Update stats
    const totalVal = pulledCards.reduce((acc, c) => acc + c.value, 0);
    const highestVal = Math.max(...pulledCards.map(c => c.value));

    setStats(prev => ({
      ...prev,
      totalPacksOpened: prev.totalPacksOpened + pulledCards.length,
      totalValuePulled: prev.totalValuePulled + totalVal,
      bestPullValue: Math.max(prev.bestPullValue, highestVal)
    }));
  };

  // Sell individual card
  const handleSellCard = (card: CardItem, instanceId?: string) => {
    const cashout = Math.floor(card.value * 0.95);
    setBalance(prev => prev + cashout);

    if (instanceId) {
      setInventory(prev => prev.filter(i => i.instanceId !== instanceId));
    } else {
      // Find matching item in inventory to remove
      setInventory(prev => {
        const idx = prev.findIndex(i => i.card.id === card.id);
        if (idx >= 0) {
          const next = [...prev];
          next.splice(idx, 1);
          return next;
        }
        return prev;
      });
    }
  };

  // Sell multiple cards in bulk
  const handleSellMultiple = (cards: { card: CardItem; instanceId: string }[]) => {
    const totalCashout = Math.floor(cards.reduce((sum, item) => sum + item.card.value * 0.95, 0));
    setBalance(prev => prev + totalCashout);
    const idsToRemove = new Set(cards.map(c => c.instanceId));
    setInventory(prev => prev.filter(i => !idsToRemove.has(i.instanceId)));
  };

  // Deduct coins (used by Battle and Upgrader)
  const handleDeductCoins = (amount: number): boolean => {
    if (balance < amount) return false;
    setBalance(prev => prev - amount);
    return true;
  };

  // Add cards directly to vault (used by Battle wins)
  const handleAddCardsToVault = (cards: CardItem[]) => {
    const newItems: InventoryCard[] = cards.map((card, i) => ({
      instanceId: `battle-win-${Date.now()}-${i}-${Math.random()}`,
      card,
      pulledAt: Date.now(),
      packName: 'Pack Battle Winnings'
    }));
    setInventory(prev => [...newItems, ...prev]);
  };

  const handleRecordBattleWin = (won: boolean) => {
    setStats(prev => ({
      ...prev,
      battlesPlayed: prev.battlesPlayed + 1,
      battlesWon: won ? prev.battlesWon + 1 : prev.battlesWon
    }));
  };

  const handleToggleSound = () => {
    const newSound = toggleSound();
    setSoundOn(newSound);
  };

  const handleNavigateToUpgrader = (card: CardItem) => {
    setSelectedPack(null);
    setUpgraderTargetCard(card);
    setActiveTab('upgrader');
  };

  const handleMarkShipped = (instanceId: string, trackingNumber: string) => {
    setInventory(prev =>
      prev.map(item =>
        item.instanceId === instanceId
          ? { ...item, isShipped: true, trackingNumber }
          : item
      )
    );
  };

  const handleOpenPackFromCrownHome = (pack: Pack, count: 1 | 2 | 3 | 4 | 5, fastOpen: boolean) => {
    setSelectedPack(pack);
    setPackOpenerCount(count);
    setPackOpenerTurbo(fastOpen);
    setPackOpenerShowOdds(false);
  };

  const handleViewOddsFromCrownHome = (pack: Pack) => {
    setSelectedPack(pack);
    setPackOpenerCount(1);
    setPackOpenerTurbo(false);
    setPackOpenerShowOdds(true);
  };

  const isStoreCrown = activeTab === 'store' && storeViewMode === 'featured_crown';

  return (
    <div className="bg-[#06080e] text-slate-100 min-h-screen flex flex-col font-sans select-none sm:select-auto relative overflow-x-hidden">
      {/* Global Interactive Particle & Shockwave FX Overlay */}
      <InteractiveFXCanvas colorScheme="neon-pink" />

      {/* 1. TOP NAVBAR (CLEAN GAMIFIED OBSIDIAN UI) */}
      <header className="flex items-center justify-between gap-3 px-3 sm:px-6 py-2 border-b border-white/10 bg-[#07090e]/95 backdrop-blur-2xl sticky top-0 z-40 shadow-[0_4px_25px_rgba(0,0,0,0.6)] shrink-0">
        {/* Zone 1: Brand Logo & Provably Fair badge */}
        <div className="flex items-center gap-3.5">
          <div
            onClick={() => {
              playHapticTap();
              setActiveTab('store');
              setStoreViewMode('featured_crown');
              handleFooterLogoClick();
            }}
            className="cursor-pointer select-none shrink-0 active:scale-95 transition-transform flex items-center"
            title="PrimePacks Home (Click 5x for Admin Portal)"
          >
            <PrimePacksLogo variant="full" size="md" glow={true} />
          </div>

          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>100% PROVABLY FAIR</span>
          </div>
        </div>

        {/* Zone 2: Redesigned Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[#101426]/90 p-1 rounded-2xl border border-white/10 text-xs font-bold font-display uppercase tracking-wider text-slate-300 shadow-inner">
          <button
            onClick={() => {
              playHapticTap();
              setActiveTab('store');
              setStoreViewMode('featured_crown');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'store'
                ? 'bg-[#00F076]/15 text-[#00F076] border border-[#00F076]/35 shadow-[0_0_12px_rgba(0,240,118,0.25)] font-black'
                : 'hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Packs</span>
          </button>
          <button
            onClick={() => {
              playHapticTap();
              setActiveTab('battles');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'battles'
                ? 'bg-[#00F076]/15 text-[#00F076] border border-[#00F076]/35 shadow-[0_0_12px_rgba(0,240,118,0.25)] font-black'
                : 'hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Battles</span>
          </button>
          <button
            onClick={() => {
              playHapticTap();
              setActiveTab('upgrader');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'upgrader'
                ? 'bg-[#00F076]/15 text-[#00F076] border border-[#00F076]/35 shadow-[0_0_12px_rgba(0,240,118,0.25)] font-black'
                : 'hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Upgrader</span>
          </button>
          <button
            onClick={() => {
              playHapticTap();
              setActiveTab('vault');
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vault'
                ? 'bg-[#00F076]/15 text-[#00F076] border border-[#00F076]/35 shadow-[0_0_12px_rgba(0,240,118,0.25)] font-black'
                : 'hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Vault</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px]">
              {inventory.length}
            </span>
          </button>
          <button
            onClick={() => {
              playHapticTap();
              setIsDailyRewardsOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:text-white hover:bg-white/5 border border-transparent text-amber-300"
          >
            <Star className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>Rewards</span>
          </button>
          <button
            onClick={() => {
              playHapticTap();
              setIsReferOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 hover:text-white hover:bg-white/5 border border-transparent text-slate-400 hover:text-slate-200"
          >
            <Gift className="w-3.5 h-3.5" />
            <span>Refer</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[9px] font-bold">+$20</span>
          </button>
        </nav>

        {/* Zone 3: Currency, Sound & Firebase Auth */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={handleToggleSound}
            title={soundOn ? 'Sound On' : 'Sound Muted'}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-[#121626] border border-white/10 text-slate-400 hover:text-white active:scale-95 transition-all cursor-pointer"
            aria-label="Toggle Sound"
          >
            {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Balance Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-[#121626] border border-white/10 shadow-sm">
            <div className="flex flex-col text-right">
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider leading-none">
                BALANCE
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-amber-400 tabular-nums">
                ${balance.toFixed(2)}
              </span>
            </div>
            <button
              onClick={() => {
                playHapticTap();
                setIsDailyRewardsOpen(true);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black transition-all shadow-sm active:scale-90 hover:brightness-110 cursor-pointer"
              title="Claim Daily Rewards / Refill"
              aria-label="Refill Coins"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Firebase Authentication Button / Profile Badge */}
          {currentUser ? (
            <button
              onClick={() => {
                playHapticTap();
                setIsProfileOpen(true);
              }}
              className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-[#121626] hover:bg-[#181d33] border border-white/10 hover:border-[#00F076]/40 transition-all cursor-pointer group"
              title="View Profile / Account"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#00F076] to-emerald-400 text-black font-black flex items-center justify-center text-xs shadow-sm">
                {(currentUser.displayName || currentUser.email || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-none">
                <span className="text-xs font-bold text-white truncate max-w-[90px] group-hover:text-[#00F076] transition-colors">
                  {currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Collector')}
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold mt-0.5">
                  {currentUser.isAnonymous ? 'Guest' : 'VIP 1'}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => {
                playHapticTap();
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }}
              className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#00F076] to-[#10B981] hover:brightness-110 active:scale-95 text-black font-display font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(0,240,118,0.35)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. MAIN CONTENT CONTAINER (FLUID NATIVE SCROLL) */}
      <main className={`flex-1 flex flex-col relative ${isStoreCrown ? 'pb-0' : 'pb-safe-nav'}`}>
        {/* TAB 1: STORE / MYSTERY PACKS */}
        {activeTab === 'store' && (
          storeViewMode === 'featured_crown' ? (
            <CrownHomeScreen
              packs={packsWithCustomUrls}
              balance={balance}
              clientSeed={clientSeed}
              serverSeed={serverSeed}
              nonce={nonce}
              onPullCards={handlePullCards}
              onSellCard={handleSellCard}
              onNavigateToUpgrader={handleNavigateToUpgrader}
              onRefillCoins={() => setIsDailyRewardsOpen(true)}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              selectedPackId={selectedPack?.id}
              onClearSelectedPackId={() => setSelectedPack(null)}
            />
          ) : (
            <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-3 sm:py-5">
              <div className="flex justify-between items-center mb-3">
                <button
                  onClick={() => setStoreViewMode('featured_crown')}
                  className="text-xs text-amber-400 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800"
                >
                  <span>← Back to 3D Foil Carousel</span>
                </button>
              </div>
              <PackDeckScroller
                packs={packsWithCustomUrls}
                balance={balance}
                onSelectPack={(pack) => {
                  setSelectedPack(pack);
                  setStoreViewMode('featured_crown');
                }}
              />
            </div>
          )
        )}

        {/* TAB 2: PACK BATTLES */}
        {activeTab === 'battles' && (
          <PackBattles
            balance={balance}
            onDeductBalance={handleDeductCoins}
            onAddCardsToVault={handleAddCardsToVault}
            onRecordBattleWin={handleRecordBattleWin}
          />
        )}

        {/* TAB 3: CARD UPGRADER */}
        {activeTab === 'upgrader' && (
          <CardUpgrader
            balance={balance}
            inventory={inventory}
            initialCard={upgraderTargetCard}
            onDeductCoins={handleDeductCoins}
            onRemoveCardFromVault={(id) => setInventory(prev => prev.filter(i => i.instanceId !== id))}
            onAddCardToVault={(card) => {
              const item: InventoryCard = {
                instanceId: `upgrade-${Date.now()}`,
                card,
                pulledAt: Date.now(),
                packName: 'Card Upgrader Win'
              };
              setInventory(prev => [item, ...prev]);
            }}
          />
        )}

        {/* TAB 4: VAULT / INVENTORY */}
        {activeTab === 'vault' && (
          <VaultInventory
            inventory={inventory}
            onSellCard={handleSellCard}
            onSellMultiple={handleSellMultiple}
            onNavigateToUpgrader={handleNavigateToUpgrader}
            onMarkShipped={handleMarkShipped}
          />
        )}
      </main>

      {/* FOOTER (Shown on secondary tabs and pack grid, omitted on single-screen featured pack view) */}
      {!isStoreCrown && (
        <footer className="border-t border-slate-800/80 bg-[#07090e] py-6 px-6 mt-12 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Secret 5-Click Admin Portal Access */}
            <div
              onClick={handleFooterLogoClick}
              className="cursor-pointer select-none active:scale-95 transition-transform"
              title="PrimePacks TCG (Click 5x for Admin Portal)"
            >
              <PrimePacksLogo variant="full" size="xs" glow={false} />
            </div>
            <span>·</span>
            <span>Provably Fair Mystery Packs & Battles</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setIsProvablyFairOpen(true)}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Provably Fair Engine
            </button>
            <span>·</span>
            <button
              onClick={() => setIsDailyRewardsOpen(true)}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Claim Free Coins
            </button>
            <span>·</span>
            <span>© 2026 PrimePacks TCG Vault</span>
          </div>
        </footer>
      )}

      {/* ADMIN PANEL MODAL (TRIGGERED BY 5 CLICKS ON FOOTER LOGO OR HEADER LOGO) */}
      <AdminPanelModal
        isOpen={isAdminOpen}
        packs={packsWithCustomUrls}
        customPackUrls={customPackUrls}
        onSaveCustomUrls={handleSaveCustomPackUrls}
        customPackItems={customPackItems}
        onSavePackItems={handleSavePackItems}
        onResetPackItems={handleResetPackItems}
        onClose={() => setIsAdminOpen(false)}
      />

      {/* In-window pack opening is handled inside CrownHomeScreen without a separate window */}

      {isProvablyFairOpen && (
        <ProvablyFairModal
          clientSeed={clientSeed}
          serverSeed={serverSeed}
          nonce={nonce}
          onUpdateClientSeed={setClientSeed}
          onClose={() => setIsProvablyFairOpen(false)}
        />
      )}

      {isDailyRewardsOpen && (
        <DailyRewardsModal
          lastClaimedAt={stats.dailyClaimedAt}
          onClaimDaily={(bonus) => {
            setBalance(prev => prev + bonus);
            setStats(prev => ({ ...prev, dailyClaimedAt: Date.now() }));
          }}
          onFaucetRefill={(amt) => {
            setBalance(prev => prev + amt);
          }}
          onClose={() => setIsDailyRewardsOpen(false)}
        />
      )}

      {isReferOpen && (
        <ReferModal
          onClose={() => setIsReferOpen(false)}
          onClaimReferralBonus={(amt) => {
            setBalance(prev => prev + amt);
          }}
        />
      )}

      {isProfileOpen && (
        <ProfileModal
          stats={stats}
          balance={balance}
          inventoryCount={inventory.length}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          onOpenProvablyFair={() => {
            setIsProfileOpen(false);
            setIsProvablyFairOpen(true);
          }}
          currentUser={currentUser}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode || 'signin');
            setIsAuthModalOpen(true);
          }}
          onClose={() => setIsProfileOpen(false)}
        />
      )}

      {/* FIREBASE AUTHENTICATION FLOW MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={(user) => {
          setCurrentUser(user);
        }}
      />

      {/* FLOATING PRIME CATEGORY CHANGER & ACTION HUB */}
      <FloatingPrimeHub
        balance={balance}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        categories={hubCategories}
        onNavigateToStore={() => {
          setActiveTab('store');
          setStoreViewMode('featured_crown');
        }}
        onNavigateToBattles={() => setActiveTab('battles')}
        onNavigateToUpgrader={() => setActiveTab('upgrader')}
        onRefillCoins={() => setBalance(prev => prev + 100)}
        onOpenDailyRewards={() => setIsDailyRewardsOpen(true)}
        onOpenProvablyFair={() => setIsProvablyFairOpen(true)}
        onOpenVault={() => setActiveTab('vault')}
        vaultCount={inventory.length}
      />

      {/* 3D HOLOGRAPHIC CARD INSPECTION MODAL FOR TICKER & COMMUNITY DROPS */}
      {tickerInspectedCard && (
        <CardInspectionModal
          card={tickerInspectedCard}
          isOpen={!!tickerInspectedCard}
          onClose={() => setTickerInspectedCard(null)}
          onKeep={() => {
            // Keep in vault
            setInventory(prev => [
              {
                instanceId: `vault-${Date.now()}-${Math.random()}`,
                card: tickerInspectedCard,
                pulledAt: Date.now(),
                packName: 'Community Drop Showcase'
              },
              ...prev
            ]);
            setTickerInspectedCard(null);
          }}
          onSell={(cardToSell) => {
            handleSellCard(cardToSell);
            setTickerInspectedCard(null);
          }}
        />
      )}

      {/* 4. REDESIGNED GAMIFIED MOBILE BOTTOM DOCKED MENU */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#060a14]/95 backdrop-blur-2xl border-t border-white/10 pb-safe select-none shadow-[0_-10px_35px_rgba(0,0,0,0.85)] md:hidden">
        {/* Subtle top neon glow accent line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#00F076]/40 to-transparent" />

        <div className="grid grid-cols-5 items-center h-15 max-w-md mx-auto relative px-1">
          {/* 1. PACKS */}
          <button
            onClick={() => {
              playHapticTap();
              setActiveTab('store');
              setStoreViewMode('featured_crown');
            }}
            className={`flex flex-col items-center justify-center h-full active:scale-90 transition-all cursor-pointer relative py-1 ${
              activeTab === 'store' ? 'text-[#00F076]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`p-1 rounded-xl transition-all ${
                activeTab === 'store' ? 'bg-[#00F076]/15 shadow-[0_0_10px_rgba(0,240,118,0.3)]' : ''
              }`}
            >
              <Layers className="w-5 h-5" />
            </div>
            <span
              className={`text-[10px] tracking-tight font-display ${
                activeTab === 'store' ? 'font-black' : 'font-semibold'
              }`}
            >
              Packs
            </span>
            {activeTab === 'store' && (
              <div className="absolute bottom-1 w-4 h-0.5 rounded-full bg-[#00F076] shadow-[0_0_6px_#00F076]" />
            )}
          </button>

          {/* 2. REWARDS */}
          <button
            onClick={() => {
              playHapticTap();
              setIsDailyRewardsOpen(true);
            }}
            className="flex flex-col items-center justify-center h-full active:scale-90 transition-all cursor-pointer relative py-1 text-slate-400 hover:text-amber-300 group"
          >
            <div className="relative p-1 rounded-xl group-hover:bg-amber-500/10 transition-all">
              <Star className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-amber-400" />
            </div>
            <span className="text-[10px] tracking-tight font-display font-semibold group-hover:text-amber-300">
              Rewards
            </span>
          </button>

          {/* 3. INVENTORY */}
          <button
            onClick={() => {
              playHapticTap();
              setActiveTab('vault');
            }}
            className={`flex flex-col items-center justify-center h-full active:scale-90 transition-all cursor-pointer relative py-1 ${
              activeTab === 'vault' ? 'text-[#00F076]' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div
              className={`relative p-1 rounded-xl transition-all ${
                activeTab === 'vault' ? 'bg-[#00F076]/15 shadow-[0_0_10px_rgba(0,240,118,0.3)]' : ''
              }`}
            >
              <Package className="w-5 h-5" />
              {inventory.length > 0 && (
                <span className="absolute -top-1 -right-2 px-1 min-w-[15px] h-3.5 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-mono text-[9px] font-black flex items-center justify-center shadow-lg shadow-pink-500/50">
                  {inventory.length > 99 ? '99+' : inventory.length}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] tracking-tight font-display ${
                activeTab === 'vault' ? 'font-black' : 'font-semibold'
              }`}
            >
              Inventory
            </span>
            {activeTab === 'vault' && (
              <div className="absolute bottom-1 w-4 h-0.5 rounded-full bg-[#00F076] shadow-[0_0_6px_#00F076]" />
            )}
          </button>

          {/* 4. REFER */}
          <button
            onClick={() => {
              playHapticTap();
              setIsReferOpen(true);
            }}
            className="flex flex-col items-center justify-center h-full active:scale-90 transition-all cursor-pointer relative py-1 text-slate-400 hover:text-slate-200 group"
          >
            <div className="relative p-1 rounded-xl group-hover:bg-white/5 transition-all">
              <Gift className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-2 px-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[8px] font-black border border-amber-500/30">
                +$20
              </span>
            </div>
            <span className="text-[10px] tracking-tight font-display font-semibold">
              Refer
            </span>
          </button>

          {/* 5. PROFILE */}
          <button
            onClick={() => {
              playHapticTap();
              if (currentUser) {
                setIsProfileOpen(true);
              } else {
                setAuthModalMode('signin');
                setIsAuthModalOpen(true);
              }
            }}
            className="flex flex-col items-center justify-center h-full active:scale-90 transition-all cursor-pointer relative py-1 text-slate-400 hover:text-slate-200 group"
          >
            <div className="relative p-1 rounded-xl group-hover:bg-white/5 transition-all">
              {currentUser ? (
                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#00F076] to-emerald-400 text-black font-black text-[10px] flex items-center justify-center shadow-sm">
                  {(currentUser.displayName || currentUser.email || 'P').charAt(0).toUpperCase()}
                </div>
              ) : (
                <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
              {currentUser && (
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 rounded-full bg-[#00F076] ring-1 ring-black" />
              )}
            </div>
            <span className="text-[10px] tracking-tight font-display font-semibold">
              {currentUser ? 'Profile' : 'Sign In'}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
