export async function requestPasswordResetEmail(email: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!email.includes("@")) {
    return { ok: false, reason: "No work email is available for this account." };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 800));
  return { ok: true };
}

export async function changeAccountPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!input.currentPassword.trim()) {
    return { ok: false, reason: "Enter your current password." };
  }

  if (!input.newPassword.trim()) {
    return { ok: false, reason: "Enter a new password." };
  }

  await new Promise((resolve) => window.setTimeout(resolve, 700));

  // Prototype: accept any non-empty current password for mock accounts.
  if (input.currentPassword.length < 4) {
    return { ok: false, reason: "Current password did not match." };
  }

  return { ok: true };
}
