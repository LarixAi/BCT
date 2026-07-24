import { describe, expect, it } from "vitest";
import { formatSyncError, isMissingSyncRouteError } from "@/domain/sync/format-sync-error";

describe("formatSyncError", () => {
  it("explains missing yard sync route", () => {
    const raw = JSON.stringify({ statusCode: 404, code: "not_found", message: "API route not found" });
    expect(formatSyncError(raw)).toContain("not available on the live server");
    expect(isMissingSyncRouteError(raw)).toBe(true);
  });

  it("explains inspection lookup failures during bodywork sync", () => {
    expect(formatSyncError("Inspection not found")).toContain("inspection start to sync");
  });
});
