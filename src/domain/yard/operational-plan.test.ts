import { describe, expect, it } from "vitest";
import { buildDemoOperationalPlan } from "@/data/plan-fixtures";
import {
  acknowledgePlan,
  buildPrepTasksFromPlan,
  canAcknowledgePlan,
  planHeadline,
  stagingSorted,
} from "@/domain/yard/operational-plan";

describe("operational-plan", () => {
  const plan = buildDemoOperationalPlan("co_northwest", "dep_b3", "2026-07-23");

  it("sorts staging by sequence", () => {
    const shuffled = {
      ...plan,
      staging: [...plan.staging].reverse(),
    };
    expect(stagingSorted(shuffled).map(s => s.sequence)).toEqual([1, 2, 3, 4, 5]);
  });

  it("creates prep tasks from published staging without duplicates", () => {
    let id = 0;
    const first = buildPrepTasksFromPlan(plan, [], "J. Miller", () => `task_${++id}`);
    expect(first.length).toBe(5);
    expect(first[0].title).toContain("MX72 BVK");
    expect(first[0].priority).toBe("High");

    const second = buildPrepTasksFromPlan(plan, first, "J. Miller", () => `task_${++id}`);
    expect(second).toEqual([]);
  });

  it("acknowledges a published plan", () => {
    expect(canAcknowledgePlan(plan)).toBe(true);
    const ack = acknowledgePlan(plan, "2026-07-22T20:00:00.000Z");
    expect(ack.status).toBe("acknowledged");
    expect(canAcknowledgePlan(ack)).toBe(false);
  });

  it("builds an operational headline", () => {
    expect(planHeadline(null)).toMatch(/No operational/);
    expect(planHeadline(plan)).toBe("5 vehicles in tomorrow's staging order");
  });
});
