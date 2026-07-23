import {
  buildLiveBootstrapShell,
  buildBootstrapPayload,
  COMMAND_HUB_BOOTSTRAP_SOURCE,
  normalizeBootstrapPayload,
} from "@/data/mocks/bootstrap";
import { describe, expect, it } from "vitest";

describe("normalizeBootstrapPayload", () => {
  it("back-fills tasks from older bootstrap caches", () => {
    const stale = buildBootstrapPayload("co_northwest", "dep_b3");
    const { tasks: _removed, schemaVersion: _v, ...withoutTasks } = stale;
    const normalized = normalizeBootstrapPayload(withoutTasks as typeof stale);
    expect(normalized.tasks.length).toBeGreaterThan(0);
    expect(normalized.schemaVersion).toBeGreaterThan(0);
  });

  it("back-fills operationalPlan when missing from older caches", () => {
    const stale = buildBootstrapPayload("co_northwest", "dep_b3");
    const { operationalPlan: _plan, ...withoutPlan } = stale;
    const normalized = normalizeBootstrapPayload(withoutPlan as typeof stale);
    expect(normalized.operationalPlan).not.toBeNull();
    expect(normalized.operationalPlan?.staging.length).toBeGreaterThan(0);
  });

  it("does not inject demo plan or tasks for command-hub payloads", () => {
    const live = buildLiveBootstrapShell("co_live", "dep_live");
    const normalized = normalizeBootstrapPayload({
      ...live,
      tasks: [{ id: "t1", title: "Move AB12", kind: "move", priority: "Normal", status: "open", createdAt: "2026-01-01", createdBy: "admin" }],
    });
    expect(normalized.dataSource).toBe(COMMAND_HUB_BOOTSTRAP_SOURCE);
    expect(normalized.operationalPlan).toBeNull();
    expect(normalized.tasks).toHaveLength(1);
    expect(normalized.trips).toHaveLength(0);
  });
});
