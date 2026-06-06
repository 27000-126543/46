import { Router, Response } from 'express';
import { query } from '../lib/db';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { jsPDF } from 'jspdf';
import { formatGold, formatDate } from '../utils/helpers';

const router = Router();

router.get('/relic-value', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const top20Result = await query<any>(
    `SELECT id, username, avatar, level, total_relic_value
     FROM players
     WHERE total_relic_value > 0
     ORDER BY total_relic_value DESC
     LIMIT 20`
  );

  const myRankResult = await query<any>(
    `SELECT COUNT(*) + 1 as rank
     FROM players
     WHERE total_relic_value > (SELECT total_relic_value FROM players WHERE id = $1)`,
    [userId]
  );

  const myDataResult = await query<any>(
    'SELECT id, username, avatar, level, total_relic_value FROM players WHERE id = $1',
    [userId]
  );

  res.json({
    success: true,
    message: '获取文物总值排行榜成功',
    data: {
      top20: top20Result.rows,
      myRank: {
        rank: parseInt(myRankResult.rows[0].rank),
        player: myDataResult.rows[0] || null,
      },
    },
  });
});

router.get('/museum-score', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const top20Result = await query<any>(
    `SELECT p.id, p.username, p.avatar, p.level, p.museum_score,
            m.name as museum_name, m.attractiveness
     FROM players p
     LEFT JOIN museums m ON p.id = m.player_id
     WHERE p.museum_score > 0
     ORDER BY p.museum_score DESC
     LIMIT 20`
  );

  const myRankResult = await query<any>(
    `SELECT COUNT(*) + 1 as rank
     FROM players
     WHERE museum_score > (SELECT museum_score FROM players WHERE id = $1)`,
    [userId]
  );

  const myDataResult = await query<any>(
    `SELECT p.id, p.username, p.avatar, p.level, p.museum_score,
            m.name as museum_name, m.attractiveness
     FROM players p
     LEFT JOIN museums m ON p.id = m.player_id
     WHERE p.id = $1`,
    [userId]
  );

  res.json({
    success: true,
    message: '获取博物馆评分排行榜成功',
    data: {
      top20: top20Result.rows,
      myRank: {
        rank: parseInt(myRankResult.rows[0].rank),
        player: myDataResult.rows[0] || null,
      },
    },
  });
});

router.get('/achievement', auth, async (_req: AuthenticatedRequest, res: Response) => {
  const result = await query<any>(
    `SELECT p.id, p.username, p.avatar, p.level, p.exp,
            (SELECT COUNT(*) FROM relics r WHERE r.player_id = p.id) as relics_count,
            (SELECT COUNT(*) FROM explorations e WHERE e.player_id = p.id AND e.status = 'completed') as explorations_count,
            (SELECT COALESCE(SUM(r.estimated_price), 0) FROM relics r WHERE r.player_id = p.id) as total_relic_value
     FROM players p
     ORDER BY p.exp DESC
     LIMIT 50`
  );

  res.json({
    success: true,
    message: '获取考古成就排行榜成功',
    data: {
      rankings: result.rows,
    },
  });
});

