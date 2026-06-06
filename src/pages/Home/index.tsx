import { useMemo, useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  LayoutDashboard,
  User,
  Coins,
  Gem,
  Trophy,
  Star,
  MapPin,
  Clock,
  Sparkles,
  Calendar,
  Gift,
  ChevronRight,
  Bell,
  Compass,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../../components/layout/PageHeader';
import ParchmentCard from '../../components/ui/ParchmentCard';
import SandProgress from '../../components/ui/SandProgress';
import RelicCard from '../../components/ui/RelicCard';
import BronzeButton from '../../components/ui/BronzeButton';
import GoldDisplay from '../../components/shared/GoldDisplay';
import { usePlayerStore } from '../../store/playerStore';
import { useExplorationStore } from '../../store/explorationStore';
import { useRelicStore } from '../../store/relicStore';
import { useMuseumStore } from '../../store/museumStore';
import { useSecretRealmStore } from '../../store/secretRealmStore';
import { gameConfig, rarityColors } from '../../data/config';
import { ruins } from '../../data/ruins';
import { formatRelativeTime, formatGold } from '../../utils/helpers';
import type { Ruin, Announcement } from '../../types';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '已结束';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}时${minutes}分${seconds}秒`;
  if (minutes > 0) return `${minutes}分${seconds}秒`;
  return `${seconds}秒`;
}

function Home() {
  const { player, announcements } = usePlayerStore();
  const { currentExploration } = useExplorationStore();
  const { relics } = useRelicStore();
  const { museum, collectIncome } = useMuseumStore();
  const { secretRealm, isParticipating, joinRealm } = useSecretRealmStore();

  const [realmCountdown, setRealmCountdown] = useState(0);
  const [explorationRemaining, setExplorationRemaining] = useState(0);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);

  useEffect(() => {
    const updateTimers = () => {
      setRealmCountdown(secretRealm.closeTime - Date.now());
      if (currentExploration) {
        const ruin = ruins.find((r) => r.id === currentExploration.ruinId);
        if (ruin) {
          const totalMs = ruin.estimatedTime * 60 * 1000;
          const elapsed = (currentExploration.progress / 100) * totalMs;
          setExplorationRemaining(Math.max(0, totalMs - elapsed));
        }
      }
    };
    updateTimers();
    const timer = setInterval(updateTimers, 1000);
    return () => clearInterval(timer);
  }, [secretRealm.closeTime, currentExploration]);

  const expNeeded = useMemo(() => {
    return Math.floor(
      gameConfig.expPerLevel *
        Math.pow(gameConfig.levelExpMultiplier, player.level - 1),
    );
  }, [player.level]);

  const currentRuin: Ruin | undefined = useMemo(() => {
    if (!currentExploration) return undefined;
    return ruins.find((r) => r.id === currentExploration.ruinId);
  }, [currentExploration]);

  const recentRelics = useMemo(() => {
    return [...relics]
      .sort((a, b) => (b.discoveredAt || 0) - (a.discoveredAt || 0))
      .slice(0, 3);
  }, [relics]);

  const incomeChartData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const historyEntry = museum.incomeHistory.find(
        (h) => h.date === `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      );
      data.push({
        date: dateStr,
        income: historyEntry?.income ?? Math.round(museum.dailyIncome * (0.5 + Math.random() * 0.5)),
      });
    }
    return data;
  }, [museum.incomeHistory, museum.dailyIncome]);

  const rareAnnouncements = useMemo(() => {
    return announcements
      .filter(
        (a: Announcement) =>
          a.type === 'relic_found' &&
          (a.rarity === 'legendary' || a.rarity === 'epic'),
      )
      .slice(0, 5);
  }, [announcements]);

  const handleClaimDaily = () => {
    if (!dailyClaimed) {
      setDailyClaimed(true);
    }
  };

  const handleCollectIncome = () => {
    collectIncome();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="总览控制台"
        subtitle={`欢迎回来，${player.name}！今天也是探索历史的好日子。`}
        icon={<LayoutDashboard />}
        actions={
          <div className="relative">
            <BronzeButton
              variant="ghost"
              size="sm"
              icon={<Bell />}
              onClick={() => setShowAnnouncements(!showAnnouncements)}
            >
              <span className="sr-only">公告</span>
            </BronzeButton>
            {rareAnnouncements.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {rareAnnouncements.length}
              </span>
            )}
            <AnimatePresence>
              {showAnnouncements && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute right-0 top-12 w-96 card-parchment border-decorated p-4 z-50"
                >
                  <h4 className="font-display font-bold text-parchment-50 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    全服重要公告
                  </h4>
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {rareAnnouncements.length === 0 ? (
                      <p className="text-parchment-400 text-sm text-center py-4">
                        暂无稀有公告
                      </p>
                    ) : (
                      rareAnnouncements.map((a) => (
                        <div
                          key={a.id}
                          className="p-3 rounded-lg bg-parchment-900/50 border border-amber-500/30"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-amber-300 font-semibold text-sm">
                                {a.title}
                              </p>
                              <p className="text-parchment-300 text-xs mt-1">
                                {a.message}
                              </p>
                            </div>
                            {a.rarity && (
                              <span
                                className="text-xs px-2 py-0.5 rounded font-bold"
                                style={{
                                  backgroundColor: rarityColors[a.rarity].bg,
                                  color: rarityColors[a.rarity].text,
                                }}
                              >
                                {rarityColors[a.rarity].label}
                              </span>
                            )}
                          </div>
                          <p className="text-parchment-500 text-xs mt-1">
                            {formatRelativeTime(a.timestamp)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ParchmentCard
          title="玩家状态概览"
          icon={<User className="w-5 h-5" />}
          subtitle={`冒险等级 ${player.level}`}
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm text-parchment-300">经验值</span>
                <span className="text-sm font-mono text-parchment-200">
                  {player.exp} / {expNeeded}
                </span>
              </div>
              <SandProgress
                value={(player.exp / expNeeded) * 100}
                showLabel={false}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="text-xs text-parchment-400">金币</span>
                </div>
                <GoldDisplay amount={player.gold} size="lg" showIcon={false} />
              </div>

              <div className="p-3 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <Gem className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-parchment-400">宝石</span>
                </div>
                <span className="font-mono font-bold text-lg text-cyan-300">
                  {player.gems}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="w-4 h-4 text-rose-400" />
                  <span className="text-xs text-parchment-400">文物总值</span>
                </div>
                <span className="font-mono font-bold text-lg text-rose-300">
                  ¥{formatGold(player.totalRelicValue)}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-parchment-400">博物馆评分</span>
                </div>
                <span className="font-mono font-bold text-lg text-purple-300">
                  {museum.attractiveness}
                </span>
              </div>
            </div>
          </div>
        </ParchmentCard>

        <ParchmentCard
          title="当前探索状态"
          icon={<MapPin className="w-5 h-5" />}
          subtitle={currentRuin ? '探索进行中' : '暂无探索任务'}
        >
          {currentExploration && currentRuin ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-parchment-900 border border-bronze-700/30 flex items-center justify-center text-3xl">
                  {currentRuin.image}
                </div>
                <div className="flex-1">
                  <h4 className="font-display font-bold text-parchment-50">
                    {currentRuin.name}
                  </h4>
                  <p className="text-xs text-parchment-400">
                    难度 {'⭐'.repeat(currentRuin.difficulty)}
                  </p>
                </div>
              </div>

              <SandProgress value={currentExploration.progress} />

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-parchment-300">
                  <Clock className="w-4 h-4" />
                  <span>预计剩余</span>
                </div>
                <span className="font-mono text-bronze-300">
                  {formatCountdown(explorationRemaining)}
                </span>
              </div>

              {currentExploration.eventsTriggered.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm text-amber-300 font-medium">
                      {currentExploration.eventsTriggered.filter((e) => !e.resolved).length > 0
                        ? '有待处理的事件！'
                        : '事件已处理完毕'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-parchment-900 flex items-center justify-center">
                <Compass className="w-8 h-8 text-parchment-500" />
              </div>
              <p className="text-parchment-300 mb-4">当前没有进行中的探索</p>
              <BronzeButton icon={<MapPin />}>前往探索</BronzeButton>
            </div>
          )}
        </ParchmentCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ParchmentCard
          title="秘境遗迹"
          icon={<Sparkles className="w-5 h-5" />}
          subtitle={secretRealm.name}
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-parchment-400">剩余时间</span>
                <span className="font-mono text-sm text-amber-300">
                  {formatCountdown(realmCountdown)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-parchment-400">参与人数</span>
                <span className="font-mono text-sm text-parchment-200">
                  {secretRealm.currentPlayers}/{secretRealm.maxPlayers}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-parchment-300">
              <Users className="w-4 h-4" />
              <span>
                当前排名：第{' '}
                {secretRealm.teams.find(
                  (t) => t.playerId === player.id,
                )?.position ?? '-'}
                {' '}名
              </span>
            </div>

            <BronzeButton
              className="w-full"
              onClick={() => !isParticipating && joinRealm()}
              disabled={isParticipating || !secretRealm.isActive}
              icon={<Compass />}
            >
              {isParticipating ? '已参与' : '立即进入'}
            </BronzeButton>
          </div>
        </ParchmentCard>

        <ParchmentCard
          title="每周展览赛"
          icon={<Calendar className="w-5 h-5" />}
          subtitle="与其他博物馆一较高下"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  报名进行中
                </span>
              </div>
              <p className="text-sm text-parchment-300">
                本周主题：古代文明瑰宝
              </p>
            </div>

            <div className="text-sm text-parchment-300 space-y-1">
              <p>🏆 冠军奖励：5000金币 + 10宝石</p>
              <p>📅 报名截止：本周日 24:00</p>
              <p>👥 已报名：38人</p>
            </div>

            <BronzeButton className="w-full" icon={<Trophy />}>
              立即报名
            </BronzeButton>
          </div>
        </ParchmentCard>

        <ParchmentCard
          title="每日奖励"
          icon={<Gift className="w-5 h-5" />}
          subtitle="每日登录领取好礼"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div
                  key={day}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-center text-xs ${
                    day <= 3
                      ? 'bg-bronze-500/20 border-bronze-500/40 text-bronze-300'
                      : day === 4
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 ring-2 ring-amber-400/50'
                        : 'bg-parchment-900/50 border-bronze-700/30 text-parchment-500'
                  }`}
                >
                  <span className="font-bold">{day}</span>
                  <span className="text-[10px]">{day === 7 ? '💎' : '💰'}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-parchment-100">
                    今日奖励
                  </p>
                  <p className="text-xs text-parchment-400 mt-0.5">
                    500金币 + 随机材料
                  </p>
                </div>
                <Gift className="w-8 h-8 text-amber-400" />
              </div>
            </div>

            <BronzeButton
              className="w-full"
              onClick={handleClaimDaily}
              disabled={dailyClaimed}
              icon={dailyClaimed ? undefined : <Gift />}
            >
              {dailyClaimed ? '已领取' : '领取奖励'}
            </BronzeButton>
          </div>
        </ParchmentCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ParchmentCard
          title="文物收藏概览"
          icon={<Sparkles className="w-5 h-5" />}
          subtitle={`共收藏 ${relics.length} 件文物`}
          headerRight={
            <button className="flex items-center gap-1 text-sm text-bronze-400 hover:text-bronze-300 transition-colors">
              查看全部
              <ChevronRight className="w-4 h-4" />
            </button>
          }
        >
          {recentRelics.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {recentRelics.map((relic) => (
                <RelicCard key={relic.id} relic={relic} size="sm" showStats={false} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-parchment-400">
              暂无收藏的文物
            </div>
          )}
        </ParchmentCard>

        <ParchmentCard
          title="收入概览"
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="最近7天博物馆门票收入趋势"
          headerRight={
            museum.dailyIncome > 0 ? (
              <BronzeButton size="sm" onClick={handleCollectIncome} icon={<Coins />}>
                收取 ¥{formatGold(museum.dailyIncome)}
              </BronzeButton>
            ) : null
          }
        >
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={incomeChartData}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d3322" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#a89978', fontSize: 12 }}
                  axisLine={{ stroke: '#5a4a32' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#a89978', fontSize: 12 }}
                  axisLine={{ stroke: '#5a4a32' }}
                  tickLine={false}
                  tickFormatter={(v) => `¥${formatGold(v)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1510',
                    border: '1px solid #5a4a32',
                    borderRadius: '8px',
                    color: '#e8dcc4',
                  }}
                  formatter={(value: number) => [`¥${formatGold(value)}`, '收入']}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  stroke="#d4af37"
                  strokeWidth={2}
                  fill="url(#incomeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ParchmentCard>
      </div>

      <ParchmentCard
        title="全服重要公告"
        icon={<Bell className="w-5 h-5" />}
        subtitle="稀有文物发现与重大事件"
      >
        <div className="space-y-2">
          {rareAnnouncements.length === 0 ? (
            <div className="text-center py-8 text-parchment-400">
              暂无稀有公告，快去探索发现传奇文物吧！
            </div>
          ) : (
            rareAnnouncements.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg bg-parchment-900/50 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-amber-200">{a.title}</p>
                      <p className="text-sm text-parchment-300 mt-0.5">{a.message}</p>
                      <p className="text-xs text-parchment-500 mt-1">
                        {formatRelativeTime(a.timestamp)}
                      </p>
                    </div>
                  </div>
                  {a.rarity && (
                    <span
                      className="text-xs px-2 py-1 rounded font-bold flex-shrink-0 shadow-gold-glow"
                      style={{
                        backgroundColor: rarityColors[a.rarity].bg,
                        color: rarityColors[a.rarity].text,
                      }}
                    >
                      {rarityColors[a.rarity].label}
                    </span>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </ParchmentCard>
    </div>
  );
}

export default Home;
