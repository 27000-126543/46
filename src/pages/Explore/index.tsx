import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map,
  Star,
  Clock,
  Lock,
  Coins,
  Trophy,
  AlertTriangle,
  Skull,
  Sword,
  Gem,
  Search,
  ChevronRight,
  Users,
  Zap,
  Target,
  Shield,
  Sparkles
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import ParchmentCard from '../../components/ui/ParchmentCard';
import SandProgress from '../../components/ui/SandProgress';
import RelicCard from '../../components/ui/RelicCard';
import MemberCard from '../../components/ui/MemberCard';
import BronzeButton from '../../components/ui/BronzeButton';
import Modal from '../../components/ui/Modal';
import RarityBadge from '../../components/ui/RarityBadge';
import StatBar from '../../components/ui/StatBar';
import RelicStats from '../../components/shared/RelicStats';
import { useExplorationStore } from '../../store/explorationStore';
import { useTeamStore } from '../../store/teamStore';
import { usePlayerStore } from '../../store/playerStore';
import { useRelicStore } from '../../store/relicStore';
import { ruins } from '../../data/ruins';
import { civilizationNames, civilizationIcons, eventTypeNames, eventTypeIcons, professionNames } from '../../data/config';
import { cn } from '../../lib/utils';
import type { Ruin, Relic, ExplorationEvent } from '../../types';

type Rating = 'S' | 'A' | 'B' | 'C' | 'D';

const ratingColors: Record<Rating, string> = {
  S: 'from-amber-300 to-amber-500 text-amber-950 shadow-gold-glow',
  A: 'from-purple-300 to-purple-500 text-purple-950',
  B: 'from-blue-300 to-blue-500 text-blue-950',
  C: 'from-green-300 to-green-500 text-green-950',
  D: 'from-gray-300 to-gray-500 text-gray-950'
};

const eventIconMap: Record<string, React.ReactNode> = {
  trap: <AlertTriangle className="w-10 h-10 text-amber-400" />,
  collapse: <Skull className="w-10 h-10 text-gray-400" />,
  rival: <Sword className="w-10 h-10 text-red-400" />,
  treasure: <Gem className="w-10 h-10 text-yellow-400" />,
  discovery: <Search className="w-10 h-10 text-blue-400" />
};

