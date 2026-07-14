export type SessionStatus = "anonymous" | "authenticated" | "expired" | "suspended";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  mobile?: string;
  driverId: string;
}

import type { AppLockTimeoutMinutes } from "@/types/security";

export interface SessionState {
  status: SessionStatus;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: string | null;
  user: UserProfile | null;
  mfaVerified: boolean;
  biometricEnabled: boolean;
  pinEnabled: boolean;
  appLockEnabled: boolean;
  appLockTimeoutMinutes: AppLockTimeoutMinutes;
  currentDeviceId: string | null;
  trustedDevice: boolean;
  hasSeenWelcome: boolean;
  hasCompletedDriverOnboarding: boolean;
  bootstrapComplete: boolean;
  biometricUnlockedThisSession: boolean;
}

export interface SignInCredentials {
  email: string;
  password: string;
  rememberDevice?: boolean;
}
