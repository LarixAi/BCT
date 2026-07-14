export type SessionStatus = "anonymous" | "authenticated" | "expired" | "suspended";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
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
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberDevice?: boolean;
}
