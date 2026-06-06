import axios, { type AxiosRequestConfig } from 'axios';
import type {
  Player,
  Announcement,
  Material,
  TeamMember,
  Team,
  Ruin,
  Exploration,
  ExplorationEvent,
  Relic,
  Museum,
  MuseumHall,
  MarketListing,
  ApprovalRecord,
  RankingEntry,
  SecretRealm,
  SecretRealmTeam,
  ExhibitionMatch
} from '../types';

const BASE_URL = 'http://localhost:3001/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

async function apiFetch<T>(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      ...options
    });
    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    const message =
      axios.isAxiosError(error) && error.response?.data?.message
        ? error.response.data.message
        : error instanceof Error
          ? error.message
          : '请求失败';
    return {
      success: false,
      message
    };
  }
}

export const auth = {
  register: (username: string, email: string, password: string) =>
    apiFetch<{ token: string; user: Player }>('/auth/register', {
      method: 'POST',
      data: { username, email, password }
    }),

  login: (username: string, password: string) =>
    apiFetch<{ token: string; user: Player }>('/auth/login', {
      method: 'POST',
      data: { username, password }
    }),

  getMe: () => apiFetch<Player>('/auth/me', { method: 'GET' })
};

export const players = {
  getProfile: () => apiFetch<Player>('/players/profile', { method: 'GET' }),

  updateProfile: (data: Partial<Player>) =>
    apiFetch<Player>('/players/profile', {
      method: 'PUT',
      data
    }),

  getAnnouncements: () =>
    apiFetch<Announcement[]>('/players/announcements', { method: 'GET' }),

  getMaterials: () => apiFetch<Material[]>('/players/materials', { method: 'GET' }),

  addGold: (amount: number) =>
    apiFetch<{ gold: number }>('/players/gold', {
      method: 'POST',
      data: { amount }
    })
};

export const teams = {
  getMembers: () => apiFetch<TeamMember[]>('/teams/members', { method: 'GET' }),

  recruitMember: (memberId: string) =>
    apiFetch<TeamMember>('/teams/recruit', {
      method: 'POST',
      data: { memberId }
    }),

  getActiveTeam: () => apiFetch<Team>('/teams/active', { method: 'GET' }),

  updateActiveTeam: (teamId: string, memberIds: string[]) =>
    apiFetch<Team>('/teams/active', {
      method: 'PUT',
      data: { teamId, memberIds }
    })
};

export const ruins = {
  getAll: () => apiFetch<Ruin[]>('/ruins', { method: 'GET' }),

  getById: (id: string) => apiFetch<Ruin>(`/ruins/${id}`, { method: 'GET' })
};

export const explorations = {
  getHistory: () => apiFetch<Exploration[]>('/explorations/history', { method: 'GET' }),

  getCurrent: () => apiFetch<Exploration | null>('/explorations/current', { method: 'GET' }),

  start: (ruinId: string, teamId: string) =>
    apiFetch<Exploration>('/explorations/start', {
      method: 'POST',
      data: { ruinId, teamId }
    }),

  tick: () => apiFetch<Exploration>('/explorations/tick', { method: 'POST' }),

  resolveEvent: (eventId: string, choiceId: string) =>
    apiFetch<ExplorationEvent>('/explorations/resolve-event', {
      method: 'POST',
      data: { eventId, choiceId }
    }),

  complete: () => apiFetch<Exploration>('/explorations/complete', { method: 'POST' })
};

export const relics = {
  getList: () => apiFetch<Relic[]>('/relics', { method: 'GET' }),

  getById: (id: string) => apiFetch<Relic>(`/relics/${id}`, { method: 'GET' }),

  repair: (relicId: string, materials: { materialId: string; amount: number }[]) =>
    apiFetch<Relic>(`/relics/${relicId}/repair`, {
      method: 'POST',
      data: { materials }
    }),

  toggleMuseum: (relicId: string) =>
    apiFetch<Relic>(`/relics/${relicId}/toggle-museum`, {
      method: 'POST'
    })
};

