import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MarketListing, ApprovalRecord, RiskLevel, Decision } from '../types';
import { relics } from '../data/relics';
import { gameConfig } from '../data/config';
import { generateId, getRandomInt, deepClone } from '../utils/helpers';
import { generateMarketPriceHistory } from '../utils/generators';
import { suggestPriceRange, assessSmugglingRisk } from '../utils/calculators';
import { usePlayerStore } from './playerStore';
import { useRelicStore } from './relicStore';

const createInitialListings = (): MarketListing[] => {
  const listingRelics = relics.slice(0, 7);
  const sellerNames = ['寻宝者张三', '考古达人李四', '收藏家王五', '神秘商人', '古董专家', '遗迹探索者', '文物猎人'];

  return listingRelics.map((relic, index) => {
    const basePrice = relic.estimatedPrice;
    const priceVariation = 0.85 + Math.random() * 0.3;
    const finalPrice = Math.round(basePrice * priceVariation);

    return {
      id: generateId('listing'),
      relicId: relic.id,
      sellerId: `seller-${index + 1}`,
      sellerName: sellerNames[index] || '匿名卖家',
      price: finalPrice,
      suggestedPriceMin: Math.round(basePrice * 0.85),
      suggestedPriceMax: Math.round(basePrice * 1.15),
      status: 'listed',
      createTime: Date.now() - getRandomInt(1, 5) * 3600000,
      approvals: [],
      priceHistory: generateMarketPriceHistory(3),
      relic: deepClone(relic)
    };
  });
};

interface MarketState {
  listings: MarketListing[];
  pendingApprovals: MarketListing[];
  myListings: MarketListing[];
  createListing: (relicId: string, price: number) => boolean;
  cancelListing: (listingId: string) => boolean;
  buyListing: (listingId: string) => boolean;
  approveListing: (listingId: string, level: 1 | 2 | 3, comment?: string) => void;
  rejectListing: (listingId: string, level: 1 | 2 | 3, comment?: string) => void;
  updateListingPrice: (listingId: string, newPrice: number) => boolean;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      listings: createInitialListings(),
      pendingApprovals: [],
      myListings: [],

      createListing: (relicId, price) => {
        const playerStore = usePlayerStore.getState();
        const relicStore = useRelicStore.getState();
        const relic = relicStore.relics.find((r) => r.id === relicId);

        if (!relic || relic.onMarket || relic.inMuseum) {
          return false;
        }

        if (price <= 0) {
          return false;
        }

        const suggestedRange = suggestPriceRange(get().listings, relic);
        const riskAssessment = assessSmugglingRisk(
          price,
          suggestedRange,
          { totalSales: get().myListings.filter((l) => l.status === 'sold').length, rejectedCount: get().myListings.filter((l) => l.status === 'rejected').length, smugglingAttempts: 0 },
          relic.rarity
        );

        const listing: MarketListing = {
          id: generateId('listing'),
          relicId,
          sellerId: playerStore.player.id,
          sellerName: playerStore.player.name,
          price,
          suggestedPriceMin: suggestedRange.min,
          suggestedPriceMax: suggestedRange.max,
          status: riskAssessment.level === 'high' ? 'pending_approval' : 'listed',
          createTime: Date.now(),
          approvals: [],
          priceHistory: [{ time: Date.now(), price }],
          relic: deepClone(relic)
        };

        relicStore.setOnMarket(relicId, true);

        if (listing.status === 'pending_approval') {
          set((state) => ({
            pendingApprovals: [...state.pendingApprovals, listing],
            myListings: [...state.myListings, listing]
          }));
        } else {
          set((state) => ({
            listings: [...state.listings, listing],
            myListings: [...state.myListings, listing]
          }));
        }

        playerStore.addAnnouncement('system', {});
        return true;
      },

      cancelListing: (listingId) => {
        const { listings, pendingApprovals, myListings } = get();
        const relicStore = useRelicStore.getState();

        const allListings = [...listings, ...pendingApprovals, ...myListings];
        const listing = allListings.find((l) => l.id === listingId);

        if (!listing) {
          return false;
        }

        const playerStore = usePlayerStore.getState();
        if (listing.sellerId !== playerStore.player.id) {
          return false;
        }

        relicStore.setOnMarket(listing.relicId, false);

        set((state) => ({
          listings: state.listings.filter((l) => l.id !== listingId),
          pendingApprovals: state.pendingApprovals.filter((l) => l.id !== listingId),
          myListings: state.myListings.map((l) =>
            l.id === listingId ? { ...l, status: 'expired' as const } : l
          )
        }));

        return true;
      },

