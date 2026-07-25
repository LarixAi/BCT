import { describe, expect, it } from "vitest";
import { bootstrapCacheKey } from "@/platform/storage/local-db";

describe("bootstrap cache tenancy", () => {
  it("keys bootstrap cache by company and depot", () => {
    expect(bootstrapCacheKey("co-a", "dep-1")).toBe("co-a:dep-1");
    expect(bootstrapCacheKey("co-b", "dep-1")).not.toBe(bootstrapCacheKey("co-a", "dep-1"));
  });
});
