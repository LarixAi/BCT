export type SessionStatus = "anonymous" | "authenticated" | "expired" | "suspended";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
}

export interface PendingMembership {
  tenantId: string;
  tenantName: string;
  role: string;
}

export interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  user: UserProfile | null;
  mfaVerified: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  trustedDevice: boolean;
  hasSeenWelcome: boolean;
  bootstrapComplete: boolean;
  /** Session-only flag — not persisted */
  biometricUnlockedThisSession: boolean;
  /** Live Command MFA challenge (not persisted long-term; cleared after verify) */
  mfaChallengeId: string | null;
  pendingCompanyId: string | null;
  pendingMemberships: PendingMembership[];
  requiresTenantSelection: boolean;
  /** Dev-only MFA hint from Command when present */
  devMfaCode: string | null;
  /** Plan modules from Command /auth/me — empty means soft-open until loaded */
  enabledModules: string[];
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberDevice?: boolean;
}

export type SignInResult =
  | { next: "mfa" }
  | { next: "company-select" }
  | {
      next: "depot-select";
      activeTenant?: { id: string; name: string; role: string | null } | null;
    };
