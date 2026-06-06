import jsPDF from 'jspdf';
import type { Player, Relic, Museum, Civilization, Rarity } from '../types';
import {
  civilizationNames,
  rarityColors,
  rarityMultiplier
} from '../data/config';
import { formatGold, formatDateTime } from './helpers';

interface IncomeRecord {
  date: string;
  income: number;
}

interface RuinDistribution {
  civilization: Civilization;
  explored: number;
  completed: number;
  relicsFound: number;
}

export function generateArchaeologyReport(
  player: Player,
  relics: Relic[],
  museum: Museum,
  incomeHistory: IncomeRecord[]
): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Archaeology Report', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${formatDateTime(Date.now())}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 15;

  doc.setDrawColor(100, 100, 100);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Player Information', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const playerInfo = [
    ['Name', player.name],
    ['Level', String(player.level)],
    ['Experience', `${player.exp} XP`],
    ['Gold', formatGold(player.gold)],
    ['Gems', String(player.gems)],
    ['Total Relic Value', formatGold(player.totalRelicValue)],
    ['Museum Score', String(player.museumScore)]
  ];

  playerInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 70, yPos);
    yPos += 7;
  });

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Ruin Distribution (Text-based Map)', 20, yPos);
  yPos += 10;

  const ruinDist: RuinDistribution[] = calculateRuinDistribution(relics);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  ruinDist.forEach(ruin => {
    const barLength = Math.min(ruin.explored * 2, 100);
    const bar = '█'.repeat(Math.floor(barLength / 5)) + '░'.repeat(20 - Math.floor(barLength / 5));
    doc.text(`${civilizationNames[ruin.civilization]}:`, 25, yPos);
    doc.text(bar, 70, yPos);
    doc.text(`${ruin.explored} explored`, 150, yPos);
    yPos += 6;
    doc.text(`  Relics found: ${ruin.relicsFound}, Completed: ${ruin.completed}`, 70, yPos);
    yPos += 7;
  });

  if (yPos > pageHeight - 60) {
    doc.addPage();
    yPos = 20;
  }

  yPos += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Income Trend (Last 7 Days)', 20, yPos);
  yPos += 10;

  if (incomeHistory.length > 0) {
    const last7Days = incomeHistory.slice(-7);
    const maxIncome = Math.max(...last7Days.map(r => r.income), 1);

    doc.setFontSize(8);
    last7Days.forEach((record, index) => {
      const barHeight = (record.income / maxIncome) * 30;
      const xPos = 25 + index * 22;

      doc.setDrawColor(150, 150, 150);
      doc.line(xPos, yPos + 30, xPos, yPos + 30 - barHeight);
      doc.line(xPos + 15, yPos + 30, xPos + 15, yPos + 30 - barHeight);
      doc.line(xPos, yPos + 30 - barHeight, xPos + 15, yPos + 30 - barHeight);

      doc.text(record.date.slice(5), xPos, yPos + 40);
      doc.text(formatGold(record.income), xPos, yPos + 35);
    });

    yPos += 50;
  } else {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('No income history available', 25, yPos);
    yPos += 15;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Museum: ${museum.name}`, 20, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`Level: ${museum.level}`, 25, yPos);
  yPos += 6;
  doc.text(`Attractiveness: ${museum.attractiveness.toFixed(1)}`, 25, yPos);
  yPos += 6;
  doc.text(`Daily Income: ${formatGold(museum.dailyIncome)}`, 25, yPos);
  yPos += 6;
  doc.text(`Total Visitors: ${museum.totalVisitors}`, 25, yPos);
  yPos += 6;
  doc.text(`Number of Halls: ${museum.halls.length}`, 25, yPos);
  yPos += 10;

  if (yPos > pageHeight - 80) {
    doc.addPage();
    yPos = 20;
  }

  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Relic Collection (${relics.length} total)`, 20, yPos);
  yPos += 10;

  const displayedRelics = relics.slice(0, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('#', 22, yPos);
  doc.text('Name', 28, yPos);
  doc.text('Civilization', 75, yPos);
  doc.text('Rarity', 110, yPos);
  doc.text('Completeness', 135, yPos);
  doc.text('Est. Price', 165, yPos);
  yPos += 6;

  doc.setDrawColor(180, 180, 180);
  doc.line(20, yPos - 2, pageWidth - 20, yPos - 2);

  doc.setFont('helvetica', 'normal');
  displayedRelics.forEach((relic, index) => {
    if (yPos > pageHeight - 20) {
      doc.addPage();
      yPos = 20;
    }

    doc.text(String(index + 1), 22, yPos);
    doc.text(relic.name.length > 20 ? relic.name.slice(0, 18) + '...' : relic.name, 28, yPos);
    doc.text(civilizationNames[relic.civilization], 75, yPos);
    doc.text(getRarityLabel(relic.rarity), 110, yPos);
    doc.text(`${relic.completeness}%`, 135, yPos);
    doc.text(formatGold(relic.estimatedPrice), 165, yPos);
    yPos += 6;
  });

  if (relics.length > 15) {
    yPos += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`... and ${relics.length - 15} more relics not shown`, 25, yPos);
  }

  yPos += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, pageWidth - 20, yPos);
  yPos += 10;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Collection Statistics', 20, yPos);
  yPos += 10;

  const stats = calculateRelicStats(relics);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  Object.entries(stats.byRarity).forEach(([rarity, count]) => {
    doc.text(`${getRarityLabel(rarity as Rarity)}: ${count}`, 25, yPos);
    yPos += 7;
  });

  yPos += 5;
  doc.text(`In Museum: ${relics.filter(r => r.inMuseum).length}`, 25, yPos);
  yPos += 7;
  doc.text(`On Market: ${relics.filter(r => r.onMarket).length}`, 25, yPos);
  yPos += 7;
  doc.text(`Average Completeness: ${stats.avgCompleteness.toFixed(1)}%`, 25, yPos);
  yPos += 7;
  doc.text(`Total Estimated Value: ${formatGold(stats.totalValue)}`, 25, yPos);

  yPos = pageHeight - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(120, 120, 120);
  doc.text('Archaeology Competition System - Confidential Report', pageWidth / 2, yPos, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  return doc;
}

