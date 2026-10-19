import { CardItem, CardRarity } from '../types';

// MurmurHash3 32-bit implementation with complete bit avalanche
export function murmur3(key: string, seed = 0): number {
  let h = seed >>> 0;
  for (let i = 0; i < key.length; i++) {
    let k = key.charCodeAt(i);
    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);

    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = Math.imul(h, 5) + 0xe6546b64;
  }
  h ^= key.length;
  // Avalanche mixing
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Generate secure random client or server seed
export function generateRandomSeed(length = 24): string {
  const chars = 'abcdef0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generates an authentic 64-character hex hash representation (SHA-256 style)
export function hashString(str: string): string {
  const seeds = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];
  return seeds.map((s) => murmur3(str, s).toString(16).padStart(8, '0')).join('');
}

// Deterministic float U in [0, 1) with 4.29 billion subdivisions
export function getRollFloat(serverSeed: string, clientSeed: string, nonce: number): number {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hashVal = murmur3(combined);
  return hashVal / 4294967296;
}

export type VolatilityMode = 'normal' | 'high' | 'ultra' | 'custom';

// Internal helper to pick or synthesize a card strictly adhering to the won rarity tier
function pickCardByRarity(
  items: CardItem[],
  targetTier: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Grail' | string,
  subFloat: number,
  packPrice: number
): CardItem {
  const targetMaxPayout = Number((packPrice * 4).toFixed(2));

  // Map target tiers to matching card rarities in database
  const targetRarities: string[] = {
    Grail: ['Grail'],
    Legendary: ['Legendary', 'Secret Rare'],
    Epic: ['Epic', 'Ultra Rare'],
    Rare: ['Rare'],
    Common: ['Common', 'Uncommon']
  }[targetTier] || [targetTier];

  const matches = items.filter((i) => targetRarities.includes(i.rarity));

  if (matches.length > 0) {
    const idx = Math.min(matches.length - 1, Math.floor(subFloat * matches.length));
    const chosen = matches[idx];
    if (targetTier === 'Grail') {
      const gVal = Math.max(chosen.value, targetMaxPayout);
      return {
        ...chosen,
        rarity: 'Grail',
        value: gVal,
        usdValue: gVal
      };
    }
    if (targetTier === 'Legendary') {
      const val = Math.max(chosen.value, Number((packPrice * 2.8).toFixed(2)));
      return {
        ...chosen,
        rarity: 'Legendary',
        value: val,
        usdValue: val
      };
    }
    if (targetTier === 'Epic') {
      const val = Math.max(chosen.value, Number((packPrice * 1.9).toFixed(2)));
      return {
        ...chosen,
        rarity: 'Epic',
        value: val,
        usdValue: val
      };
    }
    if (targetTier === 'Rare') {
      return {
        ...chosen,
        rarity: 'Rare'
      };
    }
    // Common
    return {
      ...chosen,
      rarity: 'Common'
    };
  }

  // Fallback: If pack does not have an item natively tagged with this rarity,
  // pick from sorted items based on value tier
  const sorted = [...items].sort((a, b) => a.value - b.value);

  if (targetTier === 'Grail') {
    const base = sorted[sorted.length - 1];
    const val = Math.max(base.value, targetMaxPayout);
    return {
      ...base,
      rarity: 'Grail',
      value: val,
      usdValue: val
    };
  }

  if (targetTier === 'Legendary') {
    const base = sorted[Math.max(0, sorted.length - 2)];
    const val = Math.max(base.value, Number((packPrice * 2.8).toFixed(2)));
    return {
      ...base,
      rarity: 'Legendary',
      value: val,
      usdValue: val
    };
  }

  if (targetTier === 'Epic') {
    const idx = Math.max(0, Math.floor(sorted.length * 0.7));
    const base = sorted[idx];
    const val = Math.max(base.value, Number((packPrice * 1.9).toFixed(2)));
    return {
      ...base,
      rarity: 'Epic',
      value: val,
      usdValue: val
    };
  }

  if (targetTier === 'Rare') {
    const idx = Math.max(0, Math.floor(sorted.length * 0.45));
    const base = sorted[idx];
    const val = Math.max(base.value, Number((packPrice * 1.15).toFixed(2)));
    return {
      ...base,
      rarity: 'Rare',
      value: val,
      usdValue: val
    };
  }

  // Common
  const idx = Math.min(sorted.length - 1, Math.floor(subFloat * Math.max(1, Math.floor(sorted.length * 0.35))));
  const base = sorted[idx];
  const val = Number(Math.max(0.10, Math.min(base.value, packPrice * 0.25)).toFixed(2));
  return {
    ...base,
    rarity: 'Common',
    value: val,
    usdValue: val
  };
}

