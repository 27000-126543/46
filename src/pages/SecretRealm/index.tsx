import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Swords, Clock, Users, MapPin, Trophy, AlertTriangle,
  Sparkles, Heart, Zap, Backpack, Pickaxe, Scroll,
  LogOut, Play, Info, Crown, Medal, Target, Gift,
  ChevronRight, Shield, AlertCircle
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import ParchmentCard from '../../components/ui/ParchmentCard';
import BronzeButton from '../../components/ui/BronzeButton';
import RarityBadge from '../../components/ui/RarityBadge';
import SandProgress from '../../components/ui/SandProgress';
import StatBar from '../../components/ui/StatBar';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { useSecretRealmStore } from '../../store/secretRealmStore';
import { usePlayerStore } from '../../store/playerStore';
import { useTeamStore } from '../../store/teamStore';
import { useRelicStore } from '../../store/relicStore';
import { civilizationNames, professionNames, professionIcons } from '../../data/config';
import { cn, getRandomInt, getRandomItem } from '../../utils/helpers';
import type { SecretRealmTeam, GlobalEvent, Relic, Rarity } from '../../types';

type RealmView = 'lobby' | 'exploring';

interface Particle {
  id: number;
  x: number;
  y: number;
}

interface EventChoice {
  id: string;
  text: string;
  successRate: number;
}

interface CurrentEvent {
  id: string;
  title: string;
  description: string;
  type: 'trap' | 'treasure' | 'boss' | 'mystery';
  choices: EventChoice[];
}

const mockRelicThumbnails: Array<{ name: string; rarity: Rarity; icon: string }> = [
  { name: '神秘青铜鼎', rarity: 'rare', icon: '🏺' },
  { name: '黄金面具碎片', rarity: 'epic', icon: '🎭' },
  { name: '古代卷轴', rarity: 'common', icon: '📜' }
];

