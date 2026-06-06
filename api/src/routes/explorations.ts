import { Router, Response } from 'express';
import { query } from '../lib/db';
import { auth } from '../middleware/auth';
import { broadcast, SocketEvents, emitToUser } from '../lib/socket';
import { AuthenticatedRequest, Civilization, Rarity } from '../types';
import { generateId, getRandomInt, getRandomItem, rarityWeightedRandom, estimateRelicPrice } from '../utils/helpers';

const router = Router();

const rarityWeight: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

interface RelicTemplateData {
  name: string;
  baseValue: number;
  description: string;
  image: string;
}

const civilizationRelicTemplates: Record<Civilization, RelicTemplateData[]> = {
  egypt: [
    { name: '圣甲虫护身符', baseValue: 1000, description: '古埃及常见的护身符，圣甲虫形象象征重生与永恒。', image: '🪲' },
    { name: '法老黄金面具碎片', baseValue: 25000, description: '法老木乃伊面具的黄金碎片，含金量极高。', image: '👑' },
    { name: '《亡灵书》莎草纸', baseValue: 8000, description: '抄写着帮助亡者通往来世的咒语和神话。', image: '📜' },
    { name: '图坦卡蒙匕首', baseValue: 150000, description: '传说中的陨铁匕首，历经数千年仍然寒光闪闪。', image: '🗡️' },
  ],
  maya: [
    { name: '玛雅太阳历石碑', baseValue: 12000, description: '刻有玛雅长历法的石碑残片。', image: '📅' },
    { name: '翡翠面具', baseValue: 30000, description: '由数百块翡翠拼接而成的祭祀面具。', image: '🎭' },
    { name: '可可豆陶碗', baseValue: 600, description: '内壁残留着古代可可饮品的痕迹。', image: '🥣' },
    { name: '水晶头颅', baseValue: 200000, description: '由纯净水晶雕刻的完美头颅，传说拥有神秘力量。', image: '💀' },
  ],
  atlantis: [
    { name: '亚特兰蒂斯能量水晶', baseValue: 40000, description: '在黑暗中会发出微弱荧光的蓝色水晶。', image: '💎' },
    { name: '海神三叉戟', baseValue: 300000, description: '传说中海王波塞冬使用过的三叉戟残件。', image: '🔱' },
    { name: '海底陶罐', baseValue: 1500, description: '在海底泥沙中保存完好的陶罐。', image: '🏺' },
    { name: '亚特兰蒂斯星图盘', baseValue: 15000, description: '青铜制星图盘，用于航海导航。', image: '🧭' },
  ],
  rome: [
    { name: '罗马军团鹰旗', baseValue: 9000, description: '罗马军团的鹰旗残片，荣誉的象征。', image: '🦅' },
    { name: '角斗士头盔', baseValue: 2000, description: '角斗士使用过的青铜头盔。', image: '⛑️' },
    { name: '奥古斯都金币', baseValue: 22000, description: '罗马帝国开国皇帝奥古斯都时期的金币。', image: '🪙' },
    { name: '凯撒佩剑', baseValue: 180000, description: '尤利乌斯·凯撒本人使用过的佩剑。', image: '⚔️' },
  ],
  china: [
    { name: '兵马俑将军俑', baseValue: 35000, description: '秦始皇陵中的高级军吏俑。', image: '🗿' },
    { name: '青铜剑', baseValue: 10000, description: '战国时期的青铜剑，锋利无比。', image: '🗡️' },
    { name: '玉璧', baseValue: 3500, description: '汉代玉璧，象征天圆地方的宇宙观。', image: '⭕' },
    { name: '传国玉玺', baseValue: 500000, description: '用和氏璧雕琢而成的传国玉玺残片。', image: '📦' },
  ],
  mesopotamia: [
    { name: '楔形文字泥板', baseValue: 7000, description: '记录着古代商队贸易记录的泥板。', image: '📋' },
    { name: '汉谟拉比法典石碑', baseValue: 28000, description: '世界上最早的成文法典石碑残片。', image: '⚖️' },
    { name: '黄金公牛雕像', baseValue: 1800, description: '象征力量与丰饶的小型黄金雕像。', image: '🐂' },
    { name: '吉尔伽美什石板', baseValue: 250000, description: '《吉尔伽美什史诗》的原始石板残片。', image: '📖' },
  ],
};

const explorationTimers = new Map<string, NodeJS.Timeout>();

