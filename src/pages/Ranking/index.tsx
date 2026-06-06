import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Award, Medal, TrendingUp, TrendingDown, Minus,
  FileText, Download, Image, Share2, Calendar, BarChart3,
  PieChart, MapPin, TrendingUp as TrendingUpIcon, Coins,
  ScrollText, History, Clock, RefreshCw, Crown
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import html2canvas from 'html2canvas';
import PageHeader from '../../components/layout/PageHeader';
import ParchmentCard from '../../components/ui/ParchmentCard';
import BronzeButton from '../../components/ui/BronzeButton';
import RarityBadge from '../../components/ui/RarityBadge';
import EmptyState from '../../components/ui/EmptyState';
import StatBar from '../../components/ui/StatBar';
import SandProgress from '../../components/ui/SandProgress';
import { useRankingStore } from '../../store/rankingStore';
import { usePlayerStore } from '../../store/playerStore';
import { useRelicStore } from '../../store/relicStore';
import { useMuseumStore } from '../../store/museumStore';
import { useMarketStore } from '../../store/marketStore';
import { saveReport } from '../../utils/pdf';
import { civilizationNames, rarityColors } from '../../data/config';
import type { RankingEntry, Civilization, Rarity } from '../../types';
import { cn } from '../../lib/utils';
import { formatGold } from '../../utils/helpers';

type RankingTab = 'all' | 'report';
type RankingType = 'relic' | 'museum' | 'achievement';
type ReportTimeRange = '7d' | '30d' | 'season' | 'custom';
type ReportSection = 'ruinMap' | 'income' | 'collection' | 'exhibition' | 'trade';

const rankingTypeConfig: Record<RankingType, { label: string; icon: React.ReactNode; valueLabel: string; valueSuffix: string }> = {
  relic: { label: '文物总值榜', icon: <Coins className="w-5 h-5" />, valueLabel: '文物总值', valueSuffix: '' },
  museum: { label: '博物馆评分榜', icon: <Award className="w-5 h-5" />, valueLabel: '博物馆评分', valueSuffix: '' },
  achievement: { label: '考古成就榜', icon: <Trophy className="w-5 h-5" />, valueLabel: '成就点数', valueSuffix: '' }
};

const trophyColors = {
  gold: { border: 'border-amber-400', bg: 'from-amber-400 to-yellow-600', glow: 'shadow-[0_0_40px_rgba(251,191,36,0.5)]', text: 'text-amber-300' },
  silver: { border: 'border-gray-400', bg: 'from-gray-300 to-gray-500', glow: 'shadow-[0_0_30px_rgba(156,163,175,0.4)]', text: 'text-gray-300' },
  bronze: { border: 'border-orange-700', bg: 'from-orange-600 to-orange-800', glow: 'shadow-[0_0_25px_rgba(234,88,12,0.4)]', text: 'text-orange-400' }
};

const PIE_COLORS = ['#D97706', '#9333EA', '#2563EB', '#059669', '#DC2626', '#0891B2'];

