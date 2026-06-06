import bcrypt from 'bcryptjs';
import { config } from '../config';
import { getPool, closePool, getClient } from '../lib/db';
import { generateId } from '../utils/helpers';

interface RuinSeed {
  name: string;
  civilization: 'egypt' | 'maya' | 'atlantis' | 'rome' | 'china' | 'mesopotamia';
  difficulty: number;
  description: string;
  image: string;
  minLevel: number;
  estimatedTime: number;
  rewards: { goldMin: number; goldMax: number; exp: number };
}

const ruinsData: RuinSeed[] = [
  {
    name: '吉萨金字塔入口',
    civilization: 'egypt',
    difficulty: 1,
    description: '吉萨高原上的古老金字塔群入口，传说中埋藏着法老的秘宝。',
    image: '🏛️',
    minLevel: 1,
    estimatedTime: 60,
    rewards: { goldMin: 100, goldMax: 500, exp: 50 },
  },
  {
    name: '帝王谷深处',
    civilization: 'egypt',
    difficulty: 3,
    description: '位于卢克索对岸的帝王谷，众多法老的安息之地。',
    image: '⚰️',
    minLevel: 5,
    estimatedTime: 120,
    rewards: { goldMin: 300, goldMax: 1200, exp: 150 },
  },
  {
    name: '奇琴伊察神庙',
    civilization: 'maya',
    difficulty: 2,
    description: '玛雅文明的宏伟阶梯金字塔，用于祭祀和天文观测。',
    image: '🗿',
    minLevel: 3,
    estimatedTime: 90,
    rewards: { goldMin: 200, goldMax: 800, exp: 100 },
  },
  {
    name: '蒂卡尔密林遗址',
    civilization: 'maya',
    difficulty: 4,
    description: '隐藏在危地马拉丛林深处的玛雅最大城邦遗址。',
    image: '🌴',
    minLevel: 8,
    estimatedTime: 180,
    rewards: { goldMin: 500, goldMax: 2000, exp: 250 },
  },
  {
    name: '庞贝古城废墟',
    civilization: 'rome',
    difficulty: 2,
    description: '被维苏威火山灰掩埋的罗马帝国城市，历史的瞬间凝固。',
    image: '🌋',
    minLevel: 2,
    estimatedTime: 90,
    rewards: { goldMin: 150, goldMax: 700, exp: 80 },
  },
  {
    name: '罗马斗兽场地下',
    civilization: 'rome',
    difficulty: 5,
    description: '弗拉维圆形剧场的地下通道和角斗士休息室。',
    image: '⚔️',
    minLevel: 10,
    estimatedTime: 240,
    rewards: { goldMin: 800, goldMax: 3000, exp: 400 },
  },
  {
    name: '秦始皇陵外围',
    civilization: 'china',
    difficulty: 3,
    description: '骊山脚下的秦始皇陵外围区域，兵马俑坑所在地。',
    image: '🏺',
    minLevel: 4,
    estimatedTime: 120,
    rewards: { goldMin: 300, goldMax: 1000, exp: 150 },
  },
  {
    name: '敦煌莫高窟',
    civilization: 'china',
    difficulty: 4,
    description: '丝绸之路上的佛教艺术宝库，千年壁画和经卷的所在地。',
    image: '📜',
    minLevel: 7,
    estimatedTime: 180,
    rewards: { goldMin: 500, goldMax: 1800, exp: 220 },
  },
  {
    name: '乌尔城遗址',
    civilization: 'mesopotamia',
    difficulty: 2,
    description: '苏美尔文明的重要城市，传说中希伯来人祖先的故乡。',
    image: '🏘️',
    minLevel: 2,
    estimatedTime: 90,
    rewards: { goldMin: 180, goldMax: 750, exp: 90 },
  },
  {
    name: '巴比伦空中花园遗迹',
    civilization: 'mesopotamia',
    difficulty: 5,
    description: '传说中的世界七大奇迹之一，层层叠叠的花园台基。',
    image: '🌺',
    minLevel: 12,
    estimatedTime: 240,
    rewards: { goldMin: 900, goldMax: 3500, exp: 450 },
  },
  {
    name: '亚特兰蒂斯浅滩',
    civilization: 'atlantis',
    difficulty: 4,
    description: '传说中沉没大陆的近海区域，可以看到部分建筑废墟。',
    image: '🏝️',
    minLevel: 6,
    estimatedTime: 150,
    rewards: { goldMin: 400, goldMax: 1500, exp: 180 },
  },
  {
    name: '亚特兰蒂斯深海神殿',
    civilization: 'atlantis',
    difficulty: 6,
    description: '深海之中的亚特兰蒂斯核心神殿，蕴含着失落文明的终极秘密。',
    image: '💎',
    minLevel: 15,
    estimatedTime: 300,
    rewards: { goldMin: 1500, goldMax: 6000, exp: 700 },
  },
];