export const museum = {
  get: () => apiFetch<Museum>('/museum', { method: 'GET' }),

  update: (data: Partial<Museum>) =>
    apiFetch<Museum>('/museum', {
      method: 'PUT',
      data
    }),

  addHall: (name: string, theme: MuseumHall['theme']) =>
    apiFetch<MuseumHall>('/museum/halls', {
      method: 'POST',
      data: { name, theme }
    }),

  upgradeHall: (hallId: string) =>
    apiFetch<MuseumHall>(`/museum/halls/${hallId}/upgrade`, {
      method: 'POST'
    }),

  updateLayout: (layout: Museum['layout']) =>
    apiFetch<Museum>('/museum/layout', {
      method: 'PUT',
      data: { layout }
    }),

  collectIncome: () =>
    apiFetch<{ income: number; gold: number }>('/museum/collect-income', {
      method: 'POST'
    }),

  getIncomeHistory: () =>
    apiFetch<Museum['incomeHistory']>('/museum/income-history', {
      method: 'GET'
    })
};

export const market = {
  getListings: () => apiFetch<MarketListing[]>('/market/listings', { method: 'GET' }),

  getMyListings: () => apiFetch<MarketListing[]>('/market/my-listings', { method: 'GET' }),

  createListing: (relicId: string, price: number) =>
    apiFetch<MarketListing>('/market/listings', {
      method: 'POST',
      data: { relicId, price }
    }),

  buyListing: (listingId: string) =>
    apiFetch<MarketListing>(`/market/listings/${listingId}/buy`, {
      method: 'POST'
    }),

  updatePrice: (listingId: string, price: number) =>
    apiFetch<MarketListing>(`/market/listings/${listingId}/price`, {
      method: 'PUT',
      data: { price }
    }),

  cancelListing: (listingId: string) =>
    apiFetch<MarketListing>(`/market/listings/${listingId}/cancel`, {
      method: 'POST'
    }),

  getApprovals: () => apiFetch<MarketListing[]>('/market/approvals', { method: 'GET' }),

  approveListing: (listingId: string, comment?: string) =>
    apiFetch<ApprovalRecord>(`/market/approvals/${listingId}/approve`, {
      method: 'POST',
      data: { comment }
    }),

  rejectListing: (listingId: string, comment?: string) =>
    apiFetch<ApprovalRecord>(`/market/approvals/${listingId}/reject`, {
      method: 'POST',
      data: { comment }
    })
};

export const rankings = {
  getRelicValue: () => apiFetch<RankingEntry[]>('/rankings/relic-value', { method: 'GET' }),

  getMuseumScore: () => apiFetch<RankingEntry[]>('/rankings/museum-score', { method: 'GET' }),

  getAchievement: () => apiFetch<RankingEntry[]>('/rankings/achievement', { method: 'GET' }),

  downloadReport: () => apiFetch<{ url: string }>('/rankings/report', { method: 'GET' })
};

export const secretRealm = {
  getCurrent: () => apiFetch<SecretRealm | null>('/secret-realm/current', { method: 'GET' }),

  join: (teamId: string) =>
    apiFetch<SecretRealmTeam>('/secret-realm/join', {
      method: 'POST',
      data: { teamId }
    }),

  leave: () => apiFetch<void>('/secret-realm/leave', { method: 'POST' }),

  tick: () => apiFetch<SecretRealm>('/secret-realm/tick', { method: 'POST' }),

  getLeaderboard: () =>
    apiFetch<SecretRealmTeam[]>('/secret-realm/leaderboard', { method: 'GET' })
};

export const exhibitions = {
  getCurrent: () => apiFetch<ExhibitionMatch | null>('/exhibitions/current', { method: 'GET' }),

  register: (relicIds: string[]) =>
    apiFetch<ExhibitionMatch>('/exhibitions/register', {
      method: 'POST',
      data: { relicIds }
    }),

  getMatch: (matchId: string) =>
    apiFetch<ExhibitionMatch>(`/exhibitions/${matchId}`, { method: 'GET' }),

  tickMatch: (matchId: string) =>
    apiFetch<ExhibitionMatch>(`/exhibitions/${matchId}/tick`, { method: 'POST' }),

  getHistory: () => apiFetch<ExhibitionMatch[]>('/exhibitions/history', { method: 'GET' })
};

export const api = {
  auth,
  players,
  teams,
  ruins,
  explorations,
  relics,
  museum,
  market,
  rankings,
  secretRealm,
  exhibitions
};

export default api;
