import type {
  Relic,
  ExplorationEvent,
  TeamMember,
  Announcement,
  Rarity,
  Civilization,
  Profession,
  SkillSet,
  EventChoice
} from '../types';
import {
  rarityWeight,
  rarityMultiplier,
  professionNames,
  professionIcons,
  civilizationIcons
} from '../data/config';
import { generateId, getRandomInt, getRandomItem, rarityWeightedRandom, randomRange } from './helpers';

interface RelicTemplate {
  id: string;
  name: string;
  civilization: Civilization;
  baseValue: number;
  description: string;
  image: string;
}

const firstNames = [
  '林', '陈', '王', '苏', '周', '李', '张', '刘', '赵', '黄',
  '马', '方', '阿', '沈', '韩', '杨', '朱', '吴', '郑', '孙'
];

const lastNames = [
  '风', '静怡', '铁柱', '雅', '博文', '明', '雪', '师傅', '晓', '老师',
  '力', '红', '刚', '强', '丽', '华', '军', '芳', '娜', '勇'
];

const memberDescriptions: Record<Profession, string[]> = {
  explorer: [
    '身经百战的探险家，曾穿越无数危险地带。',
    '对各种地形都了如指掌，总能找到最快的路线。',
    '野外生存专家，在最恶劣的环境中也能活下来。',
    '嗅觉灵敏，能闻出地下水和矿藏的气味。',
    '总是冲在最前面，偶尔能歪打正着发现宝藏。'
  ],
  linguist: [
    '精通多种古文字的专家，能破译神秘符号。',
    '能从模糊的刻文中读出被遗忘的历史。',
    '记忆超群，过目不忘，对文字系统有深入研究。',
    '年轻有为的语言学博士，专注于已灭绝文字。',
    '能读懂简单的铭文，但复杂的还需要深入研究。'
  ],
  engineer: [
    '天才机械工程师，擅长破解古代机关。',
    '任何陷阱在他眼中不过是精巧的谜题。',
    '动手能力极强，什么东西都能拆了再装回去。',
    '退休的军工工程师，实践经验丰富。',
    '理论知识丰富但实践不多，对古代机械充满好奇。'
  ],
  archaeologist: [
    '天赋异禀的考古学天才，能凭直觉判断文物位置。',
    '田野考古经验丰富，擅长识别地层和文物断代。',
    '手上的老茧是多年发掘的勋章。',
    '发掘时小心翼翼从不弄坏东西。',
    '经手发掘的文物数量超过许多老前辈一生的成就。'
  ],
  historian: [
    '博学的历史学教授，对六大文明如数家珍。',
    '能从蛛丝马迹中还原历史真相。',
    '发表过多篇有影响力的论文，理论功底扎实。',
    '历史爱好者，读过很多书但实战经验不多。',
    '总能讲出有趣的历史小故事，让团队保持士气。'
  ]
};

const relicNamesByCivilization: Record<Civilization, string[]> = {
  egypt: [
    '圣甲虫护身符', '法老黄金面具', '亡灵书莎草纸', '图坦卡蒙匕首',
    '方尖碑残片', '木乃伊棺椁', '荷鲁斯之眼吊坠', '阿努比斯雕像'
  ],
  maya: [
    '玛雅太阳历石碑', '翡翠面具', '可可豆陶碗', '水晶头颅',
    '祭祀金字塔模型', '羽蛇神浮雕', '黑曜石匕首', '天文观测盘'
  ],
  atlantis: [
    '能量水晶', '海神三叉戟', '海底陶罐', '星图盘',
    '合金护甲残片', '能源核心碎片', '声波发射器', '量子晶体'
  ],
  rome: [
    '军团鹰旗', '角斗士头盔', '奥古斯都金币', '凯撒佩剑',
    '元老院权杖', '斗兽场浮雕', '罗马大道里程碑', '万神殿柱头'
  ],
  china: [
    '兵马俑将军俑', '青铜剑', '玉璧', '传国玉玺',
    '司南', '素纱襌衣', '青花瓷瓶', '金缕玉衣'
  ],
  mesopotamia: [
    '楔形文字泥板', '汉谟拉比法典石碑', '黄金公牛雕像', '吉尔伽美什石板',
    '空中花园瓷砖', '星象图', '祭祀铜像', '贸易契约卷轴'
  ]
};

