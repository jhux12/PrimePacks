export type CardRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Ultra Rare' | 'Secret Rare' | 'Grail';
export type CardGrade = 'Raw' | 'PSA 9' | 'PSA 10' | 'BGS 10 Black Label';
export type CardCategory = 'pokemon' | 'sports' | 'vintage';

export interface CardItem {
  id: string;
  name: string;
  set: string;
  number: string;
  year: string;
  rarity: CardRarity;
  grade: CardGrade;
  value: number; // in CC (Crown Coins)
  usdValue: number; // estimated market USD
  imageUrl: string;
  category: CardCategory;
  odds: number; // relative weight
  foilType?: 'holo' | 'textured' | 'vintage' | 'gold';
}

export interface Pack {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // in CC
  category: CardCategory | 'all';
  tier: 'budget' | 'standard' | 'high_roller' | 'whale';
  colorAccent: string;
  badgeText?: string;
  packCoverUrl?: string;
  items: CardItem[];
}

export interface InventoryCard {
  instanceId: string;
  card: CardItem;
  pulledAt: number;
  packName: string;
  isShipped?: boolean;
  trackingNumber?: string;
}

export interface RecentPull {
  id: string;
  username: string;
  avatar: string;
  card: CardItem;
  packName: string;
  timestamp: number;
}

export interface BattlePlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  pulls: CardItem[];
  totalValue: number;
}

export interface BattleConfig {
  id: string;
  name: string;
  packs: Pack[];
  entryFee: number;
  mode: 'standard' | 'crazy'; // standard = highest wins, crazy = lowest wins
}

export interface UserStats {
  balance: number;
  totalPacksOpened: number;
  bestPullValue: number;
  battlesWon: number;
  battlesPlayed: number;
  totalValuePulled: number;
  dailyClaimedAt: number | null;
}