export function saveReport(
  player: Player,
  relics: Relic[],
  museum: Museum,
  incomeHistory: IncomeRecord[],
  filename?: string
): void {
  const doc = generateArchaeologyReport(player, relics, museum, incomeHistory);
  const reportFilename = filename || `archaeology_report_${player.id}_${Date.now()}.pdf`;
  doc.save(reportFilename);
}

export function exportReportAsBlob(
  player: Player,
  relics: Relic[],
  museum: Museum,
  incomeHistory: IncomeRecord[]
): Blob {
  const doc = generateArchaeologyReport(player, relics, museum, incomeHistory);
  return doc.output('blob');
}

function calculateRuinDistribution(relics: Relic[]): RuinDistribution[] {
  const civilizations: Civilization[] = ['egypt', 'maya', 'atlantis', 'rome', 'china', 'mesopotamia'];
  const distribution: Partial<Record<Civilization, RuinDistribution>> = {};

  civilizations.forEach(civ => {
    distribution[civ] = {
      civilization: civ,
      explored: 0,
      completed: 0,
      relicsFound: 0
    };
  });

  relics.forEach(relic => {
    if (distribution[relic.civilization]) {
      distribution[relic.civilization]!.relicsFound++;
      distribution[relic.civilization]!.explored++;
      if (relic.completeness >= 80) {
        distribution[relic.civilization]!.completed++;
      }
    }
  });

  return Object.values(distribution) as RuinDistribution[];
}

function calculateRelicStats(relics: Relic[]): {
  byRarity: Record<Rarity, number>;
  avgCompleteness: number;
  totalValue: number;
} {
  const byRarity: Record<Rarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0
  };

  let totalCompleteness = 0;
  let totalValue = 0;

  relics.forEach(relic => {
    byRarity[relic.rarity]++;
    totalCompleteness += relic.completeness;
    totalValue += relic.estimatedPrice;
  });

  return {
    byRarity,
    avgCompleteness: relics.length > 0 ? totalCompleteness / relics.length : 0,
    totalValue
  };
}

function getRarityLabel(rarity: Rarity): string {
  const labels: Record<Rarity, string> = {
    common: 'Common',
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary'
  };
  return labels[rarity];
}
