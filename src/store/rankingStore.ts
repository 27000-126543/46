import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RankingEntry } from '../types';
import { generateId, getRandomInt, deepClone } from '../utils/helpers';

interface RankingState {
  relicRankings: RankingEntry[];
  museumRankings: RankingEntry[];
  achievementRankings: RankingEntry[];
  refreshRankings: () => void;
  generateRankings: () => {
    relicRankings: RankingEntry[];
    museumRankings: RankingEntry[];
    achievementRankings: RankingEntry[];
  };
}

const playerNames = [
  '考古先锋', '宝藏猎人', '遗迹探索者', '古墓行者', '文物守护者',
  '历史迷踪', '探险王者', '神秘收藏家', '文明追溯者', '黄金考古家',
  '沙漠行者', '雨林探险家', '深海潜水员', '极地考察员', '古籍研究者'
];

const avatars = ['🧑‍🔬', '👨‍💼', '👩‍🎨', '🧙', '👨‍🌾', '👩‍🚀', '🧑‍🎓', '👨‍🏫', '👩‍⚕️', '🧑‍🍳', '👷', '🕵️', '🤴', '👸', '🦸'];

const generateMockRankings = (type: 'relic' | 'museum' | 'achievement'): RankingEntry[] => {
  const count = 20;
  const rankings: RankingEntry[] = [];

  let baseValue: number;
  switch (type) {
    case 'relic':
      baseValue = 500000;
      break;
    case 'museum':
      baseValue = 100000;
      break;
    case 'achievement':
      baseValue = 500;
      break;
  }

  for (let i = 0; i < count; i++) {
    const rank = i + 1;
    const value = Math.round(baseValue * (1 - i * 0.04) + getRandomInt(-baseValue * 0.02, baseValue * 0.02));

    rankings.push({
      rank,
      playerId: generateId('player'),
      playerName: playerNames[i % playerNames.length],
      avatar: avatars[i % avatars.length],
      value: Math.max(0, value),
      change: getRandomInt(-5, 5)
    });
  }

  return rankings;
};

export const useRankingStore = create<RankingState>()(
  persist(
    (set, get) => ({
      relicRankings: generateMockRankings('relic'),
      museumRankings: generateMockRankings('museum'),
      achievementRankings: generateMockRankings('achievement'),

      refreshRankings: () => {
        const newRankings = get().generateRankings();
        set(newRankings);
      },

      generateRankings: () => {
        const relicRankings = generateMockRankings('relic');
        const museumRankings = generateMockRankings('museum');
        const achievementRankings = generateMockRankings('achievement');

        return {
          relicRankings,
          museumRankings,
          achievementRankings
        };
      }
    }),
    {
      name: 'ranking-store'
    }
  )
);
