import { v4 as uuidv4 } from 'uuid';
import type {
  TeamMember,
  Relic,
  MarketListing,
  Rarity,
  Civilization,
  Material,
} from '../types';

const rarityMultiplier: Record<Rarity, number> = {
  common: 1,
  rare: 3,
  epic: 10,
  legendary: 50,
};

const baseValueByCivilization: Record<Civilization, number> = {
  egypt: 1000,
  maya: 1200,
  atlantis: 2000,
  rome: 900,
  china: 1100,
  mesopotamia: 1300,
};

const gameConfig = {
  relicValueMultiplier: 1.2,
  baseExplorationProgress: 100,
};

export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36);
  const random = uuidv4().substring(0, 8);
  return `${prefix}-${timestamp}-${random}`;
}

export function formatGold(amount: number): string {
  if (amount >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}亿`;
  }
  if (amount >= 10000) {
    return `${(amount / 10000).toFixed(1)}万`;
  }
  return amount.toLocaleString();
}

export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return `${(num / 1000000000).toFixed(2)}B`;
  }
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(2)}K`;
  }
  return num.toString();
}

export function getRandomInt(min: number, max: number): number {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled;
}

export function getRandomItem<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot get random item from empty array');
  }
  return array[Math.floor(Math.random() * array.length)];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

interface RelicTemplate {
  id?: string;
  name: string;
  civilization: Civilization;
  baseValue?: number;
  description: string;
  image: string;
}

export function estimateRelicPrice(
  relicTemplate: RelicTemplate | Relic,
  completeness: number,
  rarity: Rarity,
  historicalValue: number
): number {
  const baseValue =
    'baseValue' in relicTemplate && relicTemplate.baseValue !== undefined
      ? relicTemplate.baseValue
      : baseValueByCivilization[relicTemplate.civilization];

  const completenessCoefficient = completeness / 100;
  const rarityCoefficient = rarityMultiplier[rarity];
  const historicalValueCoefficient = 0.5 + historicalValue / 200;

  return Math.round(
    baseValue *
      completenessCoefficient *
      rarityCoefficient *
      historicalValueCoefficient *
      gameConfig.relicValueMultiplier
  );
}

export function calculateRepairSuccess(
  currentCompleteness: number,
  materials: Material[],
  teamMembers: TeamMember[]
): { successRate: number; expectedCompletenessGain: number } {
  const baseSuccessRate = (currentCompleteness / 100) * 0.6;

  const materialBonus = materials.reduce(
    (sum, mat) => sum + mat.quality * mat.amount * 0.02,
    0
  );

  let engineerBonus = 0;
  let archaeologistBonus = 0;
  teamMembers.forEach((member) => {
    if (member.profession === 'engineer') {
      engineerBonus = Math.max(engineerBonus, member.skills.repairBonus / 100);
    }
    if (member.profession === 'archaeologist') {
      archaeologistBonus = Math.max(
        archaeologistBonus,
        member.skills.repairBonus / 100
      );
    }
  });
  const teamBonus = Math.max(engineerBonus, archaeologistBonus);

  const successRate = Math.min(0.95, baseSuccessRate + materialBonus + teamBonus);

  const materialQualityAvg =
    materials.length > 0
      ? materials.reduce((sum, m) => sum + m.quality, 0) / materials.length
      : 1;
  const expectedCompletenessGain = Math.round(
    (5 + materialQualityAvg * 5) * (1 + teamBonus)
  );

  return {
    successRate,
    expectedCompletenessGain,
  };
}

export function calculateMuseumAttractiveness(
  displayedRelics: Relic[],
  hallLevel: number,
  theme: Civilization | 'mixed'
): { attractiveness: number; themeBonus: number; levelBonus: number } {
  let totalAttractiveness = 0;
  const civilizationCounts: Partial<Record<Civilization, number>> = {};

  displayedRelics.forEach((relic, index) => {
    const relicAttractiveness =
      (rarityMultiplier[relic.rarity] *
        relic.completeness *
        relic.historicalValue) /
      100;

    let positionBonus = 1.0;
    if (index === 0) positionBonus = 1.3;
    else if (index <= 2) positionBonus = 1.1;

    totalAttractiveness += relicAttractiveness * positionBonus;

    civilizationCounts[relic.civilization] =
      (civilizationCounts[relic.civilization] || 0) + 1;
  });

  let themeBonus = 1;
  if (theme !== 'mixed') {
    const matchingCount = civilizationCounts[theme] || 0;
    themeBonus = 1 + matchingCount * 0.15;
  } else {
    const uniqueCivilizations = Object.keys(civilizationCounts).length;
    themeBonus = 1 + uniqueCivilizations * 0.05;
  }

  const levelBonus = 1 + (hallLevel - 1) * 0.1;

  return {
    attractiveness: totalAttractiveness * themeBonus * levelBonus,
    themeBonus,
    levelBonus,
  };
}

export function suggestPriceRange(
  recentSales: MarketListing[],
  relic: Relic
): { min: number; max: number; averagePrice: number } {
  const similarSales = recentSales.filter((sale) => {
    if (!sale.relic) return false;
    const sameCivilization = sale.relic.civilization === relic.civilization;
    const sameRarity = sale.relic.rarity === relic.rarity;
    const similarCompleteness =
      Math.abs(sale.relic.completeness - relic.completeness) <= 10;
    return (
      sameCivilization && sameRarity && similarCompleteness && sale.status === 'sold'
    );
  });

  let averagePrice: number;
  if (similarSales.length > 0) {
    averagePrice =
      similarSales.reduce((sum, s) => sum + s.price, 0) / similarSales.length;
  } else {
    averagePrice = estimateRelicPrice(
      relic,
      relic.completeness,
      relic.rarity,
      relic.historicalValue
    );
  }

  return {
    min: Math.round(averagePrice * 0.85),
    max: Math.round(averagePrice * 1.15),
    averagePrice: Math.round(averagePrice),
  };
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function pickRandom<T>(array: T[], count: number): T[] {
  const shuffled = shuffleArray(array);
  return shuffled.slice(0, Math.min(count, array.length));
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  }
  if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`;
  }

  return formatDate(timestamp);
}

export function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

interface WeightedItem<T> {
  item: T;
  weight: number;
}

export function rarityWeightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) {
    throw new Error('Items and weights arrays must have the same length');
  }
  if (items.length === 0) {
    throw new Error('Cannot select from empty items array');
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) {
    return items[0];
  }

  let random = Math.random() * totalWeight;
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
}

export function rarityWeightedRandomFromItems<T extends { weight?: number }>(
  items: T[],
  getWeight?: (item: T) => number
): T {
  if (items.length === 0) {
    throw new Error('Cannot select from empty items array');
  }

  const weights = items.map((item) =>
    getWeight ? getWeight(item) : item.weight || 1
  );

  return rarityWeightedRandom(items, weights);
}