router.get('/report/pdf', auth, async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;

  const playerResult = await query<any>(
    'SELECT * FROM players WHERE id = $1',
    [userId]
  );

  if (playerResult.rows.length === 0) {
    res.status(404).json({
      success: false,
      message: '玩家不存在',
    });
    return;
  }

  const player = playerResult.rows[0];

  const relicsResult = await query<any>(
    'SELECT * FROM relics WHERE player_id = $1 ORDER BY estimated_price DESC',
    [userId]
  );

  const ruinsDistributionResult = await query<any>(
    `SELECT r.civilization, COUNT(*) as count
     FROM relics r
     WHERE r.player_id = $1
     GROUP BY r.civilization
     ORDER BY count DESC`,
    [userId]
  );

  const museumResult = await query<any>(
    'SELECT * FROM museums WHERE player_id = $1',
    [userId]
  );

  const doc = new jsPDF();
  let yOffset = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Archaeology Competition Report', 105, yOffset, { align: 'center' });
  yOffset += 15;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Player Profile', 20, yOffset);
  yOffset += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Username: ${player.username}`, 20, yOffset);
  yOffset += 7;
  doc.text(`Level: ${player.level}    EXP: ${player.exp}`, 20, yOffset);
  yOffset += 7;
  doc.text(`Gold: ${formatGold(player.gold)}    Gems: ${player.gems}`, 20, yOffset);
  yOffset += 7;
  doc.text(`Total Relic Value: ${formatGold(player.total_relic_value)}`, 20, yOffset);
  yOffset += 7;
  doc.text(`Museum Score: ${player.museum_score}`, 20, yOffset);
  yOffset += 12;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ruins Civilization Distribution', 20, yOffset);
  yOffset += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const maxCount = Math.max(...ruinsDistributionResult.rows.map((r: any) => parseInt(r.count)), 1);

  ruinsDistributionResult.rows.forEach((row: any) => {
    const barLength = (parseInt(row.count) / maxCount) * 80;
    const bar = '█'.repeat(Math.max(1, Math.round(barLength / 3)));
    doc.text(`${row.civilization.padEnd(15)} ${bar} ${row.count}`, 20, yOffset);
    yOffset += 7;
  });
  yOffset += 5;

  if (museumResult.rows.length > 0) {
    const museum = museumResult.rows[0];
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Museum Income Trend', 20, yOffset);
    yOffset += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Museum Name: ${museum.name}`, 20, yOffset);
    yOffset += 7;
    doc.text(`Level: ${museum.level}    Attractiveness: ${museum.attractiveness}`, 20, yOffset);
    yOffset += 7;
    doc.text(`Daily Income: ${formatGold(museum.daily_income)}`, 20, yOffset);
    yOffset += 7;
    doc.text(`Total Visitors: ${museum.total_visitors}`, 20, yOffset);
    yOffset += 7;

    const incomeHistory = museum.income_history || [];
    if (incomeHistory.length > 0) {
      doc.text('Recent Income (last 7 entries):', 20, yOffset);
      yOffset += 7;
      incomeHistory.slice(-7).forEach((entry: any, idx: number) => {
        const barLen = Math.min(Math.round(entry.income / 500), 50);
        const bar = '█'.repeat(Math.max(1, barLen / 3));
        const dateStr = entry.date ? formatDate(entry.date) : `Day ${idx + 1}`;
        doc.text(`${dateStr.padEnd(12)} ${bar} ${formatGold(entry.income)}`, 25, yOffset);
        yOffset += 6;
      });
    }
    yOffset += 5;
  }

  if (yOffset > 240) {
    doc.addPage();
    yOffset = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Relics Collection', 20, yOffset);
  yOffset += 10;

  if (relicsResult.rows.length === 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('No relics collected yet.', 20, yOffset);
  } else {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Name', 20, yOffset);
    doc.text('Civilization', 65, yOffset);
    doc.text('Rarity', 95, yOffset);
    doc.text('Completeness', 120, yOffset);
    doc.text('Value', 155, yOffset);
    yOffset += 6;

    doc.line(20, yOffset - 2, 195, yOffset - 2);

    doc.setFont('helvetica', 'normal');
    relicsResult.rows.slice(0, 30).forEach((relic: any) => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }
      const name = (relic.name || '').substring(0, 18);
      doc.text(name, 20, yOffset);
      doc.text(relic.civilization || '', 65, yOffset);
      doc.text(relic.rarity || '', 95, yOffset);
      doc.text(`${relic.completeness || 0}%`, 120, yOffset);
      doc.text(formatGold(relic.estimated_price || 0), 155, yOffset);
      yOffset += 6;
    });

    if (relicsResult.rows.length > 30) {
      yOffset += 4;
      doc.text(`... and ${relicsResult.rows.length - 30} more relics`, 20, yOffset);
    }
  }

  const pdfBuffer = doc.output('arraybuffer');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="archaeology-report-${player.username}-${Date.now()}.pdf"`);
  res.setHeader('Content-Length', pdfBuffer.byteLength.toString());

  res.send(Buffer.from(pdfBuffer));
});

export default router;
