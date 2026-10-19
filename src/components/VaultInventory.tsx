import React, { useState } from 'react';
import { InventoryCard, CardItem } from '../types';
import { CardView } from './CardView';
import { playCoinClink, playHapticTap } from '../utils/sound';
import { fxSystem } from '../utils/interactiveFX';
import { CardInspectionModal } from './CardInspectionModal';
import {
  Package,
  Truck,
  DollarSign,
  TrendingUp,
  Search,
  CheckCircle2,
  X,
  Sparkles,
  ShieldCheck,
  Maximize2
} from 'lucide-react';

interface VaultInventoryProps {
  inventory: InventoryCard[];
  onSellCard: (card: CardItem, instanceId: string) => void;
  onSellMultiple: (cards: { card: CardItem; instanceId: string }[]) => void;
  onNavigateToUpgrader: (card: CardItem) => void;
  onMarkShipped: (instanceId: string, trackingNumber: string) => void;
}

export const VaultInventory: React.FC<VaultInventoryProps> = ({
  inventory,
  onSellCard,
  onSellMultiple,
  onNavigateToUpgrader,
  onMarkShipped
}) => {
  const [filterRarity, setFilterRarity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'value_desc' | 'value_asc' | 'newest'>('value_desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Shipping Modal State
  const [shippingCard, setShippingCard] = useState<InventoryCard | null>(null);
  const [shippingAddress, setShippingAddress] = useState({
    name: 'Alex Collector',
    street: '742 Evergreen Terrace',
    city: 'Springfield',
    state: 'OR',
    zip: '97477',
    country: 'United States'
  });
  const [shippingConfirmed, setShippingConfirmed] = useState<string | null>(null);
  const [inspectingItem, setInspectingItem] = useState<InventoryCard | null>(null);

  // Filter & sort
  const filtered = inventory.filter((item) => {
    if (filterRarity !== 'all' && item.card.rarity !== filterRarity) return false;
    if (filterCategory !== 'all' && item.card.category !== filterCategory) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        item.card.name.toLowerCase().includes(q) ||
        item.card.set.toLowerCase().includes(q) ||
        item.card.grade.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'value_desc') return b.card.value - a.card.value;
    if (sortBy === 'value_asc') return a.card.value - b.card.value;
    return b.pulledAt - a.pulledAt;
  });

  const totalVaultValue = inventory.reduce((sum, item) => sum + item.card.value, 0);

  // Toggle selection
  const toggleSelect = (instanceId: string) => {
    playHapticTap();
    setSelectedIds((prev) =>
      prev.includes(instanceId) ? prev.filter((id) => id !== instanceId) : [...prev, instanceId]
    );
  };

  const handleSelectAll = () => {
    playHapticTap();
    if (selectedIds.length === sorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sorted.map((i) => i.instanceId));
    }
  };

  // Sell selected cards
  const handleSellSelected = () => {
    const toSell = inventory.filter((item) => selectedIds.includes(item.instanceId));
    if (toSell.length === 0) return;

    playCoinClink();
    onSellMultiple(toSell.map((i) => ({ card: i.card, instanceId: i.instanceId })));
    setSelectedIds([]);
  };

  // Submit physical delivery
  const handleConfirmShipping = () => {
    if (!shippingCard) return;
    playHapticTap();
    const tracking = `CROWN-FEDEX-${Math.floor(10000000 + Math.random() * 90000000)}`;
    onMarkShipped(shippingCard.instanceId, tracking);
    setShippingConfirmed(tracking);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-24">
      {/* Top Vault Summary Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0d1424] via-[#090d18] to-[#121929] border border-white/10 rounded-3xl p-6 sm:p-8 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
        {/* Radiant glow orb in background */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
                COLLECTOR VAULT & INVENTORY
              </h1>
              <div className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>VAULT INSURED</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Your authentic pulled cards, PSA graded gem slabs, and real-world physical delivery assets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 relative z-10">
          <div className="text-left md:text-right">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
              Total Portfolio Value
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tabular-nums drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
              ${totalVaultValue.toLocaleString()}
            </span>
          </div>

          <div className="text-left md:text-right border-l border-white/10 pl-6">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-bold block">
              Cards Stored
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-white tabular-nums">
              {inventory.length}
            </span>
          </div>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards by name, set, or PSA grade..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-white/10 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors shadow-inner"
          />
        </div>

        {/* Category & Sorting Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Tabs */}
          <div className="flex items-center bg-slate-900/90 border border-white/10 p-1 rounded-2xl text-xs">
            {['all', 'pokemon', 'sports', 'vintage'].map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  playHapticTap();
                  setFilterCategory(cat);
                }}
                className={`px-3 py-1.5 rounded-xl font-bold capitalize transition-all ${
                  filterCategory === cat
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Sort Menu */}
          <select
            value={sortBy}
            onChange={(e) => {
              playHapticTap();
              setSortBy(e.target.value as any);
            }}
            className="bg-slate-900/90 border border-white/10 text-xs text-slate-200 rounded-2xl px-3.5 py-2 focus:outline-none focus:border-amber-400/60"
          >
            <option value="value_desc">Highest Value First</option>
            <option value="value_asc">Lowest Value First</option>
            <option value="newest">Recently Pulled</option>
          </select>
        </div>
      </div>

      {/* Batch Action Toolbar when items selected */}
      {selectedIds.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 mb-6 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <span className="text-xs font-mono font-bold text-amber-300">
            {selectedIds.length} card{selectedIds.length > 1 ? 's' : ''} selected ($
            {Math.floor(
              inventory
                .filter((i) => selectedIds.includes(i.instanceId))
                .reduce((sum, i) => sum + i.card.value * 0.95, 0)
            ).toLocaleString()}{' '}
            instant cashout value)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Clear Selection
            </button>
            <button
              onClick={handleSellSelected}
              className="px-4 py-2 rounded-xl text-xs font-bold font-mono bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-900/30 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Instant Cashout Selected (95%)</span>
            </button>
          </div>
        </div>
      )}

      {/* Inventory Cards Grid */}
      {sorted.length === 0 ? (
        <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-12 text-center flex flex-col items-center">
          <Package className="w-14 h-14 text-slate-600 mb-3" />
          <h3 className="text-base font-bold text-slate-200 font-display">No cards in Vault</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            {inventory.length === 0
              ? 'Rip open some packs to pull your first grails!'
              : 'No cards matched your active filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sorted.map((item) => {
            const isSelected = selectedIds.includes(item.instanceId);

            return (
              <div key={item.instanceId} className="flex flex-col items-center group relative">
                {/* Select Checkbox */}
                <button
                  onClick={() => toggleSelect(item.instanceId)}
                  className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-amber-500 border-amber-400 text-black shadow-md'
                      : 'bg-black/60 border-white/20 text-transparent opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                {/* Shipped badge if physically dispatched */}
                {item.isShipped && (
                  <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold font-mono flex items-center gap-1 shadow-md">
                    <Truck className="w-3 h-3" />
                    <span>SHIPPED</span>
                  </div>
                )}

                <CardView
                  card={item.card}
                  size="sm"
                  selected={isSelected}
                  onSelect={() => toggleSelect(item.instanceId)}
                />

                {/* Card Controls Toolbar */}
                <div className="w-full flex items-center gap-1.5 mt-2.5 px-0.5">
                  <button
                    onClick={() => {
                      playCoinClink();
                      onSellCard(item.card, item.instanceId);
                    }}
                    title="Sell for 95% cashout"
                    className="flex-1 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-emerald-400/50 hover:bg-emerald-500/20 text-[10px] font-mono font-bold text-slate-300 hover:text-emerald-300 transition-all text-center cursor-pointer active:scale-95"
                  >
                    Sell (${Math.floor(item.card.value * 0.95)})
                  </button>
                  <button
                    onClick={() => {
                      playHapticTap();
                      setInspectingItem(item);
                    }}
                    title="Inspect 3D Holographic Card"
                    className="p-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                  </button>
                  <button
                    onClick={() => {
                      playHapticTap();
                      onNavigateToUpgrader(item.card);
                    }}
                    title="Upgrade this card in Lab"
                    className="p-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                  <button
                    onClick={() => {
                      playHapticTap();
                      setShippingCard(item);
                      setShippingConfirmed(null);
                    }}
                    title="Request Insured Physical Delivery"
                    className="p-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-all cursor-pointer active:scale-95"
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Physical Delivery / Slab Ship Modal */}
      {shippingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-[#090d18] border border-white/10 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setShippingCard(null)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white font-display">
                Request Physical Slab Delivery
              </h3>
            </div>

            {shippingConfirmed ? (
              <div className="py-6 text-center flex flex-col items-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-3" />
                <h4 className="text-lg font-bold text-white font-display">Delivery Dispatched!</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-sm">
                  Your authentic graded card has been packaged with tamper-proof security seals and insured courier tracking.
                </p>
                <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-white/10 font-mono text-xs text-amber-400">
                  Tracking #: {shippingConfirmed}
                </div>
                <button
                  onClick={() => setShippingCard(null)}
                  className="mt-6 px-6 py-2.5 rounded-2xl text-xs font-bold bg-amber-500 text-black font-display cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-400 mb-4">
                  We ship insured and tracked physical cards directly to your doorstep with guaranteed vault inspection.
                </p>

                {/* Card preview */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-900/90 border border-white/10 mb-4">
                  <div className="w-12 h-16 rounded-lg overflow-hidden bg-black shrink-0">
                    <img
                      src={shippingCard.card.imageUrl}
                      alt={shippingCard.card.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {shippingCard.card.name}
                    </span>
                    <span className="text-[11px] text-amber-400 font-mono">
                      {shippingCard.card.grade} · ${shippingCard.card.usdValue.toLocaleString()} Value
                    </span>
                  </div>
                </div>

                {/* Shipping Address Inputs */}
                <div className="space-y-3 mb-6 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={shippingAddress.name}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, name: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Street Address</label>
                    <input
                      type="text"
                      value={shippingAddress.street}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, street: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">City</label>
                      <input
                        type="text"
                        value={shippingAddress.city}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, city: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">State / Zip</label>
                      <input
                        type="text"
                        value={`${shippingAddress.state} ${shippingAddress.zip}`}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, state: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Country</label>
                      <input
                        type="text"
                        value={shippingAddress.country}
                        onChange={(e) =>
                          setShippingAddress({ ...shippingAddress, country: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <span className="text-xs text-slate-400">
                    Vault Shipping: <strong className="text-emerald-400">FREE</strong>
                  </span>
                  <button
                    onClick={handleConfirmShipping}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold font-display bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Confirm & Dispatch Slab
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3D Holographic Card Inspection Modal */}
      {inspectingItem && (
        <CardInspectionModal
          card={inspectingItem.card}
          isOpen={!!inspectingItem}
          onClose={() => setInspectingItem(null)}
          onSell={(card) => {
            onSellCard(card, inspectingItem.instanceId);
            setInspectingItem(null);
          }}
        />
      )}
    </div>
  );
};
