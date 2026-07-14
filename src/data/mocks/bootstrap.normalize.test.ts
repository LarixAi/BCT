import { buildBootstrapPayload, normalizeBootstrapPayload } from "@/data/mocks/bootstrap";
import { describe, expect, it } from "vitest";

describe("normalizeBootstrapPayload", () => {
  it("back-fills tasks from older bootstrap caches", () => {
    const stale = buildBootstrapPayload("co_northwest", "dep_b3");
    const { tasks: _removed, schemaVersion: _v, ...withoutTasks } = stale;
    const normalized = normalizeBootstrapPayload(withoutTasks as typeof stale);
    expect(normalized.tasks.length).toBeGreaterThan(0);
    expect(normalized.schemaVersion).toBeGreaterThan(0);
  });
});
