import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SecretRealm, SecretRealmTeam, GlobalEvent } from '../types';
import { generateId, getRandomInt, getRandomItem, deepClone } from '../utils/helpers';
import { usePlayerStore } from './playerStore';
import { useTeamStore } from './teamStore';

const createDefaultSecretRealm = (): SecretRealm => {
  const now = Date.now();
  const teams: SecretRealmTeam[] = [];
  const teamNames = ['铁血军团', '考古先锋队', '遗迹守护者', '黄金猎人', '神秘探险团'];
  const playerNamesList = ['勇者无敌', '探险王者', '古墓丽影', '文物专家', '历史学者'];

  for (let i = 0; i < 5; i++) {
    teams.push({
      teamId: generateId('realm-team'),
      playerId: generateId('player'),
      playerName: playerNamesList[i],
      progress: getRandomInt(0, 60),
      position: i + 1,
      relicsFound: getRandomInt(0, 5)
    });
  }

  return {
    id: 'realm-default',
    name: '失落的亚特兰蒂斯秘境',
    openTime: now - 3600000,
    closeTime: now + 7200000,
    maxPlayers: 50,
    currentPlayers: 15,
    teams,
    globalEvents: [],
    isActive: true
  };
};

interface SecretRealmState {
  secretRealm: SecretRealm;
  isParticipating: boolean;
  joinRealm: () => boolean;
  leaveRealm: () => void;
  updateTeamProgress: (teamId: string, progressDelta: number) => void;
  broadcastGlobalEvent: (type: GlobalEvent['type'], message: string) => void;
  tickRealm: () => void;
}

export const useSecretRealmStore = create<SecretRealmState>()(
  persist(
    (set, get) => ({
      secretRealm: createDefaultSecretRealm(),
      isParticipating: false,

      joinRealm: () => {
        const { secretRealm, isParticipating } = get();
        if (isParticipating) {
          return false;
        }
        if (!secretRealm.isActive) {
          return false;
        }
        if (secretRealm.currentPlayers >= secretRealm.maxPlayers) {
          return false;
        }

        const playerStore = usePlayerStore.getState();
        const teamStore = useTeamStore.getState();

        const newTeam: SecretRealmTeam = {
          teamId: teamStore.team.id,
          playerId: playerStore.player.id,
          playerName: playerStore.player.name,
          progress: 0,
          position: secretRealm.teams.length + 1,
          relicsFound: 0
        };

        set((state) => ({
          isParticipating: true,
          secretRealm: {
            ...state.secretRealm,
            currentPlayers: state.secretRealm.currentPlayers + 1,
            teams: [...state.secretRealm.teams, newTeam]
          }
        }));

        get().broadcastGlobalEvent('broadcast', `${playerStore.player.name} 加入了秘境探索！`);
        playerStore.addAnnouncement('system', {});
        return true;
      },

      leaveRealm: () => {
        const { secretRealm } = get();
        const playerStore = usePlayerStore.getState();
        const teamStore = useTeamStore.getState();

        set((state) => ({
          isParticipating: false,
          secretRealm: {
            ...state.secretRealm,
            currentPlayers: Math.max(0, state.secretRealm.currentPlayers - 1),
            teams: state.secretRealm.teams.filter((t) => t.playerId !== playerStore.player.id)
          }
        }));

        get().broadcastGlobalEvent('broadcast', `${playerStore.player.name} 离开了秘境。`);
      },

      updateTeamProgress: (teamId, progressDelta) => {
        set((state) => {
          const updatedTeams = state.secretRealm.teams
            .map((t) =>
              t.teamId === teamId
                ? { ...t, progress: Math.min(100, Math.max(0, t.progress + progressDelta)) }
                : t
            )
            .sort((a, b) => b.progress - a.progress)
            .map((t, index) => ({ ...t, position: index + 1 }));

          return {
            secretRealm: {
              ...state.secretRealm,
              teams: updatedTeams
            }
          };
        });
      },

      broadcastGlobalEvent: (type, message) => {
        const newEvent: GlobalEvent = {
          id: generateId('global-event'),
          timestamp: Date.now(),
          type,
          message
        };

        set((state) => ({
          secretRealm: {
            ...state.secretRealm,
            globalEvents: [newEvent, ...state.secretRealm.globalEvents].slice(0, 30)
          }
        }));
      },

      tickRealm: () => {
        const { secretRealm, isParticipating } = get();
        if (!secretRealm.isActive) {
          return;
        }

        const playerStore = usePlayerStore.getState();
        const teamStore = useTeamStore.getState();

        set((state) => {
          const updatedTeams = state.secretRealm.teams.map((t) => {
            const delta = getRandomInt(1, 5) * 0.1;
            const newProgress = Math.min(100, t.progress + delta);
            let newRelics = t.relicsFound;

            if (Math.random() < 0.01 && newProgress > 20) {
              newRelics += 1;
            }

            return {
              ...t,
              progress: newProgress,
              relicsFound: newRelics
            };
          });

          const sortedTeams = [...updatedTeams]
            .sort((a, b) => b.progress - a.progress)
            .map((t, index) => ({ ...t, position: index + 1 }));

          return {
            secretRealm: {
              ...state.secretRealm,
              teams: sortedTeams
            }
          };
        });

        if (isParticipating && Math.random() < 0.02) {
          const eventTypes: GlobalEvent['type'][] = ['broadcast', 'boss', 'treasure_horde'];
          const type = getRandomItem(eventTypes);

          let message = '';
          switch (type) {
            case 'boss':
              message = '⚠️ 秘境守护者出现了！击败它可获得丰厚奖励！';
              break;
            case 'treasure_horde':
              message = '💎 发现了秘藏宝藏区域！快去探索吧！';
              break;
            default:
              message = '📢 秘境探索正在激烈进行中！';
          }

          get().broadcastGlobalEvent(type, message);
        }

        const myTeam = secretRealm.teams.find((t) => t.playerId === playerStore.player.id);
        if (myTeam && myTeam.progress >= 100) {
          const reward = getRandomInt(500, 2000);
          playerStore.addGold(reward);
          playerStore.addExp(100);
          playerStore.addAnnouncement('system', {});
        }
      }
    }),
    {
      name: 'secret-realm-store'
    }
  )
);
