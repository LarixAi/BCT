import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SessionState, SignInCredentials, UserProfile } from "@/types/auth";
import type { AppLockTimeoutMinutes } from "@/types/security";
import { ensureDeviceId } from "./device-info";
import { performSignOut, SIGNED_OUT_SESSION } from "./sign-out";

const DEFAULT_SESSION: SessionState = SIGNED_OUT_SESSION;

interface SessionStore extends SessionState {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  completeMfa: () => void;
  enableBiometric: () => void;
  disableBiometric: () => void;
  setAppLockEnabled: (enabled: boolean) => void;
  setAppLockTimeout: (minutes: AppLockTimeoutMinutes) => void;
  ensureCurrentDeviceId: () => string;
  unlockBiometric: () => void;
  completeBootstrap: () => void;
  markWelcomeSeen: () => void;
  markDriverOnboardingComplete: () => void;
  signOut: () => void;
  isSessionValid: () => boolean;
  isAuthenticated: () => boolean;
}

function mockUserFromEmail(email: string): UserProfile {
  const local = email.split("@")[0] ?? "driver";
  const parts = local.replace(/[._]/g, " ").split(" ");
  return {
    id: `usr_${local}`,
    driverId: `drv_${local}`,
    email,
    firstName: parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Alex",
    lastName: parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "Morgan",
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SESSION,

      signIn: async (credentials) => {
        await new Promise((r) => setTimeout(r, 400));
        if (!credentials.email.includes("@")) throw new Error("Invalid email");
        const user = mockUserFromEmail(credentials.email);
        set({
          status: "authenticated",
          accessToken: `mock_token_${user.id}`,
          refreshToken: `mock_refresh_${user.id}`,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          user,
          mfaVerified: false,
          trustedDevice: credentials.rememberDevice ?? false,
        });
      },

      completeMfa: () => set({ mfaVerified: true }),
      enableBiometric: () => set({ biometricEnabled: true, trustedDevice: true }),
      disableBiometric: () =>
        set({ biometricEnabled: false, biometricUnlockedThisSession: true, trustedDevice: false }),
      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),
      setAppLockTimeout: (minutes) => set({ appLockTimeoutMinutes: minutes }),
      ensureCurrentDeviceId: () => {
        const existing = get().currentDeviceId;
        const next = ensureDeviceId(existing);
        if (next !== existing) set({ currentDeviceId: next });
        return next;
      },
      unlockBiometric: () => set({ biometricUnlockedThisSession: true }),
      completeBootstrap: () => set({ bootstrapComplete: true }),
      markWelcomeSeen: () => set({ hasSeenWelcome: true }),
      markDriverOnboardingComplete: () => set({ hasCompletedDriverOnboarding: true }),

      signOut: () => {
        void performSignOut();
      },

      isSessionValid: () => {
        const s = get();
        if (s.status !== "authenticated" || !s.accessToken || !s.expiresAt) return false;
        return new Date(s.expiresAt).getTime() > Date.now();
      },

      isAuthenticated: () => {
        const s = get();
        return s.status === "authenticated" && get().isSessionValid() && s.mfaVerified;
      },
    }),
    {
      name: "veyvio-driver-session-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        status: state.status,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        expiresAt: state.expiresAt,
        user: state.user,
        mfaVerified: state.mfaVerified,
        biometricEnabled: state.biometricEnabled,
        pinEnabled: state.pinEnabled,
        appLockEnabled: state.appLockEnabled,
        appLockTimeoutMinutes: state.appLockTimeoutMinutes,
        currentDeviceId: state.currentDeviceId,
        trustedDevice: state.trustedDevice,
        hasSeenWelcome: state.hasSeenWelcome,
        hasCompletedDriverOnboarding: state.hasCompletedDriverOnboarding,
        bootstrapComplete: state.bootstrapComplete,
      }),
    },
  ),
);

export function getSessionSnapshot(): SessionState {
  return useSessionStore.getState();
}
