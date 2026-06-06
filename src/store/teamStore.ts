import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TeamMember, Team, Profession, Rarity } from '../types';
import { teamMembers } from '../data/members';
import { gameConfig, rarityWeight } from '../data/config';
import { generateId, rarityWeightedRandom, deepClone } from '../utils/helpers';
import { generateTeamMember } from '../utils/generators';
import { usePlayerStore } from './playerStore';

const initialMembers = deepClone([
  teamMembers.find((m) => m.profession === 'explorer')!,
  teamMembers.find((m) => m.profession === 'linguist')!,
  teamMembers.find((m) => m.profession === 'engineer')!,
  teamMembers.find((m) => m.profession === 'archaeologist')!
]);

const initialTeam: Team = {
  id: 'team-default',
  name: '考古先锋队',
  memberIds: initialMembers.map((m) => m.id),
  active: true
};

interface TeamState {
  members: TeamMember[];
  team: Team;
  addMember: (member: TeamMember) => void;
  removeMember: (memberId: string) => void;
  setActiveTeam: (teamId: string) => void;
  addToTeam: (memberId: string) => boolean;
  removeFromTeam: (memberId: string) => boolean;
  recruitMember: (profession?: Profession) => TeamMember | null;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set, get) => ({
      members: initialMembers,
      team: initialTeam,

      addMember: (member) => set((state) => ({
        members: [...state.members, member]
      })),

      removeMember: (memberId) => set((state) => ({
        members: state.members.filter((m) => m.id !== memberId),
        team: {
          ...state.team,
          memberIds: state.team.memberIds.filter((id) => id !== memberId)
        }
      })),

      setActiveTeam: () => set((state) => ({
        team: { ...state.team, active: true }
      })),

      addToTeam: (memberId) => {
        const { team } = get();
        if (team.memberIds.length >= gameConfig.maxTeamSize) {
          return false;
        }
        if (team.memberIds.includes(memberId)) {
          return false;
        }
        set((state) => ({
          team: {
            ...state.team,
            memberIds: [...state.team.memberIds, memberId]
          }
        }));
        return true;
      },

      removeFromTeam: (memberId) => {
        const { team } = get();
        if (team.memberIds.length <= gameConfig.minTeamSize) {
          return false;
        }
        set((state) => ({
          team: {
            ...state.team,
            memberIds: state.team.memberIds.filter((id) => id !== memberId)
          }
        }));
        return true;
      },

      recruitMember: (profession) => {
        const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
        const targetRarity = rarityWeightedRandom(rarities, [
          rarityWeight.common,
          rarityWeight.rare,
          rarityWeight.epic,
          rarityWeight.legendary
        ]);

        const recruitCost: Record<Rarity, number> = {
          common: 500,
          rare: 2000,
          epic: 8000,
          legendary: 30000
        };

        const cost = recruitCost[targetRarity];
        const playerStore = usePlayerStore.getState();

        if (!playerStore.spendGold(cost)) {
          return null;
        }

        const newMember = generateTeamMember(profession, targetRarity);
        newMember.id = generateId('member');

        set((state) => ({
          members: [...state.members, newMember]
        }));

        playerStore.addAnnouncement('system', {});

        return newMember;
      }
    }),
    {
      name: 'team-store'
    }
  )
);
