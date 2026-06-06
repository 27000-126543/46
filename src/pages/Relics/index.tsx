import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Archive,
  Wrench,
  Star,
  Coins,
  Sparkles,
  Filter,
  ArrowUpDown,
  Building2,
  Store,
  Hammer,
  Plus,
  Minus,
  Check,
  AlertCircle
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import ParchmentCard from '../../components/ui/ParchmentCard';
import SandProgress from '../../components/ui/SandProgress';
import RelicCard from '../../components/ui/RelicCard';
import BronzeButton from '../../components/ui/BronzeButton';
import Modal from '../../components/ui/Modal';
import RarityBadge from '../../components/ui/RarityBadge';
import StatBar from '../../components/ui/StatBar';
import RelicStats from '../../components/shared/RelicStats';
import { useRelicStore } from '../../store/relicStore';
import { usePlayerStore } from '../../store/playerStore';
import { useTeamStore } from '../../store/teamStore';
import { civilizationNames, rarityColors, civilizationIcons } from '../../data/config';
import { calculateRepairSuccessRate } from '../../utils/calculators';
import { cn } from '../../lib/utils';
import type { Relic, Rarity, Civilization, Material } from '../../types';

type TabType = 'collection' | 'workshop';
type SortType = 'value' | 'completeness' | 'discoveredAt';

const materialTypeNames: Record<string, string> = {
  fragment: '碎片',
  adhesive: '粘合剂',
  polish: '抛光剂',
  tool: '工具'
};

const materialTypeIcons: Record<string, string> = {
  fragment: '🧩',
  adhesive: '🧴',
  polish: '🧽',
  tool: '🛠️'
};