const relicImagesByCivilization: Record<Civilization, string[]> = {
  egypt: ['🪲', '👑', '📜', '🗡️', '🏛️', '⚰️', '👁️', '🐺'],
  maya: ['📅', '🎭', '🥣', '💀', '🏔️', '🐍', '🔪', '🔭'],
  atlantis: ['💎', '🔱', '🏺', '🧭', '🛡️', '⚡', '📡', '🔮'],
  rome: ['🦅', '⛑️', '🪙', '⚔️', '🏛️', '🏟️', '🛤️', '🏛️'],
  china: ['🗿', '🗡️', '⭕', '📦', '🧭', '👘', '🏺', '👔'],
  mesopotamia: ['📋', '⚖️', '🐂', '📖', '🌺', '⭐', '🗿', '📜']
};

const relicDescriptionsByCivilization: Record<Civilization, string[]> = {
  egypt: [
    '古埃及常见的护身符，象征重生与永恒。',
    '从法老墓中出土的珍贵文物，工艺精湛。',
    '保存尚好的文物，上面记录着重要的历史信息。',
    '传说中的神器，历经数千年仍然保存完好。',
    '工匠精心制作的艺术品，具有很高的历史价值。'
  ],
  maya: [
    '刻有玛雅历法的珍贵文物，记载着重要的天文观测。',
    '由数百块宝石拼接而成的祭祀用品。',
    '绘制着精美花纹的陶器，内壁还残留着古代物品的痕迹。',
    '由纯净材质雕刻的完美艺术品，传说拥有神秘力量。',
    '玛雅文明的标志性文物，具有极高的研究价值。'
  ],
  atlantis: [
    '一块切割完美的水晶，在黑暗中会发出微弱的荧光。',
    '传说中海神使用过的武器残件。',
    '在海底泥沙中保存完好的容器，材质特殊。',
    '青铜制工具，上面标注着星辰的位置。',
    '亚特兰蒂斯文明的高科技遗物，蕴含着未知的能量。'
  ],
  rome: [
    '罗马军团的荣誉象征，虽然历经沧桑但威严犹在。',
    '角斗士使用过的装备，上面有战斗留下的痕迹。',
    '铸造精美的金币，保存完好，具有极高的收藏价值。',
    '据说属于某位著名历史人物的物品。',
    '罗马帝国时期的建筑装饰构件，工艺精湛。'
  ],
  china: [
    '秦始皇陵中的高级军吏俑，神态威严。',
    '战国时期的武器，铸造工艺精湛，历经两千余年依然锋利。',
    '质地温润的玉器，雕刻着精美的纹饰。',
    '传说中用和氏璧雕琢而成的国之重宝。',
    '中华文明的瑰宝，具有不可估量的历史价值。'
  ],
  mesopotamia: [
    '刻有楔形文字的泥板，记录着古代的重要信息。',
    '世界上最早的成文法典残片。',
    '小型黄金雕像，是美索不达米亚地区常见的祭祀用品。',
    '人类最古老史诗的原始记录。',
    '两河流域文明的见证，具有极高的历史价值。'
  ]
};

const announcementMessages: Record<Announcement['type'], string[]> = {
  relic_found: [
    '{player} 在探索中发现了稀世珍宝 {relic}！',
    '惊天发现！{player} 出土了传说中的 {relic}！',
    '考古界震动！{player} 发掘出珍贵文物 {relic}！'
  ],
  trade: [
    '{player} 以 {price} 金币的天价售出了 {relic}！',
    '市场火爆！{player} 成功交易了文物 {relic}！',
    '{player} 在黑市上悄悄出手了 {relic}...'
  ],
  exhibition: [
    '{playerA} 与 {playerB} 在展览赛中展开激烈对决！',
    '本周展览赛冠军诞生，{player} 荣登榜首！',
    '{player} 的博物馆获得了 "最佳展览" 称号！'
  ],
  system: [
    '【系统公告】全新秘境即将开启，敬请期待！',
    '【系统公告】本周双倍经验活动正式开始！',
    '【系统公告】交易市场新增一批珍稀文物！',
    '【系统公告】考古队招募系统全面升级！'
  ]
};

const professions: Profession[] = ['explorer', 'linguist', 'engineer', 'archaeologist', 'historian'];
const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const civilizations: Civilization[] = ['egypt', 'maya', 'atlantis', 'rome', 'china', 'mesopotamia'];

