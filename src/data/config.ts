import type { Material, Rarity, Profession, Civilization } from '../types';

export const rarityColors: Record<Rarity, { bg: string; text: string; border: string; label: string }> = {
  common: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    label: '普通'
  },
  rare: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-400',
    label: '稀有'
  },
  epic: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    border: 'border-purple-400',
    label: '史诗'
  },
  legendary: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-400',
    label: '传说'
  }
};

export const professionNames: Record<Profession, string> = {
  explorer: '探险家',
  linguist: '语言学家',
  engineer: '工程师',
  archaeologist: '考古学家',
  historian: '历史学家'
};

export const professionIcons: Record<Profession, string> = {
  explorer: '🧭',
  linguist: '📜',
  engineer: '🔧',
  archaeologist: '🏺',
  historian: '📚'
};

export const professionDescriptions: Record<Profession, string> = {
  explorer: '擅长探索速度和陷阱规避，在野外和复杂地形中表现卓越',
  linguist: '擅长破译古代文字和解读铭文，能从神秘符号中发现隐藏信息',
  engineer: '擅长破解机关陷阱和修复文物，是团队的技术保障',
  archaeologist: '擅长文物发现和发掘，能凭直觉找到埋藏的宝藏',
  historian: '擅长历史研究和文物鉴定，对各种文明的历史了如指掌'
};

export const civilizationNames: Record<Civilization, string> = {
  egypt: '古埃及',
  maya: '玛雅',
  atlantis: '亚特兰蒂斯',
  rome: '古罗马',
  china: '古中国',
  mesopotamia: '美索不达米亚'
};

export const civilizationIcons: Record<Civilization, string> = {
  egypt: '🏜️',
  maya: '🌴',
  atlantis: '🌊',
  rome: '⚔️',
  china: '🏯',
  mesopotamia: '🌺'
};

export const civilizationDescriptions: Record<Civilization, string> = {
  egypt: '尼罗河畔的金字塔文明，以木乃伊、象形文字和宏伟建筑闻名于世',
  maya: '热带雨林中的神秘文明，精通天文历法和象形文字',
  atlantis: '传说中沉入海底的高度文明，掌握着先进的水晶科技',
  rome: '横跨三大洲的帝国，以法律、军事和工程建筑著称',
  china: '五千年未曾中断的东方文明，瓷器、丝绸和四大发明享誉世界',
  mesopotamia: '两河流域的人类最早文明，创造了楔形文字和第一部成文法典'
};

export const eventTypeNames: Record<string, string> = {
  trap: '陷阱',
  collapse: '塌方',
  rival: '敌对探险队',
  treasure: '宝藏',
  discovery: '发现'
};

export const eventTypeIcons: Record<string, string> = {
  trap: '⚠️',
  collapse: '🪨',
  rival: '⚔️',
  treasure: '💰',
  discovery: '🔍'
};

export const rarityWeight: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3
};

export const rarityMultiplier: Record<Rarity, number> = {
  common: 1,
  rare: 3,
  epic: 10,
  legendary: 50
};

export const baseMaterials: Material[] = [
  {
    id: 'material-001',
    name: '文物碎片',
    type: 'fragment',
    quality: 1,
    amount: 10,
    icon: '🧩'
  },
  {
    id: 'material-002',
    name: '青铜碎片',
    type: 'fragment',
    quality: 2,
    amount: 5,
    icon: '🔩'
  },
  {
    id: 'material-003',
    name: '黄金残片',
    type: 'fragment',
    quality: 3,
    amount: 2,
    icon: '✨'
  },
  {
    id: 'material-004',
    name: '文物胶合剂',
    type: 'adhesive',
    quality: 1,
    amount: 8,
    icon: '🧴'
  },
  {
    id: 'material-005',
    name: '专业粘合剂',
    type: 'adhesive',
    quality: 2,
    amount: 4,
    icon: '🧪'
  },
  {
    id: 'material-006',
    name: '纳米修复剂',
    type: 'adhesive',
    quality: 3,
    amount: 1,
    icon: '💫'
  },
  {
    id: 'material-007',
    name: '基础抛光剂',
    type: 'polish',
    quality: 1,
    amount: 6,
    icon: '🧽'
  },
  {
    id: 'material-008',
    name: '专业抛光膏',
    type: 'polish',
    quality: 2,
    amount: 3,
    icon: '🪞'
  },
  {
    id: 'material-009',
    name: '钻石抛光粉',
    type: 'polish',
    quality: 3,
    amount: 1,
    icon: '💎'
  },
  {
    id: 'material-010',
    name: '考古刷',
    type: 'tool',
    quality: 1,
    amount: 5,
    icon: '🖌️'
  },
  {
    id: 'material-011',
    name: '精密工具套装',
    type: 'tool',
    quality: 2,
    amount: 2,
    icon: '🛠️'
  },
  {
    id: 'material-012',
    name: '激光修复仪',
    type: 'tool',
    quality: 3,
    amount: 1,
    icon: '🔬'
  }
];

export const gameConfig = {
  baseExplorationProgress: 100,
  maxTeamSize: 5,
  minTeamSize: 1,
  maxLevel: 50,
  expPerLevel: 100,
  levelExpMultiplier: 1.5,
  baseMuseumIncome: 10,
  baseMarketFee: 0.05,
  listingDuration: 86400000,
  maxActiveExplorations: 3,
  repairBaseCost: 50,
  repairQualityMultiplier: 1.5,
  explorationExpMultiplier: 1,
  museumAttractivenessBonus: 0.1,
  relicValueMultiplier: 1.2,
  damageBaseCost: 100,
  eventPoolSize: 4
};

export const skillNames = {
  explorationSpeed: '探索速度',
  relicDiscovery: '文物发现',
  trapHandling: '陷阱处理',
  repairBonus: '修复加成'
};

export const listingStatusNames: Record<string, string> = {
  pending_approval: '待审核',
  listed: '出售中',
  sold: '已售出',
  rejected: '已拒绝',
  expired: '已过期'
};

export const riskLevelNames: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险'
};

export const decisionNames: Record<string, string> = {
  approved: '通过',
  rejected: '拒绝',
  pending: '待审核'
};

export const explorationStatusNames: Record<string, string> = {
  exploring: '探索中',
  completed: '已完成',
  failed: '已失败',
  paused: '已暂停'
};