export default function Explore() {
  const { currentExploration, startExploration, resolveEvent, tick, completeExploration } = useExplorationStore();
  const { members, team } = useTeamStore();
  const { player } = usePlayerStore();
  const { relics } = useRelicStore();

  const [selectedRuin, setSelectedRuin] = useState<Ruin | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<ExplorationEvent | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [explorationResult, setExplorationResult] = useState<{
    rating: Rating;
    goldEarned: number;
    expEarned: number;
    relicsFound: Relic[];
  } | null>(null);

  const teamMembers = useMemo(
    () => members.filter((m) => team.memberIds.includes(m.id)),
    [members, team.memberIds]
  );

  useEffect(() => {
    if (!currentExploration) return;
    const interval = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(interval);
  }, [currentExploration, tick]);

  useEffect(() => {
    if (currentExploration) {
      const pendingEvent = currentExploration.eventsTriggered.find((e) => !e.resolved);
      if (pendingEvent && !showEventModal) {
        setCurrentEvent(pendingEvent);
        setShowEventModal(true);
      }
    }
  }, [currentExploration, showEventModal]);

  useEffect(() => {
    if (currentExploration && currentExploration.progress >= 100 && !showResultModal) {
      const ruin = ruins.find((r) => r.id === currentExploration.ruinId);
      const foundRelics = relics.filter((r) => currentExploration.relicsFound.includes(r.id));
      const goldEarned = ruin ? Math.floor((ruin.rewards.goldMin + ruin.rewards.goldMax) / 2) : 0;
      const expEarned = ruin ? ruin.rewards.exp : 0;
      const avgCompleteness = foundRelics.length > 0
        ? foundRelics.reduce((sum, r) => sum + r.completeness, 0) / foundRelics.length
        : 0;
      let rating: Rating = 'D';
      if (foundRelics.length >= 3 && avgCompleteness >= 80) rating = 'S';
      else if (foundRelics.length >= 2 && avgCompleteness >= 70) rating = 'A';
      else if (foundRelics.length >= 1 && avgCompleteness >= 60) rating = 'B';
      else if (foundRelics.length >= 1) rating = 'C';
      setExplorationResult({ rating, goldEarned, expEarned, relicsFound: foundRelics });
      setShowResultModal(true);
    }
  }, [currentExploration, relics, showResultModal]);

  const elapsedSeconds = currentExploration
    ? Math.floor((Date.now() - currentExploration.startTime) / 1000)
    : 0;
  const estimatedTotal = selectedRuin ? selectedRuin.estimatedTime : 60;
  const remainingSeconds = Math.max(0, estimatedTotal - elapsedSeconds);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleStartExploration = () => {
    if (selectedRuin && startExploration(selectedRuin.id)) {
      setSelectedRuin(null);
    }
  };

  const handleResolveEvent = (eventId: string, choiceId: string) => {
    resolveEvent(eventId, choiceId);
    setShowEventModal(false);
    setCurrentEvent(null);
  };

  const handleCloseResult = () => {
    setShowResultModal(false);
    setExplorationResult(null);
    completeExploration();
  };

  const milestones = [25, 50, 75, 100];

  if (currentExploration) {
    const currentRuin = ruins.find((r) => r.id === currentExploration.ruinId);
    return (
      <div className="space-y-6">
        <PageHeader
          title="遗迹探索"
          subtitle="探索失落的古文明"
          icon={<Map className="w-8 h-8" />}
        />

        <ParchmentCard className="relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="text-9xl absolute inset-0 flex items-center justify-center">
              {currentRuin?.image || '🏛️'}
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-parchment-50">
                  {currentRuin?.name || '未知遗迹'}
                </h2>
                <p className="text-parchment-300 mt-1">
                  {civilizationNames[currentRuin?.civilization || 'egypt']}
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-3xl font-mono font-bold text-bronze-300">
                    {formatTime(elapsedSeconds)}
                  </p>
                  <p className="text-xs text-parchment-400">已用时间</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-mono font-bold text-parchment-300">
                    {formatTime(remainingSeconds)}
                  </p>
                  <p className="text-xs text-parchment-400">预计剩余</p>
                </div>
              </div>
            </div>

            <div className="relative mb-8">
              <SandProgress
                value={currentExploration.progress}
                showLabel={true}
                label={`探索进度 ${Math.round(currentExploration.progress)}%`}
                height="h-8"
              />

              <div className="absolute top-full left-0 right-0 mt-2 flex justify-between px-2">
                {milestones.map((ms) => (
                  <div
                    key={ms}
                    className={cn(
                      'flex flex-col items-center',
                      currentExploration.progress >= ms ? 'text-bronze-400' : 'text-parchment-500'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rotate-45 border-2',
                        currentExploration.progress >= ms
                          ? 'bg-bronze-400 border-bronze-300 shadow-gold-glow'
                          : 'bg-parchment-900 border-parchment-600'
                      )}
                    />
                    <span className="text-xs mt-1">{ms}%</span>
                  </div>
                ))}
              </div>

              <div className="absolute top-0 left-0 right-0 h-full flex items-center pointer-events-none">
                {teamMembers.map((member, idx) => {
                  const position = idx < teamMembers.length
                    ? (idx + 1) / (teamMembers.length + 1) * 100
                    : 0;
                  const offset = Math.min(currentExploration.progress, position + 10);
                  return (
                    <motion.div
                      key={member.id}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${offset}%`, top: '50%' }}
                      animate={{ left: `${offset}%` }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bronze-400 to-bronze-600 border-2 border-parchment-900 flex items-center justify-center text-lg shadow-lg">
                        {member.avatar}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 mt-10">
              {teamMembers.map((member) => (
                <div key={member.id} className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-bronze-500 to-bronze-700 p-0.5 mb-2">
                    <div className="w-full h-full rounded-full bg-parchment-900 flex items-center justify-center text-2xl">
                      {member.avatar}
                    </div>
                  </div>
                  <p className="text-sm font-display text-parchment-100 truncate">{member.name}</p>
                  <p className="text-xs text-parchment-400">{professionNames[member.profession]}</p>
                </div>
              ))}
            </div>
          </div>
        </ParchmentCard>

        <Modal
          isOpen={showEventModal && !!currentEvent}
          onClose={() => {}}
          size="lg"
          title="随机事件"
        >
          {currentEvent && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
              className="space-y-6"
            >
              <div className="flex items-start gap-4 p-4 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-parchment-800 flex items-center justify-center border-2 border-bronze-600">
                  {eventIconMap[currentEvent.type] || eventIconMap.discovery}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bronze-600/30 text-bronze-300 text-xs font-medium">
                      {eventTypeNames[currentEvent.type]}
                    </span>
                    <h3 className="text-xl font-display font-bold text-parchment-50">
                      {currentEvent.title}
                    </h3>
                  </div>
                  <p className="text-parchment-300 leading-relaxed">{currentEvent.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-parchment-200">选择应对方式：</p>
                {currentEvent.choices.map((choice) => {
                  const hasRequiredSkill = choice.requiredSkill
                    ? teamMembers.some(
                        (m) =>
                          m.profession === choice.requiredSkill!.profession &&
                          m.skillLevel >= choice.requiredSkill!.minLevel
                      )
                    : true;
                  return (
                    <motion.button
                      key={choice.id}
                      whileHover={{ scale: 1.01, x: 4 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleResolveEvent(currentEvent.id, choice.id)}
                      className={cn(
                        'w-full text-left p-4 rounded-lg border transition-all',
                        'border-bronze-700/40 bg-parchment-900/30 hover:bg-parchment-800/50 hover:border-bronze-500/60'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-display font-semibold text-parchment-100">{choice.text}</p>
                          {choice.requiredSkill && (
                            <p className={cn(
                              'text-xs mt-1',
                              hasRequiredSkill ? 'text-green-400' : 'text-red-400'
                            )}>
                              需要：{professionNames[choice.requiredSkill.profession]} Lv.{choice.requiredSkill.minLevel}
                              {hasRequiredSkill ? ' ✓' : ' ✗ (成功率减半)'}
                            </p>
                          )}
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className={cn(
                            'text-lg font-mono font-bold',
                            choice.successRate >= 0.7
                              ? 'text-green-400'
                              : choice.successRate >= 0.4
                              ? 'text-amber-400'
                              : 'text-red-400'
                          )}>
                            {Math.round(choice.successRate * 100)}%
                          </p>
                          <p className="text-xs text-parchment-400">成功率</p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </Modal>

        <Modal
          isOpen={showResultModal && !!explorationResult}
          onClose={handleCloseResult}
          size="lg"
          title="探索完成"
        >
          {explorationResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className={cn(
                  'inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br font-display text-6xl font-black',
                  ratingColors[explorationResult.rating]
                )}
              >
                {explorationResult.rating}
              </motion.div>

              <p className="text-xl font-display text-parchment-100">
                {explorationResult.rating === 'S'
                  ? '完美探索！'
                  : explorationResult.rating === 'A'
                  ? '出色的探索！'
                  : explorationResult.rating === 'B'
                  ? '不错的成果'
                  : explorationResult.rating === 'C'
                  ? '还算顺利'
                  : '下次加油'}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                  <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
                    <Coins className="w-5 h-5" />
                    <span className="text-sm">获得金币</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-parchment-50">
                    +{explorationResult.goldEarned}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
                  <div className="flex items-center justify-center gap-2 text-bronze-300 mb-1">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm">获得经验</span>
                  </div>
                  <p className="text-2xl font-mono font-bold text-parchment-50">
                    +{explorationResult.expEarned}
                  </p>
                </div>
              </div>

              {explorationResult.relicsFound.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-parchment-200 mb-3">发现的文物</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {explorationResult.relicsFound.map((relic) => (
                      <AnimatePresence key={relic.id}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring' }}
                        >
                          <RelicCard relic={relic} size="sm" showStats={false} />
                          {relic.rarity === 'legendary' && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="absolute inset-0 rounded-xl pointer-events-none"
                              style={{
                                boxShadow: '0 0 30px rgba(212, 175, 55, 0.6)'
                              }}
                            />
                          )}
                        </motion.div>
                      </AnimatePresence>
                    ))}
                  </div>
                </div>
              )}

              <BronzeButton size="lg" onClick={handleCloseResult} className="w-full">
                确认领取
              </BronzeButton>
            </motion.div>
          )}
        </Modal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="遗迹探索"
        subtitle="探索失落的古文明"
        icon={<Map className="w-8 h-8" />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {ruins.map((ruin, idx) => {
          const isUnlocked = player.level >= ruin.minLevel;
          const isSelected = selectedRuin?.id === ruin.id;
          return (
            <motion.div
              key={ruin.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              onClick={() => isUnlocked && setSelectedRuin(isSelected ? null : ruin)}
              className="cursor-pointer"
            >
              <ParchmentCard
                className={cn(
                  'relative transition-all duration-300',
                  !isUnlocked && 'opacity-60 grayscale',
                  isSelected && 'ring-2 ring-bronze-400 ring-offset-2 ring-offset-parchment-950',
                  isSelected && 'scale-[1.02]',
                  isUnlocked && 'hover:scale-[1.02]'
                )}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-parchment-950/60 backdrop-blur-[2px] rounded-xl">
                    <div className="text-center">
                      <Lock className="w-10 h-10 text-parchment-400 mx-auto mb-2" />
                      <p className="text-sm text-parchment-300">
                        需要等级 Lv.{ruin.minLevel}
                      </p>
                    </div>
                  </div>
                )}

                <div className="relative h-36 rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-parchment-800 to-parchment-900 flex items-center justify-center">
                  <span className="text-7xl">{ruin.image}</span>
                  <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-parchment-950/70 backdrop-blur-sm">
                    <span>{civilizationIcons[ruin.civilization]}</span>
                    <span className="text-xs text-parchment-200">
                      {civilizationNames[ruin.civilization]}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-display font-bold text-parchment-50 mb-2">
                  {ruin.name}
                </h3>

                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'w-4 h-4',
                        i < ruin.difficulty
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-parchment-700'
                      )}
                    />
                  ))}
                  <span className="text-xs text-parchment-400 ml-1">难度</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-parchment-300">
                    <Shield className="w-3.5 h-3.5 text-bronze-400" />
                    <span>Lv.{ruin.minLevel}+</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-parchment-300">
                    <Clock className="w-3.5 h-3.5 text-bronze-400" />
                    <span>~{ruin.estimatedTime}分钟</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-bronze-700/30">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-parchment-400">潜在奖励</span>
                    <span className="text-amber-400 font-mono">
                      {ruin.rewards.goldMin}-{ruin.rewards.goldMax} 金币
                    </span>
                  </div>
                </div>
              </ParchmentCard>
            </motion.div>
          );
        })}
      </div>

      {selectedRuin && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <ParchmentCard
            title="探索配置"
            subtitle={`准备探索：${selectedRuin.name}`}
            icon={<ChevronRight className="w-5 h-5" />}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="text-sm font-medium text-parchment-200 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-bronze-400" />
                  出战队伍
                </h4>
                {teamMembers.length > 0 ? (
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-parchment-900/40"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-bronze-500 to-bronze-700 p-0.5 flex-shrink-0">
                          <div className="w-full h-full rounded-full bg-parchment-900 flex items-center justify-center text-lg">
                            {member.avatar}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-display font-semibold text-parchment-100 truncate">
                            {member.name}
                          </p>
                          <p className="text-xs text-parchment-400">
                            {professionNames[member.profession]}
                          </p>
                        </div>
                        <RarityBadge rarity={member.rarity} size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-parchment-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">暂无出战队员</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <StatBar
                  label="预计探索速度"
                  value={Math.round(
                    teamMembers.reduce((sum, m) => sum + m.skills.explorationSpeed, 0) / Math.max(1, teamMembers.length)
                  )}
                  max={100}
                  icon={<Zap className="w-4 h-4" />}
                  color="from-amber-400 to-amber-600"
                />
                <StatBar
                  label="文物发现概率"
                  value={Math.round(
                    teamMembers.reduce((sum, m) => sum + m.skills.relicDiscovery, 0) / Math.max(1, teamMembers.length)
                  )}
                  max={100}
                  icon={<Target className="w-4 h-4" />}
                  color="from-purple-400 to-purple-600"
                />
                <StatBar
                  label="危险等级评估"
                  value={selectedRuin.difficulty * 20}
                  max={100}
                  icon={<AlertTriangle className="w-4 h-4" />}
                  color={
                    selectedRuin.difficulty <= 2
                      ? 'from-green-400 to-green-600'
                      : selectedRuin.difficulty <= 3
                      ? 'from-amber-400 to-amber-600'
                      : 'from-red-400 to-red-600'
                  }
                />
              </div>

              <div className="flex flex-col justify-between">
                <div className="p-4 rounded-lg bg-parchment-900/40 border border-bronze-700/30 mb-4">
                  <p className="text-xs text-parchment-400 mb-1">遗迹描述</p>
                  <p className="text-sm text-parchment-200 leading-relaxed">
                    {selectedRuin.description}
                  </p>
                </div>
                <BronzeButton
                  size="lg"
                  onClick={handleStartExploration}
                  disabled={teamMembers.length === 0}
                  icon={<Sparkles className="w-5 h-5" />}
                  className="w-full"
                >
                  开始探索
                </BronzeButton>
              </div>
            </div>
          </ParchmentCard>
        </motion.div>
      )}
    </div>
  );
}