export function generateRelic(
  templatePool: RelicTemplate[],
  civilization: Civilization,
  rarity?: Rarity
): Relic {
  let targetRarity: Rarity;
  if (rarity) {
    targetRarity = rarity;
  } else {
    targetRarity = rarityWeightedRandom(rarities, [
      rarityWeight.common,
      rarityWeight.rare,
      rarityWeight.epic,
      rarityWeight.legendary
    ]);
  }

  let template: RelicTemplate;
  const matchingTemplates = templatePool.filter(t => t.civilization === civilization);

  if (matchingTemplates.length > 0) {
    template = getRandomItem(matchingTemplates);
  } else {
    const names = relicNamesByCivilization[civilization];
    const images = relicImagesByCivilization[civilization];
    const descriptions = relicDescriptionsByCivilization[civilization];

    template = {
      id: generateId('relic-template'),
      name: getRandomItem(names),
      civilization,
      baseValue: 500 + getRandomInt(0, 3000),
      description: getRandomItem(descriptions),
      image: getRandomItem(images)
    };
  }

  const completenessRanges: Record<Rarity, [number, number]> = {
    common: [40, 85],
    rare: [50, 90],
    epic: [55, 95],
    legendary: [60, 100]
  };

  const [minCompleteness, maxCompleteness] = completenessRanges[targetRarity];
  const completeness = getRandomInt(minCompleteness, maxCompleteness);

  const historicalValueBase: Record<Rarity, number> = {
    common: 500,
    rare: 3000,
    epic: 15000,
    legendary: 100000
  };

  const historicalValue = historicalValueBase[targetRarity] +
    getRandomInt(0, Math.floor(historicalValueBase[targetRarity] * 0.5));

  const estimatedPrice = Math.round(
    template.baseValue *
    (completeness / 100) *
    rarityMultiplier[targetRarity] *
    (0.5 + historicalValue / 200) *
    1.2
  );

  const fragments = targetRarity === 'common' ? 1 :
    targetRarity === 'rare' ? getRandomInt(1, 3) :
    targetRarity === 'epic' ? getRandomInt(2, 5) :
    getRandomInt(3, 7);

  return {
    id: generateId('relic'),
    name: template.name,
    civilization: template.civilization,
    completeness,
    rarity: targetRarity,
    historicalValue,
    estimatedPrice,
    description: template.description,
    image: template.image || civilizationIcons[civilization],
    fragments,
    discoveredAt: Date.now(),
    repairHistory: [],
    inMuseum: false,
    onMarket: false
  };
}

export function generateRandomEvent(eventPool: ExplorationEvent[]): ExplorationEvent {
  if (eventPool.length === 0) {
    return createDefaultEvent();
  }

  const event = getRandomItem(eventPool);
  return {
    ...event,
    id: generateId('event'),
    resolved: false,
    result: undefined
  };
}

function createDefaultEvent(): ExplorationEvent {
  const eventTypes = ['trap', 'collapse', 'rival', 'treasure', 'discovery'] as const;
  const type = getRandomItem([...eventTypes]);

  const titles: Record<typeof type, string[]> = {
    trap: ['神秘机关', '暗箭陷阱', '落石陷阱', '毒气密室'],
    collapse: ['通道塌方', '地下水脉', '地震摇晃', '结构松动'],
    rival: ['敌对探险队', '古墓守卫', '文物走私犯', '神秘组织'],
    treasure: ['隐藏宝箱', '祭坛贡品', '暗格藏金', '密室宝藏'],
    discovery: ['神秘壁画', '古老图书馆', '地下墓室', '隐藏通道']
  };

  const defaultChoice: EventChoice = {
    id: generateId('choice'),
    text: '小心应对',
    successRate: 0.6,
    effects: {
      progressChange: 5
    }
  };

  return {
    id: generateId('event'),
    type,
    title: getRandomItem(titles[type]),
    description: '你在探索中遇到了突发状况，需要做出选择。',
    choices: [defaultChoice],
    resolved: false
  };
}

