import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Trophy,
  Coins,
  Users,
  Star,
  TrendingUp,
  Plus,
  ArrowUp,
  Ticket,
  Sparkles,
  LayoutGrid,
  Flame,
  Zap,
  Swords,
  Clock,
  Crown,
  Medal,
  Target,
  Shield,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Play,
  Pause
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import PageHeader from '@/components/layout/PageHeader';
import ParchmentCard from '@/components/ui/ParchmentCard';
import RelicCard from '@/components/ui/RelicCard';
import BronzeButton from '@/components/ui/BronzeButton';
import Modal from '@/components/ui/Modal';
import RarityBadge from '@/components/ui/RarityBadge';
import SandProgress from '@/components/ui/SandProgress';
import StatBar from '@/components/ui/StatBar';
import RelicStats from '@/components/shared/RelicStats';
import { useMuseumStore } from '@/store/museumStore';
import { useRelicStore } from '@/store/relicStore';
import { usePlayerStore } from '@/store/playerStore';
import { civilizationNames, civilizationIcons } from '@/data/config';
import type { Relic, ExhibitionMatch, VisitorReview, LayoutSlot as LayoutSlotType } from '@/types';
import { cn } from '@/lib/utils';

type MuseumTab = 'myMuseum' | 'exhibition';

const incomeHistoryData = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (13 - i));
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    income: Math.floor(500 + Math.random() * 2000 + i * 100)
  };
});

const mockExhibitionMatch: ExhibitionMatch = {
  id: 'match-001',
  participantA: 'player-default',
  participantAName: '我的博物馆',
  participantB: 'player-rival',
  participantBName: '失落文明博物馆',
  scoreA: 7820,
  scoreB: 6450,
  visitorReviews: [],
  damageRisk: 35,
  status: 'ongoing',
  winner: undefined
};

const mockReviews: VisitorReview[] = [
  { id: '1', timestamp: Date.now(), rating: 5, comment: '展品太棒了！古埃及文物震撼人心！', target: 'A' },
  { id: '2', timestamp: Date.now(), rating: 4, comment: '布局很用心，但光线稍暗', target: 'A' },
  { id: '3', timestamp: Date.now(), rating: 5, comment: '水晶头颅是真的吗？太不可思议了！', target: 'A' },
  { id: '4', timestamp: Date.now(), rating: 3, comment: '展品太少，期待更多', target: 'B' },
  { id: '5', timestamp: Date.now(), rating: 4, comment: '罗马展区很不错', target: 'B' },
  { id: '6', timestamp: Date.now(), rating: 5, comment: '讲解员专业，体验满分！', target: 'A' },
];

const mockHistory = [
  { id: 'h1', opponent: '金色黎明博物馆', myScore: 8500, opponentScore: 7200, win: true, date: '2026-06-01' },
  { id: 'h2', opponent: '时空回廊展馆', myScore: 6800, opponentScore: 7100, win: false, date: '2026-05-28' },
  { id: 'h3', opponent: '秘境宝藏馆', myScore: 9200, opponentScore: 8100, win: true, date: '2026-05-25' },
  { id: 'h4', opponent: '永恒遗迹博物馆', myScore: 7500, opponentScore: 7500, win: false, date: '2026-05-20' },
];

const weeklyRewards = [
  { rank: 1, reward: '100000金币 + 传说文物x1', icon: Crown },
  { rank: 2, reward: '50000金币 + 史诗文物x1', icon: Medal },
  { rank: 3, reward: '30000金币 + 稀有文物x2', icon: Trophy },
  { rank: '4-10', reward: '10000金币 + 稀有文物x1', icon: Star },
];

const slotTypeConfig: Record<LayoutSlotType['type'], { label: string; color: string; bonus: number }> = {
  empty: { label: '空展位', color: 'bg-parchment-800/50 border-parchment-600', bonus: 1.0 },
  display: { label: '主展示位', color: 'bg-bronze-900/40 border-bronze-500', bonus: 1.1 },
  decoration: { label: '装饰位', color: 'bg-ruin-900/40 border-ruin-500', bonus: 0.8 },
  path: { label: '通道', color: 'bg-parchment-900/80 border-parchment-700', bonus: 0 }
};

