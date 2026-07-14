import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SessionState, SignInCredentials, UserProfile } from "@/types/auth";
import { clearPersistedSession } from "./token-storage";

const DEFAULT_SESSION: SessionState = {
  status: "anonymous",
  accessToken: null,
  refreshToken: null,
  expiresAt: null,
  user: null,
  mfaVerified: false,
  biometricEnabled: false,
  pinEnabled: false,
  trustedDevice: false,
  hasSeenWelcome: false,
  bootstrapComplete: false,
  biometricUnlockedThisSession: false,
};

interface SessionStore extends SessionState {
  signIn: (credentials: SignInCredentials) => Promise<void>;
  completeMfa: () => void;
  enableBiometric: () => void;
  unlockBiometric: () => void;
  completeBootstrap: () => void;
  markWelcomeSeen: () => void;
  signOut: () => void;
  isSessionValid: () => boolean;
  isAuthenticated: () => boolean;
}

function mockUserFromEmail(email: string): UserProfile {
  const local = email.split("@")[0] ?? "user";
  const name = local.replace(/[._]/g, " ");
  const parts = name.split(" ");
  return {
    id: `usr_${local}`,
    email,
    firstName: parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : "Yard",
    lastName: parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : "User",
  };
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SESSION,

      signIn: async (credentials) => {
        await new Promise((r) => setTimeout(r, 400));
        const user = mockUserFromEmail(credentials.email);
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
        set({
          status: "authenticated",
          accessToken: `mock_token_${user.id}`,
          refreshToken: `mock_refresh_${user.id}`,
          expiresAt,
          user,
          mfaVerified: false,
          trustedDevice: credentials.rememberDevice ?? false,
        });
      },

      completeMfa: () => set({ mfaVerified: true }),

      enableBiometric: () => set({ biometricEnabled: true }),

      unlockBiometric: () => set({ biometricUnlockedThisSession: true }),

      completeBootstrap: () => set({ bootstrapComplete: true }),

      markWelcomeSeen: () => set({ hasSeenWelcome: true }),

      signOut: () => {
        clearPersistedSession();
        set({ ...DEFAULT_SESSION });
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
      name: "veyvio-yard-session-v1",
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
        trustedDevice: state.trustedDevice,
        hasSeenWelcome: state.hasSeenWelcome,
        bootstrapComplete: state.bootstrapComplete,
      }),
    },
  ),
);

export function getSessionSnapshot(): SessionState {
  return useSessionStore.getState();
}
