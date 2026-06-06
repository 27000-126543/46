import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Exploration, ExplorationEvent, Ruin, EventChoice, Relic } from '../types';
import { ruins } from '../data/ruins';
import { explorationEvents } from '../data/events';
import { relics } from '../data/relics';
import { generateId, getRandomItem, getRandomInt, deepClone } from '../utils/helpers';
import { generateRandomEvent, generateRelic } from '../utils/generators';
import { calculateExplorationSpeed, calculateRelicDiscoveryRate } from '../utils/calculators';
import { usePlayerStore } from './playerStore';
import { useTeamStore } from './teamStore';

interface ExplorationState {
  currentExploration: Exploration | null;
  explorations: Exploration[];
  startExploration: (ruinId: string) => boolean;
  updateProgress: (delta: number) => void;
  triggerEvent: () => void;
  resolveEvent: (eventId: string, choiceId: string) => void;
  completeExploration: () => void;
  cancelExploration: () => void;
  tick: () => void;
}

export const useExplorationStore = create<ExplorationState>()(
  persist(
    (set, get) => ({
      currentExploration: null,
      explorations: [],

      startExploration: (ruinId) => {
        const { currentExploration } = get();
        if (currentExploration) {
          return false;
        }

        const ruin = ruins.find((r) => r.id === ruinId);
        if (!ruin) {
          return false;
        }

        const playerStore = usePlayerStore.getState();
        if (playerStore.player.level < ruin.minLevel) {
          return false;
        }

        const teamStore = useTeamStore.getState();
        if (teamStore.team.memberIds.length === 0) {
          return false;
        }

        const newExploration: Exploration = {
          id: generateId('exploration'),
          playerId: playerStore.player.id,
          ruinId,
          teamId: teamStore.team.id,
          progress: 0,
          status: 'exploring',
          startTime: Date.now(),
          eventsTriggered: [],
          relicsFound: []
        };

        set({ currentExploration: newExploration });
        playerStore.addAnnouncement('system', {});
        return true;
      },

      updateProgress: (delta) => {
        const { currentExploration } = get();
        if (!currentExploration || currentExploration.status !== 'exploring') {
          return;
        }

        const newProgress = Math.min(100, currentExploration.progress + delta);
        set((state) => ({
          currentExploration: state.currentExploration
            ? { ...state.currentExploration, progress: newProgress }
            : null
        }));

        if (newProgress >= 100) {
          get().completeExploration();
        }
      },

      triggerEvent: () => {
        const { currentExploration } = get();
        if (!currentExploration || currentExploration.status !== 'exploring') {
          return;
        }

        const ruin = ruins.find((r) => r.id === currentExploration.ruinId);
        if (!ruin) {
          return;
        }

        const poolEvents = ruin.eventPool
          .map((id) => explorationEvents.find((e) => e.id === id))
          .filter((e): e is ExplorationEvent => !!e);

        const event = poolEvents.length > 0
          ? generateRandomEvent(poolEvents)
          : generateRandomEvent(explorationEvents);

        set((state) => ({
          currentExploration: state.currentExploration
            ? {
                ...state.currentExploration,
                eventsTriggered: [...state.currentExploration.eventsTriggered, event]
              }
            : null
        }));
      },

      resolveEvent: (eventId, choiceId) => {
        const { currentExploration } = get();
        if (!currentExploration) {
          return;
        }

        const event = currentExploration.eventsTriggered.find((e) => e.id === eventId);
        if (!event || event.resolved) {
          return;
        }

        const choice = event.choices.find((c) => c.id === choiceId);
        if (!choice) {
          return;
        }

        const teamStore = useTeamStore.getState();
        const teamMembers = teamStore.members.filter((m) =>
          currentExploration.teamId === teamStore.team.id
            ? teamStore.team.memberIds.includes(m.id)
            : true
        );

        let successRate = choice.successRate;
        if (choice.requiredSkill) {
          const hasSkill = teamMembers.some(
            (m) => m.profession === choice.requiredSkill!.profession && m.skillLevel >= choice.requiredSkill!.minLevel
          );
          if (!hasSkill) {
            successRate *= 0.5;
          }
        }

        const success = Math.random() < successRate;
        const playerStore = usePlayerStore.getState();
        const effects = choice.effects;

        let progressDelta = 0;
        let goldDelta = 0;
        let foundRelic: Relic | null = null;

        if (success) {
          if (effects.progressChange) progressDelta += effects.progressChange;
          if (effects.goldChange) goldDelta += effects.goldChange;
          if (effects.findRelic) {
            const ruin = ruins.find((r) => r.id === currentExploration.ruinId);
            if (ruin) {
              const potentialRelicIds = ruin.potentialRelics;
              const existingRelics = potentialRelicIds
                .map((id) => relics.find((r) => r.id === id))
                .filter((r): r is Relic => !!r);

              if (existingRelics.length > 0) {
                foundRelic = deepClone(getRandomItem(existingRelics));
                foundRelic.id = generateId('relic');
                foundRelic.discoveredAt = Date.now();
              }
            }
          }
        } else {
          if (effects.damage) {
            goldDelta -= getRandomInt(50, 200);
          }
          progressDelta -= 5;
        }

        const result = {
          success,
          message: success ? '成功！' : '失败...',
          effects
        };

        if (goldDelta !== 0) {
          if (goldDelta > 0) {
            playerStore.addGold(goldDelta);
          } else {
            playerStore.spendGold(Math.abs(goldDelta));
          }
        }

        set((state) => ({
          currentExploration: state.currentExploration
            ? {
                ...state.currentExploration,
                progress: Math.max(0, Math.min(100, state.currentExploration.progress + progressDelta)),
                eventsTriggered: state.currentExploration.eventsTriggered.map((e) =>
                  e.id === eventId ? { ...e, resolved: true, result } : e
                ),
                relicsFound: foundRelic
                  ? [...state.currentExploration.relicsFound, foundRelic.id]
                  : state.currentExploration.relicsFound
              }
            : null
        }));

        if (foundRelic) {
          playerStore.addAnnouncement('relic_found', {
            relic: foundRelic.name,
            rarity: foundRelic.rarity
          });
        }
      },

      completeExploration: () => {
        const { currentExploration, explorations } = get();
        if (!currentExploration) {
          return;
        }

        const ruin = ruins.find((r) => r.id === currentExploration.ruinId);
        const playerStore = usePlayerStore.getState();

        if (ruin) {
          const goldReward = getRandomInt(ruin.rewards.goldMin, ruin.rewards.goldMax);
          playerStore.addGold(goldReward);
          playerStore.addExp(ruin.rewards.exp);

          const teamStore = useTeamStore.getState();
          const teamMembers = teamStore.members.filter((m) =>
            teamStore.team.memberIds.includes(m.id)
          );

          const { rate } = calculateRelicDiscoveryRate(teamMembers, 100, ruin.difficulty);
          if (Math.random() < rate) {
            const relicTemplatePool: { id: string; name: string; civilization: typeof ruin.civilization; baseValue: number; description: string; image: string }[] = [];
            const foundRelic = generateRelic(relicTemplatePool, ruin.civilization);
            currentExploration.relicsFound.push(foundRelic.id);
            playerStore.addAnnouncement('relic_found', {
              relic: foundRelic.name,
              rarity: foundRelic.rarity
            });
          }
        }

        const completedExploration: Exploration = {
          ...currentExploration,
          status: 'completed'
        };

        set({
          currentExploration: null,
          explorations: [completedExploration, ...explorations]
        });
      },

      cancelExploration: () => {
        const { currentExploration, explorations } = get();
        if (!currentExploration) {
          return;
        }

        const cancelledExploration: Exploration = {
          ...currentExploration,
          status: 'failed'
        };

        set({
          currentExploration: null,
          explorations: [cancelledExploration, ...explorations]
        });
      },

      tick: () => {
        const { currentExploration } = get();
        if (!currentExploration || currentExploration.status !== 'exploring') {
          return;
        }

        const ruin = ruins.find((r) => r.id === currentExploration.ruinId);
        if (!ruin) {
          return;
        }

        const teamStore = useTeamStore.getState();
        const teamMembers = teamStore.members.filter((m) =>
          teamStore.team.memberIds.includes(m.id)
        );

        const speed = calculateExplorationSpeed(teamMembers, ruin.difficulty, ruin.estimatedTime);
        get().updateProgress(speed);

        const pendingEvents = currentExploration.eventsTriggered.filter((e) => !e.resolved);
        if (pendingEvents.length === 0 && Math.random() < 0.02) {
          get().triggerEvent();
        }

        const { rate } = calculateRelicDiscoveryRate(
          teamMembers,
          currentExploration.progress,
          ruin.difficulty
        );

        if (Math.random() < rate * 0.1) {
          const potentialRelicIds = ruin.potentialRelics;
          const existingRelics = potentialRelicIds
            .map((id) => relics.find((r) => r.id === id))
            .filter((r): r is Relic => !!r);

          if (existingRelics.length > 0) {
            const foundRelic = deepClone(getRandomItem(existingRelics));
            foundRelic.id = generateId('relic');
            foundRelic.discoveredAt = Date.now();

            const playerStore = usePlayerStore.getState();
            playerStore.addAnnouncement('relic_found', {
              relic: foundRelic.name,
              rarity: foundRelic.rarity
            });

            set((state) => ({
              currentExploration: state.currentExploration
                ? {
                    ...state.currentExploration,
                    relicsFound: [...state.currentExploration.relicsFound, foundRelic.id]
                  }
                : null
            }));
          }
        }
      }
    }),
    {
      name: 'exploration-store'
    }
  )
);
