import type {
  TeamMember,
  Relic,
  MuseumHall,
  MarketListing,
  Rarity,
  Civilization,
  Material,
  RiskLevel
} from '../types';
import { rarityMultiplier, gameConfig } from '../data/config';

interface RelicTemplate {
  id: string;
  name: string;
  civilization: Civilization;
  baseValue: number;
  description: string;
  image: string;
}

interface SellerHistory {
  totalSales: number;
  rejectedCount: number;
  smugglingAttempts: number;
}

const rarityDiscoveryWeight: Record<Rarity, number> = {
  common: 0.70,
  rare: 0.20,
  epic: 0.08,
  legendary: 0.02
};

const baseValueByCivilization: Record<Civilization, number> = {
  egypt: 1000,
  maya: 1200,
  atlantis: 2000,
  rome: 900,
  china: 1100,
  mesopotamia: 1300
};

export function calculateExplorationSpeed(
  teamMembers: TeamMember[],
  ruinDifficulty: number,
  estimatedTime: number = 300
): number {
  const baseSpeed = gameConfig.baseExplorationProgress / estimatedTime;

  let speedBonus = 0;
  teamMembers.forEach(member => {
    if (member.profession === 'explorer') {
      speedBonus += member.skillLevel * 0.02;
    }
    speedBonus += member.skills.explorationSpeed / 1000;
  });

  const avgLuck = teamMembers.length > 0
    ? teamMembers.reduce((sum, m) => sum + m.luck, 0) / teamMembers.length
    : 5;
  const luckModifier = 0.8 + (avgLuck / 200);

  const difficultyPenalty = 1 - (ruinDifficulty - 1) * 0.1;

  return baseSpeed * (1 + speedBonus) * luckModifier * Math.max(0.3, difficultyPenalty);
}

export function calculateRelicDiscoveryRate(
  teamMembers: TeamMember[],
  progressPercent: number,
  ruinDifficulty: number = 1
): { rate: number; rarityWeights: Record<Rarity, number> } {
  const baseDiscoveryRate = 0.02 - (ruinDifficulty - 1) * 0.003;

  let linguistBonus = 0;
  let historianBonus = 0;
  teamMembers.forEach(member => {
    if (member.profession === 'linguist') {
      linguistBonus = Math.max(linguistBonus, member.skills.relicDiscovery / 100);
    }
    if (member.profession === 'historian') {
      historianBonus = Math.max(historianBonus, member.skills.relicDiscovery / 100);
    }
  });

  const progressBonus = progressPercent > 50 ? 1 + (progressPercent - 50) / 200 : 1;

  const rate = baseDiscoveryRate * (1 + linguistBonus) * (1 + historianBonus) * progressBonus;

  return {
    rate: Math.min(0.15, rate),
    rarityWeights: { ...rarityDiscoveryWeight }
  };
}

export function estimateRelicPrice(
  relicTemplate: RelicTemplate | Relic,
  completeness: number,
  rarity: Rarity,
  historicalValue: number
): number {
  const baseValue = 'baseValue' in relicTemplate
    ? relicTemplate.baseValue
    : baseValueByCivilization[relicTemplate.civilization];

  const completenessCoefficient = completeness / 100;
  const rarityCoefficient = rarityMultiplier[rarity];
  const historicalValueCoefficient = 0.5 + (historicalValue / 200);

  return Math.round(
    baseValue * completenessCoefficient * rarityCoefficient * historicalValueCoefficient * gameConfig.relicValueMultiplier
  );
}

export function calculateRepairSuccessRate(
  currentCompleteness: number,
  materials: Material[],
  teamMembers: TeamMember[]
): { successRate: number; expectedCompletenessGain: number } {
  const baseSuccessRate = (currentCompleteness / 100) * 0.6;

  const materialBonus = materials.reduce(
    (sum, mat) => sum + (mat.quality * mat.amount) * 0.02,
    0
  );

  let engineerBonus = 0;
  let archaeologistBonus = 0;
  teamMembers.forEach(member => {
    if (member.profession === 'engineer') {
      engineerBonus = Math.max(engineerBonus, member.skills.repairBonus / 100);
    }
    if (member.profession === 'archaeologist') {
      archaeologistBonus = Math.max(archaeologistBonus, member.skills.repairBonus / 100);
    }
  });
  const teamBonus = Math.max(engineerBonus, archaeologistBonus);

  const successRate = Math.min(0.95, baseSuccessRate + materialBonus + teamBonus);

  const materialQualityAvg = materials.length > 0
    ? materials.reduce((sum, m) => sum + m.quality, 0) / materials.length
    : 1;
  const expectedCompletenessGain = Math.round(
    (5 + materialQualityAvg * 5) * (1 + teamBonus)
  );

  return {
    successRate,
    expectedCompletenessGain
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
    const relicAttractiveness = (
      rarityMultiplier[relic.rarity] * relic.completeness * relic.historicalValue
    ) / 100;

    let positionBonus = 1.0;
    if (index === 0) positionBonus = 1.3;
    else if (index <= 2) positionBonus = 1.1;

    totalAttractiveness += relicAttractiveness * positionBonus;

    civilizationCounts[relic.civilization] = (civilizationCounts[relic.civilization] || 0) + 1;
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
    levelBonus
  };
}

