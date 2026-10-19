import React, { useState, useEffect } from 'react';
import { Pack, CardItem, CardRarity, CardGrade, CardCategory } from '../types';
import { ALL_CARDS, PACKS } from '../data/cards';
import {
  X,
  RotateCcw,
  Check,
  Sparkles,
  Cloud,
  CloudCheck,
  Loader2,
  Plus,
  Trash2,
  Search,
  Layers,
  Image as ImageIcon,
  Box,
  AlertCircle
} from 'lucide-react';
import { playHapticTap, playSuccessChime } from '../utils/sound';

interface AdminPanelModalProps {
  isOpen: boolean;
  packs: Pack[];
  customPackUrls: Record<string, string>;
  onSaveCustomUrls: (updated: Record<string, string>) => Promise<void> | void;
  customPackItems: Record<string, CardItem[]>;
  onSavePackItems: (packId: string, items: CardItem[]) => Promise<void> | void;
  onResetPackItems: (packId: string) => Promise<void> | void;
  onClose: () => void;
  isCloudSyncing?: boolean;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  isOpen,
  packs,
  customPackUrls,
  onSaveCustomUrls,
  customPackItems,
  onSavePackItems,
  onResetPackItems,
  onClose,
  isCloudSyncing = false
}) => {
  // Top-level Admin Mode: 'covers' | 'items'
  const [adminMode, setAdminMode] = useState<'covers' | 'items'>('items');

  // --- PACK COVERS STATE ---
  const [urls, setUrls] = useState<Record<string, string>>({ ...customPackUrls });
  const [coversFilter, setCoversFilter] = useState<'all' | 'customized'>('all');
  const [coversSearch, setCoversSearch] = useState('');
  const [isSavingCovers, setIsSavingCovers] = useState(false);
  const [savedCoversToast, setSavedCoversToast] = useState(false);

  // --- PACK ITEMS STATE ---
  const [selectedPackId, setSelectedPackId] = useState<string>(packs[0]?.id || 'pack-pokemon-select-1000x');
  const [currentPackItems, setCurrentPackItems] = useState<CardItem[]>([]);
  const [isSavingItems, setIsSavingItems] = useState(false);
  const [savedItemsToast, setSavedItemsToast] = useState(false);
  const [itemsSearchQuery, setItemsSearchQuery] = useState('');

  // Add Item view toggle: 'catalog' | 'custom'
  const [addItemMode, setAddItemMode] = useState<'catalog' | 'custom'>('catalog');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogRarityFilter, setCatalogRarityFilter] = useState<string>('all');

  // Custom Card Form State
  const [customName, setCustomName] = useState('');
  const [customSet, setCustomSet] = useState('');
  const [customNumber, setCustomNumber] = useState('');
  const [customYear, setCustomYear] = useState('2024');
  const [customRarity, setCustomRarity] = useState<CardRarity>('Ultra Rare');
  const [customGrade, setCustomGrade] = useState<CardGrade>('PSA 10');
  const [customValue, setCustomValue] = useState<number>(100);
  const [customOdds, setCustomOdds] = useState<number>(0.05);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [customCategory, setCustomCategory] = useState<CardCategory>('pokemon');

  // Sync internal state when opened or when external props update
  useEffect(() => {
    if (isOpen) {
      setUrls({ ...customPackUrls });
      if (!selectedPackId && packs.length > 0) {
        setSelectedPackId(packs[0].id);
      }
    }
  }, [isOpen, customPackUrls, packs, selectedPackId]);

  // Keep currentPackItems in sync with selectedPack
  useEffect(() => {
    if (!selectedPackId) return;
    const targetPack = packs.find((p) => p.id === selectedPackId);
    if (!targetPack) return;

    if (customPackItems[selectedPackId] && customPackItems[selectedPackId].length > 0) {
      setCurrentPackItems([...customPackItems[selectedPackId]]);
    } else {
      setCurrentPackItems([...targetPack.items]);
    }
  }, [selectedPackId, customPackItems, packs]);

  if (!isOpen) return null;

  const currentSelectedPack = packs.find((p) => p.id === selectedPackId) || packs[0];
  const isSelectedPackCustomized = Boolean(customPackItems[selectedPackId]?.length);

  // --- PACK COVERS HANDLERS ---
  const handleUrlChange = (packId: string, url: string) => {
    setUrls((prev) => ({
      ...prev,
      [packId]: url
    }));
  };

  const handleResetCover = (packId: string) => {
    playHapticTap();
    setUrls((prev) => {
      const next = { ...prev };
      delete next[packId];
      return next;
    });
  };

  const handleResetAllCovers = async () => {
    playHapticTap();
    if (window.confirm('Reset all pack images to default across all devices?')) {
      setUrls({});
      setIsSavingCovers(true);
      try {
        await onSaveCustomUrls({});
        playSuccessChime();
        setSavedCoversToast(true);
        setTimeout(() => setSavedCoversToast(false), 1500);
      } finally {
        setIsSavingCovers(false);
      }
    }
  };

  const handleSaveCovers = async () => {
    playHapticTap();
    setIsSavingCovers(true);
    try {
      await onSaveCustomUrls(urls);
      playSuccessChime();
      setSavedCoversToast(true);
      setTimeout(() => {
        setSavedCoversToast(false);
      }, 1200);
    } catch (err) {
      console.error('Failed to save pack URLs:', err);
    } finally {
      setIsSavingCovers(false);
    }
  };

  // --- PACK ITEMS HANDLERS ---
  const handleRemoveItem = (indexToRemove: number) => {
    playHapticTap();
    if (currentPackItems.length <= 1) {
      alert('A pack must contain at least 1 item.');
      return;
    }
    setCurrentPackItems((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleAddCardFromCatalog = (card: CardItem) => {
    playHapticTap();
    // Clone card with new unique ID for pack instance
    const newCardInstance: CardItem = {
      ...card,
      id: `${card.id}-${Date.now()}`
    };
    setCurrentPackItems((prev) => [newCardInstance, ...prev]);
    playSuccessChime();
  };

  const handleCreateCustomCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      alert('Card name is required.');
      return;
    }
    const finalImage =
      customImageUrl.trim() ||
      'https://images.pokemontcg.io/sv3pt5/199_hires.png';

    const newCard: CardItem = {
      id: `custom-${Date.now()}`,
      name: customName.trim(),
      set: customSet.trim() || 'Custom Prime Collection',
      number: customNumber.trim() || '001',
      year: customYear.trim() || '2024',
      rarity: customRarity,
      grade: customGrade,
      value: Number(customValue) || 10,
      usdValue: Number(customValue) || 10,
      imageUrl: finalImage,
      category: customCategory,
      odds: Number(customOdds) || 0.05
    };

    setCurrentPackItems((prev) => [newCard, ...prev]);
    playSuccessChime();

    // Reset inputs
    setCustomName('');
    setCustomSet('');
    setCustomNumber('');
    setCustomImageUrl('');
    setCustomValue(100);
  };

  const handleSavePackItems = async () => {
    if (!selectedPackId) return;
    playHapticTap();
    setIsSavingItems(true);
    try {
      await onSavePackItems(selectedPackId, currentPackItems);
      playSuccessChime();
      setSavedItemsToast(true);
      setTimeout(() => setSavedItemsToast(false), 1500);
    } catch (err) {
      console.error('Failed to save pack items:', err);
      alert('Error saving pack items to Firestore. Please check your connection.');
    } finally {
      setIsSavingItems(false);
    }
  };

  const handleResetPackItemsToDefault = async () => {
    if (!selectedPackId) return;
    playHapticTap();
    if (window.confirm(`Reset "${currentSelectedPack.name}" back to its default card items? This will remove custom items in Firestore.`)) {
      setIsSavingItems(true);
      try {
        await onResetPackItems(selectedPackId);
        // Find default pack items from PACKS constant
        const defaultPack = PACKS.find((p) => p.id === selectedPackId);
        if (defaultPack) {
          setCurrentPackItems([...defaultPack.items]);
        }
        playSuccessChime();
        setSavedItemsToast(true);
        setTimeout(() => setSavedItemsToast(false), 1500);
      } finally {
        setIsSavingItems(false);
      }
    }
  };

  // Quick preset sample cover images
  const PRESET_COVERS = [
    { name: 'Prime Gold Foil', url: 'https://www.crowncards.io/_next/image?url=%2Fpacks%2Fgold.png&w=640&q=75' },
    { name: 'Obsidian Neon', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=640&auto=format&fit=crop&q=80' },
    { name: 'Holographic Nebula', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=640&auto=format&fit=crop&q=80' },
    { name: 'Cyberpunk Purple', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=640&auto=format&fit=crop&q=80' },
    { name: 'Emerald Prism', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=640&auto=format&fit=crop&q=80' }
  ];

  // Preset sample card images for custom card creation
  const PRESET_CARD_IMAGES = [
    { name: 'Charizard 151 SAR', url: 'https://images.pokemontcg.io/sv3pt5/199_hires.png' },
    { name: 'Charizard 1st Edition', url: 'https://images.pokemontcg.io/base1/4_hires.png' },
    { name: 'Pikachu Illustrator', url: 'https://images.pokemontcg.io/basep/1_hires.png' },
    { name: 'Gengar VMAX Alt Art', url: 'https://images.pokemontcg.io/swsh8/271_hires.png' },
    { name: 'Lugia V Alt Art', url: 'https://images.pokemontcg.io/swsh12/186_hires.png' },
    { name: 'Rayquaza VMAX Alt Art', url: 'https://images.pokemontcg.io/swsh7/218_hires.png' },
    { name: 'Umbreon VMAX Moonbreon', url: 'https://images.pokemontcg.io/swsh7/215_hires.png' }
  ];

  const getRarityBadgeColor = (rarity: CardRarity) => {
    switch (rarity) {
      case 'Grail':
        return 'bg-amber-500/20 text-yellow-300 border-amber-400/40';
      case 'Legendary':
      case 'Secret Rare':
        return 'bg-pink-500/20 text-pink-300 border-pink-400/40';
      case 'Epic':
      case 'Ultra Rare':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/40';
      case 'Rare':
        return 'bg-blue-500/20 text-blue-300 border-blue-400/40';
      case 'Uncommon':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  // Filtered cards for Catalog picker
  const filteredCatalogCards = ALL_CARDS.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.set.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      c.rarity.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesRarity = catalogRarityFilter === 'all' || c.rarity === catalogRarityFilter;
    return matchesSearch && matchesRarity;
  });

  // Filtered cards for Pack Covers
  const filteredPacksForCovers = packs.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(coversSearch.toLowerCase()) ||
      p.id.toLowerCase().includes(coversSearch.toLowerCase());
    if (coversFilter === 'customized') {
      return matchesSearch && !!urls[p.id];
    }
    return matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl animate-fade-in select-none">
      <div className="w-full max-w-4xl bg-[#0a0d18] border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white font-display">
                  PrimePacks Admin Portal
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 border border-emerald-500/30">
                  <Cloud className="w-2.5 h-2.5" />
                  Firestore Synced
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize pack cover images & manage pack item inventories in real time. Synced across all devices.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close Admin Portal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Admin Mode Navigation: Pack Items vs Pack Covers */}
        <div className="py-2.5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playHapticTap();
                setAdminMode('items');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                adminMode === 'items'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md'
                  : 'bg-[#121626] border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Pack Items & Inventory</span>
              {Object.keys(customPackItems).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[9px] font-mono font-bold text-white">
                  {Object.keys(customPackItems).length} Custom
                </span>
              )}
            </button>

            <button
              onClick={() => {
                playHapticTap();
                setAdminMode('covers');
              }}
              className={`px-3.5 py-1.5 rounded-xl font-display font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                adminMode === 'covers'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'bg-[#121626] border border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Pack Covers</span>
              {Object.keys(urls).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-900/60 text-[9px] font-mono font-bold text-purple-200">
                  {Object.keys(urls).length}
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-1.5">
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-synced to Cloud Firestore</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: PACK ITEMS & INVENTORY MANAGER                     */}
        {/* ======================================================== */}
        {adminMode === 'items' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 py-2 min-h-0">
            {/* Pack Selector Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 bg-[#0e1324] p-2.5 rounded-2xl border border-white/10">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 font-mono">
                  Select Pack:
                </span>
                <select
                  value={selectedPackId}
                  onChange={(e) => {
                    playHapticTap();
                    setSelectedPackId(e.target.value);
                  }}
                  className="flex-1 max-w-sm px-3 py-1.5 rounded-xl bg-[#161c32] border border-white/15 text-xs text-white font-display font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  {packs.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.price}) — {customPackItems[p.id]?.length ? `★ ${customPackItems[p.id].length} items (Custom)` : `${p.items.length} items`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status and Reset Pack button */}
              <div className="flex items-center gap-2 shrink-0">
                {isSelectedPackCustomized ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[10px] font-bold">
                    Custom Items in Firestore ({currentPackItems.length})
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/5 font-mono text-[10px]">
                    Default Items ({currentPackItems.length})
                  </span>
                )}

                {isSelectedPackCustomized && (
                  <button
                    onClick={handleResetPackItemsToDefault}
                    disabled={isSavingItems}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    title="Revert to default items"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Reset Defaults</span>
                  </button>
                )}
              </div>
            </div>

            {/* Split View: Left = Pack Items List / Right = Add Items (Catalog or Custom) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
              {/* Left Column: Contained Items (5 cols) */}
              <div className="lg:col-span-6 flex flex-col bg-[#0e1324] rounded-2xl border border-white/10 p-3 overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-display font-bold text-white text-xs">
                      Items Inside Pack ({currentPackItems.length})
                    </span>
                  </div>

                  <span className="font-mono text-[10px] text-amber-400 font-bold">
                    Total Pool: ${currentPackItems.reduce((acc, c) => acc + c.value, 0).toLocaleString()}
                  </span>
                </div>

                {/* Items scroll list */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 my-2 min-h-0">
                  {currentPackItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs font-mono">
                      Pack is empty. Add items using the panel on the right.
                    </div>
                  ) : (
                    currentPackItems.map((item, idx) => (
                      <div
                        key={item.id + idx}
                        className="p-2 rounded-xl bg-[#151c33] border border-white/5 hover:border-white/15 flex items-center gap-2.5 transition-all group"
                      >
                        {/* Card Image */}
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-black/60 border border-white/10 shrink-0 flex items-center justify-center">
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain p-0.5"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.pokemontcg.io/sv3pt5/199_hires.png';
                            }}
                          />
                        </div>

                        {/* Card details */}
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-white text-xs truncate" title={item.name}>
                              {item.name}
                            </span>
                            <span className="font-mono text-amber-400 font-bold text-xs shrink-0">
                              ${item.value.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono truncate">
                            <span>{item.set}</span>
                            <span>·</span>
                            <span>{item.grade}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${getRarityBadgeColor(
                                item.rarity
                              )}`}
                            >
                              {item.rarity}
                            </span>
                            <span className="text-[9px] font-mono text-slate-500">
                              Odds wt: {item.odds}
                            </span>
                          </div>
                        </div>

                        {/* Remove item button */}
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer opacity-70 group-hover:opacity-100"
                          title="Remove item from pack"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Left Column Bottom Save Button */}
                <div className="pt-2 border-t border-white/10 shrink-0 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    {isSelectedPackCustomized ? '★ Custom in Firestore' : 'Default pack contents'}
                  </span>

                  <button
                    onClick={handleSavePackItems}
                    disabled={isSavingItems}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-display font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-75"
                  >
                    {isSavingItems ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving to Firestore...</span>
                      </>
                    ) : savedItemsToast ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-black" />
                        <span>Saved to Firestore!</span>
                      </>
                    ) : (
                      <>
                        <Cloud className="w-3.5 h-3.5" />
                        <span>Save Items to Firestore</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Add Items Panel (6 cols) */}
              <div className="lg:col-span-6 flex flex-col bg-[#0e1324] rounded-2xl border border-white/10 p-3 overflow-hidden">
                {/* Switch between Catalog and Custom Creator */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
                  <div className="flex rounded-xl bg-[#161c32] p-0.5 border border-white/10 text-xs">
                    <button
                      onClick={() => {
                        playHapticTap();
                        setAddItemMode('catalog');
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        addItemMode === 'catalog'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pick From Catalog ({ALL_CARDS.length})
                    </button>
                    <button
                      onClick={() => {
                        playHapticTap();
                        setAddItemMode('custom');
                      }}
                      className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        addItemMode === 'custom'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      + Create Custom Card
                    </button>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400">
                    Add to "{currentSelectedPack.name}"
                  </span>
                </div>

                {/* Sub-view A: Catalog Picker */}
                {addItemMode === 'catalog' && (
                  <div className="flex-1 flex flex-col overflow-hidden pt-2 min-h-0">
                    {/* Catalog Search & Rarity Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-2 shrink-0">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search cards by name or set..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-sans"
                        />
                      </div>

                      <select
                        value={catalogRarityFilter}
                        onChange={(e) => setCatalogRarityFilter(e.target.value)}
                        className="px-2.5 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-xs text-white font-mono focus:outline-none cursor-pointer"
                      >
                        <option value="all">All Rarities</option>
                        <option value="Grail">Grail</option>
                        <option value="Secret Rare">Secret Rare</option>
                        <option value="Ultra Rare">Ultra Rare</option>
                        <option value="Rare">Rare</option>
                        <option value="Uncommon">Uncommon</option>
                        <option value="Common">Common</option>
                      </select>
                    </div>

                    {/* Catalog Cards Grid */}
                    <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-2 min-h-0">
                      {filteredCatalogCards.length === 0 ? (
                        <div className="col-span-2 text-center py-10 text-slate-500 text-xs font-mono">
                          No catalog cards found.
                        </div>
                      ) : (
                        filteredCatalogCards.map((c) => (
                          <div
                            key={c.id}
                            className="p-2 rounded-xl bg-[#151c33] border border-white/5 hover:border-amber-400/40 flex items-center justify-between gap-2 transition-all group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-9 h-12 rounded bg-black/60 border border-white/10 shrink-0 overflow-hidden flex items-center justify-center">
                                <img
                                  src={c.imageUrl}
                                  alt={c.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <div className="flex flex-col min-w-0 text-[11px]">
                                <span className="font-bold text-white truncate" title={c.name}>
                                  {c.name}
                                </span>
                                <span className="text-[10px] text-slate-400 truncate font-mono">
                                  {c.set}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-amber-400 font-bold">
                                    ${c.value.toLocaleString()}
                                  </span>
                                  <span
                                    className={`px-1 py-0.2 rounded text-[8px] font-mono font-bold border ${getRarityBadgeColor(
                                      c.rarity
                                    )}`}
                                  >
                                    {c.rarity}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => handleAddCardFromCatalog(c)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 font-mono font-bold text-[10px] shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                              title="Add this card to pack"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Sub-view B: Custom Card Form Creator */}
                {addItemMode === 'custom' && (
                  <form onSubmit={handleCreateCustomCard} className="flex-1 flex flex-col overflow-y-auto pr-1 pt-2 gap-2.5 min-h-0 text-xs">
                    {/* Card Name */}
                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                        Card Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1st Edition Shadowless Charizard"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        required
                        className="w-full px-3 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Set Name & Card Number */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Set Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Base Set (1999)"
                          value={customSet}
                          onChange={(e) => setCustomSet(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Card # / Year
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 4/102 · 1999"
                          value={customNumber}
                          onChange={(e) => setCustomNumber(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Rarity & Grade */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Rarity Tier
                        </label>
                        <select
                          value={customRarity}
                          onChange={(e) => setCustomRarity(e.target.value as CardRarity)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white focus:outline-none cursor-pointer"
                        >
                          <option value="Common">Common</option>
                          <option value="Uncommon">Uncommon</option>
                          <option value="Rare">Rare</option>
                          <option value="Ultra Rare">Ultra Rare</option>
                          <option value="Secret Rare">Secret Rare</option>
                          <option value="Grail">Grail</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Slab Grade
                        </label>
                        <select
                          value={customGrade}
                          onChange={(e) => setCustomGrade(e.target.value as CardGrade)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white focus:outline-none cursor-pointer"
                        >
                          <option value="PSA 10">PSA 10 GEM MT</option>
                          <option value="PSA 9">PSA 9 MINT</option>
                          <option value="BGS 10 Black Label">BGS 10 Black Label</option>
                          <option value="Raw">Raw Near Mint</option>
                        </select>
                      </div>
                    </div>

                    {/* Market Value & Odds Weight */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Market Value ($ USD)
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={customValue}
                          onChange={(e) => setCustomValue(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                          Odds Weight
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0.0001"
                          value={customOdds}
                          onChange={(e) => setCustomOdds(Number(e.target.value))}
                          className="w-full px-3 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white font-mono focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </div>

                    {/* Image URL + Presets */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                          Card Image URL (HTTPS)
                        </label>
                        <select
                          onChange={(e) => {
                            if (e.target.value) setCustomImageUrl(e.target.value);
                          }}
                          className="text-[10px] bg-transparent text-amber-400 focus:outline-none cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled>Presets...</option>
                          {PRESET_CARD_IMAGES.map((p) => (
                            <option key={p.name} value={p.url}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="url"
                        placeholder="https://images.pokemontcg.io/..."
                        value={customImageUrl}
                        onChange={(e) => setCustomImageUrl(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-xl bg-[#161c32] border border-white/10 text-white placeholder-slate-500 font-mono text-[11px] focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="mt-1 w-full py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-display font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 fill-black" />
                      <span>Add Custom Card to Pack</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PACK COVERS MANAGER                                */}
        {/* ======================================================== */}
        {adminMode === 'covers' && (
          <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
            {/* Filter bar & Quick Presets */}
            <div className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search packs..."
                  value={coversSearch}
                  onChange={(e) => setCoversSearch(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[#121626] border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-44"
                />
                <div className="flex rounded-xl bg-[#121626] p-0.5 border border-white/10 text-xs">
                  <button
                    onClick={() => setCoversFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      coversFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All ({packs.length})
                  </button>
                  <button
                    onClick={() => setCoversFilter('customized')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      coversFilter === 'customized' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Custom ({Object.keys(urls).length})
                  </button>
                </div>
              </div>

              <button
                onClick={handleResetAllCovers}
                disabled={isSavingCovers}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-bold transition-colors cursor-pointer self-end sm:self-auto disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Defaults</span>
              </button>
            </div>

            {/* Pack List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5 my-1 min-h-0">
              {filteredPacksForCovers.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-mono">
                  No packs found matching your query.
                </div>
              ) : (
                filteredPacksForCovers.map((pack) => {
                  const currentUrl = urls[pack.id] || pack.packCoverUrl || '';
                  const isCustom = !!urls[pack.id];

                  return (
                    <div
                      key={pack.id}
                      className="p-3 rounded-2xl bg-[#121629] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-center gap-3.5"
                    >
                      {/* Thumbnail Preview */}
                      <div className="relative w-14 h-18 sm:w-16 sm:h-20 rounded-none overflow-hidden bg-black/50 border border-white/10 shrink-0 shadow-md">
                        <img
                          src={currentUrl}
                          alt={pack.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://www.crowncards.io/_next/image?url=%2Fpacks%2Fgold.png&w=640&q=75';
                          }}
                        />
                        {isCustom && (
                          <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-purple-600 text-[8px] font-mono font-bold text-white">
                            CUSTOM
                          </span>
                        )}
                      </div>

                      {/* Pack info and URL input */}
                      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-display font-bold text-white text-sm truncate">
                              {pack.name}
                            </span>
                            <span className="font-mono text-xs text-amber-400 font-bold shrink-0">
                              ${pack.price}
                            </span>
                          </div>
                          {isCustom && (
                            <button
                              onClick={() => handleResetCover(pack.id)}
                              className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                              title="Reset to default image"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>Reset</span>
                            </button>
                          )}
                        </div>

                        {/* URL Input */}
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="url"
                              placeholder="Paste image URL (HTTPS)..."
                              value={urls[pack.id] ?? ''}
                              onChange={(e) => handleUrlChange(pack.id, e.target.value)}
                              className="w-full px-3 py-1.5 rounded-xl bg-[#0a0d18] border border-white/10 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          {/* Quick Preset Selector for this pack */}
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                handleUrlChange(pack.id, e.target.value);
                              }
                            }}
                            className="px-2 py-1.5 rounded-xl bg-[#0a0d18] border border-white/10 text-[11px] text-slate-300 font-sans focus:outline-none cursor-pointer"
                            defaultValue=""
                          >
                            <option value="" disabled>Presets...</option>
                            {PRESET_COVERS.map((preset) => (
                              <option key={preset.name} value={preset.url}>
                                {preset.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions for Covers */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {Object.keys(urls).length} custom pack covers · Synced across all devices
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={onClose}
                  disabled={isSavingCovers}
                  className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  Close
                </button>
                <button
                  onClick={handleSaveCovers}
                  disabled={isSavingCovers}
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-display font-bold text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 disabled:opacity-75"
                >
                  {isSavingCovers ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Syncing to Cloud...</span>
                    </>
                  ) : savedCoversToast ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved to All Devices!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Save Covers to Firestore</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
