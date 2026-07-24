import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  PendingMembership,
  SessionState,
  SignInCredentials,
  SignInResult,
  UserProfile,
} from "@/types/auth";
import { clearPersistedSession } from "./token-storage";
import { isMockAuth } from "./auth-config";
import {
  commandConfirmMfa,
  commandGetMe,
  commandListMemberships,
  commandLogin,
  commandRefreshAccessToken,
  commandSelectTenant,
  expiresAtFromJwt,
  type CommandAuthUser,
  type TenantMembershipOption,
} from "./command-auth-api";

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
  mfaChallengeId: null,
  pendingCompanyId: null,
  pendingMemberships: [],
  requiresTenantSelection: false,
  devMfaCode: null,
  enabledModules: [],
};

interface SessionStore extends SessionState {
  signIn: (credentials: SignInCredentials) => Promise<SignInResult>;
  completeMfa: (code: string) => Promise<SignInResult>;
  selectTenant: (tenantId: string) => Promise<void>;
  prepareCompanySwitch: () => Promise<void>;
  refreshPendingMemberships: () => Promise<PendingMembership[]>;
  refreshProfile: () => Promise<void>;
  ensureValidAccessToken: (options?: { force?: boolean }) => Promise<string | null>;
  enableBiometric: () => void;
  unlockBiometric: () => void;
  completeBootstrap: () => void;
  markWelcomeSeen: () => void;
  signOut: () => void;
  clearAuthChallenge: () => void;
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

function toUserProfile(user: CommandAuthUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName || "Yard",
    lastName: user.lastName || "User",
  };
}

function mockMembershipsForEmail(email: string): PendingMembership[] {
  const normalized = email.trim().toLowerCase();
  if (normalized === "laronelaing1@outlook.com" || normalized === "veyvio@outlook.com") {
    return [
      {
        tenantId: "co_bct",
        tenantName: "Brent Community Transport",
        role: "yard_manager",
      },
      {
        tenantId: "co_northwest",
        tenantName: "Northwest Passenger Transport",
        role: "yard_manager",
      },
    ];
  }
  return [
    {
      tenantId: "co_bct",
      tenantName: "Brent Community Transport",
      role: "yard_manager",
    },
  ];
}

function toPending(memberships: TenantMembershipOption[] | undefined): PendingMembership[] {
  return (memberships ?? []).map(m => ({
    tenantId: m.tenantId,
    tenantName: m.tenantName,
    role: m.role,
  }));
}