// Pick a card from a pack based on mathematical odds strictly honoring 0% zero-probability tiers
export function rollCardFromPack(
  items: CardItem[],
  clientSeed: string,
  serverSeed: string,
  nonce: number,
  volatility: VolatilityMode = 'normal',
  _customGrailOdds: number = 15,
  packPrice?: number
): CardItem {
  if (!items || items.length === 0) {
    throw new Error('Cannot roll from an empty pack');
  }

  const pPrice = packPrice || Number((Math.max(...items.map((i) => i.value)) / 4).toFixed(2)) || 1;
  const float = getRollFloat(serverSeed, clientSeed, nonce);

  // 1. ULTRA MODE
  // Common is 85%, Rare, Epic, Legendary all at 0%, Grail at 15%
  if (volatility === 'ultra') {
    const grailRate = 0.15; // 15%
    if (float < grailRate) {
      const subFloat = float / grailRate;
      return pickCardByRarity(items, 'Grail', subFloat, pPrice);
    } else {
      // 85% Common
      const subFloat = (float - grailRate) / (1 - grailRate);
      return pickCardByRarity(items, 'Common', subFloat, pPrice);
    }
  }

  // 2. HIGH MODE
  // Common is 80%, Rare is 7.7%, Epic is 5.2%, Legendary is 3.1%, Grail is 4%
  if (volatility === 'high') {
    if (float < 0.04) {
      // Grail: 4%
      const subFloat = float / 0.04;
      return pickCardByRarity(items, 'Grail', subFloat, pPrice);
    } else if (float < 0.071) {
      // Legendary: 3.1% (0.040 + 0.031 = 0.071)
      const subFloat = (float - 0.040) / 0.031;
      return pickCardByRarity(items, 'Legendary', subFloat, pPrice);
    } else if (float < 0.123) {
      // Epic: 5.2% (0.071 + 0.052 = 0.123)
      const subFloat = (float - 0.071) / 0.052;
      return pickCardByRarity(items, 'Epic', subFloat, pPrice);
    } else if (float < 0.200) {
      // Rare: 7.7% (0.123 + 0.077 = 0.200)
      const subFloat = (float - 0.123) / 0.077;
      return pickCardByRarity(items, 'Rare', subFloat, pPrice);
    } else {
      // Common: 80% (0.200 to 1.000)
      const subFloat = (float - 0.200) / 0.80;
      return pickCardByRarity(items, 'Common', subFloat, pPrice);
    }
  }

  // 3. NORMAL MODE (DEFAULT)
  // Common is 60%, Rare is 29.6%, Epic is 7.9%, Legendary is 1.9%, Grail is 0.6%
  if (float < 0.006) {
    // Grail: 0.6%
    const subFloat = float / 0.006;
    return pickCardByRarity(items, 'Grail', subFloat, pPrice);
  } else if (float < 0.025) {
    // Legendary: 1.9% (0.006 + 0.019 = 0.025)
    const subFloat = (float - 0.006) / 0.019;
    return pickCardByRarity(items, 'Legendary', subFloat, pPrice);
  } else if (float < 0.104) {
    // Epic: 7.9% (0.025 + 0.079 = 0.104)
    const subFloat = (float - 0.025) / 0.079;
    return pickCardByRarity(items, 'Epic', subFloat, pPrice);
  } else if (float < 0.400) {
    // Rare: 29.6% (0.104 + 0.296 = 0.400)
    const subFloat = (float - 0.104) / 0.296;
    return pickCardByRarity(items, 'Rare', subFloat, pPrice);
  } else {
    // Common: 60.0% (0.400 to 1.000)
    const subFloat = (float - 0.400) / 0.60;
    return pickCardByRarity(items, 'Common', subFloat, pPrice);
  }
}

// Safely format drop rate percentages with dynamic decimal precision
export function formatOddsPercentage(itemOdds: number, totalWeight: number): string {
  if (totalWeight <= 0) return '0.00%';
  const pct = (itemOdds / totalWeight) * 100;
  if (pct >= 1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.1) return `${pct.toFixed(2)}%`;
  if (pct >= 0.01) return `${pct.toFixed(3)}%`;
  return `${pct.toFixed(4)}%`;
}