export function generateTeamMember(
  profession?: Profession,
  rarity?: Rarity
): TeamMember {
  let targetProfession: Profession;
  if (profession) {
    targetProfession = profession;
  } else {
    targetProfession = getRandomItem(professions);
  }

  let targetRarity: Rarity;
  if (rarity) {
    targetRarity = rarity;
  } else {
    targetRarity = rarityWeightedRandom(rarities, [
      rarityWeight.common,
      rarityWeight.rare,
      rarityWeight.epic,
      rarityWeight.legendary
    ]);
  }

  const raritySkillRange: Record<Rarity, [number, number]> = {
    common: [1, 2],
    rare: [2, 3],
    epic: [3, 4],
    legendary: [4, 5]
  };

  const [minSkill, maxSkill] = raritySkillRange[targetRarity];
  const skillLevel = getRandomInt(minSkill, maxSkill);

  const luckRanges: Record<Rarity, [number, number]> = {
    common: [1, 4],
    rare: [3, 6],
    epic: [5, 8],
    legendary: [7, 10]
  };

  const [minLuck, maxLuck] = luckRanges[targetRarity];
  const luck = getRandomInt(minLuck, maxLuck);

  const baseSkill: Record<Profession, keyof SkillSet> = {
    explorer: 'explorationSpeed',
    linguist: 'relicDiscovery',
    engineer: 'trapHandling',
    archaeologist: 'relicDiscovery',
    historian: 'repairBonus'
  };

  const primarySkill = baseSkill[targetProfession];
  const skillMultiplier: Record<Rarity, number> = {
    common: 0.4,
    rare: 0.6,
    epic: 0.8,
    legendary: 0.95
  };

  const skills: SkillSet = {
    explorationSpeed: Math.round(randomRange(30, 70) + skillLevel * 8),
    relicDiscovery: Math.round(randomRange(30, 70) + skillLevel * 8),
    trapHandling: Math.round(randomRange(30, 70) + skillLevel * 8),
    repairBonus: Math.round(randomRange(30, 70) + skillLevel * 8)
  };

  skills[primarySkill] = Math.round(
    50 + skillLevel * 10 * skillMultiplier[targetRarity]
  );
  skills[primarySkill] = Math.min(100, skills[primarySkill]);

  const name = getRandomItem(firstNames) + getRandomItem(lastNames);
  const descriptions = memberDescriptions[targetProfession];

  return {
    id: generateId('member'),
    name,
    profession: targetProfession,
    skillLevel,
    luck,
    rarity: targetRarity,
    avatar: professionIcons[targetProfession],
    skills,
    description: getRandomItem(descriptions)
  };
}

interface AnnouncementData {
  player?: string;
  playerA?: string;
  playerB?: string;
  relic?: string;
  price?: number;
  rarity?: Rarity;
}

export function generateAnnouncement(
  type: Announcement['type'],
  data: AnnouncementData
): Announcement {
  const templates = announcementMessages[type];
  let template = getRandomItem(templates);

  if (data.player) template = template.replace('{player}', data.player);
  if (data.playerA) template = template.replace('{playerA}', data.playerA);
  if (data.playerB) template = template.replace('{playerB}', data.playerB);
  if (data.relic) template = template.replace('{relic}', data.relic);
  if (data.price) template = template.replace('{price}', data.price.toLocaleString());

  let title: string;
  switch (type) {
    case 'relic_found':
      title = '🎉 文物发现';
      break;
    case 'trade':
      title = '💰 市场交易';
      break;
    case 'exhibition':
      title = '🏆 展览赛事';
      break;
    case 'system':
    default:
      title = '📢 系统公告';
      break;
  }

  return {
    id: generateId('announcement'),
    type,
    title,
    message: template,
    timestamp: Date.now(),
    rarity: data.rarity
  };
}

export function generateMarketPriceHistory(
  days: number = 7
): { time: number; price: number }[] {
  const history: { time: number; price: number }[] = [];
  const now = Date.now();
  const basePrice = 5000 + getRandomInt(0, 10000);
  const volatility = 0.15;

  for (let i = days - 1; i >= 0; i--) {
    const time = now - i * 24 * 60 * 60 * 1000;
    const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
    const trendFactor = 1 + (days - i) * 0.01;
    const price = Math.round(basePrice * randomFactor * trendFactor);

    history.push({ time, price });
  }

  return history;
}

export function generateRandomCivilization(): Civilization {
  return getRandomItem(civilizations);
}

export function generateRandomRarity(): Rarity {
  return rarityWeightedRandom(rarities, [
    rarityWeight.common,
    rarityWeight.rare,
    rarityWeight.epic,
    rarityWeight.legendary
  ]);
}

export function generateRandomProfession(): Profession {
  return getRandomItem(professions);
}
