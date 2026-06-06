import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Settings,
  Search,
  Filter,
  Star,
  User,
  X,
  Check,
  Plus,
  Minus,
  Sparkles,
  Coins,
  Gem,
  Zap,
  Search as SearchIcon,
  Wrench,
  BookOpen,
  Scroll,
  Compass,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageHeader from '../../components/layout/PageHeader';
import ParchmentCard from '../../components/ui/ParchmentCard';
import MemberCard from '../../components/ui/MemberCard';
import BronzeButton from '../../components/ui/BronzeButton';
import Modal from '../../components/ui/Modal';
import RarityBadge from '../../components/ui/RarityBadge';
import StatBar from '../../components/ui/StatBar';
import GoldDisplay from '../../components/shared/GoldDisplay';
import { useTeamStore } from '../../store/teamStore';
import { usePlayerStore } from '../../store/playerStore';
import {
  professionNames,
  professionIcons,
  professionDescriptions,
  rarityColors,
  rarityWeight,
  gameConfig,
  skillNames,
} from '../../data/config';
import type { TeamMember, Profession, Rarity } from '../../types';
import { generateId } from '../../utils/helpers';

type TabType = 'members' | 'recruit' | 'config';

type RecruitPoolType = 'common' | 'rare' | 'legendary';

const professionFilterOptions: { value: Profession | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'explorer', label: '探险家' },
  { value: 'linguist', label: '语言学家' },
  { value: 'engineer', label: '工程师' },
  { value: 'archaeologist', label: '考古学家' },
  { value: 'historian', label: '历史学家' },
];

const rarityFilterOptions: { value: Rarity | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'common', label: '普通' },
  { value: 'rare', label: '稀有' },
  { value: 'epic', label: '史诗' },
  { value: 'legendary', label: '传说' },
];

const professionIconMap: Record<Profession, typeof Compass> = {
  explorer: Compass,
  linguist: Scroll,
  engineer: Wrench,
  archaeologist: SearchIcon,
  historian: BookOpen,
};

const recruitPools: Record<
  RecruitPoolType,
  {
    name: string;
    cost: number;
    costType: 'gold' | 'gem';
    description: string;
    rarityRange: Rarity[];
    professionRange: Profession[];
    color: string;
  }
> = {
  common: {
    name: '普通招募',
    cost: 1000,
    costType: 'gold',
    description: '使用金币招募普通队员，有机会获得稀有品质队员',
    rarityRange: ['common', 'rare'],
    professionRange: ['explorer', 'linguist', 'engineer', 'archaeologist', 'historian'],
    color: 'from-gray-500 to-gray-600',
  },
  rare: {
    name: '稀有招募',
    cost: 5000,
    costType: 'gold',
    description: '有更高概率获得稀有和史诗品质队员',
    rarityRange: ['rare', 'epic'],
    professionRange: ['explorer', 'linguist', 'engineer', 'archaeologist', 'historian'],
    color: 'from-blue-500 to-blue-700',
  },
  legendary: {
    name: '传说招募',
    cost: 50,
    costType: 'gem',
    description: '使用宝石招募，必得史诗以上品质，有机会获得传说队员',
    rarityRange: ['epic', 'legendary'],
    professionRange: ['explorer', 'linguist', 'engineer', 'archaeologist', 'historian'],
    color: 'from-amber-400 to-amber-600',
  },
};

const recruitNames = [
  '李明', '王芳', '张伟', '刘洋', '陈静', '杨帆', '赵磊', '黄丽',
  '周杰', '吴敏', '徐强', '孙燕', '马超', '朱琳', '胡军', '郭静',
];

const recruitDescriptions: Record<Profession, string[]> = {
  explorer: [
    '热爱冒险的年轻探险家，足迹遍布各大洲。',
    '经验丰富的野外生存专家，擅长在恶劣环境中求生。',
    '充满好奇心的旅行家，总是第一个冲向未知。',
  ],
  linguist: [
    '精通多种古文字的语言学天才。',
    '曾参与多项重要铭文破译工作的学者。',
    '对古代语言有近乎直觉般的理解能力。',
  ],
  engineer: [
    '心灵手巧的机械工程师，什么都能修好。',
    '擅长破解各种古代机关的技术专家。',
    '退役军工，动手能力极强。',
  ],
  archaeologist: [
    '田野考古经验丰富，手上的老茧是勋章。',
    '对文物有敏锐直觉的年轻考古学家。',
    '参与过多次重大考古发掘的资深专家。',
  ],
  historian: [
    '博学多才的历史学者，对各种文明如数家珍。',
    '善于从蛛丝马迹中还原历史真相。',
    '历史系高材生，理论功底扎实。',
  ],
};

