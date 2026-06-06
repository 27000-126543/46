import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store,
  Tag,
  ShieldCheck,
  Search,
  Filter,
  ArrowUpDown,
  Coins,
  ShoppingCart,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  User,
  Calendar,
  Eye,
  Pencil,
  X,
  ChevronRight,
  Star,
  FileText,
  Gavel,
  BarChart3,
  AlertOctagon
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
import { useMarketStore } from '@/store/marketStore';
import { useRelicStore } from '@/store/relicStore';
import { usePlayerStore } from '@/store/playerStore';
import {
  rarityColors,
  civilizationNames,
  civilizationIcons,
  listingStatusNames,
  riskLevelNames
} from '@/data/config';
import type { Relic, MarketListing, Civilization, Rarity, ListingStatus } from '@/types';
import { cn } from '@/lib/utils';

type MarketTab = 'hall' | 'myListings' | 'approval';
type SortKey = 'price' | 'newest' | 'estimated' | 'completeness';

const mockPriceHistory = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    price: Math.floor(15000 + Math.random() * 5000 - 2500 + i * 300)
  };
});

export default function MarketPage() {
  const [activeTab, setActiveTab] = useState<MarketTab>('hall');
  const { listings, pendingApprovals, myListings, createListing, cancelListing, buyListing, approveListing, rejectListing, updateListingPrice } = useMarketStore();
  const { relics } = useRelicStore();
  const { player } = usePlayerStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCiv, setFilterCiv] = useState<Civilization | 'all'>('all');
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [filterCompleteness, setFilterCompleteness] = useState<[number, number]>([0, 100]);
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [sortAsc, setSortAsc] = useState(false);

  const [selectedListing, setSelectedListing] = useState<MarketListing | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const [showCreateListing, setShowCreateListing] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState<string | null>(null);

  const [selectedRelicForListing, setSelectedRelicForListing] = useState<Relic | null>(null);
  const [listingPrice, setListingPrice] = useState(0);

  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState<{ listing: MarketListing; approve: boolean } | null>(null);
  const [showEditPrice, setShowEditPrice] = useState<MarketListing | null>(null);
  const [editPriceValue, setEditPriceValue] = useState(0);

  const unlistedRelics = useMemo(
    () => relics.filter(r => !r.inMuseum && !r.onMarket),
    [relics]
  );

  const filteredListings = useMemo(() => {
    let result = [...listings];

    if (searchTerm) {
      result = result.filter(l => {
        const relic = l.relic || relics.find(r => r.id === l.relicId);
        return relic?.name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    if (filterCiv !== 'all') {
      result = result.filter(l => {
        const relic = l.relic || relics.find(r => r.id === l.relicId);
        return relic?.civilization === filterCiv;
      });
    }

    if (filterRarity !== 'all') {
      result = result.filter(l => {
        const relic = l.relic || relics.find(r => r.id === l.relicId);
        return relic?.rarity === filterRarity;
      });
    }

    result = result.filter(l => {
      const relic = l.relic || relics.find(r => r.id === l.relicId);
      return relic && relic.completeness >= filterCompleteness[0] && relic.completeness <= filterCompleteness[1];
    });

    result.sort((a, b) => {
      const relicA = a.relic || relics.find(r => r.id === a.relicId);
      const relicB = b.relic || relics.find(r => r.id === b.relicId);
      if (!relicA || !relicB) return 0;

      let diff = 0;
      switch (sortKey) {
        case 'price':
          diff = a.price - b.price;
          break;
        case 'newest':
          diff = b.createTime - a.createTime;
          break;
        case 'estimated':
          diff = (relicB.estimatedPrice) - (relicA.estimatedPrice);
          break;
        case 'completeness':
          diff = relicB.completeness - relicA.completeness;
          break;
      }
      return sortAsc ? -diff : diff;
    });

    return result;
  }, [listings, relics, searchTerm, filterCiv, filterRarity, filterCompleteness, sortKey, sortAsc]);

  const handleSelectListing = (listing: MarketListing) => {
    setSelectedListing(listing);
    setShowDetail(true);
  };

  const handleBuy = () => {
    if (!selectedListing) return;
    const success = buyListing(selectedListing.id);
    if (success) {
      setShowBuyConfirm(false);
      setShowDetail(false);
      const relic = selectedListing.relic || relics.find(r => r.id === selectedListing.relicId);
      setShowAnnouncement(`🎉 恭喜购入「${relic?.name || '文物'}」！花费 ${selectedListing.price.toLocaleString()} 金币`);
      setTimeout(() => setShowAnnouncement(null), 3000);
      setSelectedListing(null);
    }
  };

  const handleCreateListing = () => {
    if (!selectedRelicForListing || listingPrice <= 0) return;
    const success = createListing(selectedRelicForListing.id, listingPrice);
    if (success) {
      setShowCreateListing(false);
      setSelectedRelicForListing(null);
      setListingPrice(0);
    }
  };

  const handleApprovalAction = () => {
    if (!showApprovalModal) return;
    const { listing, approve } = showApprovalModal;
    if (approve) {
      approveListing(listing.id, 1, approvalComment);
    } else {
      rejectListing(listing.id, 1, approvalComment);
    }
    setShowApprovalModal(null);
    setApprovalComment('');
  };

  const handleEditPrice = () => {
    if (!showEditPrice) return;
    updateListingPrice(showEditPrice.id, editPriceValue);
    setShowEditPrice(null);
    setEditPriceValue(0);
  };

  const getPriceDeviation = (price: number, relic: Relic) => {
    const estimated = relic.estimatedPrice;
    const deviation = ((price - estimated) / estimated) * 100;
    return deviation;
  };

  const getRiskLevel = (price: number, relic: Relic) => {
    const deviation = Math.abs(getPriceDeviation(price, relic));
    if (deviation > 50) return 'high';
    if (deviation > 25) return 'medium';
    return 'low';
  };

  const listingStatusColor: Record<ListingStatus, string> = {
    pending_approval: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    listed: 'bg-green-500/20 text-green-300 border-green-500/40',
    sold: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    rejected: 'bg-red-500/20 text-red-300 border-red-500/40',
    expired: 'bg-parchment-500/20 text-parchment-300 border-parchment-500/40'
  };

  const tabConfig = [
    { key: 'hall' as const, label: '市场大厅', icon: Store },
    { key: 'myListings' as const, label: '我的上架', icon: Tag },
    { key: 'approval' as const, label: '审批中心', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen">
      <PageHeader
        title="文物交易市场"
        subtitle="自由交易珍稀文物，成为顶级收藏家"
        icon={<Store />}
        breadcrumbs={[{ label: '市场' }]}
      />

      <div className="flex gap-2 mb-6 border-b border-bronze-700/30 overflow-x-auto">
        {tabConfig.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-6 py-3 font-display font-semibold flex items-center gap-2 border-b-2 transition-all duration-300 -mb-px whitespace-nowrap',
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
        {activeTab === 'hall' && (
          <motion.div
            key="hall"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <ParchmentCard>
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-parchment-500" size={18} />
                  <input
                    type="text"
                    placeholder="搜索文物名称..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-100 placeholder-parchment-500 focus:border-bronze-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <Filter size={16} className="text-parchment-400" />
                    <select
                      value={filterCiv}
                      onChange={(e) => setFilterCiv(e.target.value as Civilization | 'all')}
                      className="px-3 py-2 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-100 text-sm focus:outline-none focus:border-bronze-500"
                    >
                      <option value="all">全部文明</option>
                      {(['egypt', 'maya', 'atlantis', 'rome', 'china', 'mesopotamia'] as Civilization[]).map(c => (
                        <option key={c} value={c}>{civilizationIcons[c]} {civilizationNames[c]}</option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={filterRarity}
                    onChange={(e) => setFilterRarity(e.target.value as Rarity | 'all')}
                    className="px-3 py-2 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-100 text-sm focus:outline-none focus:border-bronze-500"
                  >
                    <option value="all">全部稀有度</option>
                    {(['common', 'rare', 'epic', 'legendary'] as Rarity[]).map(r => (
                      <option key={r} value={r}>{rarityColors[r].label}</option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSortAsc(!sortAsc)}
                      className="p-2 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-300 hover:border-bronze-500/50 transition-colors"
                    >
                      <ArrowUpDown size={16} className={cn(sortAsc && 'rotate-180')} />
                    </button>
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="px-3 py-2 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-100 text-sm focus:outline-none focus:border-bronze-500"
                    >
                      <option value="newest">最新上架</option>
                      <option value="price">价格</option>
                      <option value="estimated">估价</option>
                      <option value="completeness">完整度</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-bronze-700/20">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-parchment-400 whitespace-nowrap">完整度:</span>
                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterCompleteness[0]}
                      onChange={(e) => setFilterCompleteness([Number(e.target.value), filterCompleteness[1]])}
                      className="flex-1 accent-bronze-500"
                    />
                    <span className="text-sm font-mono text-bronze-300 min-w-[100px] text-center">
                      {filterCompleteness[0]}% - {filterCompleteness[1]}%
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={filterCompleteness[1]}
                      onChange={(e) => setFilterCompleteness([filterCompleteness[0], Number(e.target.value)])}
                      className="flex-1 accent-bronze-500"
                    />
                  </div>
                </div>
              </div>
            </ParchmentCard>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredListings.map((listing) => {
                const relic = listing.relic || relics.find(r => r.id === listing.relicId);
                if (!relic) return null;
                const priceDeviation = getPriceDeviation(listing.price, relic);
                const isGoodDeal = priceDeviation < -10;

                return (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    onClick={() => handleSelectListing(listing)}
                    className="cursor-pointer"
                  >
                    <div className="relative">
                      <RelicCard relic={relic} size="md" showStats={false} />
                      {isGoodDeal && (
                        <div className="absolute -top-2 -left-2 px-2 py-1 rounded-full bg-green-500/90 text-white text-xs font-bold shadow-lg">
                          超值!
                        </div>
                      )}
                    </div>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-parchment-400 flex items-center gap-1">
                          <User size={12} />
                          {listing.sellerName}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-display font-bold text-amber-300 font-mono">
                          ¥{listing.price.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <span className="text-parchment-500">建议:</span>
                        <span className="text-parchment-400 font-mono">
                          ¥{listing.suggestedPriceMin.toLocaleString()} ~ ¥{listing.suggestedPriceMax.toLocaleString()}
                        </span>
                      </div>
                      <div className={cn(
                        'text-xs flex items-center gap-1',
                        priceDeviation < 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {priceDeviation < 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                        {priceDeviation < 0 ? '低于' : '高于'}估价 {Math.abs(priceDeviation).toFixed(1)}%
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {filteredListings.length === 0 && (
              <div className="text-center py-16">
                <Store size={48} className="mx-auto text-parchment-600 mb-4" />
                <p className="text-parchment-400">暂无符合条件的文物</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'myListings' && (
          <motion.div
            key="myListings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-display font-bold text-parchment-100">我的上架文物</h2>
                <p className="text-sm text-parchment-400 mt-1">管理您正在出售的文物</p>
              </div>
              <BronzeButton
                icon={<Plus />}
                onClick={() => setShowCreateListing(true)}
                disabled={unlistedRelics.length === 0}
              >
                上架新文物
              </BronzeButton>
            </div>

            {myListings.length === 0 ? (
              <ParchmentCard>
                <div className="text-center py-12">
                  <Tag size={48} className="mx-auto text-parchment-600 mb-4" />
                  <p className="text-parchment-400 mb-4">您还没有上架任何文物</p>
                  <BronzeButton icon={<Plus />} onClick={() => setShowCreateListing(true)}>
                    立即上架
                  </BronzeButton>
                </div>
              </ParchmentCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myListings.map((listing) => {
                  const relic = listing.relic || relics.find(r => r.id === listing.relicId);
                  if (!relic) return null;

                  return (
                    <ParchmentCard key={listing.id}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium border',
                            listingStatusColor[listing.status]
                          )}>
                            {listingStatusNames[listing.status]}
                          </span>
                          <RarityBadge rarity={relic.rarity} size="sm" />
                        </div>
                        <div className="text-xs text-parchment-500 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(listing.createTime).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-4 mb-4">
                        <div className="w-20 h-20 rounded-lg bg-parchment-900 border border-bronze-700/30 flex items-center justify-center text-4xl flex-shrink-0">
                          {relic.image}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-display font-semibold text-parchment-100 truncate">{relic.name}</h4>
                          <p className="text-xs text-parchment-400 mt-0.5">
                            {civilizationIcons[relic.civilization]} {civilizationNames[relic.civilization]}
                          </p>
                          <div className="mt-2">
                            <SandProgress value={relic.completeness} showLabel={false} className="h-1.5" />
                            <div className="text-xs text-parchment-500 mt-1">完整度 {relic.completeness}%</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-bronze-700/20">
                        <div>
                          <div className="text-xs text-parchment-500">售价</div>
                          <div className="text-xl font-display font-bold text-amber-300 font-mono">
                            ¥{listing.price.toLocaleString()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {listing.status === 'listed' && (
                            <>
                              <BronzeButton
                                size="sm"
                                variant="secondary"
                                icon={<Pencil />}
                                onClick={() => {
                                  setShowEditPrice(listing);
                                  setEditPriceValue(listing.price);
                                }}
                              >
                                改价
                              </BronzeButton>
                              <BronzeButton
                                size="sm"
                                variant="ghost"
                                icon={<XCircle />}
                                onClick={() => cancelListing(listing.id)}
                              >
                                下架
                              </BronzeButton>
                            </>
                          )}
                          {listing.status === 'pending_approval' && (
                            <span className="text-xs text-amber-400 flex items-center gap-1">
                              <Clock size={14} />
                              审批中...
                            </span>
                          )}
                        </div>
                      </div>

                      {listing.status === 'rejected' && listing.approvals.length > 0 && (
                        <div className="mt-3 p-3 rounded-lg bg-red-900/20 border border-red-500/30">
                          <div className="flex items-center gap-2 text-red-400 text-sm">
                            <AlertTriangle size={14} />
                            <span className="font-medium">驳回原因:</span>
                          </div>
                          <p className="text-sm text-red-300/80 mt-1">
                            {listing.approvals[listing.approvals.length - 1].comment || '价格偏离合理范围，存在走私风险'}
                          </p>
                        </div>
                      )}
                    </ParchmentCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'approval' && (
          <motion.div
            key="approval"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <ParchmentCard>
                <div className="text-sm text-parchment-400 mb-1">待审批总数</div>
                <div className="text-3xl font-display font-bold text-amber-300">{pendingApprovals.length}</div>
              </ParchmentCard>
              <ParchmentCard>
                <div className="text-sm text-parchment-400 mb-1">高风险</div>
                <div className="text-3xl font-display font-bold text-red-400">
                  {pendingApprovals.filter(l => getRiskLevel(l.price, l.relic || relics.find(r => r.id === l.relicId)!) === 'high').length}
                </div>
              </ParchmentCard>
              <ParchmentCard>
                <div className="text-sm text-parchment-400 mb-1">中风险</div>
                <div className="text-3xl font-display font-bold text-amber-400">
                  {pendingApprovals.filter(l => getRiskLevel(l.price, l.relic || relics.find(r => r.id === l.relicId)!) === 'medium').length}
                </div>
              </ParchmentCard>
              <ParchmentCard>
                <div className="text-sm text-parchment-400 mb-1">低风险</div>
                <div className="text-3xl font-display font-bold text-green-400">
                  {pendingApprovals.filter(l => getRiskLevel(l.price, l.relic || relics.find(r => r.id === l.relicId)!) === 'low').length}
                </div>
              </ParchmentCard>
            </div>

            {pendingApprovals.length === 0 ? (
              <ParchmentCard>
                <div className="text-center py-12">
                  <ShieldCheck size={48} className="mx-auto text-parchment-600 mb-4" />
                  <p className="text-parchment-400">暂无待审批的上架申请</p>
                </div>
              </ParchmentCard>
            ) : (
              <div className="space-y-4">
                {pendingApprovals.map((listing) => {
                  const relic = listing.relic || relics.find(r => r.id === listing.relicId);
                  if (!relic) return null;
                  const deviation = getPriceDeviation(listing.price, relic);
                  const risk = getRiskLevel(listing.price, relic);

                  return (
                    <ParchmentCard key={listing.id}>
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-4 flex gap-4">
                          <div className="w-24 h-24 rounded-xl bg-parchment-900 border border-bronze-700/30 flex items-center justify-center text-5xl flex-shrink-0">
                            {relic.image}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-display font-bold text-lg text-parchment-100 truncate">{relic.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <RarityBadge rarity={relic.rarity} size="sm" />
                              <span className="text-sm text-parchment-400">
                                {civilizationIcons[relic.civilization]} {civilizationNames[relic.civilization]}
                              </span>
                            </div>
                            <div className="mt-3">
                              <div className="flex items-center gap-2 text-sm text-parchment-400 mb-1">
                                <User size={14} />
                                <span>卖家:</span>
                                <span className="text-parchment-200 font-medium">{listing.sellerName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-parchment-400">
                                <Calendar size={14} />
                                <span>上架时间:</span>
                                <span className="text-parchment-200 font-mono">
                                  {new Date(listing.createTime).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-5">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-lg bg-parchment-900/60 border border-bronze-700/20">
                              <div className="text-xs text-parchment-400 mb-1">卖家定价</div>
                              <div className="text-2xl font-display font-bold text-amber-300 font-mono">
                                ¥{listing.price.toLocaleString()}
                              </div>
                            </div>
                            <div className="p-3 rounded-lg bg-parchment-900/60 border border-bronze-700/20">
                              <div className="text-xs text-parchment-400 mb-1">系统估价</div>
                              <div className="text-2xl font-display font-bold text-parchment-200 font-mono">
                                ¥{relic.estimatedPrice.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 p-4 rounded-lg bg-parchment-900/60 border border-bronze-700/20">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <BarChart3 size={16} className="text-bronze-400" />
                                <span className="text-sm font-medium text-parchment-200">建议价格区间</span>
                              </div>
                              <div className={cn(
                                'px-2 py-1 rounded text-xs font-bold',
                                risk === 'high' ? 'bg-red-500/30 text-red-300' :
                                risk === 'medium' ? 'bg-amber-500/30 text-amber-300' :
                                'bg-green-500/30 text-green-300'
                              )}>
                                {riskLevelNames[risk]}
                              </div>
                            </div>
                            <div className="relative h-3 rounded-full bg-parchment-800 overflow-hidden">
                              <div
                                className="absolute top-0 h-full bg-green-500/30"
                                style={{
                                  left: `${Math.max(0, (listing.suggestedPriceMin / (relic.estimatedPrice * 2)) * 100)}%`,
                                  width: `${((listing.suggestedPriceMax - listing.suggestedPriceMin) / (relic.estimatedPrice * 2)) * 100}%`
                                }}
                              />
                              <div
                                className={cn(
                                  'absolute top-0 h-full w-1 -translate-x-1/2',
                                  risk === 'high' ? 'bg-red-400' :
                                  risk === 'medium' ? 'bg-amber-400' :
                                  'bg-bronze-400'
                                )}
                                style={{ left: `${Math.min(100, (listing.price / (relic.estimatedPrice * 2)) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-parchment-500 mt-1.5">
                              <span>¥0</span>
                              <span className="text-green-400">
                                ¥{listing.suggestedPriceMin.toLocaleString()} ~ ¥{listing.suggestedPriceMax.toLocaleString()}
                              </span>
                              <span>¥{(relic.estimatedPrice * 2).toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="mt-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm text-parchment-300">价格偏离度</span>
                              <span className={cn(
                                'text-sm font-mono font-bold',
                                Math.abs(deviation) > 50 ? 'text-red-400' :
                                Math.abs(deviation) > 25 ? 'text-amber-400' :
                                'text-green-400'
                              )}>
                                {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-2 bg-parchment-800 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  Math.abs(deviation) > 50 ? 'bg-red-500' :
                                  Math.abs(deviation) > 25 ? 'bg-amber-500' :
                                  'bg-green-500'
                                )}
                                style={{ width: `${Math.min(100, Math.abs(deviation))}%` }}
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex gap-4 text-xs text-parchment-400">
                            <div className="flex items-center gap-1">
                              <AlertOctagon size={12} />
                              历史交易: <span className="text-parchment-200">23 笔</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <XCircle size={12} />
                              被驳回: <span className="text-parchment-200">1 次</span>
                            </div>
                          </div>
                        </div>

                        <div className="lg:col-span-3 flex flex-col justify-between">
                          <div className="p-3 rounded-lg bg-parchment-900/60 border border-bronze-700/20">
                            <div className="text-xs text-parchment-400 mb-1">审批进度</div>
                            <div className="flex items-center gap-2 mt-2">
                              {[1, 2, 3].map(level => {
                                const approval = listing.approvals.find(a => a.level === level);
                                return (
                                  <div key={level} className="flex-1 flex flex-col items-center">
                                    <div className={cn(
                                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                                      approval?.decision === 'approved' ? 'bg-green-500/30 text-green-300 border border-green-500/50' :
                                      approval?.decision === 'rejected' ? 'bg-red-500/30 text-red-300 border border-red-500/50' :
                                      'bg-parchment-800 text-parchment-500 border border-parchment-600'
                                    )}>
                                      {approval?.decision === 'approved' ? <CheckCircle size={16} /> :
                                       approval?.decision === 'rejected' ? <XCircle size={16} /> :
                                       level}
                                    </div>
                                    <span className="text-xs text-parchment-500 mt-1">L{level}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 mt-4">
                            <BronzeButton
                              icon={<CheckCircle />}
                              onClick={() => setShowApprovalModal({ listing, approve: true })}
                              className="w-full"
                            >
                              通过审批
                            </BronzeButton>
                            <BronzeButton
                              variant="secondary"
                              icon={<XCircle />}
                              onClick={() => setShowApprovalModal({ listing, approve: false })}
                              className="w-full"
                            >
                              驳回申请
                            </BronzeButton>
                          </div>
                        </div>
                      </div>
                    </ParchmentCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        isOpen={showDetail && !!selectedListing}
        onClose={() => setShowDetail(false)}
        title="文物详情"
        size="xl"
      >
        {selectedListing && (() => {
          const relic = selectedListing.relic || relics.find(r => r.id === selectedListing.relicId);
          if (!relic) return null;
          const priceDeviation = getPriceDeviation(selectedListing.price, relic);

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-6 rounded-xl bg-parchment-900/60 border border-bronze-700/30 flex flex-col items-center">
                    <div className="text-8xl mb-4">{relic.image}</div>
                    <h3 className="text-2xl font-display font-bold gold-text">{relic.name}</h3>
                    <div className="flex items-center gap-2 mt-2">
                      <RarityBadge rarity={relic.rarity} />
                      <span className="text-parchment-400">
                        {civilizationIcons[relic.civilization]} {civilizationNames[relic.civilization]}
                      </span>
                    </div>
                  </div>
                  <RelicStats relic={relic} size="lg" />
                  <ParchmentCard className="!p-4">
                    <p className="text-parchment-300 leading-relaxed">{relic.description}</p>
                  </ParchmentCard>
                </div>

                <div className="space-y-4">
                  <ParchmentCard className="!p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-parchment-400 mb-1">卖家</div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-bronze-500/30 flex items-center justify-center">
                            <User size={16} className="text-bronze-300" />
                          </div>
                          <span className="font-medium text-parchment-100">{selectedListing.sellerName}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-parchment-400 mb-1">上架时间</div>
                        <div className="font-mono text-parchment-200 flex items-center gap-1.5">
                          <Calendar size={14} />
                          {new Date(selectedListing.createTime).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </ParchmentCard>

                  <ParchmentCard className="!p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-parchment-300">当前售价</span>
                      <span className="text-3xl font-display font-bold text-amber-300 font-mono">
                        ¥{selectedListing.price.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm mb-4">
                      <span className="text-parchment-400">系统建议区间:</span>
                      <span className="text-green-400 font-mono font-bold px-2 py-0.5 rounded bg-green-500/10 border border-green-500/30">
                        ¥{selectedListing.suggestedPriceMin.toLocaleString()} ~ ¥{selectedListing.suggestedPriceMax.toLocaleString()}
                      </span>
                    </div>

                    <div className="relative h-4 rounded-full bg-parchment-800 overflow-hidden mb-2">
                      <div
                        className="absolute top-0 h-full bg-green-500/30"
                        style={{
                          left: '25%',
                          width: '30%'
                        }}
                      />
                      <div
                        className="absolute top-0 h-full w-1.5 bg-amber-400 -translate-x-1/2 rounded"
                        style={{ left: `${25 + 30 * ((selectedListing.price - selectedListing.suggestedPriceMin) / Math.max(1, selectedListing.suggestedPriceMax - selectedListing.suggestedPriceMin))}%` }}
                      />
                    </div>

                    <div className={cn(
                      'text-sm flex items-center justify-between',
                      priceDeviation < 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      <span className="flex items-center gap-1">
                        {priceDeviation < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                        {priceDeviation < 0 ? '低于' : '高于'}估价
                      </span>
                      <span className="font-mono font-bold">{Math.abs(priceDeviation).toFixed(1)}%</span>
                    </div>
                  </ParchmentCard>

                  <ParchmentCard title="近7天同类成交均价" icon={<TrendingUp size={16} />} className="!p-5">
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockPriceHistory}>
                          <defs>
                            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.1)" />
                          <XAxis dataKey="date" stroke="#8B7355" fontSize={10} tickLine={false} />
                          <YAxis stroke="#8B7355" fontSize={10} tickLine={false} axisLine={false} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#2C1810',
                              border: '1px solid rgba(212,175,55,0.4)',
                              borderRadius: '8px',
                              color: '#E8D5B0',
                              fontSize: '12px'
                            }}
                            formatter={(value: number) => [`¥${value.toLocaleString()}`, '均价']}
                          />
                          <ReferenceLine y={selectedListing.suggestedPriceMin} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.6} />
                          <ReferenceLine y={selectedListing.suggestedPriceMax} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.6} />
                          <ReferenceLine y={selectedListing.price} stroke="#D4AF37" strokeWidth={2} />
                          <Area
                            type="monotone"
                            dataKey="price"
                            stroke="#22c55e"
                            strokeWidth={2}
                            fill="url(#priceGrad)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-parchment-400">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-green-500" />
                        <span>建议区间</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-0.5 bg-amber-400" />
                        <span>当前定价</span>
                      </div>
                    </div>
                  </ParchmentCard>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-parchment-900/60 border border-bronze-700/20">
                      <div className="text-xs text-parchment-400 mb-1">手续费 (5%)</div>
                      <div className="text-lg font-mono text-parchment-200">
                        ¥{Math.round(selectedListing.price * 0.05).toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-900/20 border border-amber-500/30">
                      <div className="text-xs text-amber-300 mb-1">应付总额</div>
                      <div className="text-xl font-display font-bold text-amber-300 font-mono">
                        ¥{(selectedListing.price + Math.round(selectedListing.price * 0.05)).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-bronze-700/20">
                <BronzeButton variant="ghost" onClick={() => setShowDetail(false)}>
                  关闭
                </BronzeButton>
                <BronzeButton
                  icon={<ShoppingCart />}
                  onClick={() => setShowBuyConfirm(true)}
                  disabled={player.gold < selectedListing.price + Math.round(selectedListing.price * 0.05)}
                >
                  立即购买
                </BronzeButton>
              </div>
            </div>
          );
        })()}
      </Modal>

      <Modal
        isOpen={showBuyConfirm}
        onClose={() => setShowBuyConfirm(false)}
        title="确认购买"
        size="sm"
      >
        {selectedListing && (() => {
          const relic = selectedListing.relic || relics.find(r => r.id === selectedListing.relicId);
          const total = selectedListing.price + Math.round(selectedListing.price * 0.05);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-parchment-900/60 border border-bronze-700/30 flex items-center gap-4">
                <div className="text-5xl">{relic?.image}</div>
                <div>
                  <div className="font-display font-bold text-lg text-parchment-100">{relic?.name}</div>
                  <div className="text-sm text-parchment-400">卖家: {selectedListing.sellerName}</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-parchment-400">商品价格</span>
                  <span className="text-parchment-200 font-mono">¥{selectedListing.price.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-parchment-400">交易手续费 (5%)</span>
                  <span className="text-parchment-200 font-mono">¥{Math.round(selectedListing.price * 0.05).toLocaleString()}</span>
                </div>
                <div className="h-px bg-bronze-700/30 my-2" />
                <div className="flex justify-between">
                  <span className="text-parchment-300 font-medium">应付总额</span>
                  <span className="text-2xl font-display font-bold text-amber-300 font-mono">¥{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-parchment-400">当前金币</span>
                  <span className={cn('font-mono', player.gold >= total ? 'text-green-400' : 'text-red-400')}>
                    ¥{player.gold.toLocaleString()}
                  </span>
                </div>
              </div>

              {player.gold < total && (
                <div className="p-3 rounded-lg bg-red-900/20 border border-red-500/30 text-sm text-red-300 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  金币不足，还需 ¥{(total - player.gold).toLocaleString()}
                </div>
              )}
            </div>
          );
        })()}
        <div className="flex justify-end gap-3 mt-6">
          <BronzeButton variant="ghost" onClick={() => setShowBuyConfirm(false)}>
            取消
          </BronzeButton>
          <BronzeButton
            icon={<ShoppingCart />}
            onClick={handleBuy}
            disabled={!selectedListing || player.gold < (selectedListing?.price || 0) + Math.round((selectedListing?.price || 0) * 0.05)}
          >
            确认购买
          </BronzeButton>
        </div>
      </Modal>

      <Modal
        isOpen={showCreateListing}
        onClose={() => setShowCreateListing(false)}
        title="上架新文物"
        size="xl"
      >
        <div className="space-y-6">
          {!selectedRelicForListing ? (
            <div>
              <p className="text-parchment-300 mb-4">选择要上架的文物：</p>
              {unlistedRelics.length === 0 ? (
                <div className="text-center py-12">
                  <Tag size={48} className="mx-auto text-parchment-600 mb-4" />
                  <p className="text-parchment-400">没有可上架的文物</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-2">
                  {unlistedRelics.map(relic => (
                    <motion.div
                      key={relic.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        setSelectedRelicForListing(relic);
                        setListingPrice(relic.estimatedPrice);
                      }}
                      className="cursor-pointer"
                    >
                      <RelicCard relic={relic} size="sm" showStats={false} />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-parchment-900/60 border border-bronze-700/30">
                <div className="text-5xl">{selectedRelicForListing.image}</div>
                <div className="flex-1">
                  <div className="font-display font-bold text-xl text-parchment-100">{selectedRelicForListing.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <RarityBadge rarity={selectedRelicForListing.rarity} size="sm" />
                    <span className="text-sm text-parchment-400">
                      {civilizationIcons[selectedRelicForListing.civilization]} {civilizationNames[selectedRelicForListing.civilization]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedRelicForListing(null)}
                  className="p-2 rounded-lg text-parchment-400 hover:text-parchment-200 hover:bg-parchment-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockPriceHistory}>
                      <defs>
                        <linearGradient id="listingPriceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,175,55,0.1)" />
                      <XAxis dataKey="date" stroke="#8B7355" fontSize={10} tickLine={false} />
                      <YAxis stroke="#8B7355" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#2C1810',
                          border: '1px solid rgba(212,175,55,0.4)',
                          borderRadius: '8px',
                          color: '#E8D5B0',
                          fontSize: '12px'
                        }}
                        formatter={(value: number) => [`¥${value.toLocaleString()}`, '均价']}
                      />
                      <ReferenceLine y={Math.round(selectedRelicForListing.estimatedPrice * 0.85)} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.6} />
                      <ReferenceLine y={Math.round(selectedRelicForListing.estimatedPrice * 1.15)} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.6} />
                      <ReferenceLine y={listingPrice} stroke="#D4AF37" strokeWidth={2} />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#D4AF37"
                        strokeWidth={2}
                        fill="url(#listingPriceGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-parchment-400 justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-green-500" />
                    <span>建议区间</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-amber-400" />
                    <span>您的定价</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm text-parchment-300">定价 (金币)</label>
                  <div className="text-sm text-parchment-400">
                    建议区间: <span className="text-green-400 font-mono">
                      ¥{Math.round(selectedRelicForListing.estimatedPrice * 0.85).toLocaleString()} ~ ¥{Math.round(selectedRelicForListing.estimatedPrice * 1.15).toLocaleString()}
                    </span>
                  </div>
                </div>
                <input
                  type="number"
                  value={listingPrice}
                  onChange={(e) => setListingPrice(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-100 text-xl font-mono font-bold focus:border-bronze-500 focus:outline-none transition-colors"
                />
                <div className="mt-3">
                  <input
                    type="range"
                    min={Math.round(selectedRelicForListing.estimatedPrice * 0.5)}
                    max={Math.round(selectedRelicForListing.estimatedPrice * 2)}
                    value={listingPrice}
                    onChange={(e) => setListingPrice(Number(e.target.value))}
                    className="w-full accent-bronze-500"
                  />
                </div>
              </div>

              {(() => {
                const risk = getRiskLevel(listingPrice, selectedRelicForListing);
                const deviation = getPriceDeviation(listingPrice, selectedRelicForListing);
                if (risk === 'low') return null;
                return (
                  <div className={cn(
                    'p-4 rounded-lg border flex items-start gap-3',
                    risk === 'high' ? 'bg-red-900/20 border-red-500/40' : 'bg-amber-900/20 border-amber-500/40'
                  )}>
                    <AlertTriangle className={cn(
                      'size-5 flex-shrink-0 mt-0.5',
                      risk === 'high' ? 'text-red-400' : 'text-amber-400'
                    )} />
                    <div>
                      <div className={cn(
                        'font-semibold',
                        risk === 'high' ? 'text-red-300' : 'text-amber-300'
                      )}>
                        {risk === 'high' ? '⚠️ 高走私风险警告' : '⚡ 价格偏离警告'}
                      </div>
                      <p className={cn(
                        'text-sm mt-1',
                        risk === 'high' ? 'text-red-300/80' : 'text-amber-300/80'
                      )}>
                        当前定价{deviation > 0 ? '高于' : '低于'}估价 {Math.abs(deviation).toFixed(1)}%，
                        {risk === 'high' ? '将触发人工审核，可能被驳回。建议调整到合理区间。' : '建议调整到合理区间以加速上架。'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {selectedRelicForListing && (
          <div className="flex justify-end gap-3 mt-6">
            <BronzeButton variant="ghost" onClick={() => setShowCreateListing(false)}>
              取消
            </BronzeButton>
            <BronzeButton
              icon={<Plus />}
              onClick={handleCreateListing}
              disabled={listingPrice <= 0}
            >
              提交上架
            </BronzeButton>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!showApprovalModal}
        onClose={() => setShowApprovalModal(null)}
        title={showApprovalModal?.approve ? '通过审批' : '驳回申请'}
        size="md"
      >
        <div className="space-y-4">
          {showApprovalModal && (() => {
            const relic = showApprovalModal.listing.relic || relics.find(r => r.id === showApprovalModal.listing.relicId);
            return (
              <>
                <div className="p-4 rounded-xl bg-parchment-900/60 border border-bronze-700/30 flex items-center gap-4">
                  <div className="text-4xl">{relic?.image}</div>
                  <div>
                    <div className="font-display font-bold text-parchment-100">{relic?.name}</div>
                    <div className="text-sm text-parchment-400">卖家: {showApprovalModal.listing.sellerName}</div>
                    <div className="text-sm text-amber-300 font-mono">¥{showApprovalModal.listing.price.toLocaleString()}</div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-parchment-300 mb-2">
                    {showApprovalModal.approve ? '审批意见 (可选)' : '驳回理由'}
                  </label>
                  <textarea
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder={showApprovalModal.approve ? '输入审批意见...' : '请输入驳回理由...'}
                    rows={4}
                    className={cn(
                      'w-full px-4 py-3 rounded-lg bg-parchment-900 border text-parchment-100 placeholder-parchment-500 focus:outline-none transition-colors resize-none',
                      showApprovalModal.approve ? 'border-bronze-700/40 focus:border-bronze-500' : 'border-red-500/40 focus:border-red-500'
                    )}
                  />
                </div>

                {!showApprovalModal.approve && (
                  <div className="flex flex-wrap gap-2">
                    {['价格偏离合理范围', '存在走私嫌疑', '文物信息存疑', '卖家信誉问题'].map(reason => (
                      <button
                        key={reason}
                        onClick={() => setApprovalComment(reason)}
                        className="px-3 py-1.5 rounded-full text-xs bg-parchment-800/50 border border-parchment-600/50 text-parchment-300 hover:border-red-500/50 hover:text-red-300 transition-colors"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <BronzeButton variant="ghost" onClick={() => setShowApprovalModal(null)}>
            取消
          </BronzeButton>
          <BronzeButton
            variant={showApprovalModal?.approve ? 'primary' : 'secondary'}
            icon={showApprovalModal?.approve ? <CheckCircle /> : <XCircle />}
            onClick={handleApprovalAction}
            className={cn(!showApprovalModal?.approve && '!bg-red-600/80 !border-red-500/50 hover:!bg-red-600')}
          >
            {showApprovalModal?.approve ? '确认通过' : '确认驳回'}
          </BronzeButton>
        </div>
      </Modal>

      <Modal
        isOpen={!!showEditPrice}
        onClose={() => setShowEditPrice(null)}
        title="修改价格"
        size="sm"
      >
        {showEditPrice && (() => {
          const relic = showEditPrice.relic || relics.find(r => r.id === showEditPrice.relicId);
          return (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-parchment-900/60 border border-bronze-700/30 flex items-center gap-4">
                <div className="text-4xl">{relic?.image}</div>
                <div>
                  <div className="font-display font-bold text-parchment-100">{relic?.name}</div>
                  <div className="text-sm text-parchment-400">当前价格: <span className="text-amber-300 font-mono">¥{showEditPrice.price.toLocaleString()}</span></div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-parchment-300 mb-2">新价格 (金币)</label>
                <input
                  type="number"
                  value={editPriceValue}
                  onChange={(e) => setEditPriceValue(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg bg-parchment-900 border border-bronze-700/40 text-parchment-100 text-xl font-mono font-bold focus:border-bronze-500 focus:outline-none transition-colors"
                />
              </div>

              {relic && editPriceValue > 0 && (() => {
                const risk = getRiskLevel(editPriceValue, relic);
                if (risk === 'low') return null;
                return (
                  <div className={cn(
                    'p-3 rounded-lg border text-sm flex items-start gap-2',
                    risk === 'high' ? 'bg-red-900/20 border-red-500/40 text-red-300' : 'bg-amber-900/20 border-amber-500/40 text-amber-300'
                  )}>
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">
                        {risk === 'high' ? '⚠️ 高走私风险警告' : '⚡ 价格偏离警告'}
                      </div>
                      <p className="text-xs mt-1 opacity-80">
                        {risk === 'high' ? '定价偏离过大，可能触发下架审核' : '建议调整到合理区间'}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}
        <div className="flex justify-end gap-3 mt-6">
          <BronzeButton variant="ghost" onClick={() => setShowEditPrice(null)}>
            取消
          </BronzeButton>
          <BronzeButton
            icon={<Pencil />}
            onClick={handleEditPrice}
            disabled={editPriceValue <= 0}
          >
            确认修改
          </BronzeButton>
        </div>
      </Modal>

      <AnimatePresence>
        {showAnnouncement && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-900/95 via-amber-800/95 to-amber-900/95 border-2 border-amber-400 shadow-gold-glow text-center">
              <div className="text-lg font-display font-bold gold-text">{showAnnouncement}</div>
              <div className="text-xs text-amber-200/70 mt-1">全服公告</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}