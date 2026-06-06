import type { ExplorationEvent } from '../types';

export const explorationEvents: ExplorationEvent[] = [
  {
    id: 'event-001',
    type: 'trap',
    title: '流沙陷阱',
    description: '脚下的地面突然塌陷，露出深不见底的流沙坑。沙石不断往下倾泻，你必须迅速做出决定！',
    choices: [
      {
        id: 'event-001-choice-1',
        text: '快速跳跃越过流沙',
        requiredSkill: { profession: 'explorer', minLevel: 3 },
        successRate: 0.8,
        effects: {
          progressChange: 5,
          luckChange: 1
        }
      },
      {
        id: 'event-001-choice-2',
        text: '寻找稳固的支点绕行',
        successRate: 0.6,
        effects: {
          progressChange: -5
        }
      },
      {
        id: 'event-001-choice-3',
        text: '冒险直接冲过去',
        successRate: 0.3,
        effects: {
          progressChange: 10,
          damage: true,
          goldChange: -50
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-002',
    type: 'collapse',
    title: '通道塌方',
    description: '头顶传来令人不安的碎裂声，支撑结构开始松动，石块正在不断掉落！',
    choices: [
      {
        id: 'event-002-choice-1',
        text: '工程师紧急加固通道',
        requiredSkill: { profession: 'engineer', minLevel: 2 },
        successRate: 0.85,
        effects: {
          progressChange: 8,
          luckChange: 2
        }
      },
      {
        id: 'event-002-choice-2',
        text: '匍匐前进快速通过',
        successRate: 0.5,
        effects: {
          progressChange: 3,
          damage: true
        }
      },
      {
        id: 'event-002-choice-3',
        text: '后退寻找其他通路',
        successRate: 0.9,
        effects: {
          progressChange: -10
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-003',
    type: 'rival',
    title: '敌对探险队',
    description: '前方出现了另一支探险队，他们看起来不怀好意，似乎想阻止你们继续前进。',
    choices: [
      {
        id: 'event-003-choice-1',
        text: '用金币买通他们让路',
        successRate: 0.95,
        effects: {
          goldChange: -200,
          progressChange: 5
        }
      },
      {
        id: 'event-003-choice-2',
        text: '与他们正面交涉',
        requiredSkill: { profession: 'historian', minLevel: 3 },
        successRate: 0.65,
        effects: {
          progressChange: 10,
          luckChange: 2,
          goldChange: 100
        }
      },
      {
        id: 'event-003-choice-3',
        text: '趁夜潜行避开他们',
        successRate: 0.55,
        effects: {
          progressChange: -5,
          luckChange: -1
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-004',
    type: 'treasure',
    title: '隐藏宝箱',
    description: '在墙壁的缝隙中，你发现了一个古旧的木箱，上面的锁已经生锈，但看起来里面可能有好东西。',
    choices: [
      {
        id: 'event-004-choice-1',
        text: '用专业工具小心撬开',
        requiredSkill: { profession: 'engineer', minLevel: 2 },
        successRate: 0.9,
        effects: {
          goldChange: 300,
          findRelic: true,
          progressChange: 5
        }
      },
      {
        id: 'event-004-choice-2',
        text: '直接砸开箱子',
        successRate: 0.7,
        effects: {
          goldChange: 150,
          findRelic: false,
          progressChange: 2
        }
      },
      {
        id: 'event-004-choice-3',
        text: '先研究上面的铭文',
        requiredSkill: { profession: 'linguist', minLevel: 2 },
        successRate: 0.8,
        effects: {
          goldChange: 400,
          findRelic: true,
          progressChange: 10
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-005',
    type: 'discovery',
    title: '神秘壁画',
    description: '墙上描绘着精美的古代壁画，似乎在讲述一个被遗忘的故事，也许能揭示宝藏的位置。',
    choices: [
      {
        id: 'event-005-choice-1',
        text: '历史学家仔细解读壁画',
        requiredSkill: { profession: 'historian', minLevel: 3 },
        successRate: 0.85,
        effects: {
          progressChange: 20,
          luckChange: 3,
          goldChange: 50
        }
      },
      {
        id: 'event-005-choice-2',
        text: '语言学家破译上面的文字',
        requiredSkill: { profession: 'linguist', minLevel: 2 },
        successRate: 0.75,
        effects: {
          progressChange: 15,
          findRelic: true
        }
      },
      {
        id: 'event-005-choice-3',
        text: '拍照存档继续前进',
        successRate: 1.0,
        effects: {
          progressChange: 3
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-006',
    type: 'trap',
    title: '毒箭机关',
    description: '当你踏入一个看似普通的房间时，墙壁上突然出现了一排小孔，隐约能看到里面闪着寒光的箭头！',
    choices: [
      {
        id: 'event-006-choice-1',
        text: '工程师快速破解机关',
        requiredSkill: { profession: 'engineer', minLevel: 3 },
        successRate: 0.88,
        effects: {
          progressChange: 10,
          luckChange: 2
        }
      },
      {
        id: 'event-006-choice-2',
        text: '探险家敏捷翻滚躲避',
        requiredSkill: { profession: 'explorer', minLevel: 2 },
        successRate: 0.7,
        effects: {
          progressChange: 5,
          damage: true
        }
      },
      {
        id: 'event-006-choice-3',
        text: '用盾牌硬挡过去',
        successRate: 0.4,
        effects: {
          progressChange: -5,
          damage: true,
          goldChange: -100
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-007',
    type: 'collapse',
    title: '水脉爆发',
    description: '挖掘时意外凿穿了一条地下水脉，冰冷的河水正在快速涌入通道！',
    choices: [
      {
        id: 'event-007-choice-1',
        text: '用石块快速封堵水源',
        requiredSkill: { profession: 'engineer', minLevel: 2 },
        successRate: 0.8,
        effects: {
          progressChange: 5,
          luckChange: 1
        }
      },
      {
        id: 'event-007-choice-2',
        text: '游泳通过被淹通道',
        successRate: 0.45,
        effects: {
          progressChange: 15,
          damage: true,
          luckChange: -2
        }
      },
      {
        id: 'event-007-choice-3',
        text: '向高处撤退',
        successRate: 0.95,
        effects: {
          progressChange: -15
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-008',
    type: 'treasure',
    title: '祭坛贡品',
    description: '一座古老的祭坛上摆放着几件看起来很值钱的祭品，但祭坛周围似乎有某种禁忌的力量在守护。',
    choices: [
      {
        id: 'event-008-choice-1',
        text: '考古学家用专业方法取走',
        requiredSkill: { profession: 'archaeologist', minLevel: 3 },
        successRate: 0.85,
        effects: {
          findRelic: true,
          goldChange: 200,
          progressChange: 10
        }
      },
      {
        id: 'event-008-choice-2',
        text: '历史学家先研究祭祀仪式',
        requiredSkill: { profession: 'historian', minLevel: 2 },
        successRate: 0.75,
        effects: {
          findRelic: true,
          goldChange: 350,
          luckChange: 3
        }
      },
      {
        id: 'event-008-choice-3',
        text: '直接拿走最快的方式',
        successRate: 0.35,
        effects: {
          findRelic: false,
          goldChange: 80,
          damage: true,
          luckChange: -3
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-009',
    type: 'discovery',
    title: '古老图书馆',
    description: '你们发现了一间被遗忘的密室，里面堆满了年代久远的卷轴和典籍。灰尘覆盖的书架上可能隐藏着重要信息。',
    choices: [
      {
        id: 'event-009-choice-1',
        text: '语言学家系统整理典籍',
        requiredSkill: { profession: 'linguist', minLevel: 3 },
        successRate: 0.9,
        effects: {
          progressChange: 25,
          findRelic: true,
          luckChange: 2
        }
      },
      {
        id: 'event-009-choice-2',
        text: '快速翻阅寻找关键信息',
        successRate: 0.55,
        effects: {
          progressChange: 12,
          goldChange: 100
        }
      },
      {
        id: 'event-009-choice-3',
        text: '带走有价值的卷轴',
        requiredSkill: { profession: 'archaeologist', minLevel: 2 },
        successRate: 0.7,
        effects: {
          findRelic: true,
          progressChange: 5
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-010',
    type: 'rival',
    title: '文物走私犯',
    description: '一伙武装走私犯出现在你们前方，他们也在寻找同样的宝藏，看起来不想和你们分享。',
    choices: [
      {
        id: 'event-010-choice-1',
        text: '假装合作设下圈套',
        requiredSkill: { profession: 'explorer', minLevel: 4 },
        successRate: 0.75,
        effects: {
          progressChange: 15,
          goldChange: 500,
          luckChange: 2
        }
      },
      {
        id: 'event-010-choice-2',
        text: '贿赂他们分一杯羹',
        successRate: 0.85,
        effects: {
          goldChange: -400,
          progressChange: 10
        }
      },
      {
        id: 'event-010-choice-3',
        text: '悄悄绕路避开他们',
        successRate: 0.5,
        effects: {
          progressChange: -10,
          luckChange: -1
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-011',
    type: 'trap',
    title: '水银密室',
    description: '石门在身后关闭，房间地面开始缓缓流出银色的液态金属——是水银！吸入蒸气会是致命的！',
    choices: [
      {
        id: 'event-011-choice-1',
        text: '工程师紧急启动排水机关',
        requiredSkill: { profession: 'engineer', minLevel: 4 },
        successRate: 0.8,
        effects: {
          progressChange: 20,
          findRelic: true,
          luckChange: 3
        }
      },
      {
        id: 'event-011-choice-2',
        text: '屏住呼吸快速寻找出口',
        requiredSkill: { profession: 'explorer', minLevel: 3 },
        successRate: 0.55,
        effects: {
          progressChange: 10,
          damage: true
        }
      },
      {
        id: 'event-011-choice-3',
        text: '用衣物掩住口鼻撤退',
        successRate: 0.9,
        effects: {
          progressChange: -20,
          damage: false
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-012',
    type: 'discovery',
    title: '地下墓室入口',
    description: '考古学家在清理浮土时发现了一个隐藏的石门，门上刻着守护符文，里面可能是某位重要人物的墓室。',
    choices: [
      {
        id: 'event-012-choice-1',
        text: '语言学家先破译符文',
        requiredSkill: { profession: 'linguist', minLevel: 3 },
        successRate: 0.8,
        effects: {
          progressChange: 15,
          findRelic: true,
          luckChange: 2
        }
      },
      {
        id: 'event-012-choice-2',
        text: '考古学家小心发掘入口',
        requiredSkill: { profession: 'archaeologist', minLevel: 2 },
        successRate: 0.75,
        effects: {
          progressChange: 10,
          findRelic: true
        }
      },
      {
        id: 'event-012-choice-3',
        text: '直接炸开石门',
        successRate: 0.4,
        effects: {
          progressChange: 5,
          damage: true,
          goldChange: -150
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-013',
    type: 'treasure',
    title: '暗格藏金',
    description: '考古学家在清理地面时注意到一块地砖的颜色与众不同，敲击似乎是空的，下面可能藏着什么。',
    choices: [
      {
        id: 'event-013-choice-1',
        text: '小心撬开地砖查看',
        requiredSkill: { profession: 'archaeologist', minLevel: 2 },
        successRate: 0.85,
        effects: {
          goldChange: 250,
          findRelic: true,
          progressChange: 8
        }
      },
      {
        id: 'event-013-choice-2',
        text: '用探测器扫描内部',
        successRate: 0.7,
        effects: {
          goldChange: 180,
          progressChange: 5
        }
      },
      {
        id: 'event-013-choice-3',
        text: '不管它继续探索',
        successRate: 1.0,
        effects: {
          progressChange: 2
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-014',
    type: 'collapse',
    title: '落石阻路',
    description: '前方发生了小规模塌方，大块岩石完全堵住了前进的道路，必须想办法清理。',
    choices: [
      {
        id: 'event-014-choice-1',
        text: '工程师用工具开路',
        requiredSkill: { profession: 'engineer', minLevel: 2 },
        successRate: 0.9,
        effects: {
          progressChange: 12,
          luckChange: 1
        }
      },
      {
        id: 'event-014-choice-2',
        text: '众人合力搬开石块',
        successRate: 0.5,
        effects: {
          progressChange: 5,
          damage: true
        }
      },
      {
        id: 'event-014-choice-3',
        text: '寻找其他路线',
        successRate: 0.8,
        effects: {
          progressChange: -8
        }
      }
    ],
    resolved: false
  },
  {
    id: 'event-015',
    type: 'rival',
    title: '古墓守卫',
    description: '一支神秘的守墓人出现在你们面前，他们世代守护着这座古墓，绝不允许外人亵渎。',
    choices: [
      {
        id: 'event-015-choice-1',
        text: '历史学家说明考古来意',
        requiredSkill: { profession: 'historian', minLevel: 4 },
        successRate: 0.7,
        effects: {
          progressChange: 20,
          findRelic: true,
          luckChange: 5
        }
      },
      {
        id: 'event-015-choice-2',
        text: '放下所有武器表示诚意',
        successRate: 0.55,
        effects: {
          progressChange: 10,
          goldChange: -100
        }
      },
      {
        id: 'event-015-choice-3',
        text: '趁其不备快速通过',
        successRate: 0.3,
        effects: {
          progressChange: 5,
          damage: true,
          luckChange: -5
        }
      }
    ],
    resolved: false
  }
];
