export type PasswordValidationResult = { ok: true } | { ok: false; reason: string };

export function validateNewPassword(
  password: string,
  options?: { currentPassword?: string },
): PasswordValidationResult {
  if (!password.trim()) {
    return { ok: false, reason: "Enter a new password." };
  }

  if (password.length < 8) {
    return { ok: false, reason: "Password must be at least 8 characters." };
  }

  if (options?.currentPassword && password === options.currentPassword) {
    return { ok: false, reason: "New password must be different from your current password." };
  }

  return { ok: true };
}

export function validatePasswordConfirmation(
  password: string,
  confirmation: string,
): PasswordValidationResult {
  if (!confirmation) {
    return { ok: false, reason: "Confirm your new password." };
  }

  if (password !== confirmation) {
    return { ok: false, reason: "Passwords do not match." };
  }

  return { ok: true };
}
