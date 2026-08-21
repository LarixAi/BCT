export const EXECUTIVE_IDLE_TIMEOUT_MS: number;
export const EXECUTIVE_ABSOLUTE_LIFETIME_MS: number;
export const EXECUTIVE_ACCESS_COOKIE_MAX_AGE_S: number;
export const EXECUTIVE_REFRESH_COOKIE_MAX_AGE_S: number;

export function assessExecutiveSessionPolicy(
  binding: Record<string, unknown> | null | undefined,
  options?: { now?: number },
): {
  allowed: boolean;
  code: string;
  message: string;
  authenticatedAt?: number;
  lastActivityAt?: number;
};

export function nextExecutiveActivityBinding(
  binding: Record<string, unknown>,
  options?: { now?: number },
): Record<string, unknown>;
