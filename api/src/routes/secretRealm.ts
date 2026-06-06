import { Router, Response } from 'express';
import { query, getClient } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { broadcast, SocketEvents } from '../lib/socket';
import { generateId, getRandomInt, getRandomItem } from '../utils/helpers';
import { BadRequestError, ForbiddenError, NotFoundError } from '../middleware/errorHandler';

const router = Router();

const ENTRY_FEE = 100;

const GLOBAL_EVENTS = [
  { type: 'boss', title: 'BOSS 出现！', message: '远古守护者突然觉醒，所有队伍受到冲击！', effect: 'damage' },
  { type: 'collapse', title: '秘境塌方！', message: '通道发生大面积塌方，所有队伍进度停滞！', effect: 'stagnate' },
  { type: 'treasure', title: '宝藏潮！', message: '神秘宝藏涌现，所有队伍获得额外奖励！', effect: 'bonus' },
];

router.get('/current', auth, async (_req: AuthenticatedRequest, res: Response) => {
  const realmResult = await query<any>(
    `SELECT * FROM secret_realms 
     WHERE is_active = true 
     AND (open_time IS NULL OR open_time <= NOW())
     AND (close_time IS NULL OR close_time >= NOW())
     ORDER BY created_at DESC 
     LIMIT 1`
  );

  if (realmResult.rows.length === 0) {
    res.json({
      success: true,
      message: '当前没有开放的秘境',
      data: {
        realm: null,
        teams: [],
      },
    });
    return;
  }

  const realm = realmResult.rows[0];

  const teamsResult = await query<any>(
    `SELECT 
      sr.team_id,
      t.name as team_name,
      t.player_id,
      p.username as player_name,
      p.avatar,
      (sr.progress) as progress,
      (sr.rewards) as rewards
     FROM (
       SELECT 
         jsonb_array_elements(teams)->>'teamId' as team_id,
         jsonb_array_elements(teams)->>'progress' as progress,
         jsonb_array_elements(teams)->>'rewards' as rewards,
         id as realm_id
       FROM secret_realms
     ) sr
     JOIN teams t ON sr.team_id::uuid = t.id
     JOIN players p ON t.player_id = p.id
     WHERE sr.realm_id = $1
     ORDER BY (sr.progress)::float DESC`,
    [realm.id]
  );

  const teamsProgress = teamsResult.rows.map((row: any) => ({
    teamId: row.team_id,
    teamName: row.team_name,
    playerId: row.player_id,
    playerName: row.player_name,
    avatar: row.avatar,
    progress: parseFloat(row.progress) || 0,
    rewards: row.rewards || {},
  }));

  res.json({
    success: true,
    message: '获取当前秘境信息成功',
    data: {
      realm,
      teams: teamsProgress,
    },
  });
});