const eventTemplatesData = [
  {
    template_id: 'evt_trap_pit',
    type: 'trap',
    title: '陷阱！',
    description: '前方地面突然塌陷，出现一个深不见底的陷阱。',
    choices: [
      {
        id: 'jump',
        text: '尝试跳过',
        successRate: 0.5,
        requiredSkill: { profession: 'explorer', minLevel: 2 },
        effects: { progressChange: 5, goldChange: 0 },
      },
      {
        id: 'detour',
        text: '寻找绕行路线',
        successRate: 0.8,
        requiredSkill: { profession: 'engineer', minLevel: 1 },
        effects: { progressChange: -5, goldChange: 0 },
      },
      {
        id: 'brave',
        text: '使用工具安全越过',
        successRate: 0.95,
        requiredSkill: { profession: 'engineer', minLevel: 3 },
        effects: { progressChange: 0, goldChange: 0 },
      },
    ],
  },
  {
    template_id: 'evt_collapse',
    type: 'collapse',
    title: '通道塌方',
    description: '头顶传来不祥的声音，碎石正在掉落！',
    choices: [
      {
        id: 'rush',
        text: '快速冲过',
        successRate: 0.6,
        requiredSkill: { profession: 'explorer', minLevel: 1 },
        effects: { progressChange: 10, damage: true },
      },
      {
        id: 'wait',
        text: '等待稳定',
        successRate: 0.9,
        effects: { progressChange: -10, goldChange: 0 },
      },
      {
        id: 'reinforce',
        text: '加固通道',
        successRate: 0.95,
        requiredSkill: { profession: 'engineer', minLevel: 2 },
        effects: { progressChange: -3, goldChange: 0 },
      },
    ],
  },
  {
    template_id: 'evt_treasure',
    type: 'treasure',
    title: '隐藏宝箱',
    description: '在角落发现了一个布满灰尘的神秘宝箱！',
    choices: [
      {
        id: 'open',
        text: '直接打开',
        successRate: 0.7,
        effects: { goldChange: 300, findRelic: false },
      },
      {
        id: 'careful',
        text: '仔细检查机关',
        successRate: 0.9,
        requiredSkill: { profession: 'linguist', minLevel: 2 },
        effects: { goldChange: 500, findRelic: true },
      },
      {
        id: 'decipher',
        text: '破译铭文后开启',
        successRate: 0.95,
        requiredSkill: { profession: 'linguist', minLevel: 4 },
        effects: { goldChange: 800, findRelic: true },
      },
    ],
  },
  {
    template_id: 'evt_discovery',
    type: 'discovery',
    title: '古代壁画',
    description: '墙上发现了一幅色彩鲜艳的古代壁画，似乎记载着重要信息。',
    choices: [
      {
        id: 'copy',
        text: '临摹记录',
        successRate: 0.8,
        requiredSkill: { profession: 'historian', minLevel: 1 },
        effects: { progressChange: 5, goldChange: 100 },
      },
      {
        id: 'study',
        text: '深入研究',
        successRate: 0.85,
        requiredSkill: { profession: 'archaeologist', minLevel: 2 },
        effects: { progressChange: 10, goldChange: 200, findRelic: false },
      },
      {
        id: 'analyze',
        text: '多学科综合分析',
        successRate: 0.95,
        requiredSkill: { profession: 'archaeologist', minLevel: 4 },
        effects: { progressChange: 15, goldChange: 400, findRelic: true },
      },
    ],
  },
];

