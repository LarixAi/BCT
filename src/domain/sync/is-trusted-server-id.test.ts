import { describe, expect, it } from "vitest";
import { isUntrustedServerId } from "@/domain/sync/is-trusted-server-id";

describe("isUntrustedServerId", () => {
  it("rejects fake ack and local-only ids", () => {
    expect(isUntrustedServerId("ack_123")).toBe(true);
    expect(isUntrustedServerId("cmd_local_op_1")).toBe(true);
    expect(isUntrustedServerId("op_abc")).toBe(true);
    expect(isUntrustedServerId(undefined)).toBe(true);
  });

  it("accepts real server and skipped local task ids", () => {
    expect(isUntrustedServerId("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11")).toBe(false);
    expect(isUntrustedServerId("task_local_smoke")).toBe(false);
  });
});