function calculateExplorationSpeed(teamMembers: any[], difficulty: number): number {
  if (teamMembers.length === 0) return 2;
  const avgExplorationSpeed = teamMembers.reduce((sum, m) => sum + (m.skills?.explorationSpeed || 50), 0) / teamMembers.length;
  const luckBonus = teamMembers.reduce((sum, m) => sum + (m.luck || 5), 0) / teamMembers.length * 0.5;
  const baseSpeed = 3 + (avgExplorationSpeed / 100) * 5 + luckBonus * 0.1;
  return Math.max(1, baseSpeed - difficulty * 0.3);
}

function calculateRelicDiscoveryRate(teamMembers: any[], progress: number, difficulty: number): number {
  if (teamMembers.length === 0) return 0.01;
  const avgDiscovery = teamMembers.reduce((sum, m) => sum + (m.skills?.relicDiscovery || 50), 0) / teamMembers.length;
  const avgLuck = teamMembers.reduce((sum, m) => sum + (m.luck || 5), 0) / teamMembers.length;
  const progressBonus = progress / 100;
  const baseRate = (avgDiscovery / 100) * 0.15 + (avgLuck / 10) * 0.02 + progressBonus * 0.05;
  return Math.max(0.005, baseRate - difficulty * 0.005);
}

async function generateRelic(civilization: Civilization, playerId: string) {
  const templates = civilizationRelicTemplates[civilization];
  const template = getRandomItem(templates);

  const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
  const weights = rarities.map((r) => rarityWeight[r]);
  const rarity = rarityWeightedRandom(rarities, weights);

  const completeness = rarity === 'legendary'
    ? getRandomInt(40, 100)
    : rarity === 'epic'
    ? getRandomInt(55, 95)
    : rarity === 'rare'
    ? getRandomInt(70, 95)
    : getRandomInt(80, 100);

  const historicalValue = rarity === 'legendary'
    ? getRandomInt(80000, 300000)
    : rarity === 'epic'
    ? getRandomInt(20000, 80000)
    : rarity === 'rare'
    ? getRandomInt(5000, 25000)
    : getRandomInt(500, 5000);

  const relicTemplateForEstimate = {
    ...template,
    civilization,
  };
  const estimatedPrice = estimateRelicPrice(relicTemplateForEstimate, completeness, rarity, historicalValue);
  const fragments = rarity === 'legendary' ? getRandomInt(3, 6) : rarity === 'epic' ? getRandomInt(2, 4) : rarity === 'rare' ? getRandomInt(1, 3) : 1;

  const relicId = generateId('relic');

  await query(
    `INSERT INTO relics (id, name, civilization, completeness, rarity, historical_value, estimated_price, description, image, fragments, discovered_at, player_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)`,
    [relicId, template.name, civilization, completeness, rarity, historicalValue, estimatedPrice, template.description, template.image, fragments, playerId]
  );

  return {
    id: relicId,
    name: template.name,
    civilization,
    completeness,
    rarity,
    historicalValue,
    estimatedPrice,
    description: template.description,
    image: template.image,
    fragments,
  };
}

