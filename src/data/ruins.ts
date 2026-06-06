import type { Ruin } from '../types';

export const ruins: Ruin[] = [
  {
    id: 'ruin-001',
    name: '吉萨金字塔群',
    civilization: 'egypt',
    difficulty: 3,
    description: '位于尼罗河西岸的宏伟金字塔群，包括胡夫金字塔、哈夫拉金字塔和孟卡拉金字塔。古老的法老陵墓中隐藏着无数秘密和陷阱。',
    image: '🏜️',
    minLevel: 1,
    estimatedTime: 30,
    potentialRelics: ['relic-001', 'relic-002', 'relic-003', 'relic-004'],
    eventPool: ['event-001', 'event-002', 'event-003', 'event-006'],
    rewards: {
      goldMin: 100,
      goldMax: 500,
      exp: 50
    }
  },
  {
    id: 'ruin-002',
    name: '蒂卡尔玛雅古城',
    civilization: 'maya',
    difficulty: 4,
    description: '隐藏在危地马拉热带雨林深处的玛雅最大城市遗址。高耸的神庙和神秘的象形文字记载着这个失落文明的辉煌。',
    image: '🌴',
    minLevel: 3,
    estimatedTime: 45,
    potentialRelics: ['relic-005', 'relic-006', 'relic-007', 'relic-008'],
    eventPool: ['event-002', 'event-004', 'event-005', 'event-007'],
    rewards: {
      goldMin: 200,
      goldMax: 800,
      exp: 100
    }
  },
  {
    id: 'ruin-003',
    name: '亚特兰蒂斯海底神殿',
    civilization: 'atlantis',
    difficulty: 5,
    description: '传说中沉入大西洋深处的先进文明遗迹。水晶构成的神殿在深海中依然散发着神秘的光芒，但危险也无处不在。',
    image: '🌊',
    minLevel: 5,
    estimatedTime: 60,
    potentialRelics: ['relic-009', 'relic-010', 'relic-011', 'relic-012'],
    eventPool: ['event-001', 'event-003', 'event-005', 'event-008'],
    rewards: {
      goldMin: 500,
      goldMax: 2000,
      exp: 200
    }
  },
  {
    id: 'ruin-004',
    name: '罗马斗兽场地下迷宫',
    civilization: 'rome',
    difficulty: 3,
    description: '罗马斗兽场地下隐藏着复杂的通道和房间网络。这里曾是角斗士和猛兽的准备区，可能藏有罗马帝国时期的珍贵文物。',
    image: '⚔️',
    minLevel: 2,
    estimatedTime: 35,
    potentialRelics: ['relic-013', 'relic-014', 'relic-015', 'relic-016'],
    eventPool: ['event-002', 'event-006', 'event-009', 'event-010'],
    rewards: {
      goldMin: 150,
      goldMax: 600,
      exp: 75
    }
  },
  {
    id: 'ruin-005',
    name: '秦始皇陵地宫',
    civilization: 'china',
    difficulty: 5,
    description: '中国第一位皇帝的陵墓，传说中以水银为江河、以宝石为日月星辰。无数机关陷阱守护着这位千古一帝的安息之所。',
    image: '🏯',
    minLevel: 6,
    estimatedTime: 70,
    potentialRelics: ['relic-017', 'relic-018', 'relic-019', 'relic-020'],
    eventPool: ['event-001', 'event-004', 'event-007', 'event-011'],
    rewards: {
      goldMin: 600,
      goldMax: 2500,
      exp: 250
    }
  },
  {
    id: 'ruin-006',
    name: '巴比伦空中花园遗址',
    civilization: 'mesopotamia',
    difficulty: 4,
    description: '传说中的世界七大奇迹之一，由尼布甲尼撒二世为其王妃建造。虽然地面建筑已不复存在，但地下可能仍保存着珍贵的遗迹。',
    image: '🌺',
    minLevel: 4,
    estimatedTime: 50,
    potentialRelics: ['relic-021', 'relic-022', 'relic-023', 'relic-024'],
    eventPool: ['event-003', 'event-005', 'event-008', 'event-012'],
    rewards: {
      goldMin: 300,
      goldMax: 1200,
      exp: 150
    }
  }
];
