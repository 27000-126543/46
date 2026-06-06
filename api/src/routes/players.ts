import { Router, Response } from 'express';
import { z } from 'zod';
import { query } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { UnauthorizedError, BadRequestError, NotFoundError } from '../middleware/errorHandler';
import { generateId } from '../utils/helpers';

const router = Router();

interface PlayerRow {
  id: string;
  username: string;
  email: string;
  name: string;
  avatar: string;
  level: number;
  exp: number;
  gold: number;
  gems: number;
  total_relic_value: number;
  museum_score: number;
  created_at: string;
  updated_at: string;
}

interface PlayerGoldRow {
  id: string;
  gold: number;
}

interface CountRow {
  count: string;
}

interface AnnouncementRow {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: number;
  rarity?: string;
}

interface MaterialRow {
  id: string;
  name: string;
  type: string;
  quality: number;
  amount: number;
  icon: string;
}

interface MaterialAmountRow {
  id: string;
  amount: number;
}

const updateProfileSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(50, '名称最多50个字符').optional(),
  avatar: z.string().max(10, '头像最多10个字符').optional(),
});

const goldSchema = z.object({
  amount: z.number().int('金额必须是整数'),
});

const announcementQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const addMaterialSchema = z.object({
  name: z.string().min(1, '材料名称不能为空'),
  type: z.enum(['fragment', 'adhesive', 'polish', 'tool']),
  quality: z.number().int().min(1).max(10),
  amount: z.number().int().min(1),
  icon: z.string().max(10, '图标最多10个字符').optional(),
});

const useMaterialSchema = z.object({
  amount: z.number().int().min(1, '使用数量至少为1'),
});

function formatPlayer(row: PlayerRow) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    name: row.name,
    avatar: row.avatar,
    level: row.level,
    exp: row.exp,
    gold: row.gold,
    gems: row.gems,
    totalRelicValue: row.total_relic_value,
    museumScore: row.museum_score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get('/profile', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const result = await query<PlayerRow>(
      `SELECT id, username, email, name, avatar, level, exp, gold, gems, total_relic_value, museum_score, created_at, updated_at
       FROM players
       WHERE id = $1
       LIMIT 1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('用户不存在');
    }

    const player = result.rows[0];

    res.json({
      success: true,
      message: '获取玩家信息成功',
      data: formatPlayer(player),
    });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const validated = updateProfileSchema.parse(req.body);

    const fields: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (validated.name !== undefined) {
      fields.push(`name = $${paramIndex}`);
      values.push(validated.name);
      paramIndex++;
    }

    if (validated.avatar !== undefined) {
      fields.push(`avatar = $${paramIndex}`);
      values.push(validated.avatar);
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new BadRequestError('没有需要更新的字段');
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.user.userId);

    const result = await query<PlayerRow>(
      `UPDATE players
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, username, email, name, avatar, level, exp, gold, gems, total_relic_value, museum_score, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('用户不存在');
    }

    const player = result.rows[0];

    res.json({
      success: true,
      message: '更新玩家信息成功',
      data: formatPlayer(player),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/gold', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const validated = goldSchema.parse(req.body);

    const result = await query<PlayerGoldRow>(
      `UPDATE players
       SET gold = GREATEST(0, gold + $1), updated_at = NOW()
       WHERE id = $2
       RETURNING id, gold`,
      [validated.amount, req.user.userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('用户不存在');
    }

    const player = result.rows[0];

    res.json({
      success: true,
      message: validated.amount >= 0 ? '增加金币成功' : '扣除金币成功',
      data: {
        id: player.id,
        gold: player.gold,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/announcements', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const validated = announcementQuerySchema.parse(req.query);

    const countResult = await query<CountRow>(
      'SELECT COUNT(*) FROM announcements WHERE player_id = $1',
      [req.user.userId]
    );

    const result = await query<AnnouncementRow>(
      `SELECT id, type, title, message, timestamp, rarity
       FROM announcements
       WHERE player_id = $1
       ORDER BY timestamp DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, validated.limit, validated.offset]
    );

    res.json({
      success: true,
      message: '获取公告列表成功',
      data: {
        items: result.rows.map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          message: row.message,
          timestamp: row.timestamp,
          rarity: row.rarity,
        })),
        total: parseInt(countResult.rows[0].count, 10),
        limit: validated.limit,
        offset: validated.offset,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/materials', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const result = await query<MaterialRow>(
      `SELECT id, name, type, quality, amount, icon
       FROM materials
       WHERE player_id = $1
       ORDER BY type, quality DESC`,
      [req.user.userId]
    );

    res.json({
      success: true,
      message: '获取材料列表成功',
      data: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        type: row.type,
        quality: row.quality,
        amount: row.amount,
        icon: row.icon,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/materials', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const validated = addMaterialSchema.parse(req.body);

    const existingResult = await query<MaterialAmountRow>(
      `SELECT id, amount FROM materials WHERE player_id = $1 AND name = $2 AND type = $3 AND quality = $4 LIMIT 1`,
      [req.user.userId, validated.name, validated.type, validated.quality]
    );

    let material: MaterialRow;

    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      const result = await query<MaterialRow>(
        `UPDATE materials
         SET amount = amount + $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, type, quality, amount, icon`,
        [validated.amount, existing.id]
      );
      material = result.rows[0];
    } else {
      const materialId = generateId('material');
      const result = await query<MaterialRow>(
        `INSERT INTO materials (id, player_id, name, type, quality, amount, icon, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, name, type, quality, amount, icon`,
        [
          materialId,
          req.user.userId,
          validated.name,
          validated.type,
          validated.quality,
          validated.amount,
          validated.icon || '📦',
        ]
      );
      material = result.rows[0];
    }

    res.status(201).json({
      success: true,
      message: '添加材料成功',
      data: {
        id: material.id,
        name: material.name,
        type: material.type,
        quality: material.quality,
        amount: material.amount,
        icon: material.icon,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/materials/:id', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const { id } = req.params;
    const validated = useMaterialSchema.parse(req.body);

    const existingResult = await query<MaterialRow>(
      'SELECT id, name, type, quality, amount, icon FROM materials WHERE id = $1 AND player_id = $2 LIMIT 1',
      [id, req.user.userId]
    );

    if (existingResult.rows.length === 0) {
      throw new NotFoundError('材料不存在');
    }

    const existing = existingResult.rows[0];

    if (existing.amount < validated.amount) {
      throw new BadRequestError('材料数量不足');
    }

    const newAmount = existing.amount - validated.amount;

    let material: MaterialRow;

    if (newAmount <= 0) {
      await query(
        'DELETE FROM materials WHERE id = $1',
        [id]
      );
      material = { ...existing, amount: 0 };
    } else {
      const result = await query<MaterialRow>(
        `UPDATE materials
         SET amount = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, type, quality, amount, icon`,
        [newAmount, id]
      );
      material = result.rows[0];
    }

    res.json({
      success: true,
      message: '使用材料成功',
      data: {
        id: material.id,
        name: material.name,
        type: material.type,
        quality: material.quality,
        amount: material.amount,
        icon: material.icon,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
