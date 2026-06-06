import { Router, Response } from 'express';
import { query } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { generateId, getRandomInt, clamp, calculateRepairSuccess } from '../utils/helpers';
import { emitToUser } from '../lib/socket';
import { SocketEvents } from '../lib/socket';

const router = Router();

router.get('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { civilization, rarity, completeness, inMuseum, sort = 'discoveredAt', order = 'desc', page = '1', limit = '20' } = req.query;

    const conditions: string[] = ['player_id = $1'];
    const params: unknown[] = [userId];
    let paramIndex = 2;

    if (civilization) {
      conditions.push(`civilization = $${paramIndex}`);
      params.push(civilization);
      paramIndex++;
    }
    if (rarity) {
      conditions.push(`rarity = $${paramIndex}`);
      params.push(rarity);
      paramIndex++;
    }
    if (completeness) {
      const compValue = Number(completeness);
      if (!isNaN(compValue)) {
        conditions.push(`completeness >= $${paramIndex}`);
        params.push(compValue);
        paramIndex++;
      }
    }
    if (inMuseum !== undefined) {
      conditions.push(`in_museum = $${paramIndex}`);
      params.push(inMuseum === 'true');
      paramIndex++;
    }

    const validSortFields = ['discoveredAt', 'completeness', 'rarity', 'historicalValue', 'estimatedPrice', 'name'];
    const sortField = validSortFields.includes(sort as string) ? sort : 'discoveredAt';
    const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query(
      `SELECT COUNT(*) as total FROM relics ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await query(
      `SELECT id, name, civilization, completeness, rarity, historical_value,
              estimated_price, description, image, fragments, discovered_at,
              in_museum, on_market, repair_history
       FROM relics
       ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limitNum, offset]
    );

    const relics = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      civilization: row.civilization,
      completeness: row.completeness,
      rarity: row.rarity,
      historicalValue: row.historical_value,
      estimatedPrice: row.estimated_price,
      description: row.description,
      image: row.image,
      fragments: row.fragments,
      discoveredAt: row.discovered_at,
      inMuseum: row.in_museum,
      onMarket: row.on_market,
      repairHistory: row.repair_history || [],
    }));

    res.json({
      success: true,
      message: '获取文物列表成功',
      data: {
        relics,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('获取文物列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取文物列表失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.get('/templates', (_req: AuthenticatedRequest, res: Response) => {
  const templates = [
    { id: 'tpl_egypt_1', name: '法老黄金面具', civilization: 'egypt', rarity: 'legendary', baseValue: 500000, description: '古埃及法老的陪葬面具，象征着永恒的权力', image: 'egypt_mask' },
    { id: 'tpl_egypt_2', name: '圣甲虫护符', civilization: 'egypt', rarity: 'epic', baseValue: 50000, description: '代表重生与保护的神圣符号', image: 'egypt_scarab' },
    { id: 'tpl_egypt_3', name: '象形文字石碑', civilization: 'egypt', rarity: 'rare', baseValue: 15000, description: '刻有神秘象形文字的古代石碑', image: 'egypt_stele' },
    { id: 'tpl_egypt_4', name: '陶器碎片', civilization: 'egypt', rarity: 'common', baseValue: 2000, description: '古埃及日常陶器的残片', image: 'egypt_pottery' },
    { id: 'tpl_china_1', name: '青铜方鼎', civilization: 'china', rarity: 'legendary', baseValue: 480000, description: '商周时期的青铜礼器，象征王权', image: 'china_ding' },
    { id: 'tpl_china_2', name: '青花瓷瓶', civilization: 'china', rarity: 'epic', baseValue: 60000, description: '明代官窑烧制的青花瓷珍品', image: 'china_porcelain' },
    { id: 'tpl_china_3', name: '玉璧', civilization: 'china', rarity: 'rare', baseValue: 18000, description: '古代祭祀用的玉制礼器', image: 'china_jade' },
    { id: 'tpl_china_4', name: '铜钱', civilization: 'china', rarity: 'common', baseValue: 1500, description: '古代流通货币', image: 'china_coin' },
    { id: 'tpl_rome_1', name: '恺撒金币', civilization: 'rome', rarity: 'legendary', baseValue: 400000, description: '尤利乌斯·恺撒时期铸造的金币', image: 'rome_coin' },
    { id: 'tpl_rome_2', name: '军团鹰旗', civilization: 'rome', rarity: 'epic', baseValue: 55000, description: '罗马军团的象征军旗', image: 'rome_eagle' },
    { id: 'tpl_rome_3', name: '马赛克镶嵌画', civilization: 'rome', rarity: 'rare', baseValue: 16000, description: '古罗马贵族宅邸的地面装饰', image: 'rome_mosaic' },
    { id: 'tpl_rome_4', name: '陶油灯', civilization: 'rome', rarity: 'common', baseValue: 1800, description: '古罗马平民家用照明器具', image: 'rome_lamp' },
    { id: 'tpl_maya_1', name: '太阳历石', civilization: 'maya', rarity: 'legendary', baseValue: 520000, description: '玛雅文明精确历法的载体', image: 'maya_calendar' },
    { id: 'tpl_maya_2', name: '玉面具', civilization: 'maya', rarity: 'epic', baseValue: 58000, description: '玛雅祭司的祭祀面具', image: 'maya_mask' },
    { id: 'tpl_maya_3', name: '象形文字抄本', civilization: 'maya', rarity: 'rare', baseValue: 20000, description: '记载玛雅神话与历史的手抄本', image: 'maya_codex' },
    { id: 'tpl_maya_4', name: '黑曜石刀', civilization: 'maya', rarity: 'common', baseValue: 2200, description: '玛雅人用于祭祀和日常的工具', image: 'maya_obsidian' },
    { id: 'tpl_mesopotamia_1', name: '汉谟拉比法典石碑', civilization: 'mesopotamia', rarity: 'legendary', baseValue: 550000, description: '人类历史上最早的成文法典', image: 'meso_code' },
    { id: 'tpl_mesopotamia_2', name: '楔形文字泥板', civilization: 'mesopotamia', rarity: 'epic', baseValue: 52000, description: '记录商业契约的古代文献', image: 'meso_tablet' },
    { id: 'tpl_mesopotamia_3', name: '金牛头竖琴', civilization: 'mesopotamia', rarity: 'rare', baseValue: 17000, description: '苏美尔文明的精美乐器', image: 'meso_lyre' },
    { id: 'tpl_mesopotamia_4', name: '黏土印章', civilization: 'mesopotamia', rarity: 'common', baseValue: 2500, description: '古代商业认证的印信', image: 'meso_seal' },
    { id: 'tpl_atlantis_1', name: '能量水晶核心', civilization: 'atlantis', rarity: 'legendary', baseValue: 1000000, description: '传说中亚特兰蒂斯的能源之源', image: 'atlantis_crystal' },
    { id: 'tpl_atlantis_2', name: '海神三叉戟', civilization: 'atlantis', rarity: 'epic', baseValue: 120000, description: '亚特兰蒂斯王权的象征', image: 'atlantis_trident' },
    { id: 'tpl_atlantis_3', name: '星盘仪', civilization: 'atlantis', rarity: 'rare', baseValue: 35000, description: '亚特兰蒂斯天文学家的精密仪器', image: 'atlantis_astrolabe' },
    { id: 'tpl_atlantis_4', name: '合金齿轮', civilization: 'atlantis', rarity: 'common', baseValue: 5000, description: '亚特兰蒂斯机械装置的零件', image: 'atlantis_gear' },
  ];

  res.json({
    success: true,
    message: '获取文物模板成功',
    data: templates,
  });
});

router.get('/:id', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const result = await query(
      `SELECT id, name, civilization, completeness, rarity, historical_value,
              estimated_price, description, image, fragments, discovered_at,
              in_museum, on_market, repair_history
       FROM relics
       WHERE id = $1 AND player_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文物不存在或不属于当前玩家',
      });
    }

    const row = result.rows[0];
    const relic = {
      id: row.id,
      name: row.name,
      civilization: row.civilization,
      completeness: row.completeness,
      rarity: row.rarity,
      historicalValue: row.historical_value,
      estimatedPrice: row.estimated_price,
      description: row.description,
      image: row.image,
      fragments: row.fragments,
      discoveredAt: row.discovered_at,
      inMuseum: row.in_museum,
      onMarket: row.on_market,
      repairHistory: row.repair_history || [],
    };

    res.json({
      success: true,
      message: '获取文物详情成功',
      data: relic,
    });
  } catch (error) {
    console.error('获取文物详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取文物详情失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.post('/:id/repair', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { materials } = req.body;

    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供修复材料',
        errors: { materials: ['修复材料不能为空'] },
      });
    }

    const relicResult = await query(
      `SELECT id, completeness, rarity, civilization, player_id, repair_history
       FROM relics WHERE id = $1`,
      [id]
    );

    if (relicResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文物不存在',
      });
    }

    const relic = relicResult.rows[0];
    if (relic.player_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权修复此文物',
      });
    }

    if (relic.completeness >= 100) {
      return res.status(400).json({
        success: false,
        message: '文物已修复完成',
      });
    }

    const playerResult = await query(
      `SELECT inventory FROM players WHERE id = $1`,
      [userId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '玩家不存在',
      });
    }

    const inventory = playerResult.rows[0].inventory || { materials: [] };
    const playerMaterials = inventory.materials || [];

    for (const mat of materials) {
      const playerMat = playerMaterials.find((pm: { id: string }) => pm.id === mat.id);
      if (!playerMat || playerMat.amount < mat.amount) {
        return res.status(400).json({
          success: false,
          message: `材料 ${mat.name || mat.id} 不足`,
          errors: { materials: [`材料 ${mat.name || mat.id} 不足，需要 ${mat.amount}，当前 ${playerMat?.amount || 0}`] },
        });
      }
    }

    const teamResult = await query(
      `SELECT members FROM teams WHERE player_id = $1`,
      [userId]
    );
    const teamMembers = teamResult.rows[0]?.members || [];

    const { successRate } = calculateRepairSuccess(relic.completeness, materials, teamMembers);

    const completenessBefore = relic.completeness;
    let completenessAfter: number;
    const repairSuccess = Math.random() < successRate;

    if (repairSuccess) {
      const gain = getRandomInt(10, 20);
      completenessAfter = clamp(completenessBefore + gain, 0, 100);
    } else {
      const loss = getRandomInt(5, 15);
      completenessAfter = clamp(completenessBefore - loss, 0, 100);
    }

    const updatedMaterials = playerMaterials.map((pm: { id: string; amount: number }) => {
      const used = materials.find((m: { id: string }) => m.id === pm.id);
      if (used) {
        return { ...pm, amount: pm.amount - used.amount };
      }
      return pm;
    }).filter((pm: { amount: number }) => pm.amount > 0);

    const repairRecord = {
      id: generateId('rpr'),
      timestamp: Date.now(),
      success: repairSuccess,
      materialsUsed: materials.map((m: { type: string; quality: number; amount: number }) => ({
        type: m.type,
        quality: m.quality,
        amount: m.amount,
      })),
      completenessBefore,
      completenessAfter,
    };

    const repairHistory = [...(relic.repair_history || []), repairRecord];

    await query('BEGIN');

    await query(
      `UPDATE relics
       SET completeness = $1, repair_history = $2::jsonb
       WHERE id = $3`,
      [completenessAfter, JSON.stringify(repairHistory), id]
    );

    await query(
      `UPDATE players
       SET inventory = $1::jsonb
       WHERE id = $2`,
      [JSON.stringify({ ...inventory, materials: updatedMaterials }), userId]
    );

    await query('COMMIT');

    emitToUser(userId, SocketEvents.EXHIBITION_UPDATE, {
      type: 'relic_repaired',
      relicId: id,
      success: repairSuccess,
      completenessBefore,
      completenessAfter,
    });

    res.json({
      success: true,
      message: repairSuccess ? '文物修复成功' : '文物修复失败',
      data: {
        success: repairSuccess,
        completenessBefore,
        completenessAfter,
        materialsUsed: materials,
        successRate,
      },
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('修复文物错误:', error);
    res.status(500).json({
      success: false,
      message: '修复文物失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.put('/:id/museum', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { inMuseum } = req.body;

    if (typeof inMuseum !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: '无效的参数',
        errors: { inMuseum: ['inMuseum 必须是布尔值'] },
      });
    }

    const relicResult = await query(
      `SELECT id, player_id, on_market FROM relics WHERE id = $1`,
      [id]
    );

    if (relicResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '文物不存在',
      });
    }

    const relic = relicResult.rows[0];
    if (relic.player_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权操作此文物',
      });
    }

    if (inMuseum && relic.on_market) {
      return res.status(400).json({
        success: false,
        message: '文物正在市场出售，无法放入博物馆',
      });
    }

    const result = await query(
      `UPDATE relics SET in_museum = $1 WHERE id = $2 RETURNING in_museum`,
      [inMuseum, id]
    );

    res.json({
      success: true,
      message: inMuseum ? '文物已放入博物馆' : '文物已从博物馆移除',
      data: {
        inMuseum: result.rows[0].in_museum,
      },
    });
  } catch (error) {
    console.error('更新博物馆状态错误:', error);
    res.status(500).json({
      success: false,
      message: '更新博物馆状态失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

export default router;
