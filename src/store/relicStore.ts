import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Relic, Material, TeamMember, RepairRecord } from '../types';
import { relics } from '../data/relics';
import { gameConfig } from '../data/config';
import { generateId, deepClone, getRandomInt } from '../utils/helpers';
import { calculateRepairSuccessRate } from '../utils/calculators';
import { usePlayerStore } from './playerStore';
import { useTeamStore } from './teamStore';

const initialRelics = deepClone([
  relics.find((r) => r.rarity === 'common')!,
  relics.find((r) => r.rarity === 'rare')!,
  relics.find((r) => r.rarity === 'epic')!,
  relics.find((r) => r.rarity === 'legendary')!,
  relics.find((r) => r.rarity === 'rare' && r.id !== (relics.find((r) => r.rarity === 'rare')?.id || ''))!
]);

interface RelicState {
  relics: Relic[];
  selectedRelic: Relic | null;
  addRelic: (relic: Relic) => void;
  removeRelic: (relicId: string) => void;
  selectRelic: (relicId: string | null) => void;
  repairRelic: (relicId: string, materials: Material[]) => boolean;
  setInMuseum: (relicId: string, inMuseum: boolean) => void;
  setOnMarket: (relicId: string, onMarket: boolean) => void;
}

export const useRelicStore = create<RelicState>()(
  persist(
    (set, get) => ({
      relics: initialRelics,
      selectedRelic: null,

      addRelic: (relic) => set((state) => {
        const exists = state.relics.some((r) => r.id === relic.id);
        if (exists) {
          return state;
        }
        return {
          relics: [...state.relics, { ...relic, id: relic.id || generateId('relic') }]
        };
      }),

      removeRelic: (relicId) => set((state) => ({
        relics: state.relics.filter((r) => r.id !== relicId),
        selectedRelic: state.selectedRelic?.id === relicId ? null : state.selectedRelic
      })),

      selectRelic: (relicId) => {
        if (!relicId) {
          set({ selectedRelic: null });
          return;
        }
        const { relics } = get();
        const relic = relics.find((r) => r.id === relicId) || null;
        set({ selectedRelic: relic });
      },

      repairRelic: (relicId, materials) => {
        const { relics } = get();
        const relic = relics.find((r) => r.id === relicId);
        if (!relic || relic.completeness >= 100) {
          return false;
        }

        const playerStore = usePlayerStore.getState();
        const teamStore = useTeamStore.getState();
        const teamMembers = teamStore.members.filter((m) =>
          teamStore.team.memberIds.includes(m.id)
        );

        const repairCost = gameConfig.repairBaseCost * materials.reduce(
          (sum, m) => sum + m.amount * Math.pow(gameConfig.repairQualityMultiplier, m.quality - 1),
          0
        );

        if (!playerStore.spendGold(Math.round(repairCost))) {
          return false;
        }

        for (const mat of materials) {
          if (!playerStore.useMaterial(mat.id, mat.amount)) {
            playerStore.addGold(Math.round(repairCost));
            return false;
          }
        }

        const { successRate, expectedCompletenessGain } = calculateRepairSuccessRate(
          relic.completeness,
          materials,
          teamMembers
        );

        const success = Math.random() < successRate;
        const completenessGain = success
          ? expectedCompletenessGain + getRandomInt(-2, 5)
          : Math.max(0, getRandomInt(-3, 2));

        const newCompleteness = Math.min(100, Math.max(0, relic.completeness + completenessGain));

        const repairRecord: RepairRecord = {
          id: generateId('repair'),
          timestamp: Date.now(),
          success,
          materialsUsed: materials.map((m) => ({
            type: m.type,
            quality: m.quality,
            amount: m.amount
          })),
          completenessBefore: relic.completeness,
          completenessAfter: newCompleteness
        };

        set((state) => ({
          relics: state.relics.map((r) =>
            r.id === relicId
              ? {
                  ...r,
                  completeness: newCompleteness,
                  repairHistory: [...r.repairHistory, repairRecord]
                }
              : r
          ),
          selectedRelic: state.selectedRelic?.id === relicId
            ? {
                ...state.selectedRelic,
                completeness: newCompleteness,
                repairHistory: [...state.selectedRelic.repairHistory, repairRecord]
              }
            : state.selectedRelic
        }));

        if (success) {
          playerStore.addAnnouncement('system', {});
        }

        return success;
      },

      setInMuseum: (relicId, inMuseum) => set((state) => ({
        relics: state.relics.map((r) =>
          r.id === relicId ? { ...r, inMuseum, onMarket: inMuseum ? false : r.onMarket } : r
        ),
        selectedRelic: state.selectedRelic?.id === relicId
          ? { ...state.selectedRelic, inMuseum, onMarket: inMuseum ? false : state.selectedRelic.onMarket }
          : state.selectedRelic
      })),

      setOnMarket: (relicId, onMarket) => set((state) => ({
        relics: state.relics.map((r) =>
          r.id === relicId ? { ...r, onMarket, inMuseum: onMarket ? false : r.inMuseum } : r
        ),
        selectedRelic: state.selectedRelic?.id === relicId
          ? { ...state.selectedRelic, onMarket, inMuseum: onMarket ? false : state.selectedRelic.inMuseum }
          : state.selectedRelic
      }))
    }),
    {
      name: 'relic-store'
    }
  )
);