export default function Relics() {
  const [activeTab, setActiveTab] = useState<TabType>('collection');

  return (
    <div className="space-y-6">
      <PageHeader
        title="文物收藏与修复"
        subtitle="守护与修复人类文明的瑰宝"
        icon={<Archive className="w-8 h-8" />}
      />

      <div className="flex gap-2 p-1 rounded-xl bg-parchment-900/50 border border-bronze-700/30 w-fit">
        <button
          onClick={() => setActiveTab('collection')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-medium transition-all',
            activeTab === 'collection'
              ? 'bg-gradient-to-r from-bronze-500 to-bronze-600 text-parchment-50 shadow-lg'
              : 'text-parchment-300 hover:text-parchment-100 hover:bg-parchment-800/50'
          )}
        >
          <Archive className="w-4 h-4" />
          文物收藏
        </button>
        <button
          onClick={() => setActiveTab('workshop')}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-lg font-display font-medium transition-all',
            activeTab === 'workshop'
              ? 'bg-gradient-to-r from-bronze-500 to-bronze-600 text-parchment-50 shadow-lg'
              : 'text-parchment-300 hover:text-parchment-100 hover:bg-parchment-800/50'
          )}
        >
          <Wrench className="w-4 h-4" />
          修复工坊
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'collection' ? (
          <motion.div
            key="collection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <CollectionTab />
          </motion.div>
        ) : (
          <motion.div
            key="workshop"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <WorkshopTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CollectionTab() {
  const { relics, selectRelic, selectedRelic, setInMuseum, setOnMarket } = useRelicStore();

  const [filterCivilization, setFilterCivilization] = useState<Civilization | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [filterCompletenessMin, setFilterCompletenessMin] = useState(0);
  const [filterCompletenessMax, setFilterCompletenessMax] = useState(100);
  const [filterInBuilding2, setFilterInBuilding2] = useState<'all' | 'yes' | 'no'>('all');
  const [sortBy, setSortBy] = useState<SortType>('value');
  const [showDetailModal, setShowDetailModal] = useState(false);

  const stats = useMemo(() => {
    const total = relics.length;
    const byRarity: Record<Rarity, number> = {
      common: 0,
      rare: 0,
      epic: 0,
      legendary: 0
    };
    let totalValue = 0;
    relics.forEach((r) => {
      byRarity[r.rarity]++;
      totalValue += r.estimatedPrice;
    });
    return { total, byRarity, totalValue };
  }, [relics]);

  const filteredRelics = useMemo(() => {
    let result = [...relics];
    if (filterCivilization !== 'all') {
      result = result.filter((r) => r.civilization === filterCivilization);
    }
    if (filterRarity !== 'all') {
      result = result.filter((r) => r.rarity === filterRarity);
    }
    result = result.filter(
      (r) => r.completeness >= filterCompletenessMin && r.completeness <= filterCompletenessMax
    );
    if (filterInBuilding2 === 'yes') result = result.filter((r) => r.inMuseum);
    if (filterInBuilding2 === 'no') result = result.filter((r) => !r.inMuseum);

    result.sort((a, b) => {
      if (sortBy === 'value') return b.estimatedPrice - a.estimatedPrice;
      if (sortBy === 'completeness') return b.completeness - a.completeness;
      return b.discoveredAt - a.discoveredAt;
    });
    return result;
  }, [relics, filterCivilization, filterRarity, filterCompletenessMin, filterCompletenessMax, filterInBuilding2, sortBy]);

  const handleRelicClick = (relic: Relic) => {
    selectRelic(relic.id);
    setShowDetailModal(true);
  };

  const civilizationOptions: (Civilization | 'all')[] = ['all', 'egypt', 'maya', 'atlantis', 'rome', 'china', 'mesopotamia'];
  const rarityOptions: (Rarity | 'all')[] = ['all', 'common', 'rare', 'epic', 'legendary'];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ParchmentCard className="text-center">
          <p className="text-sm text-parchment-400 mb-1">文物总数</p>
          <p className="text-3xl font-display font-bold text-parchment-50">{stats.total}</p>
        </ParchmentCard>
        {(['legendary', 'epic', 'rare', 'common'] as Rarity[]).slice(0, 3).map((rarity) => (
          <ParchmentCard key={rarity} className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <RarityBadge rarity={rarity} size="sm" />
              <span className="text-sm text-parchment-400">数量</span>
            </div>
            <p className="text-3xl font-display font-bold text-parchment-50">{stats.byRarity[rarity]}</p>
          </ParchmentCard>
        ))}
        <ParchmentCard className="text-center">
          <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
            <Coins className="w-4 h-4" />
            <span className="text-sm text-parchment-400">总价值</span>
          </div>
          <p className="text-2xl font-mono font-bold text-amber-400">
            ¥{stats.totalValue.toLocaleString()}
          </p>
        </ParchmentCard>
      </div>

      <ParchmentCard>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-bronze-400" />
            <span className="text-sm font-medium text-parchment-200">筛选：</span>
          </div>

          <div className="flex flex-wrap gap-2 flex-1">
            <select
              value={filterCivilization}
              onChange={(e) => setFilterCivilization(e.target.value as Civilization | 'all')}
              className="px-3 py-1.5 rounded-lg bg-parchment-900 border border-bronze-700/40 text-sm text-parchment-100 focus:outline-none focus:border-bronze-500"
            >
              {civilizationOptions.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? '全部文明' : civilizationNames[c]}
                </option>
              ))}
            </select>

            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value as Rarity | 'all')}
              className="px-3 py-1.5 rounded-lg bg-parchment-900 border border-bronze-700/40 text-sm text-parchment-100 focus:outline-none focus:border-bronze-500"
            >
              {rarityOptions.map((r) => (
                <option key={r} value={r}>
                  {r === 'all' ? '全部稀有度' : rarityColors[r].label}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-sm text-parchment-300">完整度</span>
              <input
                type="number"
                min={0}
                max={100}
                value={filterCompletenessMin}
                onChange={(e) => setFilterCompletenessMin(Number(e.target.value))}
                className="w-16 px-2 py-1.5 rounded-lg bg-parchment-900 border border-bronze-700/40 text-sm text-parchment-100 text-center focus:outline-none focus:border-bronze-500"
              />
              <span className="text-parchment-400">-</span>
              <input
                type="number"
                min={0}
                max={100}
                value={filterCompletenessMax}
                onChange={(e) => setFilterCompletenessMax(Number(e.target.value))}
                className="w-16 px-2 py-1.5 rounded-lg bg-parchment-900 border border-bronze-700/40 text-sm text-parchment-100 text-center focus:outline-none focus:border-bronze-500"
              />
            </div>

            <select
              value={filterInBuilding2}
              onChange={(e) => setFilterInBuilding2(e.target.value as 'all' | 'yes' | 'no')}
              className="px-3 py-1.5 rounded-lg bg-parchment-900 border border-bronze-700/40 text-sm text-parchment-100 focus:outline-none focus:border-bronze-500"
            >
              <option value="all">全部状态</option>
              <option value="yes">在博物馆</option>
              <option value="no">不在博物馆</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-bronze-400" />
            <span className="text-sm font-medium text-parchment-200">排序：</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortType)}
              className="px-3 py-1.5 rounded-lg bg-parchment-900 border border-bronze-700/40 text-sm text-parchment-100 focus:outline-none focus:border-bronze-500"
            >
              <option value="value">按价值</option>
              <option value="completeness">按完整度</option>
              <option value="discoveredAt">按发现时间</option>
            </select>
          </div>
        </div>
      </ParchmentCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredRelics.map((relic) => (
          <RelicCard
            key={relic.id}
            relic={relic}
            size="md"
            onClick={() => handleRelicClick(relic)}
          />
        ))}
      </div>

      <Modal
        isOpen={showDetailModal && !!selectedRelic}
        onClose={() => setShowDetailModal(false)}
        size="xl"
        title="文物详情"
      >
        {selectedRelic && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="relative h-64 rounded-xl overflow-hidden bg-gradient-to-br from-parchment-800 to-parchment-900 border border-bronze-700/30 flex items-center justify-center mb-4">
                <span className="text-9xl">{selectedRelic.image}</span>
                <div className="absolute top-3 right-3">
                  <RarityBadge rarity={selectedRelic.rarity} size="md" />
                </div>
                {selectedRelic.inMuseum && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded bg-blue-600/80 text-xs text-white">
                    <Building2 className="w-3 h-3" />
                    博物馆展出中
                  </div>
                )}
                {selectedRelic.onMarket && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2 py-1 rounded bg-amber-600/80 text-xs text-white">
                    <Store className="w-3 h-3" />
                    交易中
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-display font-bold text-parchment-50 mb-1">
                {selectedRelic.name}
              </h2>
              <div className="flex items-center gap-2 text-sm text-parchment-300 mb-4">
                <span>{civilizationIcons[selectedRelic.civilization]}</span>
                <span>{civilizationNames[selectedRelic.civilization]}</span>
              </div>

              <div className="space-y-3 mb-4">
                <SandProgress
                  value={selectedRelic.completeness}
                  label={`完整度 ${selectedRelic.completeness}%`}
                />
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-parchment-300">
                    <Sparkles className="w-4 h-4 text-bronze-400" />
                    <span>历史价值</span>
                  </div>
                  <span className="font-mono text-parchment-100">
                    {selectedRelic.historicalValue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-parchment-300">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span>估价</span>
                  </div>
                  <span className="font-mono text-amber-400">
                    ¥{selectedRelic.estimatedPrice.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-parchment-900/40 border border-bronze-700/30">
                <p className="text-xs text-parchment-400 mb-2">历史描述</p>
                <p className="text-sm text-parchment-200 leading-relaxed">
                  {selectedRelic.description}
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center mb-6">
                <RelicStats relic={selectedRelic} size="lg" />
              </div>

              <div className="space-y-3">
                <BronzeButton
                  size="md"
                  variant={selectedRelic.inMuseum ? 'secondary' : 'primary'}
                  icon={<Building2 className="w-4 h-4" />}
                  onClick={() => setInMuseum(selectedRelic.id, !selectedRelic.inMuseum)}
                  className="w-full"
                >
                  {selectedRelic.inMuseum ? '从博物馆撤出' : '放入博物馆'}
                </BronzeButton>
                <BronzeButton
                  size="md"
                  variant="secondary"
                  icon={<Hammer className="w-4 h-4" />}
                  onClick={() => setShowDetailModal(false)}
                  className="w-full"
                >
                  送去修复
                </BronzeButton>
                <BronzeButton
                  size="md"
                  variant={selectedRelic.onMarket ? 'secondary' : 'ghost'}
                  icon={<Store className="w-4 h-4" />}
                  onClick={() => setOnMarket(selectedRelic.id, !selectedRelic.onMarket)}
                  className="w-full"
                >
                  {selectedRelic.onMarket ? '取消上架' : '上架交易'}
                </BronzeButton>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function WorkshopTab() {
  const { relics, selectedRelic, selectRelic, repairRelic } = useRelicStore();
  const { materials } = usePlayerStore();
  const { members, team } = useTeamStore();

  const [selectedMaterials, setSelectedMaterials] = useState<Record<string, number>>({});
  const [repairResult, setRepairResult] = useState<{ success: boolean; gained: number } | null>(null);
  const [showRepairAnimation, setShowRepairAnimation] = useState(false);

  const teamMembers = members.filter((m) => team.memberIds.includes(m.id));
  const repairableRelics = relics.filter((r) => r.completeness < 100);

  const selectedMaterialsList: Material[] = Object.entries(selectedMaterials)
    .map(([id, amount]) => {
      const mat = materials.find((m) => m.id === id);
      return mat ? { ...mat, amount } : null;
    })
    .filter((m): m is Material => !!m && m.amount > 0);

  const { successRate, expectedCompletenessGain } = selectedRelic
    ? calculateRepairSuccessRate(selectedRelic.completeness, selectedMaterialsList, teamMembers)
    : { successRate: 0, expectedCompletenessGain: 0 };

  const materialBonus = selectedMaterialsList.reduce(
    (sum, m) => sum + m.quality * m.amount * 0.05,
    0
  );

  const addMaterial = (material: Material) => {
    const currentAmount = selectedMaterials[material.id] || 0;
    const available = material.amount;
    if (currentAmount < available) {
      setSelectedMaterials((prev) => ({
        ...prev,
        [material.id]: currentAmount + 1
      }));
    }
  };

  const removeMaterial = (materialId: string) => {
    setSelectedMaterials((prev) => {
      const next = { ...prev };
      if (next[materialId] && next[materialId] > 0) {
        next[materialId] -= 1;
        if (next[materialId] === 0) delete next[materialId];
      }
      return next;
    });
  };

  const groupedMaterials = useMemo(() => {
    const groups: Record<string, Material[]> = {
      fragment: [],
      adhesive: [],
      polish: [],
      tool: []
    };
    materials.forEach((m) => {
      if (groups[m.type]) groups[m.type].push(m);
    });
    return groups;
  }, [materials]);

  const handleRepair = () => {
    if (!selectedRelic) return;
    setShowRepairAnimation(true);
    setTimeout(() => {
      const oldCompleteness = selectedRelic.completeness;
      const success = repairRelic(selectedRelic.id, selectedMaterialsList);
      const newRelic = relics.find((r) => r.id === selectedRelic.id);
      const gained = newRelic ? newRelic.completeness - oldCompleteness : 0;
      setRepairResult({ success, gained });
      setSelectedMaterials({});
      setTimeout(() => {
        setShowRepairAnimation(false);
      }, 2000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-3">
          <ParchmentCard
            title="待修复文物"
            subtitle={`${repairableRelics.length} 件需要修复`}
            icon={<Hammer className="w-5 h-5" />}
          >
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {repairableRelics.length > 0 ? (
                repairableRelics.map((relic) => (
                  <motion.button
                    key={relic.id}
                    whileHover={{ x: 4 }}
                    onClick={() => {
                      selectRelic(relic.id);
                      setRepairResult(null);
                    }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-all',
                      selectedRelic?.id === relic.id
                        ? 'border-bronze-500 bg-bronze-600/15'
                        : 'border-bronze-700/30 bg-parchment-900/30 hover:bg-parchment-800/40'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-parchment-800 flex items-center justify-center text-2xl flex-shrink-0">
                        {relic.image}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-semibold text-parchment-100 truncate">
                          {relic.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <RarityBadge rarity={relic.rarity} size="sm" />
                        </div>
                        <SandProgress
                          value={relic.completeness}
                          showLabel={false}
                          className="mt-1.5"
                        />
                      </div>
                    </div>
                  </motion.button>
                ))
              ) : (
                <div className="text-center py-8 text-parchment-400">
                  <Check className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
                  <p className="text-sm">所有文物都已修复完好</p>
                </div>
              )}
            </div>
          </ParchmentCard>
        </div>

        <div className="lg:col-span-5">
          <ParchmentCard
            title="修复工作台"
            icon={<Wrench className="w-5 h-5" />}
          >
            {selectedRelic ? (
              <div className="space-y-6">
                <div className="relative">
                  {showRepairAnimation && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        'absolute inset-0 z-10 rounded-xl flex items-center justify-center',
                        repairResult === null
                          ? 'bg-parchment-900/80 backdrop-blur-sm'
                          : repairResult.success
                          ? 'bg-green-500/20 backdrop-blur-sm'
                          : 'bg-red-500/20 backdrop-blur-sm'
                      )}
                    >
                      {repairResult === null ? (
                        <div className="text-center">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="text-6xl mb-3"
                          >
                            ⚒️
                          </motion.div>
                          <p className="text-parchment-200 font-display">修复中...</p>
                        </div>
                      ) : repairResult.success ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-center"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 0.6, repeat: Infinity }}
                            className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mb-3"
                          >
                            <Sparkles className="w-10 h-10 text-white" />
                          </motion.div>
                          <p className="text-xl font-display font-bold text-green-400 mb-1">修复成功！</p>
                          <p className="text-sm text-parchment-200">
                            完整度 +{repairResult.gained}%
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-center"
                        >
                          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mb-3 relative">
                            <AlertCircle className="w-10 h-10 text-white" />
                            <motion.div
                              className="absolute inset-0 rounded-full"
                              style={{
                                background:
                                  'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(220,38,38,0.3) 8px, rgba(220,38,38,0.3) 16px)'
                              }}
                            />
                          </div>
                          <p className="text-xl font-display font-bold text-red-400 mb-1">修复失败</p>
                          <p className="text-sm text-parchment-200">
                            完整度 {repairResult.gained >= 0 ? '+' : ''}{repairResult.gained}%
                          </p>
                        </motion.div>
                      )}
                    </motion.div>
                  )}

                  <div className="relative h-48 rounded-xl overflow-hidden bg-gradient-to-br from-parchment-800 to-parchment-900 border border-bronze-700/30 flex items-center justify-center mb-4">
                    <span className="text-8xl">{selectedRelic.image}</span>
                    <div className="absolute top-3 right-3">
                      <RarityBadge rarity={selectedRelic.rarity} size="md" />
                    </div>
                  </div>

                  <h3 className="text-xl font-display font-bold text-parchment-50 text-center mb-1">
                    {selectedRelic.name}
                  </h3>
                  <p className="text-sm text-parchment-400 text-center mb-4">
                    {civilizationIcons[selectedRelic.civilization]} {civilizationNames[selectedRelic.civilization]}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-parchment-400 mb-1">当前完整度</p>
                    <SandProgress
                      value={selectedRelic.completeness}
                      showLabel={false}
                    />
                    <p className="text-center text-sm font-mono text-parchment-200 mt-1">
                      {selectedRelic.completeness}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-parchment-400 mb-1">目标完整度</p>
                    <SandProgress
                      value={Math.min(100, selectedRelic.completeness + expectedCompletenessGain)}
                      showLabel={false}
                    />
                    <p className="text-center text-sm font-mono text-bronze-300 mt-1">
                      {Math.min(100, selectedRelic.completeness + expectedCompletenessGain)}%
                    </p>
                  </div>
                </div>

                <div className="relative p-6 rounded-xl bg-gradient-to-br from-parchment-900/80 to-parchment-950/80 border border-bronze-600/40">
                  <div className="text-center">
                    <p className="text-xs text-parchment-400 mb-1">修复成功率</p>
                    <motion.p
                      key={successRate}
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'text-5xl font-display font-black',
                        successRate >= 0.7
                          ? 'text-green-400'
                          : successRate >= 0.4
                          ? 'text-amber-400'
                          : 'text-red-400'
                      )}
                    >
                      {Math.round(successRate * 100)}%
                    </motion.p>
                    {materialBonus > 0 && (
                      <p className="text-xs text-green-400 mt-1">
                        材料品质加成 +{Math.round(materialBonus * 100)}%
                      </p>
                    )}
                  </div>
                </div>

                <BronzeButton
                  size="lg"
                  onClick={handleRepair}
                  disabled={selectedMaterialsList.length === 0 || showRepairAnimation}
                  icon={<Sparkles className="w-5 h-5" />}
                  className="w-full"
                >
                  开始修复
                </BronzeButton>
              </div>
            ) : (
              <div className="text-center py-16 text-parchment-400">
                <Wrench className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="text-base">请从左侧选择一件文物进行修复</p>
              </div>
            )}
          </ParchmentCard>
        </div>

        <div className="lg:col-span-4">
          <ParchmentCard
            title="材料槽位"
            subtitle="选择修复材料"
            icon={<Sparkles className="w-5 h-5" />}
          >
            <div className="space-y-4">
              {Object.entries(groupedMaterials).map(([type, mats]) => (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{materialTypeIcons[type]}</span>
                    <span className="text-sm font-medium text-parchment-200">
                      {materialTypeNames[type]}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {mats.map((mat) => {
                      const usedAmount = selectedMaterials[mat.id] || 0;
                      const available = mat.amount - usedAmount;
                      return (
                        <div
                          key={mat.id}
                          className={cn(
                            'flex items-center gap-3 p-2.5 rounded-lg border transition-all',
                            usedAmount > 0
                              ? 'border-bronze-500/60 bg-bronze-600/10'
                              : 'border-bronze-700/30 bg-parchment-900/30'
                          )}
                        >
                          <div className="w-10 h-10 rounded-lg bg-parchment-800 flex items-center justify-center text-xl flex-shrink-0">
                            {mat.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-display font-semibold text-parchment-100 truncate">
                              {mat.name}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              {Array.from({ length: 3 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'w-3 h-3',
                                    i < mat.quality
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-parchment-700'
                                  )}
                                />
                              ))}
                              <span className="text-xs text-parchment-400 ml-1">
                                可用 {available}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => removeMaterial(mat.id)}
                              disabled={usedAmount === 0}
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                                usedAmount > 0
                                  ? 'bg-bronze-600/30 text-bronze-300 hover:bg-bronze-600/50'
                                  : 'bg-parchment-800/50 text-parchment-600 cursor-not-allowed'
                              )}
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-sm font-mono text-parchment-100">
                              {usedAmount}
                            </span>
                            <button
                              onClick={() => addMaterial(mat)}
                              disabled={available === 0}
                              className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center transition-all',
                                available > 0
                                  ? 'bg-bronze-600/30 text-bronze-300 hover:bg-bronze-600/50'
                                  : 'bg-parchment-800/50 text-parchment-600 cursor-not-allowed'
                              )}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {selectedMaterialsList.length > 0 && (
              <div className="mt-4 pt-4 border-t border-bronze-700/30">
                <p className="text-xs text-parchment-400 mb-2">已选材料预览</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMaterialsList.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-bronze-600/20 border border-bronze-600/40"
                    >
                      <span>{mat.icon}</span>
                      <span className="text-xs text-parchment-100">{mat.name}</span>
                      <span className="text-xs text-bronze-300 font-mono">×{mat.amount}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ParchmentCard>
        </div>
      </div>
    </div>
  );
}