async function seedDatabase(): Promise<void> {
  console.log('='.repeat(50));
  console.log('🚀 开始执行数据库种子数据');
  console.log('='.repeat(50));

  const client = await getClient();

  try {
    await client.query('BEGIN');

    console.log('\n📝 插入初始测试用户...');

    const testUsers = [
      { username: 'admin', email: 'admin@example.com', isCommittee: true },
      { username: 'player1', email: 'player1@example.com', isCommittee: false },
      { username: 'player2', email: 'player2@example.com', isCommittee: false },
    ];

    for (const user of testUsers) {
      const hashedPassword = await bcrypt.hash('123456', config.SALT_ROUNDS);
      const userId = generateId('player');

      await client.query(
        `INSERT INTO players (id, username, email, password_hash, name, avatar, level, exp, gold, gems, total_relic_value, museum_score, is_committee, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
         ON CONFLICT (username) DO NOTHING`,
        [
          userId,
          user.username,
          user.email,
          hashedPassword,
          user.username,
          '🧑‍🔬',
          user.isCommittee ? 10 : 1,
          user.isCommittee ? 5000 : 0,
          user.isCommittee ? 100000 : 5000,
          user.isCommittee ? 500 : 100,
          0,
          0,
          user.isCommittee,
        ]
      );
      console.log(`  ✅ 用户: ${user.username} (密码: 123456)`);
    }

    console.log('\n🗺️  插入遗迹数据...');
    for (const ruin of ruinsData) {
      const ruinId = generateId('ruin');

      await client.query(
        `INSERT INTO ruins (id, name, civilization, difficulty, description, image, min_level, estimated_time, rewards, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
         ON CONFLICT DO NOTHING`,
        [
          ruinId,
          ruin.name,
          ruin.civilization,
          ruin.difficulty,
          ruin.description,
          ruin.image,
          ruin.minLevel,
          ruin.estimatedTime,
          JSON.stringify(ruin.rewards),
        ]
      );
      console.log(`  ✅ 遗迹: ${ruin.name}`);
    }

    console.log('\n🎲 插入探索事件模板...');
    for (const template of eventTemplatesData) {
      await client.query(
        `INSERT INTO exploration_event_templates (template_id, type, title, description, choices)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (template_id) DO NOTHING`,
        [
          template.template_id,
          template.type,
          template.title,
          template.description,
          JSON.stringify(template.choices),
        ]
      );
      console.log(`  ✅ 事件模板: ${template.title}`);
    }

    console.log('\n🌊 创建秘境...');
    const realmId = generateId('realm');
    const now = Date.now();
    await client.query(
      `INSERT INTO secret_realms (id, name, description, is_active, max_players, current_players, open_time, close_time, teams, global_events, rewards, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW() + INTERVAL '7 days', '[]'::jsonb, '[]'::jsonb, $7::jsonb, NOW())
       ON CONFLICT DO NOTHING`,
      [
        realmId,
        '失落的文明深渊',
        '传说中所有文明交汇的神秘领域，每周开放一次，丰厚的奖励等待勇敢的探险家！',
        true,
        100,
        0,
        JSON.stringify({ goldMin: 1000, goldMax: 5000, exp: 500 }),
      ]
    );
    console.log('  ✅ 秘境: 失落的文明深渊 (已激活)');

    await client.query('COMMIT');

    console.log('\n' + '='.repeat(50));
    console.log('✅ 所有种子数据插入成功！');
    console.log('='.repeat(50));
    console.log('\n📋 测试账号:');
    console.log('  管理员: admin / 123456 (学术委员会成员)');
    console.log('  玩家1: player1 / 123456');
    console.log('  玩家2: player2 / 123456');
    console.log('\n🏛️  已创建 12 个遗迹');
    console.log('🎲  已创建 4 个探索事件模板');
    console.log('🌊  已创建 1 个开放的秘境');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ 种子数据插入失败，已回滚');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await closePool();
  }
}

seedDatabase().catch((err) => {
  console.error('种子脚本异常:', err);
  process.exit(1);
});
