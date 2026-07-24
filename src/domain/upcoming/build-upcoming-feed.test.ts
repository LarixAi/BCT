import { describe, expect, it } from "vitest";
import { buildUpcomingFeed } from "./build-upcoming-feed";
import { classifyDueBucket, countByBucket } from "./upcoming-scheduling";
import type { YardTask } from "@/types/tasks";
import type { Vehicle } from "@/types/yard";

const now = new Date("2026-07-24T12:00:00.000Z");

const vehicle: Vehicle = {
  id: "v1",
  reg: "SK23 FGH",
  type: "Coach",
  bayId: "A01",
  status: "Available",
};

describe("upcoming-scheduling", () => {
  it("classifies overdue, today, week and month buckets", () => {
    expect(classifyDueBucket("2026-07-23T12:00:00.000Z", now)).toBe("overdue");
    expect(classifyDueBucket("2026-07-24T18:00:00.000Z", now)).toBe("today");
    expect(classifyDueBucket("2026-07-28T12:00:00.000Z", now)).toBe("week");
    expect(classifyDueBucket("2026-08-20T12:00:00.000Z", now)).toBe("month");
  });
});

describe("buildUpcomingFeed", () => {
  it("includes open tasks and compliance fixtures", () => {
    const task: YardTask = {
      id: "task_1",
      title: "Pre-departure check",
      kind: "check",
      priority: "High",
      status: "assigned",
      dueAt: "2026-07-24T17:00:00.000Z",
      vehicleId: "v1",
      createdAt: "2026-07-24T08:00:00.000Z",
      createdBy: "Admin",
    };

    const feed = buildUpcomingFeed({
      tasks: [task],
      vehicles: [vehicle],
      defects: [],
      movements: [],
      now,
    });

    expect(feed.some(item => item.yardTaskId === "task_1")).toBe(true);
    expect(feed.some(item => item.category === "mot")).toBe(true);
    expect(countByBucket(feed).today).toBeGreaterThan(0);
  });

  it("deduplicates inactive vehicle rows for the same vehicle", () => {
    const inactiveVehicle: Vehicle = {
      ...vehicle,
      id: "v10",
      reg: "GJ21 QRS",
      status: "Available",
      lastCheckAt: undefined,
    };

    const feed = buildUpcomingFeed({
      tasks: [],
      vehicles: [inactiveVehicle],
      defects: [],
      movements: [],
      now,
    });

    const inactiveRows = feed.filter(item => item.category === "inactive_vehicle" && item.vehicleId === "v10");
    expect(inactiveRows).toHaveLength(1);
  });
});
