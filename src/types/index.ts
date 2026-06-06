export type Profession = 'explorer' | 'linguist' | 'engineer' | 'archaeologist' | 'historian';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Civilization = 'egypt' | 'maya' | 'atlantis' | 'rome' | 'china' | 'mesopotamia';
export type EventType = 'trap' | 'collapse' | 'rival' | 'treasure' | 'discovery';
export type ListingStatus = 'pending_approval' | 'listed' | 'sold' | 'rejected' | 'expired';
export type RiskLevel = 'low' | 'medium' | 'high';
export type Decision = 'approved' | 'rejected' | 'pending';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  level: number;
  exp: number;
  gold: number;
  gems: number;
  totalRelicValue: number;
  museumScore: number;
}

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

export interface Team {
  id: string;
  name: string;
  memberIds: string[];
  active: boolean;
}

export interface Ruin {
  id: string;
  name: string;
  civilization: Civilization;
  difficulty: number;
  description: string;
  image: string;
  minLevel: number;
  estimatedTime: number;
  potentialRelics: string[];
  eventPool: string[];
  rewards: {
    goldMin: number;
    goldMax: number;
    exp: number;
  };
}

export interface EventChoice {
  id: string;
  text: string;
  requiredSkill?: { profession: Profession; minLevel: number };
  successRate: number;
  effects: {
    progressChange?: number;
    goldChange?: number;
    luckChange?: number;
    damage?: boolean;
    findRelic?: boolean;
  };
}

export interface ExplorationEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  choices: EventChoice[];
  resolved: boolean;
  result?: {
    success: boolean;
    message: string;
    effects: EventChoice['effects'];
  };
}

export interface Exploration {
  id: string;
  playerId: string;
  ruinId: string;
  teamId: string;
  progress: number;
  status: 'exploring' | 'completed' | 'failed' | 'paused';
  startTime: number;
  eventsTriggered: ExplorationEvent[];
  relicsFound: string[];
}

export interface RepairRecord {
  id: string;
  timestamp: number;
  success: boolean;
  materialsUsed: { type: string; quality: number; amount: number }[];
  completenessBefore: number;
  completenessAfter: number;
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

export interface LayoutSlot {
  type: 'empty' | 'display' | 'decoration' | 'path';
  relicId?: string;
  position?: { row: number; col: number };
  bonus?: number;
}

export interface MuseumHall {
  id: string;
  name: string;
  theme: Civilization | 'mixed';
  capacity: number;
  displayedRelics: string[];
  bonusMultiplier: number;
  level: number;
}

export interface Museum {
  id: string;
  playerId: string;
  name: string;
  level: number;
  attractiveness: number;
  dailyIncome: number;
  totalVisitors: number;
  halls: MuseumHall[];
  layout: LayoutSlot[][];
  incomeHistory: { date: string; income: number }[];
}

export interface VisitorReview {
  id: string;
  timestamp: number;
  rating: number;
  comment: string;
  target: 'A' | 'B';
}

export interface ExhibitionMatch {
  id: string;
  participantA: string;
  participantAName: string;
  participantB: string;
  participantBName: string;
  scoreA: number;
  scoreB: number;
  visitorReviews: VisitorReview[];
  damageRisk: number;
  status: 'pending' | 'ongoing' | 'finished';
  winner?: string;
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
  approvals: ApprovalRecord[];
  priceHistory: { time: number; price: number }[];
  relic?: Relic;
}

export interface ApprovalRecord {
  id: string;
  approverId: string;
  approverName: string;
  level: 1 | 2 | 3;
  decision: Decision;
  comment?: string;
  timestamp: number;
  riskAssessment: RiskLevel;
}

export interface RankingEntry {
  rank: number;
  playerId: string;
  playerName: string;
  avatar: string;
  value: number;
  change: number;
}

export interface SecretRealmTeam {
  teamId: string;
  playerId: string;
  playerName: string;
  progress: number;
  position: number;
  relicsFound: number;
}

export interface GlobalEvent {
  id: string;
  timestamp: number;
  type: 'broadcast' | 'boss' | 'treasure_horde';
  message: string;
  affectedTeams?: string[];
}

export interface SecretRealm {
  id: string;
  name: string;
  openTime: number;
  closeTime: number;
  maxPlayers: number;
  currentPlayers: number;
  teams: SecretRealmTeam[];
  globalEvents: GlobalEvent[];
  isActive: boolean;
}

export interface Announcement {
  id: string;
  type: 'relic_found' | 'trade' | 'exhibition' | 'system';
  title: string;
  message: string;
  timestamp: number;
  rarity?: Rarity;
}

export interface Material {
  id: string;
  name: string;
  type: 'fragment' | 'adhesive' | 'polish' | 'tool';
  quality: number;
  amount: number;
  icon: string;
}
