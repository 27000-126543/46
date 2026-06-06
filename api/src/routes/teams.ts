import { Router, Response } from 'express';
import { query } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest, Profession, Rarity } from '../types';
import { generateId, getRandomInt, rarityWeightedRandom } from '../utils/helpers';

const router = Router();

const professionNames: Record<Profession, string> = {
  explorer: '探险家',
  linguist: '语言学家',
  engineer: '工程师',
  archaeologist: '考古学家',
  historian: '历史学家',
};

const professionIcons: Record<Profession, string> = {
  explorer: '🧭',
  linguist: '📜',
  engineer: '🔧',
  archaeologist: '🏺',
  historian: '📚',
};

const rarityWeight: Record<Rarity, number> = {
  common: 60,
  rare: 25,
  epic: 12,
  legendary: 3,
};

const recruitCost: Record<Rarity, { gold: number; gems: number }> = {
  common: { gold: 500, gems: 0 },
  rare: { gold: 2000, gems: 5 },
  epic: { gold: 8000, gems: 20 },
  legendary: { gold: 30000, gems: 80 },
};

const professions: Profession[] = ['explorer', 'linguist', 'engineer', 'archaeologist', 'historian'];

const firstNames = ['林', '陈', '王', '苏', '周', '阿', '李', '张', '方', '赵', '小', '马', '艾', '哈', '娜', '老', '汤', '卡', '沈', '苏', '珍', '美'];
const lastNames = ['风', '静怡', '铁柱', '雅', '博文', '力', '雪', '师傅', '晓', '老师', '明', '红', '可', '桑', '塔莎', '王', '尼', '洛斯', '教授', '菲', '妮', '丽'];

function generateRandomName(): string {
  const first = firstNames[Math.floor(Math.random() * firstNames.length)];
  const last = lastNames[Math.floor(Math.random() * lastNames.length)];
  return first + last;
}

