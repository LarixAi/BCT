import { describe, expect, it } from "vitest";
import { isDemoDataSource, usesLiveCommandData } from "@/platform/yard/data-source";

describe("data-source", () => {
  it("treats command-hub as live when mock flags are off", () => {
    expect(isDemoDataSource("command-hub")).toBe(false);
    expect(usesLiveCommandData("command-hub")).toBe(true);
  });

  it("treats mock bootstrap as demo", () => {
    expect(isDemoDataSource("mock")).toBe(true);
    expect(usesLiveCommandData("mock")).toBe(false);
  });
});