function Team() {
  const [activeTab, setActiveTab] = useState<TabType>('members');
  const [professionFilter, setProfessionFilter] = useState<Profession | 'all'>('all');
  const [rarityFilter, setRarityFilter] = useState<Rarity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRecruitResult, setShowRecruitResult] = useState(false);
  const [recruitedMember, setRecruitedMember] = useState<TeamMember | null>(null);
  const [flippingCard, setFlippingCard] = useState<RecruitPoolType | null>(null);

  const { members, team, addToTeam, removeFromTeam, addMember } = useTeamStore();
  const { player, spendGold, addGold, addExp } = usePlayerStore();

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (professionFilter !== 'all' && m.profession !== professionFilter) return false;
      if (rarityFilter !== 'all' && m.rarity !== rarityFilter) return false;
      if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [members, professionFilter, rarityFilter, searchQuery]);

  const teamMembers = useMemo(() => {
    return team.memberIds
      .map((id) => members.find((m) => m.id === id))
      .filter((m): m is TeamMember => !!m);
  }, [team.memberIds, members]);

  const availableMembers = useMemo(() => {
    return members.filter((m) => !team.memberIds.includes(m.id));
  }, [members, team.memberIds]);

  const teamStats = useMemo(() => {
    if (teamMembers.length === 0) {
      return {
        explorationSpeed: 0,
        relicDiscovery: 0,
        trapHandling: 0,
        repairBonus: 0,
        avgLuck: 0,
      };
    }
    const total = teamMembers.reduce(
      (acc, m) => ({
        explorationSpeed: acc.explorationSpeed + m.skills.explorationSpeed,
        relicDiscovery: acc.relicDiscovery + m.skills.relicDiscovery,
        trapHandling: acc.trapHandling + m.skills.trapHandling,
        repairBonus: acc.repairBonus + m.skills.repairBonus,
        avgLuck: acc.avgLuck + m.luck,
      }),
      { explorationSpeed: 0, relicDiscovery: 0, trapHandling: 0, repairBonus: 0, avgLuck: 0 },
    );
    return {
      explorationSpeed: Math.round(total.explorationSpeed / teamMembers.length),
      relicDiscovery: Math.round(total.relicDiscovery / teamMembers.length),
      trapHandling: Math.round(total.trapHandling / teamMembers.length),
      repairBonus: Math.round(total.repairBonus / teamMembers.length),
      avgLuck: Math.round(total.avgLuck / teamMembers.length),
    };
  }, [teamMembers]);

  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member);
    setShowDetailModal(true);
  };

  const handleToggleTeamMember = (memberId: string) => {
    if (team.memberIds.includes(memberId)) {
      removeFromTeam(memberId);
    } else {
      addToTeam(memberId);
    }
  };

  const getRecruitProbability = (pool: RecruitPoolType, rarity: Rarity): number => {
    const poolConfig = recruitPools[pool];
    if (!poolConfig.rarityRange.includes(rarity)) return 0;

    const weights = poolConfig.rarityRange.map((r) => rarityWeight[r]);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    return Math.round((rarityWeight[rarity] / totalWeight) * 100);
  };

  const handleRecruit = (poolType: RecruitPoolType) => {
    const pool = recruitPools[poolType];

    if (pool.costType === 'gold') {
      if (!spendGold(pool.cost)) return;
    }

    setFlippingCard(poolType);

    setTimeout(() => {
      const rarities = pool.rarityRange;
      const weights = rarities.map((r) => rarityWeight[r]);
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      let targetRarity: Rarity = rarities[0];
      for (let i = 0; i < rarities.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          targetRarity = rarities[i];
          break;
        }
      }

      const professions = pool.professionRange;
      const targetProfession = professions[Math.floor(Math.random() * professions.length)];

      const rarityMultiplier: Record<Rarity, number> = {
        common: 1,
        rare: 1.5,
        epic: 2,
        legendary: 3,
      };

      const baseSkill = targetRarity === 'common' ? 30 : targetRarity === 'rare' ? 50 : targetRarity === 'epic' ? 70 : 85;
      const skillRange = targetRarity === 'legendary' ? 15 : targetRarity === 'epic' ? 20 : targetRarity === 'rare' ? 25 : 30;

      const newMember: TeamMember = {
        id: generateId('member'),
        name: recruitNames[Math.floor(Math.random() * recruitNames.length)],
        profession: targetProfession,
        skillLevel: targetRarity === 'legendary' ? 5 : targetRarity === 'epic' ? 4 : targetRarity === 'rare' ? 3 : 2,
        luck: Math.min(10, Math.max(1, Math.round(5 * rarityMultiplier[targetRarity] + Math.random() * 3))),
        rarity: targetRarity,
        avatar: professionIcons[targetProfession],
        skills: {
          explorationSpeed: baseSkill + Math.floor(Math.random() * skillRange),
          relicDiscovery: baseSkill + Math.floor(Math.random() * skillRange),
          trapHandling: baseSkill + Math.floor(Math.random() * skillRange),
          repairBonus: baseSkill + Math.floor(Math.random() * skillRange),
        },
        description: recruitDescriptions[targetProfession][Math.floor(Math.random() * 3)],
      };

      addMember(newMember);
      setRecruitedMember(newMember);
      setFlippingCard(null);
      setShowRecruitResult(true);
    }, 1200);
  };

  const renderTabs = () => (
    <div className="flex gap-1 p-1 rounded-xl bg-parchment-900/50 border border-bronze-700/30 mb-6">
      {[
        { key: 'members' as TabType, label: '我的队员', icon: <Users className="w-4 h-4" /> },
        { key: 'recruit' as TabType, label: '招募中心', icon: <UserPlus className="w-4 h-4" /> },
        { key: 'config' as TabType, label: '队伍配置', icon: <Settings className="w-4 h-4" /> },
      ].map((tab) => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-300 ${
            activeTab === tab.key
              ? 'bg-bronze-500/20 text-bronze-300 border border-bronze-500/40 shadow-inner'
              : 'text-parchment-400 hover:text-parchment-200 hover:bg-parchment-800/30'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );

  const renderMembersTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-500" />
          <input
            type="text"
            placeholder="搜索队员名称..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-parchment-900/50 border border-bronze-700/30 text-parchment-100 placeholder-parchment-500 focus:outline-none focus:border-bronze-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-parchment-500" />
            <select
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value as Profession | 'all')}
              className="px-3 py-2.5 rounded-lg bg-parchment-900/50 border border-bronze-700/30 text-parchment-100 focus:outline-none focus:border-bronze-500/50 text-sm"
            >
              {professionFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as Rarity | 'all')}
            className="px-3 py-2.5 rounded-lg bg-parchment-900/50 border border-bronze-700/30 text-parchment-100 focus:outline-none focus:border-bronze-500/50 text-sm"
          >
            {rarityFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="text-sm text-parchment-400">
        共 {filteredMembers.length} 名队员
      </div>

      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              onClick={() => handleMemberClick(member)}
              inTeam={team.memberIds.includes(member.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-parchment-400">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>没有找到符合条件的队员</p>
        </div>
      )}
    </div>
  );

  const renderRecruitTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {(Object.keys(recruitPools) as RecruitPoolType[]).map((poolType) => {
        const pool = recruitPools[poolType];
        const canAfford = pool.costType === 'gold' ? player.gold >= pool.cost : player.gems >= pool.cost;
        const isFlipping = flippingCard === poolType;

        return (
          <ParchmentCard key={poolType} className="overflow-hidden">
            <div className="text-center">
              <div
                className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${pool.color} flex items-center justify-center shadow-lg`}
              >
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="font-display font-bold text-xl text-parchment-50 mb-1">
                {pool.name}
              </h3>
              <p className="text-sm text-parchment-400 mb-4">{pool.description}</p>

              <div className="p-3 rounded-lg bg-parchment-900/50 mb-4 space-y-2">
                <p className="text-xs text-parchment-400 mb-2">招募概率</p>
                {pool.rarityRange.map((rarity) => (
                  <div key={rarity} className="flex items-center justify-between text-sm">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{
                        backgroundColor: rarityColors[rarity].bg,
                        color: rarityColors[rarity].text,
                      }}
                    >
                      {rarityColors[rarity].label}
                    </span>
                    <span className="font-mono text-parchment-200">
                      {getRecruitProbability(poolType, rarity)}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-parchment-900/50 mb-4">
                <p className="text-xs text-parchment-400 mb-2">可招募职业</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {pool.professionRange.map((prof) => (
                    <span
                      key={prof}
                      className="text-xs px-2 py-0.5 rounded bg-bronze-500/10 text-bronze-300 border border-bronze-500/30"
                    >
                      {professionNames[prof]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative h-14">
                <AnimatePresence mode="wait">
                  {isFlipping ? (
                    <motion.div
                      key="flipping"
                      initial={{ rotateY: 0 }}
                      animate={{ rotateY: 360 }}
                      transition={{ duration: 1.2, ease: 'easeInOut' }}
                      className="absolute inset-0"
                    >
                      <div className="w-full h-full rounded-lg bg-gradient-to-br from-bronze-500 to-amber-600 flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white animate-pulse" />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="button"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute inset-0"
                    >
                      <BronzeButton
                        className="w-full h-full"
                        onClick={() => handleRecruit(poolType)}
                        disabled={!canAfford || flippingCard !== null}
                        icon={pool.costType === 'gold' ? <Coins className="w-4 h-4" /> : <Gem className="w-4 h-4" />}
                      >
                        {pool.costType === 'gold' ? (
                          <GoldDisplay amount={pool.cost} showIcon={false} size="md" />
                        ) : (
                          <span className="font-mono font-bold">{pool.cost} 宝石</span>
                        )}
                      </BronzeButton>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {!canAfford && (
                <p className="text-xs text-rose-400 mt-2 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {pool.costType === 'gold' ? '金币不足' : '宝石不足'}
                </p>
              )}
            </div>
          </ParchmentCard>
        );
      })}
    </div>
  );

  const renderConfigTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ParchmentCard
        title="出战队伍"
        icon={<Users className="w-5 h-5" />}
        subtitle={`${teamMembers.length}/${gameConfig.maxTeamSize} 人`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            {Array.from({ length: gameConfig.maxTeamSize }).map((_, idx) => {
              const member = teamMembers[idx];
              const ProfIcon = member ? professionIconMap[member.profession] : Plus;

              return (
                <div
                  key={idx}
                  className={`aspect-square rounded-xl border-2 border-dashed flex items-center justify-center transition-all duration-300 ${
                    member
                      ? `relic-rarity-${member.rarity} border-solid cursor-pointer hover:scale-105`
                      : 'border-bronze-700/30 bg-parchment-900/30'
                  }`}
                  onClick={() => member && handleToggleTeamMember(member.id)}
                >
                  {member ? (
                    <div className="relative w-full h-full p-2 flex flex-col items-center justify-center">
                      <div className="text-2xl mb-1">{member.avatar}</div>
                      <p className="text-[10px] text-parchment-200 font-medium truncate w-full text-center">
                        {member.name}
                      </p>
                      <p className="text-[9px] text-parchment-400 truncate w-full text-center">
                        {professionNames[member.profession]}
                      </p>
                    </div>
                  ) : (
                    <Plus className="w-8 h-8 text-parchment-600" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-3 pt-4 border-t border-bronze-700/30">
            <h4 className="font-display font-semibold text-parchment-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-bronze-400" />
              队伍总览
            </h4>
            <div className="grid grid-cols-1 gap-3">
              <StatBar
                label={skillNames.explorationSpeed}
                value={teamStats.explorationSpeed}
                max={100}
                icon={<Zap className="w-4 h-4" />}
                color="from-amber-500 to-orange-500"
              />
              <StatBar
                label={skillNames.relicDiscovery}
                value={teamStats.relicDiscovery}
                max={100}
                icon={<SearchIcon className="w-4 h-4" />}
                color="from-purple-500 to-pink-500"
              />
              <StatBar
                label={skillNames.trapHandling}
                value={teamStats.trapHandling}
                max={100}
                icon={<Wrench className="w-4 h-4" />}
                color="from-blue-500 to-cyan-500"
              />
              <StatBar
                label={skillNames.repairBonus}
                value={teamStats.repairBonus}
                max={100}
                icon={<Sparkles className="w-4 h-4" />}
                color="from-emerald-500 to-teal-500"
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-parchment-900/50">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-parchment-300">平均幸运值</span>
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.min(5, Math.round(teamStats.avgLuck / 2))
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-parchment-700'
                    }`}
                  />
                ))}
                <span className="text-sm font-mono text-amber-300 ml-1">{teamStats.avgLuck}</span>
              </div>
            </div>
          </div>

          <BronzeButton className="w-full" icon={<Check />}>
            保存配置
          </BronzeButton>
        </div>
      </ParchmentCard>

      <ParchmentCard
        title="备选队员"
        icon={<UserPlus className="w-5 h-5" />}
        subtitle={`${availableMembers.length} 人可加入队伍`}
      >
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {availableMembers.length > 0 ? (
            availableMembers.map((member) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-3 rounded-lg card-parchment border cursor-pointer hover:border-bronze-500/50 transition-colors"
                onClick={() => handleMemberClick(member)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full p-0.5 bg-gradient-to-br ${
                      member.profession === 'explorer'
                        ? 'from-amber-500 to-amber-700'
                        : member.profession === 'linguist'
                          ? 'from-blue-500 to-blue-700'
                          : member.profession === 'engineer'
                            ? 'from-ruin-500 to-ruin-700'
                            : member.profession === 'archaeologist'
                              ? 'from-terracotta-500 to-terracotta-700'
                              : 'from-purple-500 to-purple-700'
                    }`}
                  >
                    <div className="w-full h-full rounded-full bg-parchment-900 flex items-center justify-center text-xl">
                      {member.avatar}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-semibold text-parchment-50 truncate">
                        {member.name}
                      </h4>
                      <RarityBadge rarity={member.rarity} size="sm" />
                    </div>
                    <p className="text-xs text-parchment-400">
                      {professionNames[member.profession]} · Lv.{member.skillLevel}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTeamMember(member.id);
                    }}
                    disabled={teamMembers.length >= gameConfig.maxTeamSize}
                    className="p-2 rounded-lg bg-bronze-500/20 text-bronze-300 hover:bg-bronze-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-12 text-parchment-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">所有队员都已在队伍中</p>
            </div>
          )}
        </div>
      </ParchmentCard>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="考古队管理"
        subtitle="招募精英队员，组建最强考古团队"
        icon={<Users />}
      />

      {renderTabs()}

      {activeTab === 'members' && renderMembersTab()}
      {activeTab === 'recruit' && renderRecruitTab()}
      {activeTab === 'config' && renderConfigTab()}

      <Modal
        isOpen={showDetailModal && selectedMember !== null}
        onClose={() => setShowDetailModal(false)}
        title={selectedMember?.name}
        size="lg"
        footer={
          selectedMember && (
            <div className="flex gap-3 justify-end">
              <BronzeButton
                variant="ghost"
                onClick={() => setShowDetailModal(false)}
                icon={<X />}
              >
                关闭
              </BronzeButton>
              <BronzeButton
                onClick={() => {
                  handleToggleTeamMember(selectedMember.id);
                }}
                icon={team.memberIds.includes(selectedMember.id) ? <Minus /> : <Plus />}
              >
                {team.memberIds.includes(selectedMember.id) ? '移出队伍' : '加入队伍'}
              </BronzeButton>
            </div>
          )
        }
      >
        {selectedMember && (
          <div className="space-y-6">
            <div className="flex items-start gap-6">
              <div
                className={`w-24 h-24 rounded-2xl p-1 bg-gradient-to-br ${
                  selectedMember.profession === 'explorer'
                    ? 'from-amber-500 to-amber-700'
                    : selectedMember.profession === 'linguist'
                      ? 'from-blue-500 to-blue-700'
                      : selectedMember.profession === 'engineer'
                        ? 'from-ruin-500 to-ruin-700'
                        : selectedMember.profession === 'archaeologist'
                          ? 'from-terracotta-500 to-terracotta-700'
                          : 'from-purple-500 to-purple-700'
                }`}
              >
                <div className="w-full h-full rounded-xl bg-parchment-900 flex items-center justify-center text-5xl">
                  {selectedMember.avatar}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display text-2xl font-bold text-parchment-50">
                    {selectedMember.name}
                  </h3>
                  <RarityBadge rarity={selectedMember.rarity} size="md" />
                </div>
                <p className="text-parchment-300 mb-2">
                  {professionNames[selectedMember.profession]} · 等级 {selectedMember.skillLevel}
                </p>
                <p className="text-sm text-parchment-400">{professionDescriptions[selectedMember.profession]}</p>
                <div className="flex items-center gap-1 mt-3">
                  <span className="text-sm text-parchment-400 mr-2">幸运值:</span>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.min(5, Math.round(selectedMember.luck / 2))
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-parchment-700'
                      }`}
                    />
                  ))}
                  <span className="text-sm font-mono text-amber-300 ml-2">{selectedMember.luck}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-parchment-900/50 border border-bronze-700/30">
              <p className="text-parchment-200 text-sm leading-relaxed">
                "{selectedMember.description}"
              </p>
            </div>

            <div>
              <h4 className="font-display font-semibold text-parchment-100 mb-3">技能数据</h4>
              <div className="grid grid-cols-2 gap-4">
                <StatBar
                  label={skillNames.explorationSpeed}
                  value={selectedMember.skills.explorationSpeed}
                  max={100}
                  icon={<Zap className="w-4 h-4" />}
                  color="from-amber-500 to-orange-500"
                />
                <StatBar
                  label={skillNames.relicDiscovery}
                  value={selectedMember.skills.relicDiscovery}
                  max={100}
                  icon={<SearchIcon className="w-4 h-4" />}
                  color="from-purple-500 to-pink-500"
                />
                <StatBar
                  label={skillNames.trapHandling}
                  value={selectedMember.skills.trapHandling}
                  max={100}
                  icon={<Wrench className="w-4 h-4" />}
                  color="from-blue-500 to-cyan-500"
                />
                <StatBar
                  label={skillNames.repairBonus}
                  value={selectedMember.skills.repairBonus}
                  max={100}
                  icon={<Sparkles className="w-4 h-4" />}
                  color="from-emerald-500 to-teal-500"
                />
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showRecruitResult && recruitedMember !== null}
        onClose={() => {
          setShowRecruitResult(false);
          setRecruitedMember(null);
        }}
        title="招募成功！"
        size="md"
        footer={
          <BronzeButton onClick={() => {
            setShowRecruitResult(false);
            setRecruitedMember(null);
          }}>
            确认
          </BronzeButton>
        }
      >
        {recruitedMember && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="text-center"
          >
            <div
              className={`w-28 h-28 mx-auto mb-4 rounded-2xl p-1 bg-gradient-to-br ${
                recruitedMember.profession === 'explorer'
                  ? 'from-amber-500 to-amber-700'
                  : recruitedMember.profession === 'linguist'
                    ? 'from-blue-500 to-blue-700'
                    : recruitedMember.profession === 'engineer'
                      ? 'from-ruin-500 to-ruin-700'
                      : recruitedMember.profession === 'archaeologist'
                        ? 'from-terracotta-500 to-terracotta-700'
                        : 'from-purple-500 to-purple-700'
              } shadow-gold-glow`}
            >
              <div className="w-full h-full rounded-xl bg-parchment-900 flex items-center justify-center text-6xl">
                {recruitedMember.avatar}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <h3 className="font-display text-2xl font-bold text-parchment-50">
                {recruitedMember.name}
              </h3>
              <RarityBadge rarity={recruitedMember.rarity} size="md" />
            </div>
            <p className="text-parchment-300 mb-4">
              {professionNames[recruitedMember.profession]} · 等级 {recruitedMember.skillLevel}
            </p>

            <div className="flex items-center justify-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.min(5, Math.round(recruitedMember.luck / 2))
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-parchment-700'
                  }`}
                />
              ))}
              <span className="text-sm font-mono text-amber-300 ml-2">幸运 {recruitedMember.luck}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-parchment-900/50">
              <div className="text-center">
                <p className="text-xs text-parchment-400 mb-1">探索速度</p>
                <p className="font-mono text-lg text-amber-300">{recruitedMember.skills.explorationSpeed}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-parchment-400 mb-1">文物发现</p>
                <p className="font-mono text-lg text-purple-300">{recruitedMember.skills.relicDiscovery}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-parchment-400 mb-1">陷阱处理</p>
                <p className="font-mono text-lg text-cyan-300">{recruitedMember.skills.trapHandling}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-parchment-400 mb-1">修复加成</p>
                <p className="font-mono text-lg text-emerald-300">{recruitedMember.skills.repairBonus}</p>
              </div>
            </div>

            <p className="text-sm text-parchment-400 mt-4 italic">
              "{recruitedMember.description}"
            </p>
          </motion.div>
        )}
      </Modal>
    </div>
  );
}

export default Team;