function generateSkillsByProfession(profession: Profession, skillLevel: number, rarity: Rarity) {
  const baseMultiplier = { common: 1, rare: 1.3, epic: 1.6, legendary: 2 }[rarity];
  const levelBonus = skillLevel * 8;

  const skills = {
    explorationSpeed: 0,
    relicDiscovery: 0,
    trapHandling: 0,
    repairBonus: 0,
  };

  switch (profession) {
    case 'explorer':
      skills.explorationSpeed = Math.round((60 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.trapHandling = Math.round((50 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.relicDiscovery = Math.round((40 + levelBonus * 0.5) * baseMultiplier + getRandomInt(0, 15));
      skills.repairBonus = Math.round((30 + levelBonus * 0.3) * baseMultiplier + getRandomInt(0, 10));
      break;
    case 'linguist':
      skills.relicDiscovery = Math.round((60 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.repairBonus = Math.round((50 + levelBonus) * baseMultiplier + getRandomInt(0, 15));
      skills.explorationSpeed = Math.round((30 + levelBonus * 0.4) * baseMultiplier + getRandomInt(0, 10));
      skills.trapHandling = Math.round((25 + levelBonus * 0.3) * baseMultiplier + getRandomInt(0, 10));
      break;
    case 'engineer':
      skills.trapHandling = Math.round((60 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.repairBonus = Math.round((60 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.explorationSpeed = Math.round((45 + levelBonus * 0.5) * baseMultiplier + getRandomInt(0, 15));
      skills.relicDiscovery = Math.round((30 + levelBonus * 0.3) * baseMultiplier + getRandomInt(0, 10));
      break;
    case 'archaeologist':
      skills.relicDiscovery = Math.round((65 + levelBonus) * baseMultiplier + getRandomInt(0, 25));
      skills.repairBonus = Math.round((55 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.explorationSpeed = Math.round((35 + levelBonus * 0.4) * baseMultiplier + getRandomInt(0, 10));
      skills.trapHandling = Math.round((40 + levelBonus * 0.4) * baseMultiplier + getRandomInt(0, 10));
      break;
    case 'historian':
      skills.repairBonus = Math.round((55 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.relicDiscovery = Math.round((50 + levelBonus) * baseMultiplier + getRandomInt(0, 20));
      skills.explorationSpeed = Math.round((30 + levelBonus * 0.3) * baseMultiplier + getRandomInt(0, 10));
      skills.trapHandling = Math.round((30 + levelBonus * 0.3) * baseMultiplier + getRandomInt(0, 10));
      break;
  }

  return {
    explorationSpeed: Math.min(100, skills.explorationSpeed),
    relicDiscovery: Math.min(100, skills.relicDiscovery),
    trapHandling: Math.min(100, skills.trapHandling),
    repairBonus: Math.min(100, skills.repairBonus),
  };
}

function generateDescription(profession: Profession, rarity: Rarity, skillLevel: number): string {
  const rarityDesc: Record<Rarity, string> = {
    common: '刚入行的新人',
    rare: '有一定经验的从业者',
    epic: '业内知名的专家',
    legendary: '传说中的大师级人物',
  };
  const profDesc = professionNames[profession];
  return `${rarityDesc[rarity]}${profDesc}，技能等级 ${skillLevel}。`;
}

function generateLuckByRarity(rarity: Rarity): number {
  switch (rarity) {
    case 'common':
      return getRandomInt(2, 5);
    case 'rare':
      return getRandomInt(4, 7);
    case 'epic':
      return getRandomInt(5, 8);
    case 'legendary':
      return getRandomInt(7, 10);
  }
}

router.get('/members', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query<any>(
      `SELECT id, name, profession, skill_level, luck, rarity, avatar, skills, description, is_recruited, created_at, updated_at
       FROM team_members WHERE player_id = $1 AND is_recruited = true ORDER BY created_at DESC`,
      [userId]
    );

    const members = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      profession: row.profession,
      skillLevel: row.skill_level,
      luck: row.luck,
      rarity: row.rarity,
      avatar: row.avatar,
      skills: row.skills,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json({
      success: true,
      message: '获取队员列表成功',
      data: members,
    });
  } catch (error) {
    console.error('获取队员列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取队员列表失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.post('/members/recruit', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { useGems = false } = req.body || {};

    const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
    const weights = rarities.map((r) => rarityWeight[r]);
    const rarity = rarityWeightedRandom(rarities, weights);

    const cost = recruitCost[rarity];
    const actualCost = useGems ? cost.gems : cost.gold;

    const playerResult = await query<any>(
      'SELECT gold, gems, level FROM players WHERE id = $1',
      [userId]
    );

    if (!playerResult.rowCount || playerResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '玩家不存在',
      });
    }

    const player: any = playerResult.rows[0];

    if (useGems) {
      if (player.gems < actualCost) {
        return res.status(400).json({
          success: false,
          message: `宝石不足，需要 ${actualCost} 宝石`,
        });
      }
    } else {
      if (player.gold < actualCost) {
        return res.status(400).json({
          success: false,
          message: `金币不足，需要 ${actualCost} 金币`,
        });
      }
    }

    const profession = professions[Math.floor(Math.random() * professions.length)];
    const skillLevelByRarity: Record<Rarity, number> = {
      common: getRandomInt(1, 2),
      rare: getRandomInt(2, 3),
      epic: getRandomInt(3, 4),
      legendary: getRandomInt(4, 5),
    };
    const skillLevel = skillLevelByRarity[rarity];

    const newMember = {
      id: generateId('member'),
      name: generateRandomName(),
      profession,
      skillLevel,
      luck: generateLuckByRarity(rarity),
      rarity,
      avatar: professionIcons[profession],
      skills: generateSkillsByProfession(profession, skillLevel, rarity),
      description: generateDescription(profession, rarity, skillLevel),
    };

    await query('BEGIN');

    if (useGems) {
      await query('UPDATE players SET gems = gems - $1 WHERE id = $2', [actualCost, userId]);
    } else {
      await query('UPDATE players SET gold = gold - $1 WHERE id = $2', [actualCost, userId]);
    }

    await query(
      `INSERT INTO team_members (id, name, profession, skill_level, luck, rarity, avatar, skills, description, player_id, is_recruited)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, true)`,
      [
        newMember.id,
        newMember.name,
        newMember.profession,
        newMember.skillLevel,
        newMember.luck,
        newMember.rarity,
        newMember.avatar,
        JSON.stringify(newMember.skills),
        newMember.description,
        userId,
      ]
    );

    await query('COMMIT');

    res.json({
      success: true,
      message: `招募成功！获得${rarity === 'legendary' ? '传说级' : rarity === 'epic' ? '史诗级' : rarity === 'rare' ? '稀有级' : '普通'}队员`,
      data: {
        member: newMember,
        cost: {
          type: useGems ? 'gems' : 'gold',
          amount: actualCost,
        },
      },
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('招募队员错误:', error);
    res.status(500).json({
      success: false,
      message: '招募队员失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.get('/active', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const teamResult = await query<any>(
      `SELECT id, name, member_ids, active, created_at, updated_at
       FROM teams WHERE player_id = $1 AND active = true LIMIT 1`,
      [userId]
    );

    if (!teamResult.rowCount || teamResult.rowCount === 0) {
      return res.json({
        success: true,
        message: '暂无活跃队伍',
        data: null,
      });
    }

    const team: any = teamResult.rows[0];
    const memberIds = team.member_ids || [];

    let members: any[] = [];
    if (memberIds.length > 0) {
      const membersResult = await query<any>(
        `SELECT id, name, profession, skill_level, luck, rarity, avatar, skills, description
         FROM team_members WHERE id = ANY($1::uuid[]) AND is_recruited = true`,
        [memberIds]
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
        description: row.description,
      }));
    }

    res.json({
      success: true,
      message: '获取活跃队伍成功',
      data: {
        id: team.id,
        name: team.name,
        memberIds,
        members,
        active: team.active,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
      },
    });
  } catch (error) {
    console.error('获取活跃队伍错误:', error);
    res.status(500).json({
      success: false,
      message: '获取活跃队伍失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.put('/active', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { memberIds, name } = req.body || {};

    if (!Array.isArray(memberIds)) {
      return res.status(400).json({
        success: false,
        message: '队员ID列表格式错误',
      });
    }

    if (memberIds.length < 1 || memberIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: '队伍人数必须在1-5人之间',
      });
    }

    const membersResult = await query<any>(
      `SELECT id FROM team_members WHERE id = ANY($1::uuid[]) AND player_id = $2 AND is_recruited = true`,
      [memberIds, userId]
    );

    if (!membersResult.rowCount || membersResult.rowCount !== memberIds.length) {
      return res.status(400).json({
        success: false,
        message: '部分队员不存在或不属于当前玩家',
      });
    }

    const teamResult = await query<any>(
      'SELECT id FROM teams WHERE player_id = $1 AND active = true LIMIT 1',
      [userId]
    );

    let teamId: string;
    const teamName = name || '我的考古队';

    if (teamResult.rowCount && teamResult.rowCount > 0) {
      teamId = (teamResult.rows[0] as any).id;
      await query(
        'UPDATE teams SET member_ids = $1, name = $2 WHERE id = $3',
        [memberIds, teamName, teamId]
      );
    } else {
      teamId = generateId('team');
      await query(
        `INSERT INTO teams (id, name, player_id, member_ids, active)
         VALUES ($1, $2, $3, $4, true)`,
        [teamId, teamName, userId, memberIds]
      );
    }

    const updatedTeam = await query<any>(
      `SELECT id, name, member_ids, active, created_at, updated_at FROM teams WHERE id = $1`,
      [teamId]
    );

    const team: any = updatedTeam.rows[0];

    res.json({
      success: true,
      message: '更新队伍成功',
      data: {
        id: team.id,
        name: team.name,
        memberIds: team.member_ids,
        active: team.active,
        createdAt: team.created_at,
        updatedAt: team.updated_at,
      },
    });
  } catch (error) {
    console.error('更新队伍错误:', error);
    res.status(500).json({
      success: false,
      message: '更新队伍失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

router.delete('/members/:id', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const memberId = req.params.id;

    const memberResult = await query<any>(
      'SELECT id, player_id FROM team_members WHERE id = $1',
      [memberId]
    );

    if (!memberResult.rowCount || memberResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: '队员不存在',
      });
    }

    if ((memberResult.rows[0] as any).player_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权操作此队员',
      });
    }

    const teamResult = await query<any>(
      'SELECT id, member_ids FROM teams WHERE player_id = $1 AND active = true LIMIT 1',
      [userId]
    );

    await query('BEGIN');

    if (teamResult.rowCount && teamResult.rowCount > 0) {
      const team: any = teamResult.rows[0];
      const newMemberIds = (team.member_ids || []).filter((id: string) => id !== memberId);
      await query(
        'UPDATE teams SET member_ids = $1 WHERE id = $2',
        [newMemberIds, team.id]
      );
    }

    await query(
      'UPDATE team_members SET is_recruited = false, player_id = NULL WHERE id = $1',
      [memberId]
    );

    await query('COMMIT');

    res.json({
      success: true,
      message: '解雇队员成功',
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('解雇队员错误:', error);
    res.status(500).json({
      success: false,
      message: '解雇队员失败',
      errors: [error instanceof Error ? error.message : '未知错误'],
    });
  }
});

export default router;