export default function Ranking() {
  const [activeTab, setActiveTab] = useState<RankingTab>('all');
  const [rankingType, setRankingType] = useState<RankingType>('relic');
  const reportRef = useRef<HTMLDivElement>(null);

  const { relicRankings, museumRankings, achievementRankings, refreshRankings } = useRankingStore();
  const { player } = usePlayerStore();
  const { relics } = useRelicStore();
  const { museum } = useMuseumStore();
  const { myListings } = useMarketStore();

  const currentRankings = useMemo(() => {
    switch (rankingType) {
      case 'relic': return relicRankings;
      case 'museum': return museumRankings;
      case 'achievement': return achievementRankings;
    }
  }, [rankingType, relicRankings, museumRankings, achievementRankings]);

  const topThree = currentRankings.slice(0, 3);
  const restRankings = currentRankings.slice(3, 20);
  const myRankingEntry = currentRankings.find(r => r.playerId === player.id) || {
    rank: currentRankings.length + getRandomInt(1, 10),
    playerId: player.id,
    playerName: player.name,
    avatar: player.avatar,
    value: rankingType === 'relic' ? player.totalRelicValue : rankingType === 'museum' ? player.museumScore : Math.round(player.level * 20),
    change: getRandomInt(-3, 3)
  };

  const topThreeChartData = topThree.map(entry => ({
    name: entry.playerName,
    value: entry.value,
    fill: entry.rank === 1 ? '#F59E0B' : entry.rank === 2 ? '#9CA3AF' : '#EA580C'
  }));

  const ruinDistributionData = useMemo(() => {
    const dist: Record<Civilization, number> = { egypt: 0, maya: 0, atlantis: 0, rome: 0, china: 0, mesopotamia: 0 };
    relics.forEach(r => { dist[r.civilization]++; });
    return Object.entries(dist)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({ name: civilizationNames[k as Civilization], value: v }));
  }, [relics]);

  const incomeTrendData = useMemo(() => {
    const history = museum.incomeHistory;
    if (history.length === 0) {
      const days = 7;
      return Array.from({ length: days }, (_, i) => ({
        date: `Day ${i + 1}`,
        income: Math.round(Math.random() * 5000 + 1000)
      }));
    }
    return history.map(h => ({ date: h.date.slice(5), income: h.income }));
  }, [museum.incomeHistory]);

  const collectionStatsData = useMemo(() => {
    const stats: Record<Rarity, number> = { common: 0, rare: 0, epic: 0, legendary: 0 };
    relics.forEach(r => { stats[r.rarity]++; });
    return Object.entries(stats).map(([k, v]) => ({
      name: rarityColors[k as Rarity].label,
      count: v,
      fill: k === 'common' ? '#6B7280' : k === 'rare' ? '#3B82F6' : k === 'epic' ? '#9333EA' : '#F59E0B'
    }));
  }, [relics]);

  const [reportConfig, setReportConfig] = useState<{
    timeRange: ReportTimeRange;
    sections: ReportSection[];
    customStart: string;
    customEnd: string;
  }>({
    timeRange: '7d',
    sections: ['ruinMap', 'income', 'collection', 'exhibition', 'trade'],
    customStart: '',
    customEnd: ''
  });

  const [historyReports] = useState<Array<{ id: string; date: string; name: string }>>([
    { id: '1', date: '2026-06-01', name: '月度考古报告' },
    { id: '2', date: '2026-05-25', name: '赛季总结报告' },
    { id: '3', date: '2026-05-18', name: '周度考古报告' }
  ]);

  const handleExportPDF = () => {
    saveReport(player, relics, museum, museum.incomeHistory);
  };

  const handleExportImage = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        backgroundColor: '#1a1410',
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `考古报告_${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (e) {
      console.error('导出图片失败', e);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/report/share/${player.id}`;
    navigator.clipboard?.writeText(url);
    alert('分享链接已复制到剪贴板！');
  };

  const toggleSection = (section: ReportSection) => {
    setReportConfig(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="排行榜与报告"
        subtitle="全服竞技排名，考古成就一览"
        icon={<Trophy className="w-7 h-7 text-amber-400" />}
        breadcrumbs={[{ label: '排行榜' }]}
      />

      <div className="flex gap-2 mb-6 border-b border-bronze-700/30">
        <button
          onClick={() => setActiveTab('all')}
          className={cn(
            'px-6 py-3 font-display font-semibold text-lg transition-all border-b-2 -mb-px',
            activeTab === 'all'
              ? 'text-amber-300 border-amber-400 bg-amber-400/5'
              : 'text-parchment-400 border-transparent hover:text-parchment-200'
          )}
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            全服榜单
          </div>
        </button>
        <button
          onClick={() => setActiveTab('report')}
          className={cn(
            'px-6 py-3 font-display font-semibold text-lg transition-all border-b-2 -mb-px',
            activeTab === 'report'
              ? 'text-amber-300 border-amber-400 bg-amber-400/5'
              : 'text-parchment-400 border-transparent hover:text-parchment-200'
          )}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            考古报告
          </div>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'all' ? (
          <motion.div
            key="ranking"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap gap-3 justify-between items-center">
              <div className="flex gap-2">
                {(Object.keys(rankingTypeConfig) as RankingType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setRankingType(type)}
                    className={cn(
                      'px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2',
                      rankingType === type
                        ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white shadow-gold-glow'
                        : 'bg-parchment-900/50 text-parchment-300 hover:bg-parchment-800/50 border border-bronze-700/30'
                    )}
                  >
                    {rankingTypeConfig[type].icon}
                    {rankingTypeConfig[type].label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-parchment-300">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span className="text-sm">每周重置倒计时：</span>
                  <span className="font-mono text-amber-300 font-semibold">5天 12:34:56</span>
                </div>
                <BronzeButton size="sm" onClick={refreshRankings} icon={<RefreshCw className="w-4 h-4" />}>
                  刷新
                </BronzeButton>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ParchmentCard title="全服排名" subtitle={`${rankingTypeConfig[rankingType].label} TOP 20`}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4 items-end justify-center">
                      {[1, 0, 2].map(idx => {
                        const entry = topThree[idx];
                        if (!entry) return null;
                        const medalColor = idx === 0 ? trophyColors.gold : idx === 1 ? trophyColors.silver : trophyColors.bronze;
                        const positionClass = idx === 0 ? 'order-1' : idx === 1 ? 'order-2' : 'order-3';
                        const heightClass = idx === 0 ? 'pt-0' : idx === 1 ? 'pt-10' : 'pt-16';

                        return (
                          <motion.div
                            key={entry.rank}
                            initial={{ opacity: 0, y: 50, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: idx * 0.15, type: 'spring' }}
                            className={cn('flex flex-col items-center', positionClass, heightClass)}
                          >
                            <div className="relative mb-2">
                              {entry.rank === 1 && (
                                <motion.div
                                  animate={{ y: [0, -5, 0], rotate: [-5, 5, -5] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="absolute -top-6 left-1/2 -translate-x-1/2 text-3xl"
                                >
                                  <Crown className="w-8 h-8 text-amber-400" />
                                </motion.div>
                              )}
                              <div className={cn(
                                'w-24 h-24 rounded-full flex items-center justify-center text-5xl',
                                idx === 0 ? 'w-28 h-28 text-6xl' : '',
                                'bg-gradient-to-br', medalColor.bg,
                                'border-4', medalColor.border,
                                medalColor.glow
                              )}>
                                {entry.avatar}
                              </div>
                            </div>

                            <div className="text-center mt-2">
                              <h4 className="font-display font-bold text-lg text-parchment-50 truncate max-w-[120px]">
                                {entry.playerName}
                              </h4>
                              <p className={cn('font-mono font-bold text-lg mt-1', medalColor.text)}>
                                {entry.value.toLocaleString()}
                              </p>
                            </div>

                            <div className={cn(
                              'mt-3 px-4 py-2 rounded-lg bg-gradient-to-r text-white font-display font-bold flex items-center gap-1',
                              medalColor.bg
                            )}>
                              {idx === 0 ? <Trophy className="w-5 h-5" /> : idx === 1 ? <Award className="w-5 h-5" /> : <Medal className="w-5 h-5" />}
                              第{entry.rank}名
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topThreeChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#4a3728" />
                          <XAxis type="number" stroke="#9ca3af" />
                          <YAxis dataKey="name" type="category" stroke="#9ca3af" width={80} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1a1410', border: '1px solid #78350f', borderRadius: '8px' }}
                            labelStyle={{ color: '#fbbf24' }}
                          />
                          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                            {topThreeChartData.map((entry, index) => (
                              <Cell key={index} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2">
                      {restRankings.map(entry => (
                        <RankingRow key={entry.rank} entry={entry} valueLabel={rankingTypeConfig[rankingType].valueLabel} />
                      ))}
                    </div>
                  </div>
                </ParchmentCard>
              </div>

              <div className="space-y-6">
                <ParchmentCard title="我的排名" icon={<Crown className="w-5 h-5" />}>
                  <div className="text-center">
                    <div className="relative inline-block mb-4">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 border-4 border-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.5)] flex items-center justify-center text-4xl">
                        {player.avatar}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-500 to-amber-700 text-white px-3 py-1 rounded-full font-display font-bold text-lg">
                        #{myRankingEntry.rank}
                      </div>
                    </div>
                    <h3 className="font-display font-bold text-xl text-parchment-50">{player.name}</h3>
                    <p className="text-parchment-400 mt-1">等级 {player.level}</p>
                    <div className="mt-4 p-4 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                      <div className="text-sm text-parchment-400">{rankingTypeConfig[rankingType].valueLabel}</div>
                      <div className="text-2xl font-mono font-bold text-amber-300 mt-1">
                        {myRankingEntry.value.toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      {myRankingEntry.change > 0 ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm font-medium">
                          <TrendingUp className="w-4 h-4" />
                          上升 {myRankingEntry.change} 名
                        </span>
                      ) : myRankingEntry.change < 0 ? (
                        <span className="flex items-center gap-1 text-red-400 text-sm font-medium">
                          <TrendingDown className="w-4 h-4" />
                          下降 {Math.abs(myRankingEntry.change)} 名
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-parchment-400 text-sm font-medium">
                          <Minus className="w-4 h-4" />
                          排名不变
                        </span>
                      )}
                    </div>
                  </div>
                </ParchmentCard>

                <ParchmentCard title="榜单规则" icon={<ScrollText className="w-5 h-5" />}>
                  <ul className="space-y-3 text-sm text-parchment-300">
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      文物总值榜根据玩家所有收藏文物的累计估价计算
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      博物馆评分综合评估展馆吸引力、访客量、展示质量
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      考古成就榜统计探索、修复、展览等各项成就
                    </li>
                    <li className="flex gap-2">
                      <span className="text-amber-400">•</span>
                      榜单每周一00:00重置，根据最终排名发放奖励
                    </li>
                  </ul>
                </ParchmentCard>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="report"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <ParchmentCard title="报告配置" icon={<FileText className="w-5 h-5" />}>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-parchment-200 mb-2 block">时间范围</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['7d', '30d', 'season', 'custom'] as ReportTimeRange[]).map(range => (
                          <button
                            key={range}
                            onClick={() => setReportConfig(p => ({ ...p, timeRange: range }))}
                            className={cn(
                              'px-3 py-2 rounded-lg text-sm transition-all',
                              reportConfig.timeRange === range
                                ? 'bg-gradient-to-r from-amber-500 to-amber-700 text-white'
                                : 'bg-parchment-900/50 text-parchment-300 hover:bg-parchment-800/50 border border-bronze-700/30'
                            )}
                          >
                            {range === '7d' ? '最近7天' : range === '30d' ? '最近30天' : range === 'season' ? '本赛季' : '自定义'}
                          </button>
                        ))}
                      </div>
                      {reportConfig.timeRange === 'custom' && (
                        <div className="mt-2 space-y-2">
                          <input
                            type="date"
                            value={reportConfig.customStart}
                            onChange={e => setReportConfig(p => ({ ...p, customStart: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-parchment-900 border border-bronze-700/30 text-parchment-100 text-sm"
                          />
                          <input
                            type="date"
                            value={reportConfig.customEnd}
                            onChange={e => setReportConfig(p => ({ ...p, customEnd: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-parchment-900 border border-bronze-700/30 text-parchment-100 text-sm"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-parchment-200 mb-2 block">包含内容</label>
                      <div className="space-y-2">
                        {[
                          { key: 'ruinMap', label: '遗址分布图', icon: <MapPin className="w-4 h-4" /> },
                          { key: 'income', label: '收入趋势', icon: <TrendingUpIcon className="w-4 h-4" /> },
                          { key: 'collection', label: '收藏统计', icon: <PieChart className="w-4 h-4" /> },
                          { key: 'exhibition', label: '展览战绩', icon: <Award className="w-4 h-4" /> },
                          { key: 'trade', label: '交易记录', icon: <Coins className="w-4 h-4" /> }
                        ].map(section => (
                          <label
                            key={section.key}
                            className={cn(
                              'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all',
                              reportConfig.sections.includes(section.key as ReportSection)
                                ? 'bg-amber-400/10 border border-amber-500/30'
                                : 'bg-parchment-900/30 border border-bronze-700/20 hover:bg-parchment-900/50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={reportConfig.sections.includes(section.key as ReportSection)}
                              onChange={() => toggleSection(section.key as ReportSection)}
                              className="w-4 h-4 rounded accent-amber-500"
                            />
                            {section.icon}
                            <span className="text-sm text-parchment-200">{section.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-bronze-700/30 space-y-2">
                      <BronzeButton onClick={handleExportPDF} icon={<Download className="w-4 h-4" />} className="w-full">
                        导出 PDF
                      </BronzeButton>
                      <BronzeButton onClick={handleExportImage} variant="secondary" icon={<Image className="w-4 h-4" />} className="w-full">
                        导出图片
                      </BronzeButton>
                      <BronzeButton onClick={handleShare} variant="ghost" icon={<Share2 className="w-4 h-4" />} className="w-full">
                        分享链接
                      </BronzeButton>
                    </div>
                  </div>
                </ParchmentCard>

                <ParchmentCard title="历史报告" icon={<History className="w-5 h-5" />}>
                  <div className="space-y-2">
                    {historyReports.map(report => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-parchment-900/30 hover:bg-parchment-900/50 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-bronze-400" />
                          <div>
                            <div className="text-sm text-parchment-100 font-medium">{report.name}</div>
                            <div className="text-xs text-parchment-500">{report.date}</div>
                          </div>
                        </div>
                        <Download className="w-4 h-4 text-parchment-500 group-hover:text-amber-400 transition-colors" />
                      </div>
                    ))}
                  </div>
                </ParchmentCard>
              </div>

              <div className="lg:col-span-3">
                <div ref={reportRef} className="space-y-6">
                  <ParchmentCard
                    title="考古报告预览"
                    subtitle="个人考古成就综合分析"
                    icon={<FileText className="w-5 h-5" />}
                    headerRight={
                      <div className="text-sm text-parchment-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date().toLocaleDateString('zh-CN')}
                      </div>
                    }
                  >
                    <div className="bg-gradient-to-br from-amber-900/20 via-parchment-900/50 to-amber-900/20 rounded-xl p-6 border border-bronze-700/30 mb-6">
                      <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 border-4 border-amber-300/50 flex items-center justify-center text-5xl shadow-lg">
                          {player.avatar}
                        </div>
                        <div className="flex-1">
                          <h2 className="font-display text-2xl font-bold text-parchment-50">{player.name}</h2>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-sm font-medium border border-amber-500/30">
                              Lv.{player.level} 考古学家
                            </span>
                            <span className="text-parchment-400 text-sm">
                              称号：精英探索者
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div>
                              <div className="text-xs text-parchment-500">收藏文物</div>
                              <div className="text-xl font-mono font-bold text-parchment-100">{relics.length}</div>
                            </div>
                            <div>
                              <div className="text-xs text-parchment-500">文物总值</div>
                              <div className="text-xl font-mono font-bold text-amber-300">
                                {formatGold(relics.reduce((s, r) => s + r.estimatedPrice, 0))}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-parchment-500">博物馆等级</div>
                              <div className="text-xl font-mono font-bold text-parchment-100">Lv.{museum.level}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {reportConfig.sections.includes('ruinMap') && (
                      <div className="mb-6">
                        <h4 className="font-display font-semibold text-lg text-parchment-100 mb-4 flex items-center gap-2">
                          <MapPin className="w-5 h-5 text-amber-400" />
                          遗址分布图
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={ruinDistributionData}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  dataKey="value"
                                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                  {ruinDistributionData.map((_, index) => (
                                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1a1410', border: '1px solid #78350f', borderRadius: '8px' }}
                                />
                                <Legend />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-col justify-center">
                            <p className="text-parchment-300 leading-relaxed">
                              您共探索了 <span className="text-amber-300 font-semibold">{relics.length}</span> 处古代遗址，
                              其中 <span className="text-amber-300 font-semibold">
                                {ruinDistributionData[0]?.name || '古埃及'}
                              </span> 文明探索次数最多，
                              展现出您对该文明浓厚的研究兴趣。建议后续可以均衡探索其他文明，
                              解锁更多文明专属成就和奖励。
                            </p>
                            <div className="mt-4 space-y-2">
                              {ruinDistributionData.slice(0, 3).map((item, i) => (
                                <StatBar
                                  key={i}
                                  label={item.name}
                                  value={item.value}
                                  max={Math.max(...ruinDistributionData.map(d => d.value))}
                                  color={`${['from-amber-500', 'from-purple-500', 'from-blue-500'][i]}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportConfig.sections.includes('income') && (
                      <div className="mb-6">
                        <h4 className="font-display font-semibold text-lg text-parchment-100 mb-4 flex items-center gap-2">
                          <TrendingUpIcon className="w-5 h-5 text-amber-400" />
                          收入趋势图
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={incomeTrendData}>
                              <defs>
                                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#4a3728" />
                              <XAxis dataKey="date" stroke="#9ca3af" />
                              <YAxis stroke="#9ca3af" />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#1a1410', border: '1px solid #78350f', borderRadius: '8px' }}
                              />
                              <Area
                                type="monotone"
                                dataKey="income"
                                stroke="#F59E0B"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#incomeGradient)"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {reportConfig.sections.includes('collection') && (
                      <div className="mb-6">
                        <h4 className="font-display font-semibold text-lg text-parchment-100 mb-4 flex items-center gap-2">
                          <PieChart className="w-5 h-5 text-amber-400" />
                          收藏统计
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={collectionStatsData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#4a3728" />
                                <XAxis dataKey="name" stroke="#9ca3af" />
                                <YAxis stroke="#9ca3af" />
                                <Tooltip
                                  contentStyle={{ backgroundColor: '#1a1410', border: '1px solid #78350f', borderRadius: '8px' }}
                                />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                  {collectionStatsData.map((entry, index) => (
                                    <Cell key={index} fill={entry.fill} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-3">
                            {collectionStatsData.map((stat, i) => (
                              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-parchment-900/30">
                                <div className="flex items-center gap-3">
                                  <RarityBadge rarity={(['common', 'rare', 'epic', 'legendary'] as Rarity[])[i]} />
                                  <span className="text-parchment-200">{stat.name}</span>
                                </div>
                                <span className="font-mono font-bold text-xl text-parchment-100">
                                  {stat.count}
                                </span>
                              </div>
                            ))}
                            <div className="pt-3 border-t border-bronze-700/30">
                              <div className="flex justify-between text-sm">
                                <span className="text-parchment-400">平均完整度</span>
                                <span className="text-parchment-100 font-medium">
                                  {relics.length > 0 ? (relics.reduce((s, r) => s + r.completeness, 0) / relics.length).toFixed(1) : 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {reportConfig.sections.includes('exhibition') && (
                      <div className="mb-6">
                        <h4 className="font-display font-semibold text-lg text-parchment-100 mb-4 flex items-center gap-2">
                          <Award className="w-5 h-5 text-amber-400" />
                          展览战绩
                        </h4>
                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { label: '博物馆评分', value: museum.attractiveness, unit: '' },
                            { label: '累计访客', value: museum.totalVisitors, unit: '人' },
                            { label: '展馆数量', value: museum.halls.length, unit: '个' },
                            { label: '陈列文物', value: museum.halls.reduce((s, h) => s + h.displayedRelics.length, 0), unit: '件' }
                          ].map((item, i) => (
                            <div key={i} className="p-4 rounded-xl bg-parchment-900/30 border border-bronze-700/30 text-center">
                              <div className="text-xs text-parchment-400 mb-1">{item.label}</div>
                              <div className="text-2xl font-mono font-bold text-amber-300">
                                {item.value.toLocaleString()}
                                <span className="text-sm font-normal text-parchment-400 ml-1">{item.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {reportConfig.sections.includes('trade') && (
                      <div>
                        <h4 className="font-display font-semibold text-lg text-parchment-100 mb-4 flex items-center gap-2">
                          <Coins className="w-5 h-5 text-amber-400" />
                          交易记录与文物时间轴
                        </h4>
                        <div className="space-y-3">
                          {relics.slice(0, 5).map((relic, idx) => (
                            <motion.div
                              key={relic.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-center gap-4 p-3 rounded-lg bg-parchment-900/30 hover:bg-parchment-900/50 transition-all"
                            >
                              <div className="w-12 h-12 rounded-lg bg-parchment-800 border border-bronze-700/30 flex items-center justify-center text-2xl flex-shrink-0">
                                {relic.rarity === 'legendary' ? '💎' : relic.rarity === 'epic' ? '🔮' : relic.rarity === 'rare' ? '📿' : '🏺'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-parchment-100 truncate">{relic.name}</span>
                                  <RarityBadge rarity={relic.rarity} size="sm" />
                                </div>
                                <div className="text-xs text-parchment-500 mt-0.5">
                                  {civilizationNames[relic.civilization]} · 发现于 {new Date(relic.discoveredAt).toLocaleDateString('zh-CN')}
                                </div>
                              </div>
                              <SandProgress
                                value={relic.completeness}
                                showLabel={false}
                                className="w-24"
                                height="h-2"
                              />
                              <div className="text-amber-300 font-mono font-semibold text-sm flex-shrink-0">
                                {formatGold(relic.estimatedPrice)}
                              </div>
                            </motion.div>
                          ))}
                          {myListings.length > 0 && (
                            <div className="mt-4 p-4 rounded-lg bg-amber-900/10 border border-amber-500/20">
                              <div className="flex items-center justify-between">
                                <span className="text-parchment-300">市场交易记录</span>
                                <span className="text-amber-300 font-medium">{myListings.length} 笔</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {reportConfig.sections.length === 0 && (
                      <EmptyState
                        title="请选择要包含的报告内容"
                        description="在左侧配置面板中勾选至少一个内容模块即可预览报告"
                        icon={<FileText className="w-12 h-12" />}
                      />
                    )}
                  </ParchmentCard>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RankingRow({ entry, valueLabel }: { entry: RankingEntry; valueLabel: string }) {
  const isMe = false;
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center gap-4 p-3 rounded-lg transition-all',
        isMe ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-parchment-900/30 hover:bg-parchment-900/50'
      )}
    >
      <div className="w-10 text-center">
        <span className="font-display font-bold text-lg text-parchment-300">#{entry.rank}</span>
      </div>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-parchment-800 to-parchment-900 border border-bronze-700/40 flex items-center justify-center text-xl">
        {entry.avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-parchment-100 truncate">{entry.playerName}</div>
        <div className="text-xs text-parchment-500">{valueLabel}</div>
      </div>
      <div className="font-mono font-bold text-parchment-100">
        {entry.value.toLocaleString()}
      </div>
      <div className="w-10 flex justify-center">
        {entry.change > 0 ? (
          <TrendingUp className="w-4 h-4 text-green-400" />
        ) : entry.change < 0 ? (
          <TrendingDown className="w-4 h-4 text-red-400" />
        ) : (
          <Minus className="w-4 h-4 text-parchment-500" />
        )}
      </div>
    </motion.div>
  );
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