      buyListing: (listingId) => {
        const { listings } = get();
        const listing = listings.find((l) => l.id === listingId);

        if (!listing || listing.status !== 'listed') {
          return false;
        }

        const playerStore = usePlayerStore.getState();
        const relicStore = useRelicStore.getState();

        const fee = Math.round(listing.price * gameConfig.baseMarketFee);
        const totalCost = listing.price + fee;

        if (!playerStore.spendGold(totalCost)) {
          return false;
        }

        if (listing.relic) {
          const newRelic = deepClone(listing.relic);
          newRelic.id = generateId('relic');
          newRelic.discoveredAt = Date.now();
          newRelic.onMarket = false;
          relicStore.addRelic(newRelic);
        }

        playerStore.addAnnouncement('trade', {
          relic: listing.relic?.name || '文物',
          price: listing.price
        });

        set((state) => ({
          listings: state.listings.filter((l) => l.id !== listingId),
          myListings: state.myListings.map((l) =>
            l.id === listingId ? { ...l, status: 'sold' as const } : l
          )
        }));

        return true;
      },

      approveListing: (listingId, level, comment) => {
        const { pendingApprovals } = get();
        const listing = pendingApprovals.find((l) => l.id === listingId);
        if (!listing) {
          return;
        }

        const playerStore = usePlayerStore.getState();
        const approval: ApprovalRecord = {
          id: generateId('approval'),
          approverId: playerStore.player.id,
          approverName: playerStore.player.name,
          level,
          decision: 'approved',
          comment,
          timestamp: Date.now(),
          riskAssessment: (listing.approvals.length > 0 ? listing.approvals[0].riskAssessment : 'low') as RiskLevel
        };

        const allApproved = [...listing.approvals, approval].filter((a) => a.decision === 'approved').length >= 2;

        set((state) => ({
          pendingApprovals: allApproved ? state.pendingApprovals.filter((l) => l.id !== listingId) : state.pendingApprovals.map((l) =>
            l.id === listingId ? { ...l, approvals: [...l.approvals, approval] } : l
          ),
          listings: allApproved ? [...state.listings, { ...listing, status: 'listed', approvals: [...listing.approvals, approval] }] : state.listings,
          myListings: state.myListings.map((l) =>
            l.id === listingId
              ? { ...l, approvals: [...l.approvals, approval], status: allApproved ? 'listed' : l.status }
              : l
          )
        }));
      },

      rejectListing: (listingId, level, comment) => {
        const { pendingApprovals } = get();
        const listing = pendingApprovals.find((l) => l.id === listingId);
        if (!listing) {
          return;
        }

        const playerStore = usePlayerStore.getState();
        const relicStore = useRelicStore.getState();

        const approval: ApprovalRecord = {
          id: generateId('approval'),
          approverId: playerStore.player.id,
          approverName: playerStore.player.name,
          level,
          decision: 'rejected',
          comment,
          timestamp: Date.now(),
          riskAssessment: (listing.approvals.length > 0 ? listing.approvals[0].riskAssessment : 'high') as RiskLevel
        };

        relicStore.setOnMarket(listing.relicId, false);

        set((state) => ({
          pendingApprovals: state.pendingApprovals.filter((l) => l.id !== listingId),
          myListings: state.myListings.map((l) =>
            l.id === listingId ? { ...l, status: 'rejected', approvals: [...l.approvals, approval] } : l
          )
        }));
      },

      updateListingPrice: (listingId, newPrice) => {
        const { listings, pendingApprovals, myListings } = get();
        const playerStore = usePlayerStore.getState();

        const allListings = [...listings, ...pendingApprovals, ...myListings];
        const listing = allListings.find((l) => l.id === listingId);

        if (!listing || listing.sellerId !== playerStore.player.id || listing.status === 'sold') {
          return false;
        }

        if (newPrice <= 0) {
          return false;
        }

        set((state) => ({
          listings: state.listings.map((l) =>
            l.id === listingId
              ? { ...l, price: newPrice, priceHistory: [...l.priceHistory, { time: Date.now(), price: newPrice }] }
              : l
          ),
          pendingApprovals: state.pendingApprovals.map((l) =>
            l.id === listingId
              ? { ...l, price: newPrice, priceHistory: [...l.priceHistory, { time: Date.now(), price: newPrice }] }
              : l
          ),
          myListings: state.myListings.map((l) =>
            l.id === listingId
              ? { ...l, price: newPrice, priceHistory: [...l.priceHistory, { time: Date.now(), price: newPrice }] }
              : l
          )
        }));

        return true;
      }
    }),
    {
      name: 'market-store'
    }
  )
);
