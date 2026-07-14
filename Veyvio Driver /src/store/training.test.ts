import { describe, expect, it, beforeEach } from "vitest";
import { useTrainingStore } from "@/store/training";
import { BARRIER_PERSPECTIVES, SAY_OR_DO_SCENARIOS } from "@/domain/passenger/passenger-training";

describe("training store", () => {
  beforeEach(() => {
    useTrainingStore.getState().resetProgress();
  });

  it("tracks barrier module completion", () => {
    for (const perspective of BARRIER_PERSPECTIVES) {
      useTrainingStore.getState().markBarrierViewed(perspective.id);
    }
    expect(useTrainingStore.getState().moduleStatus("barriers")).toBe("completed");
  });

  it("tracks say-or-do scenario completion", () => {
    useTrainingStore.getState().completeScenario(SAY_OR_DO_SCENARIOS[0]!.id);
    expect(useTrainingStore.getState().moduleStatus("say_or_do")).toBe("in_progress");
  });

  it("tracks angie bad journey completion", () => {
    useTrainingStore.getState().completeAngieBadJourney();
    expect(useTrainingStore.getState().progress.angieBadJourneyCompleted).toBe(true);
    expect(useTrainingStore.getState().moduleStatus("angie_bad_journey")).toBe("completed");
  });
});