export default function MuseumPage() {
  const [activeTab, setActiveTab] = useState<MuseumTab>('myMuseum');
  const { museum, updateIncome, collectIncome, addHall, upgradeHall, placeRelic, removeRelic } = useMuseumStore();
  const { relics } = useRelicStore();
  const { player } = usePlayerStore();
  const [heatMapMode, setHeatMapMode] = useState(false);
  const [ticketPrice, setTicketPrice] = useState(50);
  const [showUnlockHall, setShowUnlockHall] = useState(false);
  const [showListing, setShowListing] = useState(false);
  const [newHallName, setNewHallName] = useState('');
  const [newHallTheme, setNewHallTheme] = useState<'mixed' | 'egypt' | 'maya' | 'atlantis' | 'rome' | 'china' | 'mesopotamia'>('mixed');
  const [matchScore, setMatchScore] = useState({ A: mockExhibitionMatch.scoreA, B: mockExhibitionMatch.scoreB });
  const [damageRisk, setDamageRisk] = useState(mockExhibitionMatch.damageRisk);
  const [reviews, setReviews] = useState<VisitorReview[]>(mockReviews);
  const [isMatchPaused, setIsMatchPaused] = useState(false);
  const [liveReviews, setLiveReviews] = useState<VisitorReview[]>([]);

  const availableRelics = useMemo(() => relics.filter(r => !r.inMuseum && !r.onMarket), [relics]);
  const displayedRelicIds = useMemo(() => museum.halls.flatMap(h => h.displayedRelics), [museum.halls]);
  const displayedRelics = useMemo(
    () => displayedRelicIds.map(id => relics.find(r => r.id === id)).filter((r): r is Relic => !!r),
    [displayedRelicIds, relics]
  );

  useEffect(() => {
    updateIncome();
  }, [updateIncome]);

  useEffect(() => {
    if (activeTab === 'exhibition' && !isMatchPaused) {
      const interval = setInterval(() => {
        setMatchScore(prev => ({
          A: prev.A + Math.floor(Math.random() * 80 + 20),
          B: prev.B + Math.floor(Math.random() * 70 + 15)
        }));
        setDamageRisk(prev => Math.min(100, Math.max(0, prev + (Math.random() - 0.45) * 3)));
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [activeTab, isMatchPaused]);

  useEffect(() => {
    if (activeTab === 'exhibition' && !isMatchPaused) {
      const commentInterval = setInterval(() => {
        const templates = [
          { rating: 5, comment: '展品太震撼了！不虚此行！', target: 'A' as const },
          { rating: 4, comment: '布局很有设计感', target: 'A' as const },
          { rating: 5, comment: '这个文物我找了好久！', target: 'A' as const },
          { rating: 3, comment: '人有点多，体验一般', target: 'B' as const },
          { rating: 4, comment: '讲解员很专业', target: Math.random() > 0.5 ? 'A' : 'B' as 'A' | 'B' },
          { rating: 5, comment: '下次还会再来！', target: 'A' as const },
          { rating: 2, comment: '展品太少了', target: 'B' as const },
        ];
        const template = templates[Math.floor(Math.random() * templates.length)];
        const newReview: VisitorReview = {
          id: `live-${Date.now()}`,
          timestamp: Date.now(),
          ...template
        };
        setLiveReviews(prev => [...prev.slice(-4), newReview]);
      }, 2500);

      return () => clearInterval(commentInterval);
    }
  }, [activeTab, isMatchPaused]);

  const handleCollectIncome = () => {
    const collected = collectIncome();
    if (collected > 0) {
      setShowListing(true);
      setTimeout(() => setShowListing(false), 2000);
    }
  };

  const handleAddHall = () => {
    if (!newHallName.trim()) return;
    const success = addHall(newHallName, newHallTheme);
    if (success) {
      setShowUnlockHall(false);
      setNewHallName('');
      setNewHallTheme('mixed');
    }
  };

  const handlePlaceRelic = (relicId: string) => {
    if (museum.halls.length > 0) {
      placeRelic(museum.halls[0].id, relicId);
    }
  };

  const getSlotAttractiveness = (slot: LayoutSlotType): number => {
    if (!slot.relicId) return 0;
    const relic = relics.find(r => r.id === slot.relicId);
    if (!relic) return 0;
    const baseAttraction = relic.historicalValue * (relic.completeness / 100) * 0.1;
    return baseAttraction * (slot.bonus || 1);
  };

  const maxAttraction = useMemo(() => {
    let max = 0;
    museum.layout.forEach(row => {
      row.forEach(slot => {
        const attr = getSlotAttractiveness(slot);
        if (attr > max) max = attr;
      });
    });
    return max || 1;
  }, [museum.layout, relics]);

  const getHeatColor = (slot: LayoutSlotType) => {
    if (!heatMapMode || slot.type === 'path') return '';
    const attr = getSlotAttractiveness(slot);
    const ratio = attr / maxAttraction;
    if (ratio > 0.75) return 'bg-red-500/60';
    if (ratio > 0.5) return 'bg-orange-500/50';
    if (ratio > 0.25) return 'bg-yellow-500/40';
    return 'bg-green-500/30';
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="博物馆与展览赛"
        subtitle="经营你的私人博物馆，参加文明展览竞技"
        icon={<Building2 />}
        breadcrumbs={[{ label: '博物馆' }]}
      />

      <div className="flex gap-2 mb-6 border-b border-bronze-700/30">
        {[
          { key: 'myMuseum' as const, label: '我的博物馆', icon: Building2 },
          { key: 'exhibition' as const, label: '展览赛', icon: Trophy },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-6 py-3 font-display font-semibold flex items-center gap-2 border-b-2 transition-all duration-300 -mb-px',
              activeTab === tab.key
                ? 'border-bronze-400 text-bronze-300'
                : 'border-transparent text-parchment-400 hover:text-parchment-200'
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'myMuseum' && (
          <motion.div
            key="myMuseum"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <ParchmentCard className="col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="text-bronze-400" size={20} />
                  <span className="text-parchment-400 text-sm">博物馆名称</span>
                </div>
                <h2 className="text-2xl font-display font-bold gold-text">{museum.name}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <Star className="text-amber-400" size={16} />
                  <span className="text-parchment-200">等级 {museum.level}</span>
                </div>
              </ParchmentCard>

              <ParchmentCard>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="text-bronze-400" size={18} />
                  <span className="text-parchment-400 text-sm">当前吸引力</span>
                </div>
                <div className="text-3xl font-display font-bold text-bronze-300">{museum.attractiveness}</div>
                <SandProgress value={Math.min(100, museum.attractiveness)} showLabel={false} className="mt-2" />
              </ParchmentCard>

              <ParchmentCard>
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="text-amber-400" size={18} />
                  <span className="text-parchment-400 text-sm">今日门票收入</span>
                </div>
                <div className="text-3xl font-display font-bold text-amber-300">
                  {museum.dailyIncome.toLocaleString()}
                </div>
                <div className="text-xs text-parchment-400 mt-1">金币</div>
              </ParchmentCard>

              <ParchmentCard>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="text-ruin-400" size={18} />
                  <span className="text-parchment-400 text-sm">累计游客数</span>
                </div>
                <div className="text-3xl font-display font-bold text-ruin-300">
                  {museum.totalVisitors.toLocaleString()}
                </div>
                <div className="text-xs text-parchment-400 mt-1">人次</div>
              </ParchmentCard>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <ParchmentCard
                title="收入趋势"
                subtitle="最近14天门票收入"
                icon={<TrendingUp size={20} />}
                className="lg:col-span-2"
              >
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={museum.incomeHistory.length > 0 ? museum.incomeHistory : incomeHistoryData}>
                      <defs>
                        <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.1)" />
                      <XAxis dataKey="date" stroke="#8B7355" fontSize={12} tickLine={false} />
                      <YAxis stroke="#8B7355" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#2C1810',
                          border: '1px solid rgba(212,175,55,0.4)',
                          borderRadius: '8px',
                          color: '#E8D5B0'
                        }}
                        formatter={(value: number) => [`${value.toLocaleString()} 金币`, '收入']}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        fill="url(#incomeGradient)"
                        name="收入"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ParchmentCard>

              <ParchmentCard
                title="经营面板"
                subtitle="博物馆日常管理"
                icon={<Ticket size={20} />}
              >
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-parchment-300 text-sm">门票价格</span>
                      <span className="text-bronze-300 font-mono font-bold">{ticketPrice} 金币</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={ticketPrice}
                      onChange={(e) => setTicketPrice(Number(e.target.value))}
                      className="w-full h-2 bg-parchment-800 rounded-lg appearance-none cursor-pointer accent-bronze-500"
                    />
                    <div className="flex justify-between text-xs text-parchment-500 mt-1">
                      <span>低价引流</span>
                      <span>高价收益</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-parchment-300 text-sm mb-2">游客满意度</div>
                    <SandProgress value={78 + Math.floor(ticketPrice / 50)} label={`满意度 ${78 + Math.floor(ticketPrice / 50)}%`} />
                  </div>

                  <div className="pt-2">
                    <StatBar label="预计游客数" value={Math.floor(museum.attractiveness * (200 - ticketPrice) / 100)} max={500} icon={<Users size={14} />} />
                  </div>

                  <BronzeButton
                    icon={<Coins />}
                    onClick={handleCollectIncome}
                    disabled={museum.dailyIncome <= 0}
                    className="w-full"
                  >
                    领取收入 {museum.dailyIncome > 0 && `(${museum.dailyIncome.toLocaleString()})`}
                  </BronzeButton>
                </div>
              </ParchmentCard>
            </div>

            <ParchmentCard
              title="展厅管理"
              subtitle="解锁和升级你的展厅"
              icon={<LayoutGrid size={20} />}
              headerRight={
                <BronzeButton size="sm" icon={<Plus />} onClick={() => setShowUnlockHall(true)}>
                  解锁新展厅
                </BronzeButton>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {museum.halls.map((hall, idx) => {
                  const cost = 5000 * Math.pow(2, hall.level - 1);
                  return (
                    <motion.div
                      key={hall.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                      className="p-5 rounded-xl bg-parchment-900/60 border border-bronze-700/30 hover:border-bronze-500/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-display font-bold text-lg text-parchment-50">{hall.name}</h4>
                          <div className="flex items-center gap-1 text-sm text-parchment-400 mt-1">
                            <span>{hall.theme === 'mixed' ? '🎨 综合展厅' : `${civilizationIcons[hall.theme]} ${civilizationNames[hall.theme]}`}</span>
                            <span>·</span>
                            <span>Lv.{hall.level}</span>
                          </div>
                        </div>
                        <RarityBadge rarity={hall.level >= 5 ? 'legendary' : hall.level >= 3 ? 'epic' : 'rare'} size="sm" />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div>
                          <div className="text-parchment-400">容量</div>
                          <div className="font-mono text-parchment-100">{hall.displayedRelics.length}/{hall.capacity}</div>
                        </div>
                        <div>
                          <div className="text-parchment-400">加成系数</div>
                          <div className="font-mono text-bronze-300">x{hall.bonusMultiplier.toFixed(1)}</div>
                        </div>
                      </div>

                      <SandProgress
                        value={(hall.displayedRelics.length / hall.capacity) * 100}
                        showLabel={false}
                        className="mb-4"
                      />

                      <div className="flex items-center gap-2">
                        <BronzeButton
                          size="sm"
                          variant="secondary"
                          icon={<ArrowUp />}
                          onClick={() => upgradeHall(hall.id)}
                          disabled={player.gold < cost}
                          className="flex-1"
                        >
                          升级 ({cost.toLocaleString()})
                        </BronzeButton>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ParchmentCard>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <ParchmentCard
                title="待陈列文物"
                subtitle="拖拽放入展位"
                icon={<Sparkles size={20} />}
                className="lg:col-span-1"
              >
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {availableRelics.length === 0 ? (
                    <div className="text-center py-8 text-parchment-400">
                      <Sparkles size={32} className="mx-auto mb-2 opacity-40" />
                      <p>没有可陈列的文物</p>
                    </div>
                  ) : (
                    availableRelics.map((relic) => (
                      <motion.div
                        key={relic.id}
                        draggable
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handlePlaceRelic(relic.id)}
                        className="p-3 rounded-lg bg-parchment-800/50 border border-bronze-700/20 cursor-grab active:cursor-grabbing hover:border-bronze-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-parchment-900 flex items-center justify-center text-2xl border border-bronze-700/30">
                            {relic.image}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-semibold text-parchment-100 truncate">{relic.name}</div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <RarityBadge rarity={relic.rarity} size="sm" />
                              <span className="text-xs text-parchment-400">{relic.completeness}%</span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </ParchmentCard>

              <ParchmentCard
                title="展馆布局编辑器"
                subtitle="6x4 网格，合理布置文物"
                icon={<LayoutGrid size={20} />}
                className="lg:col-span-3"
                headerRight={
                  <button
                    onClick={() => setHeatMapMode(!heatMapMode)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      heatMapMode
                        ? 'bg-bronze-500/30 text-bronze-300 border border-bronze-500/50'
                        : 'bg-parchment-800/50 text-parchment-300 border border-parchment-700/50 hover:border-bronze-500/30'
                    )}
                  >
                    <Flame size={14} />
                    热力图
                  </button>
                }
              >
                <div className="space-y-4">
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(6, 1fr)` }}>
                    {museum.layout.map((row, rowIdx) =>
                      row.map((slot, colIdx) => {
                        const config = slotTypeConfig[slot.type];
                        const relic = slot.relicId ? relics.find(r => r.id === slot.relicId) : null;
                        const attraction = getSlotAttractiveness(slot);

                        return (
                          <motion.div
                            key={`${rowIdx}-${colIdx}`}
                            whileHover={slot.type !== 'path' ? { scale: 1.05 } : undefined}
                            className={cn(
                              'aspect-square rounded-lg border-2 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-200',
                              config.color,
                              getHeatColor(slot),
                              slot.type !== 'path' && 'cursor-pointer hover:border-bronze-400'
                            )}
                          >
                            {slot.type === 'path' ? (
                              <div className="text-parchment-600 text-xs">通道</div>
                            ) : relic ? (
                              <>
                                <div className="text-2xl md:text-3xl">{relic.image}</div>
                                {!heatMapMode && attraction > 0 && (
                                  <div className="absolute bottom-0.5 text-[10px] text-bronze-300 font-mono">
                                    +{Math.round(attraction)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-parchment-500 text-xs text-center px-1">
                                {config.label}
                              </div>
                            )}
                            {slot.bonus && slot.bonus > 1 && slot.type !== 'path' && (
                              <div className="absolute top-0.5 right-0.5 text-[9px] bg-bronze-500/80 px-1 rounded text-white font-bold">
                                x{slot.bonus}
                              </div>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 pt-3 border-t border-bronze-700/20">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-bronze-900/40 border border-bronze-500" />
                      <span className="text-sm text-parchment-300">主展示位 (x1.1)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-parchment-800/50 border border-parchment-600" />
                      <span className="text-sm text-parchment-300">普通展位 (x1.0)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-ruin-900/40 border border-ruin-500" />
                      <span className="text-sm text-parchment-300">装饰位 (x0.8)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-parchment-900/80 border border-parchment-700" />
                      <span className="text-sm text-parchment-300">通道</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-parchment-900/60 border border-bronze-500/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="text-bronze-400" size={20} />
                        <span className="font-display font-semibold text-parchment-100">吸引力实时预览</span>
                      </div>
                      <div className="text-2xl font-display font-bold gold-text">
                        {museum.attractiveness}
                      </div>
                    </div>
                    <SandProgress value={Math.min(100, museum.attractiveness)} showLabel={false} className="mt-3" />
                  </div>
                </div>
              </ParchmentCard>
            </div>
          </motion.div>
        )}

        {activeTab === 'exhibition' && (
          <motion.div
            key="exhibition"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ParchmentCard
                title="本周赛事"
                subtitle="文明之光杯"
                icon={<Trophy size={20} />}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="text-bronze-400" size={16} />
                    <span className="text-parchment-300 text-sm">距报名截止</span>
                  </div>
                  <div className="text-3xl font-display font-bold text-bronze-300 font-mono">
                    02:34:17
                  </div>
                  <SandProgress value={65} showLabel={false} />
                </div>
              </ParchmentCard>

              <ParchmentCard
                title="已报名人数"
                subtitle="博物馆馆长参赛"
                icon={<Users size={20} />}
              >
                <div className="text-4xl font-display font-bold gold-text">1,247</div>
                <div className="mt-2 text-sm text-parchment-400">
                  预计奖励池：<span className="text-amber-300 font-bold">5,000,000 金币</span>
                </div>
              </ParchmentCard>

              <ParchmentCard
                title="我的报名"
                icon={<Target size={20} />}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl bg-bronze-emboss flex items-center justify-center text-3xl">
                    🏛️
                  </div>
                  <div>
                    <div className="font-display font-bold text-parchment-50">{museum.name}</div>
                    <div className="text-sm text-parchment-400">评分: <span className="text-bronze-300 font-mono">8,520</span></div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {displayedRelics.slice(0, 4).map((r) => (
                    <div key={r.id} className="w-8 h-8 rounded bg-parchment-800 border border-bronze-700/30 flex items-center justify-center text-sm">
                      {r.image}
                    </div>
                  ))}
                </div>
              </ParchmentCard>
            </div>

            <ParchmentCard
              title="实时对战"
              subtitle="正在进行的展览赛"
              icon={<Swords size={20} />}
              headerRight={
                <button
                  onClick={() => setIsMatchPaused(!isMatchPaused)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-parchment-800/50 text-parchment-300 border border-parchment-700/50 hover:border-bronze-500/30 transition-all"
                >
                  {isMatchPaused ? <Play size={14} /> : <Pause size={14} />}
                  {isMatchPaused ? '继续' : '暂停'}
                </button>
              }
            >
              <div className="grid grid-cols-1 lg:grid-cols-11 gap-4">
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-bronze-900/30 to-parchment-900/60 border border-bronze-500/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="text-bronze-400" size={18} />
                        <span className="font-display font-bold text-lg text-bronze-300">我方</span>
                      </div>
                      <RarityBadge rarity="legendary" size="sm" />
                    </div>
                    <div className="text-xl font-display font-bold text-parchment-50 mb-1">{mockExhibitionMatch.participantAName}</div>
                    <div className="text-5xl font-display font-bold gold-text font-mono text-center py-4">
                      {matchScore.A.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {displayedRelics.slice(0, 3).map((r) => (
                      <div key={r.id} className="p-3 rounded-lg bg-parchment-800/50 border border-bronze-700/30 text-center">
                        <div className="text-3xl mb-1">{r.image}</div>
                        <div className="text-xs text-parchment-300 truncate">{r.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-1 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-bronze-emboss flex items-center justify-center border-2 border-bronze-400 shadow-gold-glow">
                      <Swords className="text-bronze-300" size={28} />
                    </div>
                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-display font-bold text-bronze-400 whitespace-nowrap">
                      VS
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-red-900/20 to-parchment-900/60 border border-red-500/30">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-400" size={18} />
                        <span className="font-display font-bold text-lg text-red-300">对手</span>
                      </div>
                      <RarityBadge rarity="epic" size="sm" />
                    </div>
                    <div className="text-xl font-display font-bold text-parchment-50 mb-1">{mockExhibitionMatch.participantBName}</div>
                    <div className="text-5xl font-display font-bold text-red-300 font-mono text-center py-4">
                      {matchScore.B.toLocaleString()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {['🏺', '⚔️', '📜'].map((img, i) => (
                      <div key={i} className="p-3 rounded-lg bg-parchment-800/50 border border-red-700/20 text-center">
                        <div className="text-3xl mb-1">{img}</div>
                        <div className="text-xs text-parchment-400 truncate">对手文物{i + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-parchment-900/60 border border-bronze-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare className="text-bronze-400" size={18} />
                    <span className="font-display font-semibold text-parchment-100">游客评价弹幕</span>
                  </div>
                  <div className="h-40 overflow-hidden relative">
                    <AnimatePresence>
                      {liveReviews.slice(-5).map((review, idx) => (
                        <motion.div
                          key={review.id}
                          initial={{ opacity: 0, y: 40, x: Math.random() * 40 - 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -40 }}
                          transition={{ duration: 0.5 }}
                          style={{
                            position: 'absolute',
                            bottom: `${idx * 32}px`,
                            left: `${Math.random() * 60}%`,
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm max-w-[80%]',
                            review.target === 'A'
                              ? 'bg-bronze-500/20 border border-bronze-500/40 text-bronze-200'
                              : 'bg-red-500/20 border border-red-500/40 text-red-200'
                          )}
                        >
                          <div className="flex items-center gap-1">
                            {Array.from({ length: review.rating }).map((_, i) => (
                              <Star key={i} size={10} className="fill-amber-400 text-amber-400" />
                            ))}
                            <span className="ml-1">{review.comment}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-parchment-900/60 border border-bronze-700/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="text-amber-400" size={18} />
                    <span className="font-display font-semibold text-parchment-100">文物受损风险</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-parchment-300">综合风险指数</span>
                        <span className={cn(
                          'font-mono font-bold',
                          damageRisk > 70 ? 'text-red-400' : damageRisk > 40 ? 'text-amber-400' : 'text-green-400'
                        )}>
                          {Math.round(damageRisk)}%
                        </span>
                      </div>
                      <div className="h-3 bg-parchment-800 rounded-full overflow-hidden">
                        <motion.div
                          className={cn(
                            'h-full rounded-full transition-all',
                            damageRisk > 70 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                            damageRisk > 40 ? 'bg-gradient-to-r from-amber-600 to-amber-400' :
                            'bg-gradient-to-r from-green-600 to-green-400'
                          )}
                          animate={{ width: `${damageRisk}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {displayedRelics.slice(0, 3).map((r, i) => (
                        <div key={r.id} className="p-2 rounded bg-parchment-800/50">
                          <div className="text-xl mb-1">{r.image}</div>
                          <div className="text-parchment-400">风险 {20 + i * 15 + Math.round(damageRisk / 5)}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </ParchmentCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ParchmentCard
                title="历史战绩"
                subtitle="过往对战记录"
                icon={<Trophy size={20} />}
              >
                <div className="space-y-3">
                  {mockHistory.map((record) => (
                    <motion.div
                      key={record.id}
                      whileHover={{ x: 4 }}
                      className="p-4 rounded-xl bg-parchment-900/60 border border-bronze-700/30 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          record.win ? 'bg-bronze-500/30' : 'bg-parchment-700/50'
                        )}>
                          {record.win ? <Trophy className="text-bronze-400" size={18} /> : <Medal className="text-parchment-400" size={18} />}
                        </div>
                        <div>
                          <div className="font-display font-semibold text-parchment-100">
                            {record.win ? '胜利' : record.myScore === record.opponentScore ? '平局' : '失败'} vs {record.opponent}
                          </div>
                          <div className="text-xs text-parchment-400">{record.date}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold">
                          <span className={record.win ? 'text-bronze-300' : 'text-parchment-400'}>{record.myScore.toLocaleString()}</span>
                          <span className="text-parchment-500 mx-1">:</span>
                          <span className={!record.win && record.myScore !== record.opponentScore ? 'text-red-400' : 'text-parchment-400'}>{record.opponentScore.toLocaleString()}</span>
                        </div>
                        <ChevronRight className="text-parchment-500 ml-auto" size={16} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ParchmentCard>

              <ParchmentCard
                title="每周排名奖励"
                subtitle="赛季奖励预览"
                icon={<Crown size={20} />}
              >
                <div className="space-y-3">
                  {weeklyRewards.map((reward, idx) => (
                    <motion.div
                      key={String(reward.rank)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        'p-4 rounded-xl flex items-center justify-between border',
                        idx === 0
                          ? 'bg-gradient-to-r from-amber-900/30 to-parchment-900/60 border-amber-500/40'
                          : 'bg-parchment-900/60 border-bronze-700/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-12 h-12 rounded-full flex items-center justify-center',
                          idx === 0 ? 'bg-amber-500/30' : idx === 1 ? 'bg-gray-400/30' : idx === 2 ? 'bg-orange-600/30' : 'bg-parchment-700/50'
                        )}>
                          <reward.icon className={cn(
                            'size-6',
                            idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-parchment-400'
                          )} />
                        </div>
                        <div>
                          <div className="font-display font-bold text-parchment-100">
                            第 {reward.rank} 名
                          </div>
                          <div className="text-sm text-parchment-400">{reward.reward}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ParchmentCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={showUnlockHall} onClose={() => setShowUnlockHall(false)} title="解锁新展厅" size="md">
        <div className="space-y-5">
          <div>
            <label className="block text-sm text-parchment-300 mb-2">展厅名称</label>
            <input
              type="text"
              value={newHallName}
              onChange={(e) => setNewHallName(e.target.value)}
              placeholder="输入展厅名称..."
              className="w-full px-4 py-3 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-100 placeholder-parchment-500 focus:border-bronze-500 focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm text-parchment-300 mb-2">展厅主题</label>
            <div className="grid grid-cols-3 gap-2">
              {(['mixed', 'egypt', 'maya', 'atlantis', 'rome', 'china', 'mesopotamia'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setNewHallTheme(theme)}
                  className={cn(
                    'p-3 rounded-lg border text-sm transition-all',
                    newHallTheme === theme
                      ? 'bg-bronze-500/20 border-bronze-500 text-bronze-300'
                      : 'bg-parchment-900/60 border-parchment-700/40 text-parchment-300 hover:border-bronze-500/40'
                  )}
                >
                  {theme === 'mixed' ? '🎨 综合' : `${civilizationIcons[theme]} ${civilizationNames[theme]}`}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-parchment-900/60 border border-amber-500/30">
            <div className="flex items-center justify-between">
              <span className="text-parchment-300">解锁费用</span>
              <span className="text-2xl font-display font-bold text-amber-300 font-mono">
                {(10000 * Math.pow(2, museum.halls.length - 1)).toLocaleString()} 金币
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <BronzeButton variant="ghost" onClick={() => setShowUnlockHall(false)}>
            取消
          </BronzeButton>
          <BronzeButton icon={<Plus />} onClick={handleAddHall} disabled={!newHallName.trim()}>
            确认解锁
          </BronzeButton>
        </div>
      </Modal>

      <AnimatePresence>
        {showListing && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            className="fixed top-1/3 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="px-8 py-6 rounded-2xl bg-gradient-to-br from-amber-900/95 to-parchment-900/95 border-2 border-bronze-400 shadow-gold-glow text-center">
              <Coins className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <div className="text-xl font-display font-bold gold-text mb-1">收入领取成功！</div>
              <div className="text-3xl font-display font-bold text-amber-300 font-mono">
                +{museum.dailyIncome > 0 ? museum.dailyIncome.toLocaleString() : '0'} 金币
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
