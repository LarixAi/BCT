import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BARRIER_PERSPECTIVES,
  SAY_OR_DO_SCENARIOS,
  type PcjTrainingModuleId,
} from "@/domain/passenger/passenger-training";
import { loadLegacyViewedBarrierIds } from "@/domain/passenger/passenger-barriers";

export interface TrainingProgress {
  viewedBarrierIds: string[];
  angieBadJourneyCompleted: boolean;
  completedScenarioIds: string[];
  completedAt: Partial<Record<PcjTrainingModuleId, string>>;
}

const EMPTY_PROGRESS: TrainingProgress = {
  viewedBarrierIds: [],
  angieBadJourneyCompleted: false,
  completedScenarioIds: [],
  completedAt: {},
};

interface TrainingStore {
  progress: TrainingProgress;
  markBarrierViewed: (id: string) => void;
  completeAngieBadJourney: () => void;
  completeScenario: (id: string) => void;
  moduleStatus: (moduleId: PcjTrainingModuleId) => "not_started" | "in_progress" | "completed";
  resetProgress: () => void;
}

function uniquePush(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set, get) => ({
      progress: EMPTY_PROGRESS,

      markBarrierViewed: (id) =>
        set((state) => {
          const viewedBarrierIds = uniquePush(state.progress.viewedBarrierIds, id);
          const barriersComplete = viewedBarrierIds.length >= BARRIER_PERSPECTIVES.length;
          return {
            progress: {
              ...state.progress,
              viewedBarrierIds,
              completedAt: barriersComplete
                ? { ...state.progress.completedAt, barriers: new Date().toISOString() }
                : state.progress.completedAt,
            },
          };
        }),

      completeAngieBadJourney: () =>
        set((state) => ({
          progress: {
            ...state.progress,
            angieBadJourneyCompleted: true,
            completedAt: {
              ...state.progress.completedAt,
              angie_bad_journey: new Date().toISOString(),
            },
          },
        })),

      completeScenario: (id) =>
        set((state) => {
          const completedScenarioIds = uniquePush(state.progress.completedScenarioIds, id);
          const scenariosComplete = completedScenarioIds.length >= SAY_OR_DO_SCENARIOS.length;
          return {
            progress: {
              ...state.progress,
              completedScenarioIds,
              completedAt: scenariosComplete
                ? { ...state.progress.completedAt, say_or_do: new Date().toISOString() }
                : state.progress.completedAt,
            },
          };
        }),

      moduleStatus: (moduleId) => {
        const { progress } = get();
        switch (moduleId) {
          case "barriers": {
            if (progress.viewedBarrierIds.length >= BARRIER_PERSPECTIVES.length) return "completed";
            if (progress.viewedBarrierIds.length > 0) return "in_progress";
            return "not_started";
          }
          case "angie_bad_journey":
            return progress.angieBadJourneyCompleted ? "completed" : "not_started";
          case "say_or_do": {
            if (progress.completedScenarioIds.length >= SAY_OR_DO_SCENARIOS.length) return "completed";
            if (progress.completedScenarioIds.length > 0) return "in_progress";
            return "not_started";
          }
          default:
            return "not_started";
        }
      },

      resetProgress: () => set({ progress: EMPTY_PROGRESS }),
    }),
    {
      name: "veyvio-driver-training",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ progress: state.progress }),
      merge: (persisted, current) => {
        const merged = {
          ...current,
          ...(persisted as Partial<TrainingStore>),
        };
        const legacy = loadLegacyViewedBarrierIds();
        if (legacy.length > 0 && merged.progress.viewedBarrierIds.length === 0) {
          merged.progress = {
            ...merged.progress,
            viewedBarrierIds: legacy,
          };
        }
        return merged;
      },
    },
  ),
);