export default function SecretRealm() {
  const [view, setView] = useState<RealmView>('lobby');
  const [showRules, setShowRules] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CurrentEvent | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

  const { secretRealm, isParticipating, joinRealm, leaveRealm, tickRealm, broadcastGlobalEvent } = useSecretRealmStore();
  const { player, materials } = usePlayerStore();
  const { team, members } = useTeamStore();
  const { relics } = useRelicStore();

  const sortedTeams = useMemo(() => {
    return [...secretRealm.teams].sort((a, b) => b.progress - a.progress);
  }, [secretRealm.teams]);

  const myTeam = useMemo(() => {
    return secretRealm.teams.find(t => t.playerId === player.id);
  }, [secretRealm.teams, player.id]);

  const top10Teams = sortedTeams.slice(0, 10);

  const teamMembers = useMemo(() => {
    return members.filter(m => team.memberIds.includes(m.id));
  }, [members, team.memberIds]);

  const countdown = useMemo(() => {
    const now = Date.now();
    const target = secretRealm.isActive ? secretRealm.closeTime : secretRealm.openTime;
    const diff = Math.max(0, target - now);
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { hours, minutes, seconds, isActive: secretRealm.isActive };
  }, [secretRealm]);

  useEffect(() => {
    if (view !== 'exploring') return;
    const interval = setInterval(() => {
      tickRealm();
    }, 500);
    return () => clearInterval(interval);
  }, [view, tickRealm]);

  useEffect(() => {
    if (view !== 'exploring') return;
    const eventInterval = setInterval(() => {
      if (Math.random() < 0.15 && !showEventModal) {
        triggerRandomEvent();
      }
    }, 8000);
    return () => clearInterval(eventInterval);
  }, [view, showEventModal]);

  useEffect(() => {
    if (view !== 'exploring') return;
    const relicInterval = setInterval(() => {
      if (Math.random() < 0.08) {
        spawnRewardParticles();
      }
    }, 5000);
    return () => clearInterval(relicInterval);
  }, [view]);

  const spawnRewardParticles = () => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 12; i++) {
      newParticles.push({
        id: particleIdRef.current++,
        x: Math.random() * 100,
        y: Math.random() * 100
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2000);
  };

  const triggerRandomEvent = () => {
    const events: CurrentEvent[] = [
      {
        id: '1',
        title: '古代陷阱触发！',
        description: '你不小心踩中了地板上的压力机关，毒箭从四面八方向你射来！',
        type: 'trap',
        choices: [
          { id: 'a', text: '快速翻滚躲避（需要探险家）', successRate: 0.8 },
          { id: 'b', text: '用盾牌硬抗（需要工程师）', successRate: 0.6 },
          { id: 'c', text: '寻找机关破解（需要语言学家）', successRate: 0.7 }
        ]
      },
      {
        id: '2',
        title: '发现隐藏宝箱！',
        description: '在墙壁的暗格中你发现了一个尘封已久的宝箱，上面刻满了神秘符文。',
        type: 'treasure',
        choices: [
          { id: 'a', text: '直接打开（风险较高）', successRate: 0.5 },
          { id: 'b', text: '仔细研究符文后打开', successRate: 0.85 },
          { id: 'c', text: '带回基地慢慢研究', successRate: 1.0 }
        ]
      },
      {
        id: '3',
        title: '秘境守护者现身！',
        description: '一尊巨大的石像缓缓苏醒，它是守护这片遗迹千年的远古守卫！',
        type: 'boss',
        choices: [
          { id: 'a', text: '正面对决（奖励丰厚）', successRate: 0.3 },
          { id: 'b', text: '寻找弱点攻击（需要历史学家）', successRate: 0.6 },
          { id: 'c', text: '悄悄绕过', successRate: 0.8 }
        ]
      }
    ];
    setCurrentEvent(getRandomItem(events));
    setShowEventModal(true);
  };

  const handleJoinRealm = () => {
    const success = joinRealm();
    if (success) {
      setView('exploring');
    }
  };

  const handleLeaveRealm = () => {
    leaveRealm();
    setView('lobby');
  };

  const handleEventChoice = (choice: EventChoice) => {
    const success = Math.random() < choice.successRate;
    broadcastGlobalEvent(
      success ? 'treasure_horde' : 'broadcast',
      success
        ? `🎉 ${player.name} 成功应对了「${currentEvent?.title}」！`
        : `💥 ${player.name} 在「${currentEvent?.title}」中遭遇挫折...`
    );
    if (success) {
      spawnRewardParticles();
    }
    setShowEventModal(false);
    setCurrentEvent(null);
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="秘境遗迹"
        subtitle="实时多人探索，争夺远古宝藏"
        icon={<Swords className="w-7 h-7 text-amber-400" />}
        breadcrumbs={[{ label: '秘境遗迹' }]}
        actions={
          view === 'exploring' ? (
            <BronzeButton variant="ghost" size="sm" onClick={handleLeaveRealm} icon={<LogOut className="w-4 h-4" />}>
              离开秘境
            </BronzeButton>
          ) : null
        }
      />

      <AnimatePresence mode="wait">
        {view === 'lobby' ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ParchmentCard>
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center gap-3 px-6 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
                      {secretRealm.isActive ? (
                        <>
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="text-green-400 font-medium">进行中</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-300 font-medium">准备中</span>
                        </>
                      )}
                    </div>

                    <h2 className="font-display text-4xl font-bold mb-2 bg-gold-shimmer bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer">
                      {secretRealm.name}
                    </h2>
                    <p className="text-parchment-400 text-lg mb-8">
                      {civilizationNames.atlantis} 文明 · 难度 ★★★★☆
                    </p>

                    <div className="flex items-center justify-center gap-6 mb-8">
                      <TimeBlock label={countdown.isActive ? '剩余时间' : '开启倒计时'} />
                      <div className="text-5xl font-display font-bold text-amber-300">:</div>
                      <TimeBlock value={String(countdown.hours).padStart(2, '0')} />
                      <div className="text-5xl font-display font-bold text-amber-300">:</div>
                      <TimeBlock value={String(countdown.minutes).padStart(2, '0')} />
                      <div className="text-5xl font-display font-bold text-amber-300">:</div>
                      <TimeBlock value={String(countdown.seconds).padStart(2, '0')} />
                    </div>

                    <div className="max-w-md mx-auto mb-8">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-parchment-400 flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          参与人数
                        </span>
                        <span className="text-amber-300 font-mono font-medium">
                          {secretRealm.currentPlayers} / {secretRealm.maxPlayers}
                        </span>
                      </div>
                      <div className="h-4 bg-parchment-900 rounded-full overflow-hidden border border-bronze-700/30">
                        <motion.div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-700 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${(secretRealm.currentPlayers / secretRealm.maxPlayers) * 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-4">
                      <BronzeButton
                        size="lg"
                        onClick={handleJoinRealm}
                        disabled={!secretRealm.isActive || isParticipating || secretRealm.currentPlayers >= secretRealm.maxPlayers}
                        icon={<Play className="w-5 h-5" />}
                      >
                        {isParticipating ? '已加入秘境' : secretRealm.currentPlayers >= secretRealm.maxPlayers ? '人数已满' : '加入秘境探索'}
                      </BronzeButton>
                      <BronzeButton
                        size="lg"
                        variant="secondary"
                        onClick={() => setShowRules(true)}
                        icon={<Info className="w-5 h-5" />}
                      >
                        规则说明
                      </BronzeButton>
                    </div>
                  </div>
                </ParchmentCard>

                <ParchmentCard
                  title="秘境介绍"
                  subtitle="失落的亚特兰蒂斯文明遗迹"
                  icon={<MapPin className="w-5 h-5" />}
                >
                  <div className="space-y-4">
                    <p className="text-parchment-300 leading-relaxed">
                      传说中沉没于大西洋海底的高度文明，掌握着先进的水晶科技和神秘的能量之力。
                      本次秘境将带您深入亚特兰蒂斯的核心神殿，探寻失落千年的远古宝藏。
                    </p>

                    <div>
                      <h4 className="font-display font-semibold text-parchment-100 mb-3 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-amber-400" />
                        奖励池预览
                      </h4>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { icon: '💎', name: '传说水晶', rarity: 'legendary' as Rarity },
                          { icon: '👑', name: '黄金王冠', rarity: 'epic' as Rarity },
                          { icon: '🏺', name: '古代陶罐', rarity: 'rare' as Rarity },
                          { icon: '📜', name: '神秘卷轴', rarity: 'rare' as Rarity }
                        ].map((item, i) => (
                          <div key={i} className="p-3 rounded-lg bg-parchment-900/30 border border-bronze-700/20 text-center">
                            <div className="text-3xl mb-1">{item.icon}</div>
                            <div className="text-sm text-parchment-200 truncate">{item.name}</div>
                            <div className="mt-1"><RarityBadge rarity={item.rarity} size="sm" /></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </ParchmentCard>
              </div>

              <div className="space-y-6">
                <ParchmentCard
                  title="已加入队伍"
                  subtitle={`${secretRealm.teams.length} 支队伍已集结`}
                  icon={<Users className="w-5 h-5" />}
                >
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {secretRealm.teams.map((t, idx) => (
                      <motion.div
                        key={t.teamId}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="p-3 rounded-lg bg-parchment-900/30 hover:bg-parchment-900/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {t.position <= 3 ? (
                              <Crown className={cn(
                                'w-4 h-4',
                                t.position === 1 ? 'text-amber-400' : t.position === 2 ? 'text-gray-300' : 'text-orange-400'
                              )} />
                            ) : (
                              <span className="w-4 text-center text-parchment-500 text-sm font-mono">#{t.position}</span>
                            )}
                            <span className="font-medium text-parchment-100">{t.playerName}</span>
                          </div>
                          <span className="text-xs text-parchment-500">预计战力: {t.relicsFound * 1000 + Math.round(t.progress * 50)}</span>
                        </div>
                        <SandProgress
                          value={t.progress}
                          showLabel={false}
                          height="h-1.5"
                        />
                      </motion.div>
                    ))}
                  </div>
                </ParchmentCard>

                <ParchmentCard title="我的队伍" icon={<Shield className="w-5 h-5" />}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-semibold text-parchment-100">{team.name}</span>
                      <span className="text-xs text-parchment-500">{teamMembers.length} 人</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {teamMembers.map(m => (
                        <div key={m.id} className="text-center">
                          <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-parchment-700 to-parchment-900 border border-bronze-700/30 flex items-center justify-center text-xl">
                            {professionIcons[m.profession]}
                          </div>
                          <div className="text-xs text-parchment-400 mt-1 truncate">{m.name}</div>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-bronze-700/30">
                      <StatBar
                        label="队伍综合战力"
                        value={teamMembers.reduce((s, m) => s + m.skillLevel * 10, 0)}
                        max={500}
                        color="from-amber-500 to-red-500"
                        icon={<Target className="w-4 h-4" />}
                      />
                    </div>
                  </div>
                </ParchmentCard>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="exploring"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="relative space-y-4"
          >
            <div className="grid grid-cols-4 gap-4">
              <StatusCard
                icon={<Clock className="w-5 h-5 text-amber-400" />}
                label="剩余时间"
                value={`${countdown.hours}:${String(countdown.minutes).padStart(2, '0')}:${String(countdown.seconds).padStart(2, '0')}`}
                highlight
              />
              <StatusCard
                icon={<Users className="w-5 h-5 text-blue-400" />}
                label="参与队伍"
                value={`${secretRealm.teams.length} 支`}
              />
              <StatusCard
                icon={<Sparkles className="w-5 h-5 text-purple-400" />}
                label="已发现文物"
                value={`${secretRealm.teams.reduce((s, t) => s + t.relicsFound, 0)} 件`}
              />
              <StatusCard
                icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
                label="全服事件"
                value={`${secretRealm.globalEvents.length} 次`}
              />
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-parchment-900 via-parchment-900/50 to-parchment-900 border border-bronze-700/30 py-3 px-6">
              <div className="flex gap-12 whitespace-nowrap animate-[scroll_30s_linear_infinite]">
                {[...secretRealm.globalEvents, ...secretRealm.globalEvents].map((event, idx) => (
                  <motion.div
                    key={`${event.id}-${idx}`}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <EventBadge type={event.type} />
                    <span className={cn(
                      'font-medium',
                      event.type === 'boss' ? 'text-red-400' :
                      event.type === 'treasure_horde' ? 'text-amber-300' :
                      'text-parchment-200'
                    )}>
                      {event.message}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
              <div className="lg:col-span-7 relative">
                <ParchmentCard
                  title="队伍进度"
                  subtitle="实时探索情况"
                  icon={<Target className="w-5 h-5" />}
                  className="h-full"
                >
                  <div className="relative">
                    {particles.map(p => (
                      <motion.div
                        key={p.id}
                        initial={{ scale: 0, opacity: 1, y: 0 }}
                        animate={{ scale: 1.5, opacity: 0, y: -60 }}
                        transition={{ duration: 1.5, ease: 'easeOut' }}
                        className="absolute w-3 h-3 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_10px_rgba(251,191,36,0.8)] pointer-events-none"
                        style={{ left: `${p.x}%`, top: `${p.y}%` }}
                      />
                    ))}

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                      {myTeam && (
                        <motion.div
                          key="my-team"
                          layout
                          className="p-4 rounded-xl bg-gradient-to-r from-amber-900/30 to-amber-900/10 border-2 border-amber-500/50 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 rounded-md bg-amber-500 text-white text-xs font-bold">我的队伍</span>
                              {myTeam.position <= 3 ? (
                                <Crown className={cn(
                                  'w-5 h-5',
                                  myTeam.position === 1 ? 'text-amber-400' : myTeam.position === 2 ? 'text-gray-300' : 'text-orange-400'
                                )} />
                              ) : null}
                              <span className="font-display font-bold text-lg text-parchment-50">{player.name}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1 text-sm">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-parchment-200">{myTeam.relicsFound} 件文物</span>
                              </div>
                              <span className="font-mono font-bold text-amber-300">#{myTeam.position}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <SandProgress
                                value={myTeam.progress}
                                label={`探索进度 ${myTeam.progress.toFixed(1)}%`}
                                height="h-3"
                              />
                            </div>
                            <span className="text-sm text-parchment-400 whitespace-nowrap">
                              当前位置: 亚特兰蒂斯神殿 {Math.floor(myTeam.progress / 10) + 1} 层
                            </span>
                          </div>
                        </motion.div>
                      )}

                      {sortedTeams.map((t, idx) => {
                        if (t.playerId === player.id) return null;
                        const isTop3 = t.position <= 3;
                        return (
                          <motion.div
                            key={t.teamId}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className={cn(
                              'p-3 rounded-lg transition-all',
                              isTop3
                                ? 'bg-gradient-to-r from-amber-900/20 border border-amber-500/30'
                                : 'bg-parchment-900/30 hover:bg-parchment-900/50'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 text-center">
                                  {isTop3 ? (
                                    <Medal className={cn(
                                      'w-5 h-5 mx-auto',
                                      t.position === 1 ? 'text-amber-400' : t.position === 2 ? 'text-gray-300' : 'text-orange-400'
                                    )} />
                                  ) : (
                                    <span className="font-mono font-bold text-parchment-500">#{t.position}</span>
                                  )}
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-parchment-700 to-parchment-900 border border-bronze-700/30 flex items-center justify-center text-base">
                                  🧑‍🔬
                                </div>
                                <span className={cn(
                                  'font-medium',
                                  isTop3 ? 'text-amber-200' : 'text-parchment-100'
                                )}>
                                  {t.playerName}
                                </span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-xs text-parchment-400">
                                  {Math.floor(t.progress / 10) + 1} 层
                                </span>
                                <div className="flex items-center gap-1 text-xs">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  <span className="text-parchment-300">{t.relicsFound}</span>
                                </div>
                              </div>
                            </div>
                            <SandProgress
                              value={t.progress}
                              showLabel={false}
                              height="h-2"
                            />
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </ParchmentCard>
              </div>

              <div className="lg:col-span-3 space-y-4">
                <ParchmentCard
                  title="我的队伍详情"
                  subtitle="实时状态监控"
                  icon={<Shield className="w-5 h-5" />}
                >
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-parchment-300 mb-3">队员状态</h4>
                      <div className="space-y-2">
                        {teamMembers.map(m => (
                          <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-parchment-900/30">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-parchment-700 to-parchment-900 border border-bronze-700/30 flex items-center justify-center text-xl">
                                {professionIcons[m.profession]}
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-parchment-950" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-parchment-100 truncate">{m.name}</span>
                                <span className="text-xs text-parchment-500">{professionNames[m.profession]}</span>
                              </div>
                              <div className="flex gap-2">
                                <div className="flex-1">
                                  <StatBar
                                    label=""
                                    value={getRandomInt(60, 100)}
                                    max={100}
                                    color="from-red-500 to-red-400"
                                    showValue={false}
                                  />
                                </div>
                                <div className="flex-1">
                                  <StatBar
                                    label=""
                                    value={getRandomInt(40, 100)}
                                    max={100}
                                    color="from-blue-500 to-blue-400"
                                    showValue={false}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-bronze-700/30">
                      <h4 className="text-sm font-medium text-parchment-300 mb-2">当前区域</h4>
                      <div className="p-3 rounded-lg bg-gradient-to-br from-amber-900/20 to-parchment-900/50 border border-bronze-700/30">
                        <div className="flex items-center gap-2 mb-1">
                          <MapPin className="w-4 h-4 text-amber-400" />
                          <span className="font-medium text-parchment-100">水晶能量核心</span>
                        </div>
                        <p className="text-xs text-parchment-400 leading-relaxed">
                          巨大的水晶散发着神秘的能量波动，空气中漂浮着金色的光点。
                          传说这里封印着亚特兰蒂斯最核心的秘密...
                        </p>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-parchment-300 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        我队已发现文物 ({myTeam?.relicsFound || 0})
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {mockRelicThumbnails.map((r, i) => (
                          <div key={i} className="aspect-square rounded-lg bg-parchment-900/50 border border-bronze-700/30 flex flex-col items-center justify-center p-2 hover:border-amber-500/50 transition-all cursor-pointer group">
                            <div className="text-2xl mb-1 group-hover:scale-110 transition-transform">{r.icon}</div>
                            <RarityBadge rarity={r.rarity} size="sm" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-bronze-700/30">
                      <h4 className="text-sm font-medium text-parchment-300 mb-2 flex items-center gap-2">
                        <Backpack className="w-4 h-4 text-amber-400" />
                        快捷栏
                      </h4>
                      <div className="grid grid-cols-5 gap-2">
                        {materials.slice(0, 5).map(m => (
                          <div key={m.id} className="aspect-square rounded-lg bg-parchment-900/50 border border-bronze-700/30 flex flex-col items-center justify-center p-1.5 hover:border-amber-500/50 transition-all cursor-pointer relative">
                            <div className="text-xl">{m.icon}</div>
                            <span className="absolute bottom-0.5 right-1 text-[10px] font-mono text-amber-300">
                              {m.amount}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <BronzeButton
                      className="w-full"
                      onClick={() => triggerRandomEvent()}
                      icon={<AlertCircle className="w-4 h-4" />}
                    >
                      触发事件（测试）
                    </BronzeButton>
                  </div>
                </ParchmentCard>

                <ParchmentCard
                  title="实时排行榜"
                  subtitle="TOP 10 队伍"
                  icon={<Trophy className="w-5 h-5" />}
                >
                  <div className="space-y-2">
                    {top10Teams.map((t, idx) => (
                      <motion.div
                        key={t.teamId}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg transition-all',
                          t.playerId === player.id ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-parchment-900/20'
                        )}
                      >
                        <div className="w-6 text-center">
                          {t.position <= 3 ? (
                            <Crown className={cn(
                              'w-4 h-4 mx-auto',
                              t.position === 1 ? 'text-amber-400' : t.position === 2 ? 'text-gray-300' : 'text-orange-400'
                            )} />
                          ) : (
                            <span className="text-xs font-mono font-bold text-parchment-500">{t.position}</span>
                          )}
                        </div>
                        <span className="flex-1 text-sm text-parchment-200 truncate">{t.playerName}</span>
                        <span className="text-xs font-mono text-amber-300">{t.progress.toFixed(0)}%</span>
                      </motion.div>
                    ))}
                  </div>
                </ParchmentCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showRules}
        onClose={() => setShowRules(false)}
        title="秘境探索规则"
        size="lg"
      >
        <div className="space-y-4 text-parchment-300">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-parchment-100">时间限制</h4>
              <p className="text-sm mt-1">每次秘境持续 2 小时，请合理规划探索路线和资源使用。</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-parchment-100">组队探索</h4>
              <p className="text-sm mt-1">需提前配置好队伍，队伍成员的专业技能将影响探索效率和事件成功率。</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-parchment-100">文物发现</h4>
              <p className="text-sm mt-1">探索过程中可发现各稀有度的文物，高难度区域有更大几率获得传说级文物。</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-parchment-100">随机事件</h4>
              <p className="text-sm mt-1">探索会随机触发陷阱、宝藏、BOSS等事件，做出正确选择可获得丰厚奖励。</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h4 className="font-display font-semibold text-parchment-100">排名奖励</h4>
              <p className="text-sm mt-1">根据最终探索进度排名发放奖励，前三名可获得限定称号和珍稀文物！</p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEventModal}
        onClose={() => setShowEventModal(false)}
        title={currentEvent?.title || '神秘事件'}
        size="md"
      >
        {currentEvent && (
          <div className="space-y-5">
            <div className={cn(
              'p-4 rounded-xl border',
              currentEvent.type === 'trap' ? 'bg-red-900/20 border-red-500/30' :
              currentEvent.type === 'treasure' ? 'bg-amber-900/20 border-amber-500/30' :
              currentEvent.type === 'boss' ? 'bg-purple-900/20 border-purple-500/30' :
              'bg-blue-900/20 border-blue-500/30'
            )}>
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl',
                  currentEvent.type === 'trap' ? 'bg-red-500/20' :
                  currentEvent.type === 'treasure' ? 'bg-amber-500/20' :
                  currentEvent.type === 'boss' ? 'bg-purple-500/20' :
                  'bg-blue-500/20'
                )}>
                  {currentEvent.type === 'trap' ? '⚠️' :
                   currentEvent.type === 'treasure' ? '💎' :
                   currentEvent.type === 'boss' ? '👹' : '❓'}
                </div>
                <p className="text-parchment-200 leading-relaxed">
                  {currentEvent.description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-parchment-400 mb-2">选择你的行动：</h4>
              {currentEvent.choices.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleEventChoice(choice)}
                  className="w-full p-4 rounded-lg bg-parchment-900/50 border border-bronze-700/30 hover:border-amber-500/50 hover:bg-parchment-900 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-parchment-100 font-medium group-hover:text-amber-200 transition-colors">
                      {choice.text}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-parchment-500">成功率</span>
                      <span className={cn(
                        'font-mono font-bold text-sm',
                        choice.successRate >= 0.7 ? 'text-green-400' :
                        choice.successRate >= 0.4 ? 'text-amber-400' : 'text-red-400'
                      )}>
                        {Math.round(choice.successRate * 100)}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-parchment-500 group-hover:text-amber-400 transition-colors" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function TimeBlock({ label, value }: { label?: string; value?: string }) {
  if (label) {
    return (
      <div className="text-center">
        <div className="text-parchment-400 text-sm mb-1">{label}</div>
      </div>
    );
  }
  return (
    <div className="text-center">
      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-900/50 to-parchment-900 border-2 border-bronze-700/40 flex items-center justify-center shadow-inner">
        <span className="font-display font-bold text-4xl text-amber-300 tabular-nums">{value}</span>
      </div>
    </div>
  );
}

function StatusCard({ icon, label, value, highlight = false }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={cn(
        'p-4 rounded-xl border transition-all',
        highlight
          ? 'bg-gradient-to-br from-amber-900/30 to-amber-900/10 border-amber-500/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]'
          : 'bg-parchment-900/30 border-bronze-700/30 hover:border-bronze-600/50'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'w-10 h-10 rounded-lg flex items-center justify-center',
          highlight ? 'bg-amber-500/20' : 'bg-parchment-800'
        )}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs text-parchment-400 truncate">{label}</div>
          <div className={cn(
            'font-mono font-bold text-lg tabular-nums',
            highlight ? 'text-amber-300' : 'text-parchment-100'
          )}>
            {value}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EventBadge({ type }: { type: GlobalEvent['type'] }) {
  const config = {
    broadcast: { bg: 'bg-blue-500/20', text: 'text-blue-300', icon: '📢', label: '广播' },
    boss: { bg: 'bg-red-500/20', text: 'text-red-300', icon: '👹', label: 'BOSS' },
    treasure_horde: { bg: 'bg-amber-500/20', text: 'text-amber-300', icon: '💎', label: '宝藏' }
  };
  const c = config[type];
  return (
    <span className={cn('px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1', c.bg, c.text)}>
      <span>{c.icon}</span>
      {c.label}
    </span>
  );
}
