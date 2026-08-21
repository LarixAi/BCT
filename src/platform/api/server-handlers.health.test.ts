import { describe, expect, it } from "vitest";
import { buildYardHealthBody } from "./server-handlers";

describe("yard health payload", () => {
  it("reports live in production", () => {
    const body = buildYardHealthBody({ prod: true, deploymentSha: "abc123" });
    expect(body.ok).toBe(true);
    expect(body.mode).toBe("live");
    expect(body.deploymentSha).toBe("abc123");
  });

  it("reports dev-stub outside production", () => {
    const body = buildYardHealthBody({ prod: false, deploymentSha: null });
    expect(body.mode).toBe("dev-stub");
  });
});
