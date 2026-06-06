import { Router, Response } from 'express';
import { query } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest, Civilization, Relic } from '../types';
import { generateId, getRandomInt, calculateMuseumAttractiveness } from '../utils/helpers';
import { emitToUser } from '../lib/socket';
import { SocketEvents } from '../lib/socket';

const router = Router();

const defaultHalls = [
  {
    id: generateId('hall'),
    name: '主展厅',
    level: 1,
    capacity: 5,
    theme: 'mixed' as Civilization | 'mixed',
    bonus: 1.0,
    displaySlots: [
      { id: generateId('slot'), relicId: null, position: { x: 0, y: 0 } },
      { id: generateId('slot'), relicId: null, position: { x: 1, y: 0 } },
      { id: generateId('slot'), relicId: null, position: { x: 2, y: 0 } },
    ],
  },
];

const defaultLayout = defaultHalls.map(hall => ({
  hallId: hall.id,
  displaySlots: hall.displaySlots,
}));

router.get('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    let result = await query(
      `SELECT id, name, level, player_id, ticket_price, attractiveness,
              halls, layout, income_history, last_collect_time, created_at
       FROM museums WHERE player_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      const museumId = generateId('mus');
      const now = Date.now();

      await query(
        `INSERT INTO museums (
          id, name, level, player_id, ticket_price, attractiveness,
          halls, layout, income_history, last_collect_time, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11)`,
        [
          museumId,
          '我的博物馆',
          1,
          userId,
          10,
          0,
          JSON.stringify(defaultHalls),
          JSON.stringify(defaultLayout),
          JSON.stringify([]),
          now,
          now,
        ]
      );

      result = await query(
        `SELECT id, name, level, player_id, ticket_price, attractiveness,
                halls, layout, income_history, last_collect_time, created_at
         FROM museums WHERE id = $1`,
        [museumId]
      );
    }

    const row = result.rows[0];
    const halls = row.halls || [];
    const layout = row.layout || [];

    const displayedRelicIds = layout
      .flatMap((l: { displaySlots: { relicId: string | null }[] }) =>
        l.displaySlots.map((s: { relicId: string | null }) => s.relicId)
      )
      .filter((id: string | null) => id !== null);

    let displayedRelics: Relic[] = [];
    if (displayedRelicIds.length > 0) {
      const relicsResult = await query(
        `SELECT id, name, civilization, completeness, rarity, historical_value,
                estimated_price, description, image, fragments, discovered_at,
                in_museum, on_market
         FROM relics WHERE id = ANY($1)`,
        [displayedRelicIds]
      );
      displayedRelics = relicsResult.rows.map(r => ({
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
        inMuseum: r.in_museum,
        onMarket: r.on_market,
        repairHistory: [],
      }));
    }

    let totalAttractiveness = 0;
    halls.forEach((hall: { level: number; theme: Civilization | 'mixed'; id: string }) => {
      const hallLayout = layout.find((l: { hallId: string }) => l.hallId === hall.id);
      const hallRelicIds = hallLayout
        ? hallLayout.displaySlots
            .map((s: { relicId: string | null }) => s.relicId)
            .filter((id: string | null) => id !== null)
        : [];
      const hallRelics = displayedRelics.filter(r => hallRelicIds.includes(r.id));
      const { attractiveness } = calculateMuseumAttractiveness(hallRelics, hall.level, hall.theme);
      totalAttractiveness += attractiveness;
    });

    const museum = {
      id: row.id,
      name: row.name,
      level: row.level,
      playerId: row.player_id,
      ticketPrice: row.ticket_price,
      attractiveness: totalAttractiveness,
      halls,
      layout,
      incomeHistory: row.income_history || [],
      lastCollectTime: row.last_collect_time,
      createdAt: row.created_at,
      displayedRelics,
    };

    res.json({
      success: true,
      message: '获取博物馆信息成功',
      data: museum,
    });
  } catch (error) {
    console.error('获取博物馆信息错误:', error);
    res.status(500).json({
      success: false,
      message: '获取博物馆信息失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.put('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, level } = req.body;

    const museumResult = await query(
      `SELECT id, level, player_id FROM museums WHERE player_id = $1`,
      [userId]
    );

    if (museumResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '博物馆不存在',
      });
    }

    const museum = museumResult.rows[0];

    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.length < 1 || name.length > 50) {
        return res.status(400).json({
          success: false,
          message: '博物馆名称无效',
          errors: { name: ['名称长度应在1-50个字符之间'] },
        });
      }
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }

    if (level !== undefined) {
      if (typeof level !== 'number' || level < 1 || level > 100) {
        return res.status(400).json({
          success: false,
          message: '等级无效',
          errors: { level: ['等级应在1-100之间'] },
        });
      }
      if (level <= museum.level) {
        return res.status(400).json({
          success: false,
          message: '新等级必须高于当前等级',
          errors: { level: ['新等级必须高于当前等级'] },
        });
      }
      updates.push(`level = $${paramIndex}`);
      params.push(level);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有需要更新的字段',
      });
    }

    params.push(userId);

    const result = await query(
      `UPDATE museums SET ${updates.join(', ')} WHERE player_id = $${paramIndex}
       RETURNING id, name, level`,
      params
    );

    res.json({
      success: true,
      message: '博物馆信息更新成功',
      data: {
        id: result.rows[0].id,
        name: result.rows[0].name,
        level: result.rows[0].level,
      },
    });
  } catch (error) {
    console.error('更新博物馆信息错误:', error);
    res.status(500).json({
      success: false,
      message: '更新博物馆信息失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.post('/halls', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, theme = 'mixed' } = req.body;

    const museumResult = await query(
      `SELECT id, halls, level FROM museums WHERE player_id = $1`,
      [userId]
    );

    if (museumResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '博物馆不存在',
      });
    }

    const museum = museumResult.rows[0];
    const halls = museum.halls || [];
    const maxHalls = 3 + Math.floor(museum.level / 5);

    if (halls.length >= maxHalls) {
      return res.status(400).json({
        success: false,
        message: `已达到展厅数量上限 (${maxHalls})`,
        errors: { halls: [`博物馆等级 ${museum.level} 最多支持 ${maxHalls} 个展厅`] },
      });
    }

    const validThemes = ['egypt', 'maya', 'atlantis', 'rome', 'china', 'mesopotamia', 'mixed'];
    if (!validThemes.includes(theme)) {
      return res.status(400).json({
        success: false,
        message: '无效的主题',
        errors: { theme: [`主题必须是: ${validThemes.join(', ')}`] },
      });
    }

    const hallName = name || `展厅 ${halls.length + 1}`;
    if (typeof hallName !== 'string' || hallName.length < 1 || hallName.length > 30) {
      return res.status(400).json({
        success: false,
        message: '展厅名称无效',
        errors: { name: ['名称长度应在1-30个字符之间'] },
      });
    }

    const newHall = {
      id: generateId('hall'),
      name: hallName,
      level: 1,
      capacity: 5,
      theme,
      bonus: 1.0,
      displaySlots: [
        { id: generateId('slot'), relicId: null, position: { x: 0, y: 0 } },
        { id: generateId('slot'), relicId: null, position: { x: 1, y: 0 } },
        { id: generateId('slot'), relicId: null, position: { x: 2, y: 0 } },
      ],
    };

    const updatedHalls = [...halls, newHall];
    const updatedLayout = [
      ...(museum.layout || []),
      {
        hallId: newHall.id,
        displaySlots: newHall.displaySlots,
      },
    ];

    await query(
      `UPDATE museums SET halls = $1::jsonb, layout = $2::jsonb WHERE player_id = $3`,
      [JSON.stringify(updatedHalls), JSON.stringify(updatedLayout), userId]
    );

    res.json({
      success: true,
      message: '展厅创建成功',
      data: newHall,
    });
  } catch (error) {
    console.error('创建展厅错误:', error);
    res.status(500).json({
      success: false,
      message: '创建展厅失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.put('/halls/:id', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const museumResult = await query(
      `SELECT m.id, m.halls, p.gold
       FROM museums m
       JOIN players p ON m.player_id = p.id
       WHERE m.player_id = $1`,
      [userId]
    );

    if (museumResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '博物馆不存在',
      });
    }

    const { halls, gold } = museumResult.rows[0];
    const hallIndex = halls.findIndex((h: { id: string }) => h.id === id);

    if (hallIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '展厅不存在',
      });
    }

    const hall = halls[hallIndex];
    const upgradeCost = Math.floor(500 * Math.pow(1.5, hall.level - 1));

    if (gold < upgradeCost) {
      return res.status(400).json({
        success: false,
        message: '金币不足',
        errors: { gold: [`升级需要 ${upgradeCost} 金币，当前 ${gold}`] },
      });
    }

    const updatedHall = {
      ...hall,
      level: hall.level + 1,
      capacity: hall.capacity + 2,
      bonus: hall.bonus + 0.1,
      displaySlots: [
        ...hall.displaySlots,
        { id: generateId('slot'), relicId: null, position: { x: hall.displaySlots.length, y: 0 } },
      ],
    };

    const updatedHalls = [...halls];
    updatedHalls[hallIndex] = updatedHall;

    await query('BEGIN');

    await query(
      `UPDATE museums SET halls = $1::jsonb WHERE player_id = $2`,
      [JSON.stringify(updatedHalls), userId]
    );

    await query(
      `UPDATE players SET gold = gold - $1 WHERE id = $2`,
      [upgradeCost, userId]
    );

    await query('COMMIT');

    res.json({
      success: true,
      message: `展厅升级到 ${updatedHall.level} 级成功`,
      data: {
        hall: updatedHall,
        cost: upgradeCost,
      },
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('升级展厅错误:', error);
    res.status(500).json({
      success: false,
      message: '升级展厅失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.put('/layout', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { layout } = req.body;

    if (!layout || !Array.isArray(layout)) {
      return res.status(400).json({
        success: false,
        message: '布局数据无效',
        errors: { layout: ['layout 必须是数组'] },
      });
    }

    const museumResult = await query(
      `SELECT id, halls FROM museums WHERE player_id = $1`,
      [userId]
    );

    if (museumResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '博物馆不存在',
      });
    }

    const halls = museumResult.rows[0].halls || [];
    const validHallIds = halls.map((h: { id: string }) => h.id);

    for (const layoutItem of layout) {
      if (!validHallIds.includes(layoutItem.hallId)) {
        return res.status(400).json({
          success: false,
          message: `无效的展厅 ID: ${layoutItem.hallId}`,
          errors: { layout: [`展厅 ${layoutItem.hallId} 不存在`] },
        });
      }

      if (layoutItem.displaySlots && Array.isArray(layoutItem.displaySlots)) {
        const relicIds = layoutItem.displaySlots
          .map((s: { relicId: string | null }) => s.relicId)
          .filter((id: string | null) => id !== null);

        if (relicIds.length > 0) {
          const relicsResult = await query(
            `SELECT id, player_id, in_museum, on_market FROM relics WHERE id = ANY($1)`,
            [relicIds]
          );

          for (const relic of relicsResult.rows) {
            if (relic.player_id !== userId) {
              return res.status(403).json({
                success: false,
                message: `文物 ${relic.id} 不属于当前玩家`,
              });
            }
            if (relic.on_market) {
              return res.status(400).json({
                success: false,
                message: `文物 ${relic.id} 正在市场出售，无法展出`,
              });
            }
          }
        }
      }
    }

    await query(
      `UPDATE museums SET layout = $1::jsonb WHERE player_id = $2`,
      [JSON.stringify(layout), userId]
    );

    const allRelicIds = layout
      .flatMap((l: { displaySlots: { relicId: string | null }[] }) =>
        l.displaySlots.map((s: { relicId: string | null }) => s.relicId)
      )
      .filter((id: string | null) => id !== null);

    await query(
      `UPDATE relics SET in_museum = CASE WHEN id = ANY($1) THEN true ELSE in_museum END
       WHERE player_id = $2`,
      [allRelicIds, userId]
    );

    emitToUser(userId, SocketEvents.EXHIBITION_UPDATE, {
      type: 'museum_layout_updated',
      timestamp: Date.now(),
    });

    res.json({
      success: true,
      message: '博物馆布局更新成功',
      data: layout,
    });
  } catch (error) {
    console.error('更新博物馆布局错误:', error);
    res.status(500).json({
      success: false,
      message: '更新博物馆布局失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.post('/collect-income', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const museumResult = await query(
      `SELECT id, halls, layout, ticket_price, attractiveness,
              income_history, last_collect_time
       FROM museums WHERE player_id = $1`,
      [userId]
    );

    if (museumResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '博物馆不存在',
      });
    }

    const museum = museumResult.rows[0];
    const halls = museum.halls || [];
    const layout = museum.layout || [];
    const now = Date.now();
    const timeDiff = now - (museum.last_collect_time || now);

    const displayedRelicIds = layout
      .flatMap((l: { displaySlots: { relicId: string | null }[] }) =>
        l.displaySlots.map((s: { relicId: string | null }) => s.relicId)
      )
      .filter((id: string | null) => id !== null);

    let displayedRelics: Relic[] = [];
    if (displayedRelicIds.length > 0) {
      const relicsResult = await query(
        `SELECT id, name, civilization, completeness, rarity, historical_value,
                estimated_price, description, image, fragments, discovered_at,
                in_museum, on_market
         FROM relics WHERE id = ANY($1)`,
        [displayedRelicIds]
      );
      displayedRelics = relicsResult.rows.map(r => ({
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
        inMuseum: r.in_museum,
        onMarket: r.on_market,
        repairHistory: [],
      }));
    }

    let totalAttractiveness = 0;
    halls.forEach((hall: { level: number; theme: Civilization | 'mixed'; id: string }) => {
      const hallLayout = layout.find((l: { hallId: string }) => l.hallId === hall.id);
      const hallRelicIds = hallLayout
        ? hallLayout.displaySlots
            .map((s: { relicId: string | null }) => s.relicId)
            .filter((id: string | null) => id !== null)
        : [];
      const hallRelics = displayedRelics.filter(r => hallRelicIds.includes(r.id));
      const { attractiveness } = calculateMuseumAttractiveness(hallRelics, hall.level, hall.theme);
      totalAttractiveness += attractiveness;
    });

    const trafficCoefficient = 0.5 + Math.random() * 1.0;
    const hoursElapsed = Math.max(1, timeDiff / (1000 * 60 * 60));
    const visitorsPerHour = Math.floor(totalAttractiveness * trafficCoefficient);
    const totalVisitors = Math.floor(visitorsPerHour * Math.min(hoursElapsed, 24));
    const totalIncome = totalVisitors * (museum.ticket_price || 10);

    if (totalIncome <= 0) {
      return res.json({
        success: true,
        message: '暂无门票收入',
        data: {
          income: 0,
          visitors: 0,
          attractiveness: totalAttractiveness,
        },
      });
    }

    const incomeRecord = {
      id: generateId('inc'),
      timestamp: now,
      income: totalIncome,
      visitors: totalVisitors,
      attractiveness: totalAttractiveness,
      ticketPrice: museum.ticket_price || 10,
    };

    const updatedIncomeHistory = [...(museum.income_history || []), incomeRecord].slice(-50);

    await query('BEGIN');

    await query(
      `UPDATE players SET gold = gold + $1 WHERE id = $2`,
      [totalIncome, userId]
    );

    await query(
      `UPDATE museums
       SET income_history = $1::jsonb,
           last_collect_time = $2,
           attractiveness = $3
       WHERE player_id = $4`,
      [JSON.stringify(updatedIncomeHistory), now, totalAttractiveness, userId]
    );

    await query('COMMIT');

    emitToUser(userId, SocketEvents.EXHIBITION_UPDATE, {
      type: 'income_collected',
      income: totalIncome,
      visitors: totalVisitors,
      timestamp: now,
    });

    res.json({
      success: true,
      message: `成功收取 ${totalIncome} 金币门票收入`,
      data: {
        income: totalIncome,
        visitors: totalVisitors,
        attractiveness: totalAttractiveness,
        ticketPrice: museum.ticket_price || 10,
        trafficCoefficient,
      },
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('收取门票收入错误:', error);
    res.status(500).json({
      success: false,
      message: '收取门票收入失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.get('/income-history', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit = '30' } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));

    const result = await query(
      `SELECT income_history FROM museums WHERE player_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: '获取收入历史成功',
        data: [],
      });
    }

    const incomeHistory = (result.rows[0].income_history || [])
      .sort((a: { timestamp: number }, b: { timestamp: number }) => b.timestamp - a.timestamp)
      .slice(0, limitNum);

    res.json({
      success: true,
      message: '获取收入历史成功',
      data: incomeHistory,
    });
  } catch (error) {
    console.error('获取收入历史错误:', error);
    res.status(500).json({
      success: false,
      message: '获取收入历史失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

export default router;