export function calculateTicketIncome(
  attractiveness: number,
  basePrice: number,
  visitorMultiplier: number = 1
): { income: number; estimatedVisitors: number } {
  const baseVisitors = Math.floor(attractiveness * 0.5 + 50);
  const estimatedVisitors = Math.floor(baseVisitors * visitorMultiplier);
  const income = Math.floor(estimatedVisitors * basePrice * gameConfig.baseMuseumIncome / 10);

  return {
    income,
    estimatedVisitors
  };
}

export function suggestPriceRange(
  recentSales: MarketListing[],
  relic: Relic
): { min: number; max: number; averagePrice: number } {
  const similarSales = recentSales.filter(sale => {
    if (!sale.relic) return false;
    const sameCivilization = sale.relic.civilization === relic.civilization;
    const sameRarity = sale.relic.rarity === relic.rarity;
    const similarCompleteness = Math.abs(sale.relic.completeness - relic.completeness) <= 10;
    return sameCivilization && sameRarity && similarCompleteness && sale.status === 'sold';
  });

  let averagePrice: number;
  if (similarSales.length > 0) {
    averagePrice = similarSales.reduce((sum, s) => sum + s.price, 0) / similarSales.length;
  } else {
    averagePrice = estimateRelicPrice(relic, relic.completeness, relic.rarity, relic.historicalValue);
  }

  return {
    min: Math.round(averagePrice * 0.85),
    max: Math.round(averagePrice * 1.15),
    averagePrice: Math.round(averagePrice)
  };
}

export function assessSmugglingRisk(
  price: number,
  suggestedRange: { min: number; max: number; averagePrice: number },
  sellerHistory: SellerHistory,
  rarity: Rarity
): { level: RiskLevel; score: number; factors: string[] } {
  const factors: string[] = [];
  let score = 0;

  const deviation = price < suggestedRange.averagePrice
    ? (suggestedRange.averagePrice - price) / suggestedRange.averagePrice
    : (price - suggestedRange.averagePrice) / suggestedRange.averagePrice;

  if (deviation > 0.5) {
    score += 40;
    factors.push('价格严重偏离市场正常范围');
  } else if (deviation > 0.3) {
    score += 20;
    factors.push('价格明显偏离市场正常范围');
  } else if (deviation > 0.15) {
    score += 10;
    factors.push('价格略有偏离市场范围');
  }

  if (price < suggestedRange.min * 0.7) {
    score += 30;
    factors.push('售价远低于建议最低价');
  }

  if (sellerHistory.totalSales > 0) {
    const rejectionRate = sellerHistory.rejectedCount / sellerHistory.totalSales;
    if (rejectionRate > 0.3) {
      score += 30;
      factors.push('卖家历史审核拒绝率过高');
    } else if (rejectionRate > 0.1) {
      score += 15;
      factors.push('卖家存在部分审核拒绝记录');
    }

    if (sellerHistory.smugglingAttempts > 0) {
      score += sellerHistory.smugglingAttempts * 20;
      factors.push(`卖家有${sellerHistory.smugglingAttempts}次走私未遂记录`);
    }
  }

  const rarityRisk: Record<Rarity, number> = {
    common: 0,
    rare: 5,
    epic: 15,
    legendary: 30
  };
  score += rarityRisk[rarity];
  if (rarity === 'legendary' || rarity === 'epic') {
    factors.push('高稀有度文物需要额外审核');
  }

  let level: RiskLevel;
  if (score >= 60) {
    level = 'high';
  } else if (score >= 30) {
    level = 'medium';
  } else {
    level = 'low';
  }

  return {
    level,
    score: Math.min(100, score),
    factors
  };
}
