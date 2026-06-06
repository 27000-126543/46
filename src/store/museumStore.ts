import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Museum, MuseumHall, LayoutSlot, Civilization, Relic } from '../types';
import { gameConfig } from '../data/config';
import { generateId, formatDate, deepClone } from '../utils/helpers';
import { calculateMuseumAttractiveness, calculateTicketIncome } from '../utils/calculators';
import { usePlayerStore } from './playerStore';
import { useRelicStore } from './relicStore';

const createDefaultLayout = (): LayoutSlot[][] => {
  const rows = 4;
  const cols = 6;
  const layout: LayoutSlot[][] = [];

  for (let r = 0; r < rows; r++) {
    const row: LayoutSlot[] = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        row.push({ type: 'path', position: { row: r, col: c } });
      } else if (r === 1 && (c === 2 || c === 3)) {
        row.push({ type: 'display', position: { row: r, col: c }, bonus: 1.1 });
      } else {
        row.push({ type: 'empty', position: { row: r, col: c } });
      }
    }
    layout.push(row);
  }

  return layout;
};

const defaultHall: MuseumHall = {
  id: 'hall-default',
  name: '主展厅',
  theme: 'mixed',
  capacity: 5,
  displayedRelics: [],
  bonusMultiplier: 1.0,
  level: 1
};

const defaultMuseum: Museum = {
  id: 'museum-default',
  playerId: 'player-default',
  name: '我的私人博物馆',
  level: 1,
  attractiveness: 50,
  dailyIncome: 0,
  totalVisitors: 0,
  halls: [defaultHall],
  layout: createDefaultLayout(),
  incomeHistory: []
};

interface MuseumState {
  museum: Museum;
  updateMuseum: (updates: Partial<Museum>) => void;
  addHall: (name: string, theme: Civilization | 'mixed') => boolean;
  upgradeHall: (hallId: string) => boolean;
  placeRelic: (hallId: string, relicId: string) => boolean;
  removeRelic: (hallId: string, relicId: string) => boolean;
  updateIncome: () => void;
  collectIncome: () => number;
}

export const useMuseumStore = create<MuseumState>()(
  persist(
    (set, get) => ({
      museum: defaultMuseum,

      updateMuseum: (updates) => set((state) => ({
        museum: { ...state.museum, ...updates }
      })),

      addHall: (name, theme) => {
        const { museum } = get();
        const playerStore = usePlayerStore.getState();
        const cost = 10000 * Math.pow(2, museum.halls.length - 1);

        if (!playerStore.spendGold(cost)) {
          return false;
        }

        const newHall: MuseumHall = {
          id: generateId('hall'),
          name,
          theme,
          capacity: 5,
          displayedRelics: [],
          bonusMultiplier: 1.0,
          level: 1
        };

        set((state) => ({
          museum: {
            ...state.museum,
            halls: [...state.museum.halls, newHall]
          }
        }));

        playerStore.addAnnouncement('system', {});
        return true;
      },

      upgradeHall: (hallId) => {
        const { museum } = get();
        const hall = museum.halls.find((h) => h.id === hallId);
        if (!hall) {
          return false;
        }

        const playerStore = usePlayerStore.getState();
        const cost = 5000 * Math.pow(2, hall.level - 1);

        if (!playerStore.spendGold(cost)) {
          return false;
        }

        set((state) => ({
          museum: {
            ...state.museum,
            halls: state.museum.halls.map((h) =>
              h.id === hallId
                ? {
                    ...h,
                    level: h.level + 1,
                    capacity: h.capacity + 2,
                    bonusMultiplier: h.bonusMultiplier + 0.1
                  }
                : h
            )
          }
        }));

        get().updateIncome();
        return true;
      },

      placeRelic: (hallId, relicId) => {
        const { museum } = get();
        const hall = museum.halls.find((h) => h.id === hallId);
        if (!hall) {
          return false;
        }

        if (hall.displayedRelics.length >= hall.capacity) {
          return false;
        }

        if (hall.displayedRelics.includes(relicId)) {
          return false;
        }

        const relicStore = useRelicStore.getState();
        const relic = relicStore.relics.find((r) => r.id === relicId);
        if (!relic || relic.inMuseum || relic.onMarket) {
          return false;
        }

        relicStore.setInMuseum(relicId, true);

        set((state) => ({
          museum: {
            ...state.museum,
            halls: state.museum.halls.map((h) =>
              h.id === hallId
                ? { ...h, displayedRelics: [...h.displayedRelics, relicId] }
                : h
            )
          }
        }));

        get().updateIncome();
        return true;
      },

      removeRelic: (hallId, relicId) => {
        const relicStore = useRelicStore.getState();
        const relic = relicStore.relics.find((r) => r.id === relicId);
        if (!relic) {
          return false;
        }

        relicStore.setInMuseum(relicId, false);

        set((state) => ({
          museum: {
            ...state.museum,
            halls: state.museum.halls.map((h) =>
              h.id === hallId
                ? { ...h, displayedRelics: h.displayedRelics.filter((id) => id !== relicId) }
                : h
            )
          }
        }));

        get().updateIncome();
        return true;
      },

      updateIncome: () => {
        const { museum } = get();
        const relicStore = useRelicStore.getState();

        let totalAttractiveness = 0;

        for (const hall of museum.halls) {
          const displayedRelics = hall.displayedRelics
            .map((id) => relicStore.relics.find((r) => r.id === id))
            .filter((r): r is Relic => !!r);

          const { attractiveness } = calculateMuseumAttractiveness(
            displayedRelics,
            hall.level,
            hall.theme
          );

          totalAttractiveness += attractiveness * hall.bonusMultiplier;
        }

        const { income, estimatedVisitors } = calculateTicketIncome(
          totalAttractiveness,
          museum.level * 5
        );

        set((state) => ({
          museum: {
            ...state.museum,
            attractiveness: Math.round(totalAttractiveness),
            dailyIncome: income,
            totalVisitors: state.museum.totalVisitors + estimatedVisitors
          }
        }));
      },

      collectIncome: () => {
        const { museum } = get();
        const playerStore = usePlayerStore.getState();

        if (museum.dailyIncome <= 0) {
          return 0;
        }

        playerStore.addGold(museum.dailyIncome);

        const today = formatDate(Date.now());
        const historyEntry = { date: today, income: museum.dailyIncome };

        set((state) => ({
          museum: {
            ...state.museum,
            dailyIncome: 0,
            incomeHistory: [...state.museum.incomeHistory, historyEntry].slice(-30)
          }
        }));

        playerStore.addAnnouncement('system', {});
        return museum.dailyIncome;
      }
    }),
    {
      name: 'museum-store'
    }
  )
);
