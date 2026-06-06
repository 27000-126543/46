import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Player, Announcement, Material } from '../types';
import { baseMaterials, gameConfig } from '../data/config';
import { generateId, deepClone } from '../utils/helpers';
import { generateAnnouncement } from '../utils/generators';

const defaultPlayer: Player = {
  id: 'player-default',
  name: '考古学家',
  avatar: '🧑‍🔬',
  level: 1,
  exp: 0,
  gold: 5000,
  gems: 100,
  totalRelicValue: 0,
  museumScore: 0
};

interface PlayerState {
  player: Player;
  announcements: Announcement[];
  materials: Material[];
  updatePlayer: (updates: Partial<Player>) => void;
  addGold: (amount: number) => void;
  spendGold: (amount: number) => boolean;
  addExp: (amount: number) => void;
  addAnnouncement: (type: Announcement['type'], data?: Record<string, unknown>) => void;
  addMaterial: (material: Material) => void;
  useMaterial: (materialId: string, amount: number) => boolean;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      player: defaultPlayer,
      announcements: [],
      materials: deepClone(baseMaterials),

      updatePlayer: (updates) => set((state) => ({
        player: { ...state.player, ...updates }
      })),

      addGold: (amount) => set((state) => ({
        player: { ...state.player, gold: state.player.gold + amount }
      })),

      spendGold: (amount) => {
        const { player } = get();
        if (player.gold >= amount) {
          set((state) => ({
            player: { ...state.player, gold: state.player.gold - amount }
          }));
          return true;
        }
        return false;
      },

      addExp: (amount) => {
        const { player } = get();
        let newExp = player.exp + amount;
        let newLevel = player.level;
        let expNeeded = gameConfig.expPerLevel * Math.pow(gameConfig.levelExpMultiplier, newLevel - 1);

        while (newExp >= expNeeded && newLevel < gameConfig.maxLevel) {
          newExp -= expNeeded;
          newLevel += 1;
          expNeeded = gameConfig.expPerLevel * Math.pow(gameConfig.levelExpMultiplier, newLevel - 1);
          get().addAnnouncement('system', {});
        }

        set((state) => ({
          player: {
            ...state.player,
            exp: newExp,
            level: newLevel
          }
        }));
      },

      addAnnouncement: (type, data = {}) => {
        const { player } = get();
        const announcement = generateAnnouncement(type, {
          player: player.name,
          ...data
        } as Parameters<typeof generateAnnouncement>[1]);
        set((state) => ({
          announcements: [announcement, ...state.announcements].slice(0, 50)
        }));
      },

      addMaterial: (material) => set((state) => {
        const existing = state.materials.find((m) => m.id === material.id);
        if (existing) {
          return {
            materials: state.materials.map((m) =>
              m.id === material.id ? { ...m, amount: m.amount + material.amount } : m
            )
          };
        }
        return {
          materials: [...state.materials, { ...material, id: material.id || generateId('material') }]
        };
      }),

      useMaterial: (materialId, amount) => {
        const { materials } = get();
        const material = materials.find((m) => m.id === materialId);
        if (material && material.amount >= amount) {
          set((state) => ({
            materials: state.materials.map((m) =>
              m.id === materialId ? { ...m, amount: m.amount - amount } : m
            )
          }));
          return true;
        }
        return false;
      }
    }),
    {
      name: 'player-store'
    }
  )
);
