import { Router, Response } from 'express';
import { query, getClient } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { broadcast, SocketEvents } from '../lib/socket';
import { generateId, suggestPriceRange } from '../utils/helpers';
import { BadRequestError, ForbiddenError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

router.get('/listings', auth, async (req: AuthenticatedRequest, res: Response) => {
  const { civilization, rarity, minPrice, maxPrice, minCompleteness, maxCompleteness, sort = 'create_time_desc', page = '1', limit = '20' } = req.query as Record<string, string>;

  const conditions: string[] = ["ml.status = 'listed'"];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (civilization) {
    conditions.push(`r.civilization = $${paramIndex}`);
    params.push(civilization);
    paramIndex++;
  }
  if (rarity) {
    conditions.push(`r.rarity = $${paramIndex}`);
    params.push(rarity);
    paramIndex++;
  }
  if (minPrice) {
    conditions.push(`ml.price >= $${paramIndex}`);
    params.push(parseInt(minPrice));
    paramIndex++;
  }
  if (maxPrice) {
    conditions.push(`ml.price <= $${paramIndex}`);
    params.push(parseInt(maxPrice));
    paramIndex++;
  }
  if (minCompleteness) {
    conditions.push(`r.completeness >= $${paramIndex}`);
    params.push(parseInt(minCompleteness));
    paramIndex++;
  }
  if (maxCompleteness) {
    conditions.push(`r.completeness <= $${paramIndex}`);
    params.push(parseInt(maxCompleteness));
    paramIndex++;
  }

  const whereClause = conditions.join(' AND ');

  let orderBy = 'ml.create_time DESC';
  switch (sort) {
    case 'price_asc':
      orderBy = 'ml.price ASC';
      break;
    case 'price_desc':
      orderBy = 'ml.price DESC';
      break;
    case 'completeness_desc':
      orderBy = 'r.completeness DESC';
      break;
    case 'completeness_asc':
      orderBy = 'r.completeness ASC';
      break;
    case 'create_time_asc':
      orderBy = 'ml.create_time ASC';
      break;
    default:
      orderBy = 'ml.create_time DESC';
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const offset = (pageNum - 1) * limitNum;

  const countResult = await query<any>(
    `SELECT COUNT(*) FROM market_listings ml JOIN relics r ON ml.relic_id = r.id WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count);

  const listingsResult = await query<any>(
    `SELECT 
      ml.id, ml.relic_id, ml.seller_id, ml.seller_name, ml.price, 
      ml.suggested_price_min, ml.suggested_price_max, ml.status, 
      ml.create_time, ml.price_history, ml.approvals,
      r.name as relic_name, r.civilization, r.rarity, r.completeness, 
      r.historical_value, r.estimated_price, r.description, r.image
    FROM market_listings ml 
    JOIN relics r ON ml.relic_id = r.id 
    WHERE ${whereClause}
    ORDER BY ${orderBy}
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limitNum, offset]
  );

  res.json({
    success: true,
    message: '获取上架文物列表成功',
    data: {
      listings: listingsResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

router.get('/listings/mine', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const result = await query<any>(
    `SELECT 
      ml.id, ml.relic_id, ml.seller_id, ml.seller_name, ml.price, 
      ml.suggested_price_min, ml.suggested_price_max, ml.status, 
      ml.create_time, ml.price_history, ml.approvals,
      r.name as relic_name, r.civilization, r.rarity, r.completeness, 
      r.historical_value, r.estimated_price, r.description, r.image
    FROM market_listings ml 
    JOIN relics r ON ml.relic_id = r.id 
    WHERE ml.seller_id = $1
    ORDER BY ml.create_time DESC`,
    [userId]
  );

  res.json({
    success: true,
    message: '获取我的上架文物成功',
    data: {
      listings: result.rows,
    },
  });
});

router.post('/listings', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { relicId, price } = req.body;

  if (!relicId || !price || price <= 0) {
    throw new BadRequestError('参数不完整：需要 relicId 和 price');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const relicResult = await client.query<any>(
      'SELECT * FROM relics WHERE id = $1 AND player_id = $2',
      [relicId, userId]
    );

    if (relicResult.rows.length === 0) {
      throw new NotFoundError('文物不存在或不属于你');
    }

    const relic = relicResult.rows[0];
    if (relic.on_market) {
      throw new BadRequestError('该文物已在市场上架');
    }
    if (relic.in_museum) {
      throw new BadRequestError('该文物正在博物馆展出，无法上架');
    }

    const sellerResult = await client.query<any>(
      'SELECT username FROM players WHERE id = $1',
      [userId]
    );
    const sellerName = sellerResult.rows[0].username;

    const recentSalesResult = await client.query<any>(
      `SELECT ml.*, r.civilization, r.rarity, r.completeness 
       FROM market_listings ml 
       JOIN relics r ON ml.relic_id = r.id
       WHERE ml.status = 'sold' 
       AND ml.create_time >= NOW() - INTERVAL '7 days'`,
      []
    );

    const priceRange = suggestPriceRange(recentSalesResult.rows, relic);

    const insertResult = await client.query<any>(
      `INSERT INTO market_listings 
       (id, relic_id, seller_id, seller_name, price, suggested_price_min, suggested_price_max, status, create_time, price_history, approvals)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending_approval', NOW(), $8, '[]')
       RETURNING *`,
      [
        generateId('ml'),
        relicId,
        userId,
        sellerName,
        price,
        priceRange.min,
        priceRange.max,
        JSON.stringify([{ time: Date.now(), price }]),
      ]
    );

    await client.query(
      'UPDATE relics SET on_market = true WHERE id = $1',
      [relicId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: '文物已成功上架，等待学术审批',
      data: {
        listing: insertResult.rows[0],
        suggestedPrice: priceRange,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.put('/listings/:id/price', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { price } = req.body;

  if (!price || price <= 0) {
    throw new BadRequestError('价格必须为正数');
  }

  const listingResult = await query<any>(
    'SELECT * FROM market_listings WHERE id = $1',
    [id]
  );

  if (listingResult.rows.length === 0) {
    throw new NotFoundError('上架记录不存在');
  }

  const listing = listingResult.rows[0];
  if (listing.seller_id !== userId) {
    throw new ForbiddenError('你无权修改此上架记录');
  }
  if (listing.status !== 'listed' && listing.status !== 'pending_approval') {
    throw new BadRequestError('只有待审批或已上架的商品才能修改价格');
  }

  const priceHistory = listing.price_history || [];
  priceHistory.push({ time: Date.now(), price });

  const updateResult = await query<any>(
    'UPDATE market_listings SET price = $1, price_history = $2 WHERE id = $3 RETURNING *',
    [price, JSON.stringify(priceHistory), id]
  );

  res.json({
    success: true,
    message: '价格修改成功',
    data: {
      listing: updateResult.rows[0],
    },
  });
});

router.delete('/listings/:id', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const listingResult = await client.query<any>(
      'SELECT * FROM market_listings WHERE id = $1',
      [id]
    );

    if (listingResult.rows.length === 0) {
      throw new NotFoundError('上架记录不存在');
    }

    const listing = listingResult.rows[0];
    if (listing.seller_id !== userId) {
      throw new ForbiddenError('你无权下架此商品');
    }
    if (listing.status === 'sold') {
      throw new BadRequestError('已售出的商品无法下架');
    }

    await client.query(
      'UPDATE relics SET on_market = false WHERE id = $1',
      [listing.relic_id]
    );

    await client.query(
      'DELETE FROM market_listings WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '文物已成功下架',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.post('/listings/:id/buy', auth, async (req: AuthenticatedRequest, res: Response) => {
  const buyerId = req.user!.userId;
  const { id } = req.params;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const listingResult = await client.query<any>(
      'SELECT * FROM market_listings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (listingResult.rows.length === 0) {
      throw new NotFoundError('上架记录不存在');
    }

    const listing = listingResult.rows[0];
    if (listing.status !== 'listed') {
      throw new BadRequestError('该商品不在可购买状态');
    }
    if (listing.seller_id === buyerId) {
      throw new BadRequestError('不能购买自己上架的商品');
    }

    const buyerResult = await client.query<any>(
      'SELECT * FROM players WHERE id = $1 FOR UPDATE',
      [buyerId]
    );
    const buyer = buyerResult.rows[0];

    if (buyer.gold < listing.price) {
      throw new BadRequestError('金币不足');
    }

    const fee = Math.floor(listing.price * 0.05);
    const sellerReceive = listing.price - fee;

    await client.query(
      'UPDATE players SET gold = gold - $1 WHERE id = $2',
      [listing.price, buyerId]
    );

    await client.query(
      'UPDATE players SET gold = gold + $1 WHERE id = $2',
      [sellerReceive, listing.seller_id]
    );

    await client.query(
      'UPDATE relics SET player_id = $1, on_market = false WHERE id = $2',
      [buyerId, listing.relic_id]
    );

    await client.query(
      "UPDATE market_listings SET status = 'sold' WHERE id = $1",
      [id]
    );

    const relicResult = await client.query<any>(
      'SELECT * FROM relics WHERE id = $1',
      [listing.relic_id]
    );
    const relic = relicResult.rows[0];

    const announcementResult = await client.query<any>(
      `INSERT INTO announcements (id, type, title, message, rarity, timestamp)
       VALUES ($1, 'market_sale', $2, $3, $4, NOW())
       RETURNING *`,
      [
        generateId('ann'),
        `文物成交：${relic.name}`,
        `${buyer.username} 以 ${listing.price} 金币购买了 ${listing.seller_name} 的 ${relic.name}（${relic.rarity}）`,
        relic.rarity,
      ]
    );

    await client.query('COMMIT');

    broadcast(SocketEvents.ANNOUNCEMENT, announcementResult.rows[0]);

    res.json({
      success: true,
      message: '购买成功',
      data: {
        listing: { ...listing, status: 'sold' },
        relic,
        goldSpent: listing.price,
        fee,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.get('/approvals', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const playerResult = await query<any>(
    'SELECT is_committee FROM players WHERE id = $1',
    [userId]
  );

  if (!playerResult.rows[0]?.is_committee) {
    throw new ForbiddenError('只有学术委员会成员可以查看审批列表');
  }

  const result = await query<any>(
    `SELECT 
      ml.id, ml.relic_id, ml.seller_id, ml.seller_name, ml.price, 
      ml.suggested_price_min, ml.suggested_price_max, ml.status, 
      ml.create_time, ml.approvals,
      r.name as relic_name, r.civilization, r.rarity, r.completeness, 
      r.historical_value, r.estimated_price, r.description, r.image
    FROM market_listings ml 
    JOIN relics r ON ml.relic_id = r.id 
    WHERE ml.status = 'pending_approval'
    ORDER BY ml.create_time ASC`
  );

  res.json({
    success: true,
    message: '获取待审批列表成功',
    data: {
      approvals: result.rows,
    },
  });
});

router.post('/approvals/:id/approve', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  const playerResult = await query<any>(
    'SELECT * FROM players WHERE id = $1',
    [userId]
  );

  if (!playerResult.rows[0]?.is_committee) {
    throw new ForbiddenError('只有学术委员会成员可以审批');
  }

  const committeeMember = playerResult.rows[0];

  const listingResult = await query<any>(
    'SELECT * FROM market_listings WHERE id = $1',
    [id]
  );

  if (listingResult.rows.length === 0) {
    throw new NotFoundError('上架记录不存在');
  }

  const listing = listingResult.rows[0];
  if (listing.status !== 'pending_approval') {
    throw new BadRequestError('该商品不在待审批状态');
  }

  const approvals = listing.approvals || [];

  if (approvals.find((a: any) => a.committee_id === userId)) {
    throw new BadRequestError('你已经审批过该商品');
  }

  let level = 1;
  if (committeeMember.level >= 5) level = 2;
  if (committeeMember.level >= 10) level = 3;

  approvals.push({
    committee_id: userId,
    committee_name: committeeMember.username,
    level,
    decision: 'approved',
    time: Date.now(),
  });

  const uniqueLevels = new Set(approvals.map((a: any) => a.level));
  const hasAllLevels = uniqueLevels.has(1) && uniqueLevels.has(2) && uniqueLevels.has(3);

  const newStatus = hasAllLevels ? 'listed' : 'pending_approval';

  const updateResult = await query<any>(
    'UPDATE market_listings SET approvals = $1, status = $2 WHERE id = $3 RETURNING *',
    [JSON.stringify(approvals), newStatus, id]
  );

  if (newStatus === 'listed') {
    broadcast(SocketEvents.ANNOUNCEMENT, {
      id: generateId('ann'),
      type: 'market_listed',
      title: '文物上架',
      message: `${listing.seller_name} 的文物已通过学术审批，正式上架交易市场`,
      timestamp: Date.now(),
    });
  }

  res.json({
    success: true,
    message: newStatus === 'listed' ? '审批通过，商品已上架' : '审批通过，等待其他级别委员审批',
    data: {
      listing: updateResult.rows[0],
      approvals,
    },
  });
});

router.post('/approvals/:id/reject', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason) {
    throw new BadRequestError('请提供驳回理由');
  }

  const playerResult = await query<any>(
    'SELECT * FROM players WHERE id = $1',
    [userId]
  );

  if (!playerResult.rows[0]?.is_committee) {
    throw new ForbiddenError('只有学术委员会成员可以审批');
  }

  const committeeMember = playerResult.rows[0];

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const listingResult = await client.query<any>(
      'SELECT * FROM market_listings WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (listingResult.rows.length === 0) {
      throw new NotFoundError('上架记录不存在');
    }

    const listing = listingResult.rows[0];
    if (listing.status !== 'pending_approval') {
      throw new BadRequestError('该商品不在待审批状态');
    }

    const approvals = listing.approvals || [];
    approvals.push({
      committee_id: userId,
      committee_name: committeeMember.username,
      decision: 'rejected',
      reason,
      time: Date.now(),
    });

    await client.query(
      "UPDATE market_listings SET approvals = $1, status = 'rejected' WHERE id = $2",
      [JSON.stringify(approvals), id]
    );

    await client.query(
      'UPDATE relics SET on_market = false WHERE id = $1',
      [listing.relic_id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: '已驳回审批',
      data: {
        listingId: id,
        reason,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

export default router;