router.post('/join', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { teamId } = req.body;

  if (!teamId) {
    throw new BadRequestError('需要提供队伍ID');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const playerResult = await client.query<any>(
      'SELECT * FROM players WHERE id = $1 FOR UPDATE',
      [userId]
    );
    const player = playerResult.rows[0];

    if (!player) {
      throw new NotFoundError('玩家不存在');
    }

    if (player.gold < ENTRY_FEE) {
      throw new BadRequestError(`金币不足，需要 ${ENTRY_FEE} 金币`);
    }

    const teamResult = await client.query<any>(
      'SELECT * FROM teams WHERE id = $1 AND player_id = $2',
      [teamId, userId]
    );

    if (teamResult.rows.length === 0) {
      throw new NotFoundError('队伍不存在或不属于你');
    }

    const realmResult = await client.query<any>(
      `SELECT * FROM secret_realms 
       WHERE is_active = true 
       AND (open_time IS NULL OR open_time <= NOW())
       AND (close_time IS NULL OR close_time >= NOW())
       ORDER BY created_at DESC 
       LIMIT 1
       FOR UPDATE`
    );

    if (realmResult.rows.length === 0) {
      throw new NotFoundError('当前没有开放的秘境');
    }

    const realm = realmResult.rows[0];
    const teams = realm.teams || [];

    if (teams.find((t: any) => t.teamId === teamId)) {
      throw new BadRequestError('该队伍已在秘境中');
    }

    if (teams.length >= (realm.max_players || 100)) {
      throw new BadRequestError('秘境人数已达上限');
    }

    teams.push({
      teamId,
      playerId: userId,
      progress: 0,
      rewards: { gold: 0, relics: [], exp: 0 },
      joinedAt: Date.now(),
      events: [],
    });

    await client.query(
      'UPDATE players SET gold = gold - $1 WHERE id = $2',
      [ENTRY_FEE, userId]
    );

    await client.query(
      'UPDATE secret_realms SET teams = $1, current_players = $2 WHERE id = $3',
      [JSON.stringify(teams), teams.length, realm.id]
    );

    await client.query('COMMIT');

    broadcast(SocketEvents.SECRET_REALM_UPDATE, {
      type: 'team_joined',
      realmId: realm.id,
      teamId,
      playerName: player.username,
    });

    res.json({
      success: true,
      message: '成功加入秘境',
      data: {
        realm,
        teams,
        entryFee: ENTRY_FEE,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.post('/leave', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  const { teamId } = req.body;

  if (!teamId) {
    throw new BadRequestError('需要提供队伍ID');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const teamResult = await client.query<any>(
      'SELECT * FROM teams WHERE id = $1 AND player_id = $2',
      [teamId, userId]
    );

    if (teamResult.rows.length === 0) {
      throw new ForbiddenError('你无权操作此队伍');
    }

    const realmResult = await client.query<any>(
      `SELECT * FROM secret_realms 
       WHERE is_active = true 
       ORDER BY created_at DESC 
       LIMIT 1
       FOR UPDATE`
    );

    if (realmResult.rows.length === 0) {
      throw new NotFoundError('当前没有开放的秘境');
    }

    const realm = realmResult.rows[0];
    let teams = realm.teams || [];
    const teamIndex = teams.findIndex((t: any) => t.teamId === teamId);

    if (teamIndex === -1) {
      throw new BadRequestError('该队伍不在秘境中');
    }

    const leavingTeam = teams[teamIndex];
    teams = teams.filter((t: any) => t.teamId !== teamId);

    if (leavingTeam.rewards && leavingTeam.rewards.gold > 0) {
      await client.query(
        'UPDATE players SET gold = gold + $1 WHERE id = $2',
        [leavingTeam.rewards.gold, userId]
      );
    }

    await client.query(
      'UPDATE secret_realms SET teams = $1, current_players = $2 WHERE id = $3',
      [JSON.stringify(teams), teams.length, realm.id]
    );

    await client.query('COMMIT');

    broadcast(SocketEvents.SECRET_REALM_UPDATE, {
      type: 'team_left',
      realmId: realm.id,
      teamId,
    });

    res.json({
      success: true,
      message: '成功离开秘境',
      data: {
        rewards: leavingTeam.rewards || {},
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.post('/tick', auth, async (_req: AuthenticatedRequest, res: Response) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const realmResult = await client.query<any>(
      `SELECT * FROM secret_realms 
       WHERE is_active = true 
       AND (open_time IS NULL OR open_time <= NOW())
       AND (close_time IS NULL OR close_time >= NOW())
       ORDER BY created_at DESC 
       LIMIT 1
       FOR UPDATE`
    );

    if (realmResult.rows.length === 0) {
      throw new NotFoundError('当前没有开放的秘境');
    }

    const realm = realmResult.rows[0];
    let teams = realm.teams || [];
    let globalEvents = realm.global_events || [];

    teams = teams.map((team: any) => {
      const progressGain = getRandomInt(5, 20);
      const newProgress = Math.min(100, (team.progress || 0) + progressGain);
      const goldGain = getRandomInt(10, 100);

      const existingRewards = team.rewards || { gold: 0, relics: [], exp: 0 };

      return {
        ...team,
        progress: newProgress,
        rewards: {
          ...existingRewards,
          gold: (existingRewards.gold || 0) + goldGain,
          exp: (existingRewards.exp || 0) + getRandomInt(5, 30),
        },
      };
    });

    const eventRoll = Math.random();
    let triggeredEvent: typeof GLOBAL_EVENTS[0] | null = null;

    if (eventRoll < 0.15) {
      triggeredEvent = getRandomItem(GLOBAL_EVENTS);

      if (triggeredEvent.effect === 'damage') {
        teams = teams.map((team: any) => ({
          ...team,
          progress: Math.max(0, (team.progress || 0) - 10),
        }));
      } else if (triggeredEvent.effect === 'stagnate') {
        teams = teams.map((team: any) => ({
          ...team,
          progress: team.progress || 0,
        }));
      } else if (triggeredEvent.effect === 'bonus') {
        teams = teams.map((team: any) => {
          const existingRewards = team.rewards || { gold: 0, relics: [], exp: 0 };
          return {
            ...team,
            progress: Math.min(100, (team.progress || 0) + 5),
            rewards: {
              ...existingRewards,
              gold: (existingRewards.gold || 0) + 500,
            },
          };
        });
      }

      globalEvents.push({
        ...triggeredEvent,
        id: generateId('evt'),
        timestamp: Date.now(),
      });
    }

    await client.query(
      'UPDATE secret_realms SET teams = $1, global_events = $2 WHERE id = $3',
      [JSON.stringify(teams), JSON.stringify(globalEvents), realm.id]
    );

    await client.query('COMMIT');

    broadcast(SocketEvents.SECRET_REALM_UPDATE, {
      type: 'tick',
      realmId: realm.id,
      teams,
      globalEvents,
    });

    if (triggeredEvent) {
      broadcast(SocketEvents.ANNOUNCEMENT, {
        id: generateId('ann'),
        type: 'secret_realm_event',
        title: `秘境事件：${triggeredEvent.title}`,
        message: triggeredEvent.message,
        rarity: triggeredEvent.type === 'boss' ? 'legendary' : triggeredEvent.type === 'treasure' ? 'epic' : 'rare',
        timestamp: Date.now(),
      });
    }

    res.json({
      success: true,
      message: '秘境 tick 成功',
      data: {
        teams,
        triggeredEvent,
        globalEvents,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
});

router.get('/leaderboard', auth, async (_req: AuthenticatedRequest, res: Response) => {
  const realmResult = await query<any>(
    `SELECT * FROM secret_realms 
     WHERE is_active = true 
     AND (open_time IS NULL OR open_time <= NOW())
     AND (close_time IS NULL OR close_time >= NOW())
     ORDER BY created_at DESC 
     LIMIT 1`
  );

  if (realmResult.rows.length === 0) {
    res.json({
      success: true,
      message: '当前没有开放的秘境',
      data: {
        realm: null,
        leaderboard: [],
      },
    });
    return;
  }

  const realm = realmResult.rows[0];
  const teams = realm.teams || [];

  const leaderboard = teams
    .map((team: any) => ({
      teamId: team.teamId,
      playerId: team.playerId,
      progress: team.progress || 0,
      rewards: team.rewards || { gold: 0, relics: [], exp: 0 },
      score: (team.progress || 0) * 100 + ((team.rewards?.gold) || 0),
    }))
    .sort((a: any, b: any) => b.score - a.score);

  const playerIds = leaderboard.map((t: any) => t.playerId).filter(Boolean);
  let playerMap: Record<string, any> = {};

  if (playerIds.length > 0) {
    const playersResult = await query<any>(
      'SELECT id, username, avatar FROM players WHERE id = ANY($1::uuid[])',
      [playerIds]
    );
    playerMap = playersResult.rows.reduce((acc: Record<string, any>, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, any>);
  }

  const teamIds = leaderboard.map((t: any) => t.teamId).filter(Boolean);
  let teamMap: Record<string, any> = {};

  if (teamIds.length > 0) {
    const teamsResult = await query<any>(
      'SELECT id, name FROM teams WHERE id = ANY($1::uuid[])',
      [teamIds]
    );
    teamMap = teamsResult.rows.reduce((acc: Record<string, any>, t: any) => {
      acc[t.id] = t;
      return acc;
    }, {} as Record<string, any>);
  }

  const enrichedLeaderboard = leaderboard.map((entry: any, index: number) => ({
    rank: index + 1,
    ...entry,
    playerName: playerMap[entry.playerId]?.username || 'Unknown',
    playerAvatar: playerMap[entry.playerId]?.avatar,
    teamName: teamMap[entry.teamId]?.name || 'Unknown Team',
  }));

  res.json({
    success: true,
    message: '获取秘境排行榜成功',
    data: {
      realm,
      leaderboard: enrichedLeaderboard,
    },
  });
});

export default router;
