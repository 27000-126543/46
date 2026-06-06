import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { query } from '../lib/db';
import { config } from '../config';
import { auth, signToken } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { ConflictError, UnauthorizedError, BadRequestError } from '../middleware/errorHandler';
import { generateId } from '../utils/helpers';

const router = Router();

interface PlayerRow {
  id: string;
  username: string;
  email: string;
  password_hash: string;
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

interface SimpleIdRow {
  id: string;
}

const registerSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符').max(50, '用户名最多50个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少6个字符').max(100, '密码最多100个字符'),
});

const loginSchema = z.object({
  username: z.string().min(1, '请输入用户名或邮箱').optional(),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  password: z.string().min(1, '请输入密码'),
}).refine((data) => data.username || data.email, {
  message: '请输入用户名或邮箱',
  path: ['username'],
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

router.post('/register', async (req: Request, res: Response, next) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await query<SimpleIdRow>(
      'SELECT id FROM players WHERE username = $1 OR email = $2 LIMIT 1',
      [validated.username, validated.email]
    );

    if (existingUser.rows.length > 0) {
      throw new ConflictError('用户名或邮箱已被注册');
    }

    const hashedPassword = await bcrypt.hash(validated.password, config.SALT_ROUNDS);

    const playerId = generateId('player');

    const result = await query<PlayerRow>(
      `INSERT INTO players (id, username, email, password_hash, name, avatar, level, exp, gold, gems, total_relic_value, museum_score, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING id, username, email, password_hash, name, avatar, level, exp, gold, gems, total_relic_value, museum_score, created_at, updated_at`,
      [
        playerId,
        validated.username,
        validated.email,
        hashedPassword,
        validated.username,
        '🧑‍🔬',
        1,
        0,
        5000,
        100,
        0,
        0,
      ]
    );

    const player = result.rows[0];
    const token = signToken(player.id);

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        player: formatPlayer(player),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req: Request, res: Response, next) => {
  try {
    const validated = loginSchema.parse(req.body);

    const identifier = validated.username || validated.email;
    if (!identifier) {
      throw new BadRequestError('请输入用户名或邮箱');
    }

    const result = await query<PlayerRow>(
      `SELECT id, username, email, password_hash, name, avatar, level, exp, gold, gems, total_relic_value, museum_score, created_at, updated_at
       FROM players
       WHERE username = $1 OR email = $1
       LIMIT 1`,
      [identifier]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const player = result.rows[0];
    const isPasswordValid = await bcrypt.compare(validated.password, player.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('用户名或密码错误');
    }

    const token = signToken(player.id);

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        player: formatPlayer(player),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/me', auth, async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('未授权');
    }

    const result = await query<PlayerRow>(
      `SELECT id, username, email, password_hash, name, avatar, level, exp, gold, gems, total_relic_value, museum_score, created_at, updated_at
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
      message: '获取用户信息成功',
      data: formatPlayer(player),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
