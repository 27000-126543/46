import { Router, Request, Response } from 'express';
import { query } from '../lib/db';
import { optionalAuth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();

interface RuinRow {
  id: string;
  name: string;
  civilization: string;
  difficulty: number;
  description: string;
  image: string;
  min_level: number;
  estimated_time: number;
  potential_relics?: string[];
  event_pool?: string[];
  rewards?: {
    goldMin: number;
    goldMax: number;
    exp: number;
  };
}

interface RuinRewards {
  goldMin: number;
  goldMax: number;
  exp: number;
}

function formatRuin(row: RuinRow) {
  return {
    id: row.id,
    name: row.name,
    civilization: row.civilization,
    difficulty: row.difficulty,
    description: row.description,
    image: row.image,
    minLevel: row.min_level,
    estimatedTime: row.estimated_time,
    potentialRelics: (row.potential_relics as string[]) || [],
    eventPool: (row.event_pool as string[]) || [],
    rewards: (row.rewards as RuinRewards) || {
      goldMin: 0,
      goldMax: 0,
      exp: 0,
    },
  };
}

router.get('/', optionalAuth, async (_req: AuthenticatedRequest, res: Response, next) => {
  try {
    const result = await query<RuinRow>(
      `SELECT id, name, civilization, difficulty, description, image, min_level, estimated_time, potential_relics, event_pool, rewards
       FROM ruins
       ORDER BY min_level ASC, difficulty ASC`
    );

    const ruins = result.rows.map((row: RuinRow) => formatRuin(row));

    res.json({
      success: true,
      message: '获取遗迹列表成功',
      data: ruins,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', optionalAuth, async (req: Request, res: Response, next) => {
  try {
    const { id } = req.params;

    const result = await query<RuinRow>(
      `SELECT id, name, civilization, difficulty, description, image, min_level, estimated_time, potential_relics, event_pool, rewards
       FROM ruins
       WHERE id = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('遗迹不存在');
    }

    const row = result.rows[0];

    res.json({
      success: true,
      message: '获取遗迹详情成功',
      data: formatRuin(row),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
