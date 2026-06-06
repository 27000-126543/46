import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        isCommittee?: boolean;
      };
    }
  }
}

export type Profession = 'explorer' | 'linguist' | 'engineer' | 'archaeologist' | 'historian';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Civilization = 'egypt' | 'maya' | 'atlantis' | 'rome' | 'china' | 'mesopotamia';
export type EventType = 'trap' | 'collapse' | 'rival' | 'treasure' | 'discovery';
export type ListingStatus = 'pending_approval' | 'listed' | 'sold' | 'rejected' | 'expired';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Decision = 'approved' | 'rejected' | 'pending';

export interface SkillSet {
  explorationSpeed: number;
  relicDiscovery: number;
  trapHandling: number;
  repairBonus: number;
}

export interface TeamMember {
  id: string;
  name: string;
  profession: Profession;
  skillLevel: number;
  luck: number;
  rarity: Rarity;
  avatar: string;
  skills: SkillSet;
  description: string;
}

export interface Material {
  id: string;
  name: string;
  type: 'fragment' | 'adhesive' | 'polish' | 'tool';
  quality: number;
  amount: number;
  icon: string;
}

export interface Relic {
  id: string;
  name: string;
  civilization: Civilization;
  completeness: number;
  rarity: Rarity;
  historicalValue: number;
  estimatedPrice: number;
  description: string;
  image: string;
  fragments: number;
  discoveredAt: number;
  repairHistory: RepairRecord[];
  inMuseum: boolean;
  onMarket: boolean;
}

export interface RepairRecord {
  id: string;
  timestamp: number;
  success: boolean;
  materialsUsed: { type: string; quality: number; amount: number }[];
  completenessBefore: number;
  completenessAfter: number;
}

export interface MarketListing {
  id: string;
  relicId: string;
  sellerId: string;
  sellerName: string;
  price: number;
  suggestedPriceMin: number;
  suggestedPriceMax: number;
  status: ListingStatus;
  createTime: number;
  priceHistory: { time: number; price: number }[];
  relic?: Relic;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    isCommittee?: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}
