import { Router, Response } from 'express';
import { query } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest, Relic, Rarity } from '../types';
import { generateId, getRandomInt, clamp, calculateMuseumAttractiveness } from '../utils/helpers';
import { emitToUser, broadcast } from '../lib/socket';
import { SocketEvents } from '../lib/socket';

const router = Router();

function getWeekStart(): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diff = day >= 1 ? day - 1 : 6;
  now.setDate(now.getDate() - diff);
  return now.getTime();
}

function calculatePlayerScore(relics: Relic[], bonusMultiplier: number = 1): number {
  let baseScore = 0;
  const rarityWeights: Record<Rarity, number> = {
    common: 10,
    rare: 30,
    epic: 100,
    legendary: 300,
  };

  relics.forEach(relic => {
    const rarityScore = rarityWeights[relic.rarity] || 10;
    const completenessScore = relic.completeness / 100;
    const historicalScore = relic.historicalValue / 100;
    baseScore += Math.round(rarityScore * completenessScore * historicalScore);
  });

  return Math.round(baseScore * bonusMultiplier);
}

router.get('/', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const weekStart = getWeekStart();

    const weekResult = await query(
      `SELECT id, week_start, status, theme, registration_fee,
              prize_pool, start_time, end_time
       FROM exhibitions WHERE week_start = $1`,
      [weekStart]
    );

    let exhibition: {
      id: string;
      weekStart: number;
      status: 'upcoming' | 'registering' | 'in_progress' | 'completed';
      theme: string;
      registrationFee: number;
      prizePool: number;
      startTime: number;
      endTime: number;
    } | null = null;

    if (weekResult.rows.length > 0) {
      const row = weekResult.rows[0];
      exhibition = {
        id: row.id,
        weekStart: row.week_start,
        status: row.status,
        theme: row.theme,
        registrationFee: row.registration_fee,
        prizePool: row.prize_pool,
        startTime: row.start_time,
        endTime: row.end_time,
      };
    } else {
      const exhibitionId = generateId('exh');
      const now = Date.now();
      const themes = ['egypt', 'china', 'rome', 'maya', 'mesopotamia', 'atlantis', 'mixed'];
      const theme = themes[Math.floor(Math.random() * themes.length)];

      await query(
        `INSERT INTO exhibitions (
          id, week_start, status, theme, registration_fee,
          prize_pool, start_time, end_time, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          exhibitionId,
          weekStart,
          'registering',
          theme,
          100,
          0,
          weekStart + 2 * 24 * 60 * 60 * 1000,
          weekStart + 6 * 24 * 60 * 60 * 1000,
          now,
        ]
      );

      exhibition = {
        id: exhibitionId,
        weekStart,
        status: 'registering',
        theme,
        registrationFee: 100,
        prizePool: 0,
        startTime: weekStart + 2 * 24 * 60 * 60 * 1000,
        endTime: weekStart + 6 * 24 * 60 * 60 * 1000,
      };
    }

    const registerResult = await query(
      `SELECT er.id, er.player_id, er.registered_at, er.score, er.rank,
              er.exhibition_relics, p.name as player_name, p.avatar
       FROM exhibition_registrations er
       JOIN players p ON er.player_id = p.id
       WHERE er.exhibition_id = $1
       ORDER BY er.score DESC NULLS LAST, er.registered_at ASC`,
      [exhibition.id]
    );

    const participants = registerResult.rows.map(row => ({
      id: row.id,
      playerId: row.player_id,
      playerName: row.player_name,
      avatar: row.avatar,
      registeredAt: row.registered_at,
      score: row.score || 0,
      rank: row.rank,
      exhibitionRelics: row.exhibition_relics || [],
    }));

    const playerRegistered = participants.find(p => p.playerId === userId);

    res.json({
      success: true,
      message: '获取本周赛事状态成功',
      data: {
        exhibition,
        participants,
        totalParticipants: participants.length,
        isRegistered: !!playerRegistered,
        playerRegistration: playerRegistered || null,
      },
    });
  } catch (error) {
    console.error('获取赛事状态错误:', error);
    res.status(500).json({
      success: false,
      message: '获取赛事状态失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.post('/register', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { relicIds } = req.body;
    const weekStart = getWeekStart();

    if (!relicIds || !Array.isArray(relicIds) || relicIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请选择参展文物',
        errors: { relicIds: ['至少选择1件文物参展'] },
      });
    }

    if (relicIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: '参展文物数量超限',
        errors: { relicIds: ['最多选择5件文物参展'] },
      });
    }

    const playerResult = await query(
      `SELECT id, name, avatar, gold FROM players WHERE id = $1`,
      [userId]
    );

    if (playerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '玩家不存在',
      });
    }

    const player = playerResult.rows[0];

    const relicsResult = await query(
      `SELECT id, name, civilization, completeness, rarity, historical_value,
              estimated_price, description, image, fragments, discovered_at,
              in_museum, on_market, player_id
       FROM relics WHERE id = ANY($1)`,
      [relicIds]
    );

    if (relicsResult.rows.length !== relicIds.length) {
      return res.status(400).json({
        success: false,
        message: '部分文物不存在',
        errors: { relicIds: ['存在无效的文物ID'] },
      });
    }

    for (const relic of relicsResult.rows) {
      if (relic.player_id !== userId) {
        return res.status(403).json({
          success: false,
          message: `文物 ${relic.name} 不属于当前玩家`,
        });
      }
      if (relic.on_market) {
        return res.status(400).json({
          success: false,
          message: `文物 ${relic.name} 正在市场出售，无法参展`,
        });
      }
    }

    const exhibitionResult = await query(
      `SELECT id, status, registration_fee, prize_pool FROM exhibitions WHERE week_start = $1`,
      [weekStart]
    );

    if (exhibitionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '本周赛事尚未开始',
      });
    }

    const exhibition = exhibitionResult.rows[0];
    if (exhibition.status !== 'registering') {
      return res.status(400).json({
        success: false,
        message: '当前不是报名阶段',
      });
    }

    if (player.gold < exhibition.registration_fee) {
      return res.status(400).json({
        success: false,
        message: '金币不足',
        errors: { gold: [`报名需要 ${exhibition.registration_fee} 金币，当前 ${player.gold}`] },
      });
    }

    const existingReg = await query(
      `SELECT id FROM exhibition_registrations WHERE exhibition_id = $1 AND player_id = $2`,
      [exhibition.id, userId]
    );

    if (existingReg.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您已报名本周赛事',
      });
    }

    const exhibitionRelics = relicsResult.rows.map(r => ({
      id: r.id,
      name: r.name,
      civilization: r.civilization,
      completeness: r.completeness,
      rarity: r.rarity,
      historicalValue: r.historical_value,
      estimatedPrice: r.estimated_price,
      image: r.image,
    }));

    const themeBonus = exhibition.theme === 'mixed' ? 1.0 :
      exhibitionRelics.filter(r => r.civilization === exhibition.theme).length > 0 ? 1.2 : 1.0;

    const baseScore = calculatePlayerScore(
      exhibitionRelics.map(r => ({ ...r, repairHistory: [], fragments: 0, discoveredAt: 0, description: '', inMuseum: false, onMarket: false })),
      themeBonus
    );

    await query('BEGIN');

    const registrationId = generateId('exr');
    await query(
      `INSERT INTO exhibition_registrations (
        id, exhibition_id, player_id, player_name, avatar,
        exhibition_relics, score, registered_at
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        registrationId,
        exhibition.id,
        userId,
        player.name,
        player.avatar,
        JSON.stringify(exhibitionRelics),
        baseScore,
        Date.now(),
      ]
    );

    await query(
      `UPDATE players SET gold = gold - $1 WHERE id = $2`,
      [exhibition.registration_fee, userId]
    );

    const newPrizePool = exhibition.prize_pool + exhibition.registration_fee;
    await query(
      `UPDATE exhibitions SET prize_pool = $1 WHERE id = $2`,
      [newPrizePool, exhibition.id]
    );

    await query('COMMIT');

    broadcast(SocketEvents.EXHIBITION_UPDATE, {
      type: 'new_registration',
      exhibitionId: exhibition.id,
      playerId: userId,
      playerName: player.name,
      score: baseScore,
    });

    res.json({
      success: true,
      message: '报名成功',
      data: {
        registrationId,
        exhibitionRelics,
        baseScore,
        themeBonus,
      },
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('报名错误:', error);
    res.status(500).json({
      success: false,
      message: '报名失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.get('/current-match', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const weekStart = getWeekStart();

    const matchResult = await query(
      `SELECT id, exhibition_id, player1_id, player2_id, player1_score,
              player2_score, status, rounds, events, current_round, started_at, ended_at
       FROM exhibition_matches
       WHERE exhibition_id = (SELECT id FROM exhibitions WHERE week_start = $1)
         AND (player1_id = $2 OR player2_id = $2)
         AND status IN ('in_progress', 'pending')
       ORDER BY started_at DESC
       LIMIT 1`,
      [weekStart, userId]
    );

    if (matchResult.rows.length === 0) {
      return res.json({
        success: true,
        message: '当前没有进行中的对战',
        data: null,
      });
    }

    const match = matchResult.rows[0];
    const opponentId = match.player1_id === userId ? match.player2_id : match.player1_id;
    const playerSide = match.player1_id === userId ? 'player1' : 'player2';

    const playersResult = await query(
      `SELECT p.id, p.name, p.avatar, er.exhibition_relics, er.score
       FROM players p
       JOIN exhibition_registrations er ON p.id = er.player_id
       WHERE p.id IN ($1, $2)
         AND er.exhibition_id = $3`,
      [userId, opponentId, match.exhibition_id]
    );

    const players = playersResult.rows.reduce((acc, row) => {
      acc[row.id] = {
        id: row.id,
        name: row.name,
        avatar: row.avatar,
        exhibitionRelics: row.exhibition_relics || [],
        baseScore: row.score || 0,
      };
      return acc;
    }, {} as Record<string, { id: string; name: string; avatar: string; exhibitionRelics: unknown[]; baseScore: number }>);

    res.json({
      success: true,
      message: '获取当前对战成功',
      data: {
        id: match.id,
        status: match.status,
        playerSide,
        player1: players[match.player1_id],
        player2: players[match.player2_id],
        player1Score: match.player1_score,
        player2Score: match.player2_score,
        currentRound: match.current_round,
        rounds: match.rounds || [],
        events: match.events || [],
        startedAt: match.started_at,
        endedAt: match.ended_at,
      },
    });
  } catch (error) {
    console.error('获取当前对战错误:', error);
    res.status(500).json({
      success: false,
      message: '获取当前对战失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.post('/matches/:id/tick', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const matchResult = await query(
      `SELECT id, exhibition_id, player1_id, player2_id, player1_score,
              player2_score, status, rounds, events, current_round
       FROM exhibition_matches WHERE id = $1`,
      [id]
    );

    if (matchResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '对战不存在',
      });
    }

    const match = matchResult.rows[0];
    if (match.player1_id !== userId && match.player2_id !== userId) {
      return res.status(403).json({
        success: false,
        message: '无权操作此对战',
      });
    }
    if (match.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: '对战未在进行中',
      });
    }

    const playersResult = await query(
      `SELECT p.id, p.name, er.exhibition_relics
       FROM players p
       JOIN exhibition_registrations er ON p.id = er.player_id
       WHERE p.id IN ($1, $2) AND er.exhibition_id = $3`,
      [match.player1_id, match.player2_id, match.exhibition_id]
    );

    const playerData: Record<string, { name: string; relics: Relic[] }> = {};
    playersResult.rows.forEach(row => {
      playerData[row.id] = {
        name: row.name,
        relics: (row.exhibition_relics || []).map((r: { id: string; name: string; civilization: string; completeness: number; rarity: Rarity; historicalValue: number; estimatedPrice: number; image: string }) => ({
          ...r,
          description: '',
          fragments: 0,
          discoveredAt: 0,
          inMuseum: false,
          onMarket: false,
          repairHistory: [],
        })),
      };
    });

    const currentRound = (match.current_round || 0) + 1;
    const maxRounds = 10;
    const rounds = match.rounds || [];
    const events = match.events || [];

    const reviewComments = [
      '展品精美绝伦，令人叹为观止！',
      '文物保存完好，历史价值极高。',
      '这个展厅的布局非常专业。',
      '感受到了深厚的文化底蕴。',
      '展品的完整度令人赞叹。',
      '这次展览令人印象深刻。',
      '感受到了历史的厚重感。',
      '展品选择独具匠心。',
    ];

    const p1RoundScore = getRandomInt(50, 150);
    const p2RoundScore = getRandomInt(50, 150);
    const newP1Score = match.player1_score + p1RoundScore;
    const newP2Score = match.player2_score + p2RoundScore;

    const visitorReview = {
      id: generateId('rev'),
      timestamp: Date.now(),
      reviewer: `游客${getRandomInt(1000, 9999)}`,
      comment: reviewComments[Math.floor(Math.random() * reviewComments.length)],
      rating: getRandomInt(3, 5),
    };
    events.push(visitorReview);

    const damageRisks = [];
    for (const [pid, data] of Object.entries(playerData)) {
      for (const relic of data.relics) {
        if (Math.random() < 0.05) {
          const damage = getRandomInt(1, 5);
          damageRisks.push({
            relicId: relic.id,
            relicName: relic.name,
            playerId: pid,
            playerName: data.name,
            damage,
          });

          await query(
            `UPDATE relics SET completeness = GREATEST(0, completeness - $1) WHERE id = $2`,
            [damage, relic.id]
          );
        }
      }
    }

    if (damageRisks.length > 0) {
      damageRisks.forEach(d => {
        events.push({
          id: generateId('evt'),
          type: 'damage',
          timestamp: Date.now(),
          ...d,
        });
      });
    }

    rounds.push({
      round: currentRound,
      player1Score: p1RoundScore,
      player2Score: p2RoundScore,
      review: visitorReview,
      damageRisks,
    });

    let matchStatus = match.status;
    let endedAt = null;

    if (currentRound >= maxRounds) {
      matchStatus = 'completed';
      endedAt = Date.now();

      const winnerId = newP1Score > newP2Score ? match.player1_id :
        newP2Score > newP1Score ? match.player2_id : null;

      events.push({
        id: generateId('evt'),
        type: 'match_end',
        timestamp: Date.now(),
        winnerId,
        player1FinalScore: newP1Score,
        player2FinalScore: newP2Score,
      });
    }

    await query(
      `UPDATE exhibition_matches
       SET player1_score = $1, player2_score = $2, current_round = $3,
           rounds = $4::jsonb, events = $5::jsonb, status = $6, ended_at = $7
       WHERE id = $8`,
      [
        newP1Score,
        newP2Score,
        currentRound,
        JSON.stringify(rounds),
        JSON.stringify(events),
        matchStatus,
        endedAt,
        id,
      ]
    );

    const playerSide = match.player1_id === userId ? 'player1' : 'player2';

    emitToUser(match.player1_id, SocketEvents.EXHIBITION_UPDATE, {
      type: 'match_tick',
      matchId: id,
      round: currentRound,
      player1Score: newP1Score,
      player2Score: newP2Score,
    });
    emitToUser(match.player2_id, SocketEvents.EXHIBITION_UPDATE, {
      type: 'match_tick',
      matchId: id,
      round: currentRound,
      player1Score: newP1Score,
      player2Score: newP2Score,
    });

    res.json({
      success: true,
      message: `第 ${currentRound} 回合结束`,
      data: {
        matchId: id,
        playerSide,
        currentRound,
        maxRounds,
        player1Score: newP1Score,
        player2Score: newP2Score,
        roundData: rounds[rounds.length - 1],
        status: matchStatus,
      },
    });
  } catch (error) {
    console.error('对战推进错误:', error);
    res.status(500).json({
      success: false,
      message: '对战推进失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

router.get('/history', auth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { limit = '20', page = '1' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM exhibition_matches
       WHERE (player1_id = $1 OR player2_id = $1) AND status = 'completed'`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const matchesResult = await query(
      `SELECT m.id, m.exhibition_id, m.player1_id, m.player2_id,
              m.player1_score, m.player2_score, m.status, m.started_at, m.ended_at,
              p1.name as player1_name, p1.avatar as player1_avatar,
              p2.name as player2_name, p2.avatar as player2_avatar
       FROM exhibition_matches m
       JOIN players p1 ON m.player1_id = p1.id
       JOIN players p2 ON m.player2_id = p2.id
       WHERE (m.player1_id = $1 OR m.player2_id = $1) AND m.status = 'completed'
       ORDER BY m.ended_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limitNum, offset]
    );

    const matchHistory = matchesResult.rows.map(row => {
      const isPlayer1 = row.player1_id === userId;
      const myScore = isPlayer1 ? row.player1_score : row.player2_score;
      const opponentScore = isPlayer1 ? row.player2_score : row.player1_score;
      const result = myScore > opponentScore ? 'win' : myScore < opponentScore ? 'loss' : 'draw';

      return {
        id: row.id,
        exhibitionId: row.exhibition_id,
        result,
        myScore,
        opponentScore,
        opponent: {
          id: isPlayer1 ? row.player2_id : row.player1_id,
          name: isPlayer1 ? row.player2_name : row.player1_name,
          avatar: isPlayer1 ? row.player2_avatar : row.player1_avatar,
        },
        startedAt: row.started_at,
        endedAt: row.ended_at,
      };
    });

    const regResult = await query(
      `SELECT er.id, er.exhibition_id, er.score, er.rank, er.registered_at,
              e.theme, e.prize_pool
       FROM exhibition_registrations er
       JOIN exhibitions e ON er.exhibition_id = e.id
       WHERE er.player_id = $1
       ORDER BY er.registered_at DESC
       LIMIT $2`,
      [userId, limitNum]
    );

    const registrationHistory = regResult.rows.map(row => ({
      id: row.id,
      exhibitionId: row.exhibition_id,
      theme: row.theme,
      score: row.score || 0,
      rank: row.rank,
      prizePool: row.prize_pool,
      registeredAt: row.registered_at,
    }));

    const wins = matchHistory.filter(m => m.result === 'win').length;
    const losses = matchHistory.filter(m => m.result === 'loss').length;
    const draws = matchHistory.filter(m => m.result === 'draw').length;

    res.json({
      success: true,
      message: '获取历史战绩成功',
      data: {
        matchHistory,
        registrationHistory,
        stats: {
          totalMatches: total,
          wins,
          losses,
          draws,
          winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('获取历史战绩错误:', error);
    res.status(500).json({
      success: false,
      message: '获取历史战绩失败',
      errors: { server: ['服务器内部错误'] },
    });
  }
});

export default router;
