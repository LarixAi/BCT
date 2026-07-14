import { describe, expect, it } from "vitest";
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/domain/auth/password-policy";

describe("password policy", () => {
  it("requires at least 8 characters", () => {
    expect(validateNewPassword("short")).toEqual({
      ok: false,
      reason: "Password must be at least 8 characters.",
    });
  });

  it("rejects reusing the current password", () => {
    expect(validateNewPassword("same-password", { currentPassword: "same-password" })).toEqual({
      ok: false,
      reason: "New password must be different from your current password.",
    });
  });

  it("requires matching confirmation", () => {
    expect(validatePasswordConfirmation("new-password-1", "different")).toEqual({
      ok: false,
      reason: "Passwords do not match.",
    });
  });
});