router.get('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query<any>(
      `SELECT e.id, e.ruin_id, e.team_id, e.progress, e.status, e.start_time, e.end_time, e.events_triggered, e.relics_found,
              r.name as ruin_name, r.civilization, r.difficulty, r.image
       FROM explorations e
       LEFT JOIN ruins r ON e.ruin_id = r.id
       WHERE e.player_id = $1
       ORDER BY e.created_at DESC
       LIMIT 50`,
      [userId]
    );

    const explorations = result.rows.map((row: any) => ({
      id: row.id,
      ruinId: row.ruin_id,
      ruinName: row.ruin_name,
      civilization: row.civilization,
      difficulty: row.difficulty,
      ruinImage: row.image,
      teamId: row.team_id,
      progress: row.progress,
      status: row.status,
      startTime: row.start_time,
      endTime: row.end_time,
      eventsTriggered: row.events_triggered || [],
      relicsFound: row.relics_found || [],
    }));

    res.json({
      success: true,
      message: '获取探索记录成功',
      data: explorations,
    });
  } catch (error) {
    console.error('获取探索记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取探索记录失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.get('/current', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query<any>(
      `SELECT e.id, e.ruin_id, e.team_id, e.progress, e.status, e.start_time, e.events_triggered, e.relics_found,
              r.name as ruin_name, r.civilization, r.difficulty, r.image, r.estimated_time, r.rewards
       FROM explorations e
       LEFT JOIN ruins r ON e.ruin_id = r.id
       WHERE e.player_id = $1 AND e.status = 'exploring'
       ORDER BY e.created_at DESC
       LIMIT 1`,
      [userId]
    );

    if (!result.rowCount || result.rowCount === 0) {
      return res.json({
        success: true,
        message: '暂无进行中的探索',
        data: null,
      });
    }

    const exploration: any = result.rows[0];
    const teamResult = await query<any>(
      `SELECT member_ids FROM teams WHERE id = $1`,
      [exploration.team_id]
    );

    let members: any[] = [];
    if (teamResult.rowCount && teamResult.rowCount > 0 && (teamResult.rows[0] as any).member_ids?.length > 0) {
      const membersResult = await query<any>(
        `SELECT id, name, profession, skill_level, luck, rarity, avatar, skills
         FROM team_members WHERE id = ANY($1::uuid[])`,
        [(teamResult.rows[0] as any).member_ids]
      );
      members = membersResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        profession: row.profession,
        skillLevel: row.skill_level,
        luck: row.luck,
        rarity: row.rarity,
        avatar: row.avatar,
        skills: row.skills,
      }));
    }

    res.json({
      success: true,
      message: '获取当前探索成功',
      data: {
        id: exploration.id,
        ruinId: exploration.ruin_id,
        ruinName: exploration.ruin_name,
        civilization: exploration.civilization,
        difficulty: exploration.difficulty,
        ruinImage: exploration.image,
        estimatedTime: exploration.estimated_time,
        rewards: exploration.rewards,
        teamId: exploration.team_id,
        teamMembers: members,
        progress: exploration.progress,
        status: exploration.status,
        startTime: exploration.start_time,
        eventsTriggered: exploration.events_triggered || [],
        relicsFound: exploration.relics_found || [],
      },
    });
  } catch (error) {
    console.error('获取当前探索错误:', error);
    res.status(500).json({
      success: false,
      message: '获取当前探索失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.post('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { ruinId } = req.body || {};

    if (!ruinId) {
      return res.status(400).json({
        success: false,
        message: '遗迹ID不能为空',
      });
    }

    const existingExploration = await query<any>(
      `SELECT id FROM explorations WHERE player_id = $1 AND status = 'exploring' LIMIT 1`,
      [userId]
    );

    if (existingExploration.rowCount && existingExploration.rowCount > 0) {
      return res.status(400).json({
        success: false,
        message: '已有进行中的探索，请先完成或取消',
      });
    }

    const ruinResult = await query<any>(
      `SELECT id, name, civilization, difficulty, min_level, estimated_time, rewards
       FROM ruins WHERE id = $1`,
      [ruinId]
    );

    if (!ruinResult.rowCount || ruinResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '遗迹不存在',
      });
    }

    const ruin: any = ruinResult.rows[0];

    const playerResult = await query<any>(
      'SELECT level FROM players WHERE id = $1',
      [userId]
    );

    if ((playerResult.rows[0] as any).level < ruin.min_level) {
      return res.status(400).json({
        success: false,
        message: `玩家等级不足，需要等级 ${ruin.min_level}`,
      });
    }

    const teamResult = await query<any>(
      `SELECT id, name, member_ids FROM teams WHERE player_id = $1 AND active = true LIMIT 1`,
      [userId]
    );

    if (!teamResult.rowCount || teamResult.rowCount === 0 || !((teamResult.rows[0] as any).member_ids?.length > 0)) {
      return res.status(400).json({
        success: false,
        message: '请先组建出战队伍',
      });
    }

    const team: any = teamResult.rows[0];
    if (team.member_ids.length < 1 || team.member_ids.length > 5) {
      return res.status(400).json({
        success: false,
        message: '队伍人数必须在1-5人之间',
      });
    }

    const explorationId = generateId('exploration');

    await query(
      `INSERT INTO explorations (id, player_id, ruin_id, team_id, progress, status, start_time, events_triggered, relics_found)
       VALUES ($1, $2, $3, $4, 0, 'exploring', NOW(), '[]'::jsonb, '{}')`,
      [explorationId, userId, ruinId, team.id]
    );

    const timer = setInterval(async () => {
      try {
        const check = await query<any>(
          `SELECT status FROM explorations WHERE id = $1`,
          [explorationId]
        );
        if (!check.rowCount || check.rowCount === 0 || (check.rows[0] as any).status !== 'exploring') {
          clearInterval(timer);
          explorationTimers.delete(explorationId);
          return;
        }

        const membersResult = await query<any>(
          `SELECT tm.skills, tm.luck
           FROM team_members tm
           JOIN teams t ON tm.id = ANY(t.member_ids)
           WHERE t.id = $1`,
          [team.id]
        );
        const members = membersResult.rows;
        const speed = calculateExplorationSpeed(members, ruin.difficulty);

        const updateResult = await query<any>(
          `UPDATE explorations SET progress = LEAST(100, progress + $1)
           WHERE id = $2 AND status = 'exploring'
           RETURNING progress`,
          [speed, explorationId]
        );

        const newProgress = (updateResult.rows[0] as any)?.progress || 0;

        if (Math.random() < 0.05) {
          const eventTemplates = await query<any>(
            `SELECT template_id, type, title, description, choices FROM exploration_event_templates
             ORDER BY RANDOM() LIMIT 1`
          );
          if (eventTemplates.rowCount && eventTemplates.rowCount > 0) {
            const template: any = eventTemplates.rows[0];
            const event = {
              id: generateId('event'),
              templateId: template.template_id,
              type: template.type,
              title: template.title,
              description: template.description,
              choices: template.choices,
              resolved: false,
            };
            await query(
              `UPDATE explorations SET events_triggered = events_triggered || $1::jsonb
               WHERE id = $2`,
              [JSON.stringify(event), explorationId]
            );
          }
        }

        const discoveryRate = calculateRelicDiscoveryRate(members, newProgress, ruin.difficulty);
        if (Math.random() < discoveryRate * 0.1) {
          const relic = await generateRelic(ruin.civilization, userId);
          await query(
            `UPDATE explorations SET relics_found = array_append(relics_found, $1::uuid)
             WHERE id = $2`,
            [relic.id, explorationId]
          );
          emitToUser(userId, SocketEvents.EXPLORATION_UPDATE, {
            type: 'relic_found',
            explorationId,
            relic,
          });
        }

        emitToUser(userId, SocketEvents.EXPLORATION_UPDATE, {
          type: 'progress',
          explorationId,
          progress: newProgress,
        });

        if (newProgress >= 100) {
          clearInterval(timer);
          explorationTimers.delete(explorationId);
        }
      } catch (err) {
        console.error('探索定时器错误:', err);
      }
    }, 5000);

    explorationTimers.set(explorationId, timer);

    res.json({
      success: true,
      message: '开始探索成功',
      data: {
        id: explorationId,
        ruinId,
        ruinName: ruin.name,
        civilization: ruin.civilization,
        difficulty: ruin.difficulty,
        teamId: team.id,
        teamName: team.name,
        progress: 0,
        status: 'exploring',
        startTime: new Date().toISOString(),
        estimatedTime: ruin.estimated_time,
        rewards: ruin.rewards,
        eventsTriggered: [],
        relicsFound: [],
      },
    });
  } catch (error) {
    console.error('开始探索错误:', error);
    res.status(500).json({
      success: false,
      message: '开始探索失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.post('/:id/progress', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const explorationId = req.params.id;

    const explorationResult = await query<any>(
      `SELECT e.id, e.progress, e.status, e.ruin_id, e.team_id, e.events_triggered, e.relics_found,
              r.civilization, r.difficulty
       FROM explorations e
       LEFT JOIN ruins r ON e.ruin_id = r.id
       WHERE e.id = $1 AND e.player_id = $2`,
      [explorationId, userId]
    );

    if (!explorationResult.rowCount || explorationResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '探索记录不存在',
      });
    }

    const exploration: any = explorationResult.rows[0];
    if (exploration.status !== 'exploring') {
      return res.status(400).json({
        success: false,
        message: '探索已结束',
      });
    }

    const teamResult = await query<any>(
      `SELECT member_ids FROM teams WHERE id = $1`,
      [exploration.team_id]
    );

    let members: any[] = [];
    if (teamResult.rowCount && teamResult.rowCount > 0 && (teamResult.rows[0] as any).member_ids?.length > 0) {
      const membersResult = await query<any>(
        `SELECT skills, luck FROM team_members WHERE id = ANY($1::uuid[])`,
        [(teamResult.rows[0] as any).member_ids]
      );
      members = membersResult.rows;
    }

    const speed = calculateExplorationSpeed(members, exploration.difficulty);
    const newProgress = Math.min(100, (exploration.progress || 0) + speed);

    await query(
      `UPDATE explorations SET progress = $1 WHERE id = $2`,
      [newProgress, explorationId]
    );

    let newEvent: any = null;
    const pendingEvents = (exploration.events_triggered || []).filter((e: any) => !e.resolved);
    if (pendingEvents.length === 0 && Math.random() < 0.08) {
      const eventTemplates = await query<any>(
        `SELECT template_id, type, title, description, choices FROM exploration_event_templates
         ORDER BY RANDOM() LIMIT 1`
      );
      if (eventTemplates.rowCount && eventTemplates.rowCount > 0) {
        const template: any = eventTemplates.rows[0];
        newEvent = {
          id: generateId('event'),
          templateId: template.template_id,
          type: template.type,
          title: template.title,
          description: template.description,
          choices: template.choices,
          resolved: false,
        };
        await query(
          `UPDATE explorations SET events_triggered = events_triggered || $1::jsonb
           WHERE id = $2`,
          [JSON.stringify(newEvent), explorationId]
        );
      }
    }

    let foundRelic: any = null;
    const discoveryRate = calculateRelicDiscoveryRate(members, newProgress, exploration.difficulty);
    if (Math.random() < discoveryRate * 0.15) {
      foundRelic = await generateRelic(exploration.civilization, userId);
      await query(
        `UPDATE explorations SET relics_found = array_append(relics_found, $1::uuid)
         WHERE id = $2`,
        [foundRelic.id, explorationId]
      );
      if (foundRelic.rarity === 'epic' || foundRelic.rarity === 'legendary') {
        await query(
          `INSERT INTO announcements (type, title, message, rarity, timestamp)
           VALUES ('relic_found', $1, $2, $3, NOW())`,
          [`发现${foundRelic.rarity === 'legendary' ? '传说级' : '史诗级'}文物！`, `玩家发现了 ${foundRelic.name}`, foundRelic.rarity]
        );
        broadcast(SocketEvents.RELIC_FOUND, foundRelic);
        broadcast(SocketEvents.ANNOUNCEMENT, {
          type: 'relic_found',
          title: `发现${foundRelic.rarity === 'legendary' ? '传说级' : '史诗级'}文物！`,
          message: `发现了 ${foundRelic.name}`,
          rarity: foundRelic.rarity,
          timestamp: Date.now(),
        });
      }
    }

    emitToUser(userId, SocketEvents.EXPLORATION_UPDATE, {
      type: 'progress',
      explorationId,
      progress: newProgress,
      event: newEvent,
      relic: foundRelic,
    });

    res.json({
      success: true,
      message: '进度更新成功',
      data: {
        progress: newProgress,
        event: newEvent,
        relic: foundRelic,
      },
    });
  } catch (error) {
    console.error('更新进度错误:', error);
    res.status(500).json({
      success: false,
      message: '更新进度失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.post('/:id/events/:eventId/resolve', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const explorationId = req.params.id;
    const eventId = req.params.eventId;
    const { choiceId } = req.body || {};

    if (!choiceId) {
      return res.status(400).json({
        success: false,
        message: '请选择一个选项',
      });
    }

    const explorationResult = await query<any>(
      `SELECT e.id, e.status, e.team_id, e.progress, e.ruin_id, e.events_triggered, e.relics_found,
              r.civilization, r.difficulty
       FROM explorations e
       LEFT JOIN ruins r ON e.ruin_id = r.id
       WHERE e.id = $1 AND e.player_id = $2`,
      [explorationId, userId]
    );

    if (!explorationResult.rowCount || explorationResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '探索记录不存在',
      });
    }

    const exploration: any = explorationResult.rows[0];
    if (exploration.status !== 'exploring') {
      return res.status(400).json({
        success: false,
        message: '探索已结束',
      });
    }

    const events: any[] = exploration.events_triggered || [];
    const eventIndex = events.findIndex((e) => e.id === eventId || e.templateId === eventId);
    if (eventIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '事件不存在',
      });
    }

    const event = events[eventIndex];
    if (event.resolved) {
      return res.status(400).json({
        success: false,
        message: '事件已解决',
      });
    }

    const choice = event.choices.find((c: any) => c.id === choiceId);
    if (!choice) {
      return res.status(400).json({
        success: false,
        message: '选项不存在',
      });
    }

    const teamResult = await query<any>(
      `SELECT member_ids FROM teams WHERE id = $1`,
      [exploration.team_id]
    );
    let teamMembers: any[] = [];
    if (teamResult.rowCount && teamResult.rowCount > 0 && (teamResult.rows[0] as any).member_ids?.length > 0) {
      const membersResult = await query<any>(
        `SELECT profession, skill_level, skills, luck FROM team_members WHERE id = ANY($1::uuid[])`,
        [(teamResult.rows[0] as any).member_ids]
      );
      teamMembers = membersResult.rows;
    }

    let successRate = choice.successRate;
    if (choice.requiredSkill) {
      const hasSkill = teamMembers.some(
        (m) => m.profession === choice.requiredSkill.profession && m.skill_level >= choice.requiredSkill.minLevel
      );
      if (!hasSkill) {
        successRate *= 0.5;
      } else {
        successRate = Math.min(0.98, successRate + 0.1);
      }
    }

    const success = Math.random() < successRate;
    const effects = choice.effects || {};

    let progressDelta = 0;
    let goldDelta = 0;
    let foundRelic: any = null;

    if (success) {
      if (effects.progressChange) progressDelta += effects.progressChange;
      if (effects.goldChange) goldDelta += effects.goldChange;
      if (effects.findRelic) {
        foundRelic = await generateRelic(exploration.civilization, userId);
        await query(
          `UPDATE explorations SET relics_found = array_append(relics_found, $1::uuid)
           WHERE id = $2`,
          [foundRelic.id, explorationId]
        );
        if (foundRelic.rarity === 'epic' || foundRelic.rarity === 'legendary') {
          await query(
            `INSERT INTO announcements (type, title, message, rarity, timestamp)
             VALUES ('relic_found', $1, $2, $3, NOW())`,
            [`发现${foundRelic.rarity === 'legendary' ? '传说级' : '史诗级'}文物！`, `玩家发现了 ${foundRelic.name}`, foundRelic.rarity]
          );
          broadcast(SocketEvents.RELIC_FOUND, foundRelic);
          broadcast(SocketEvents.ANNOUNCEMENT, {
            type: 'relic_found',
            title: `发现${foundRelic.rarity === 'legendary' ? '传说级' : '史诗级'}文物！`,
            message: `发现了 ${foundRelic.name}`,
            rarity: foundRelic.rarity,
            timestamp: Date.now(),
          });
        }
      }
    } else {
      if (effects.damage) {
        goldDelta -= getRandomInt(50, 300);
      }
      progressDelta -= 5;
    }

    const newProgress = Math.max(0, Math.min(100, (exploration.progress || 0) + progressDelta));

    if (goldDelta !== 0) {
      if (goldDelta > 0) {
        await query('UPDATE players SET gold = gold + $1 WHERE id = $2', [goldDelta, userId]);
      } else {
        await query('UPDATE players SET gold = GREATEST(0, gold + $1) WHERE id = $2', [goldDelta, userId]);
      }
    }

    const result = {
      success,
      message: success ? '成功！' : '失败...',
      effects,
      goldDelta,
      progressDelta,
    };

    events[eventIndex] = {
      ...event,
      resolved: true,
      result,
    };

    await query(
      `UPDATE explorations SET events_triggered = $1::jsonb, progress = $2 WHERE id = $3`,
      [JSON.stringify(events), newProgress, explorationId]
    );

    res.json({
      success: true,
      message: success ? '事件解决成功' : '事件解决失败',
      data: {
        result,
        progress: newProgress,
        relic: foundRelic,
      },
    });
  } catch (error) {
    console.error('解决事件错误:', error);
    res.status(500).json({
      success: false,
      message: '解决事件失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.post('/:id/complete', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const explorationId = req.params.id;

    const explorationResult = await query<any>(
      `SELECT e.id, e.progress, e.status, e.ruin_id, e.team_id, e.relics_found, e.start_time,
              r.name as ruin_name, r.civilization, r.difficulty, r.rewards
       FROM explorations e
       LEFT JOIN ruins r ON e.ruin_id = r.id
       WHERE e.id = $1 AND e.player_id = $2`,
      [explorationId, userId]
    );

    if (!explorationResult.rowCount || explorationResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '探索记录不存在',
      });
    }

    const exploration: any = explorationResult.rows[0];

    if (exploration.status === 'completed' || exploration.status === 'failed') {
      return res.status(400).json({
        success: false,
        message: '探索已结束',
      });
    }

    const timer = explorationTimers.get(explorationId);
    if (timer) {
      clearInterval(timer);
      explorationTimers.delete(explorationId);
    }

    const rewards = exploration.rewards || {};
    const goldReward = getRandomInt(rewards.goldMin || 100, rewards.goldMax || 500);
    const expReward = rewards.exp || 50;
    const progress = exploration.progress || 0;
    const completionBonus = Math.round(progress / 100 * goldReward);
    const totalGold = goldReward + completionBonus;

    let bonusRelic: any = null;
    if (progress >= 80) {
      const teamResult = await query<any>(
        `SELECT member_ids FROM teams WHERE id = $1`,
        [exploration.team_id]
      );
      let teamMembers: any[] = [];
      if (teamResult.rowCount && teamResult.rowCount > 0 && (teamResult.rows[0] as any).member_ids?.length > 0) {
        const membersResult = await query<any>(
          `SELECT skills, luck FROM team_members WHERE id = ANY($1::uuid[])`,
          [(teamResult.rows[0] as any).member_ids]
        );
        teamMembers = membersResult.rows;
      }
      const discoveryRate = calculateRelicDiscoveryRate(teamMembers, progress, exploration.difficulty);
      if (Math.random() < discoveryRate * 2) {
        bonusRelic = await generateRelic(exploration.civilization, userId);
        await query(
          `UPDATE explorations SET relics_found = array_append(relics_found, $1::uuid)
           WHERE id = $2`,
          [bonusRelic.id, explorationId]
        );
        if (bonusRelic.rarity === 'epic' || bonusRelic.rarity === 'legendary') {
          await query(
            `INSERT INTO announcements (type, title, message, rarity, timestamp)
             VALUES ('relic_found', $1, $2, $3, NOW())`,
            [`发现${bonusRelic.rarity === 'legendary' ? '传说级' : '史诗级'}文物！`, `玩家在${exploration.ruin_name}发现了 ${bonusRelic.name}`, bonusRelic.rarity]
          );
          broadcast(SocketEvents.RELIC_FOUND, bonusRelic);
          broadcast(SocketEvents.ANNOUNCEMENT, {
            type: 'relic_found',
            title: `发现${bonusRelic.rarity === 'legendary' ? '传说级' : '史诗级'}文物！`,
            message: `在${exploration.ruin_name}发现了 ${bonusRelic.name}`,
            rarity: bonusRelic.rarity,
            timestamp: Date.now(),
          });
        }
      }
    }

    await query('BEGIN');

    await query(
      'UPDATE players SET gold = gold + $1, exp = exp + $2, total_relic_value = total_relic_value + $3 WHERE id = $4',
      [totalGold, expReward, bonusRelic ? bonusRelic.estimatedPrice : 0, userId]
    );

    const finalStatus = progress >= 50 ? 'completed' : 'failed';
    await query(
      `UPDATE explorations SET status = $1, end_time = NOW() WHERE id = $2`,
      [finalStatus, explorationId]
    );

    await query('COMMIT');

    const updatedExploration = await query<any>(
      `SELECT relics_found FROM explorations WHERE id = $1`,
      [explorationId]
    );

    const finalRelicIds = (updatedExploration.rows[0] as any).relics_found || [];
    let relicDetails: any[] = [];
    if (finalRelicIds.length > 0) {
      const relicsResult = await query<any>(
        `SELECT id, name, civilization, completeness, rarity, historical_value, estimated_price, description, image, fragments, discovered_at
         FROM relics WHERE id = ANY($1::uuid[])`,
        [finalRelicIds]
      );
      relicDetails = relicsResult.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        civilization: r.civilization,
        completeness: r.completeness,
        rarity: r.rarity,
        historicalValue: r.historical_value,
        estimatedPrice: r.estimated_price,
        description: r.description,
        image: r.image,
        fragments: r.fragments,
        discoveredAt: r.discovered_at,
      }));
    }

    res.json({
      success: true,
      message: finalStatus === 'completed' ? '探索完成！' : '探索失败',
      data: {
        status: finalStatus,
        rewards: {
          gold: totalGold,
          exp: expReward,
          completionBonus,
        },
        relics: relicDetails,
        bonusRelic,
        finalProgress: progress,
      },
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('完成探索错误:', error);
    res.status(500).json({
      success: false,
      message: '完成探索失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

export default router;