function applyTokens(
  set: (partial: Partial<SessionState>) => void,
  input: {
    accessToken: string;
    refreshToken?: string | null;
    user?: CommandAuthUser | null;
    mfaVerified: boolean;
    memberships?: TenantMembershipOption[];
    requiresTenantSelection?: boolean;
    trustedDevice?: boolean;
  },
) {
  const profile = input.user ? toUserProfile(input.user) : null;
  set({
    status: "authenticated",
    accessToken: input.accessToken,
    refreshToken: input.refreshToken ?? null,
    expiresAt: expiresAtFromJwt(input.accessToken),
    user: profile,
    mfaVerified: input.mfaVerified,
    mfaChallengeId: null,
    devMfaCode: null,
    pendingMemberships: toPending(input.memberships),
    requiresTenantSelection: Boolean(input.requiresTenantSelection),
    trustedDevice: input.trustedDevice ?? false,
    bootstrapComplete: false,
    enabledModules: Array.isArray(input.user?.enabledModules) ? input.user.enabledModules : [],
  });
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_SESSION,

      signIn: async (credentials) => {
        if (isMockAuth()) {
          await new Promise(r => setTimeout(r, 400));
          const user = mockUserFromEmail(credentials.email);
          const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
          const memberships = mockMembershipsForEmail(credentials.email);
          set({
            status: "authenticated",
            accessToken: `mock_token_${user.id}`,
            refreshToken: `mock_refresh_${user.id}`,
            expiresAt,
            user,
            mfaVerified: false,
            trustedDevice: credentials.rememberDevice ?? false,
            mfaChallengeId: "mock_challenge",
            pendingMemberships: memberships,
            requiresTenantSelection: memberships.length > 1,
            pendingCompanyId: null,
            devMfaCode: null,
            bootstrapComplete: false,
          });
          return { next: "mfa" };
        }

        const result = await commandLogin(
          credentials.email,
          credentials.password,
          credentials.rememberDevice ?? false,
        );

        if (result.requiresMfaChallenge && result.mfaChallengeId) {
          set({
            status: "anonymous",
            accessToken: null,
            refreshToken: result.refreshToken ?? null,
            expiresAt: null,
            user: null,
            mfaVerified: false,
            mfaChallengeId: result.mfaChallengeId,
            pendingCompanyId: result.pendingCompanyId ?? null,
            pendingMemberships: toPending(result.memberships),
            requiresTenantSelection: Boolean(result.requiresTenantSelection),
            devMfaCode: result.devMfaCode ?? null,
            trustedDevice: credentials.rememberDevice ?? false,
            bootstrapComplete: false,
          });
          return { next: "mfa" };
        }

        if (result.requiresTenantSelection) {
          if (!result.accessToken) {
            throw new Error("Sign in succeeded but no session token was returned");
          }
          applyTokens(set, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
            mfaVerified: true,
            memberships: result.memberships,
            requiresTenantSelection: true,
            trustedDevice: credentials.rememberDevice,
          });
          return { next: "company-select" };
        }

        if (!result.accessToken) {
          throw new Error("Sign in failed — no access token");
        }

        applyTokens(set, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          mfaVerified: true,
          memberships: result.memberships,
          requiresTenantSelection: false,
          trustedDevice: credentials.rememberDevice,
        });

        let profile = result.user ?? null;
        if (!profile) {
          try {
            profile = await commandGetMe(result.accessToken);
            set({ user: toUserProfile(profile) });
          } catch {
            /* profile optional at this step */
          }
        }

        return {
          next: "depot-select" as const,
          activeTenant: profile?.activeTenantId
            ? {
                id: profile.activeTenantId,
                name: profile.tenantName ?? "Company",
                role: profile.role,
              }
            : null,
        };
      },

      completeMfa: async (code) => {
        if (isMockAuth()) {
          if (code.length < 6) throw new Error("Enter the 6-digit authenticator code");
          set({ mfaVerified: true, mfaChallengeId: null });
          return { next: "company-select" };
        }

        const challengeId = get().mfaChallengeId;
        if (!challengeId) throw new Error("No MFA challenge — sign in again");

        const result = await commandConfirmMfa({
          challengeId,
          code,
          companyId: get().pendingCompanyId,
        });

        if (result.requiresTenantSelection) {
          applyTokens(set, {
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user,
            mfaVerified: true,
            memberships: result.memberships,
            requiresTenantSelection: true,
            trustedDevice: get().trustedDevice,
          });
          return { next: "company-select" };
        }

        applyTokens(set, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          mfaVerified: true,
          memberships: result.memberships,
          requiresTenantSelection: false,
          trustedDevice: get().trustedDevice,
        });
        return {
          next: "depot-select" as const,
          activeTenant: result.user?.activeTenantId
            ? {
                id: result.user.activeTenantId,
                name: result.user.tenantName ?? "Company",
                role: result.user.role,
              }
            : null,
        };
      },

      selectTenant: async (tenantId) => {
        if (isMockAuth()) {
          set({ requiresTenantSelection: false, pendingMemberships: [] });
          return;
        }

        const { refreshToken } = get();
        if (!refreshToken) {
          throw Object.assign(new Error("Session expired — sign in again to select a company"), { status: 401 });
        }

        const accessToken = await get().ensureValidAccessToken();
        const result = await commandSelectTenant(tenantId, refreshToken, accessToken);
        applyTokens(set, {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
          mfaVerified: true,
          requiresTenantSelection: false,
          memberships: [],
          trustedDevice: get().trustedDevice,
        });
      },

      prepareCompanySwitch: async () => {
        await get().refreshPendingMemberships();
        set({ bootstrapComplete: false });
      },

      ensureValidAccessToken: async (options) => {
        const state = get();
        if (isMockAuth() || !state.accessToken || state.accessToken.startsWith("mock_")) {
          return state.accessToken;
        }
        if (!state.refreshToken) {
          get().signOut();
          throw Object.assign(new Error("Session expired — sign in again"), { status: 401 });
        }

        const skewMs = 60_000;
        const stillValid =
          !options?.force &&
          state.expiresAt &&
          new Date(state.expiresAt).getTime() - skewMs > Date.now();

        if (stillValid) return state.accessToken;

        const refreshed = await commandRefreshAccessToken(state.refreshToken);
        set({
          status: "authenticated",
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken,
          expiresAt: expiresAtFromJwt(refreshed.accessToken),
        });
        return refreshed.accessToken;
      },

      refreshPendingMemberships: async () => {
        const { user, pendingMemberships } = get();
        if (isMockAuth()) {
          const mapped = mockMembershipsForEmail(user?.email ?? "");
          set({
            requiresTenantSelection: true,
            pendingMemberships: mapped,
          });
          return mapped;
        }

        let accessToken = await get().ensureValidAccessToken();
        try {
          const memberships = await commandListMemberships(accessToken);
          const mapped = toPending(memberships);
          set({
            requiresTenantSelection: true,
            pendingMemberships: mapped,
          });
          return mapped;
        } catch (err) {
          const status = (err as { status?: number }).status;
          if (status === 401 && get().refreshToken) {
            accessToken = await get().ensureValidAccessToken({ force: true });
            const memberships = await commandListMemberships(accessToken);
            const mapped = toPending(memberships);
            set({
              requiresTenantSelection: true,
              pendingMemberships: mapped,
            });
            return mapped;
          }
          throw err;
        }
      },

      refreshProfile: async () => {
        if (isMockAuth()) return;
        const token = await get().ensureValidAccessToken();
        if (!token || token.startsWith("mock_")) return;
        const me = await commandGetMe(token);
        set({
          user: toUserProfile(me),
          enabledModules: Array.isArray(me.enabledModules) ? me.enabledModules : [],
        });
      },

      enableBiometric: () => set({ biometricEnabled: true }),

      unlockBiometric: () => set({ biometricUnlockedThisSession: true }),

      completeBootstrap: () => set({ bootstrapComplete: true }),

      markWelcomeSeen: () => set({ hasSeenWelcome: true }),

      clearAuthChallenge: () =>
        set({
          mfaChallengeId: null,
          pendingCompanyId: null,
          pendingMemberships: [],
          requiresTenantSelection: false,
          devMfaCode: null,
        }),

      signOut: () => {
        clearPersistedSession();
        set({ ...DEFAULT_SESSION, hasSeenWelcome: get().hasSeenWelcome });
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
        pendingMemberships: state.pendingMemberships,
        requiresTenantSelection: state.requiresTenantSelection,
        pendingCompanyId: state.pendingCompanyId,
        // Do not persist MFA challenge or ephemeral unlock
      }),
    },
  ),
);

export function getSessionSnapshot(): SessionState {
  return useSessionStore.getState();
}
