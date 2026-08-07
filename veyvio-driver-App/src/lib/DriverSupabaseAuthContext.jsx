import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getDriverSessionContext, signInDriver, signOutDriver } from "@/services/session.service";
import { savePendingCompanySelection } from "@/pages/driver/DriverAuthSelectCompany";
import { linkDriverAccountIfNeeded } from "@/services/link-driver.service";
import { buildAccessContext } from "@/lib/driver-access-mode";
import { withTimeout } from "@/lib/withTimeout";
import { rebindBiometricCredentialIfEnabled, invalidateBiometricAccess } from "@/features/auth/biometrics/biometric-enrollment";
import { signInDriverWithBiometrics } from "@/features/auth/biometrics/biometric-login";
import {
  markBiometricUnlocked,
  rememberLastBiometricDriverId,
  resetBiometricLockOnSignOut,
  shouldRebindBiometricCredential,
} from "@/features/auth/biometrics";
import { enforceRemoteDeviceSecurity } from "@/features/auth/biometrics/biometric-security-sync";
import { clearDriverSensitiveWorkspace } from "@/lib/driver-sensitive-storage";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";

const DriverSupabaseAuthContext = createContext(null);

/** Device security check must never block app boot indefinitely. */
const DEVICE_SECURITY_TIMEOUT_MS = 5000;
/** Full session refresh ceiling — show UI or an escape hatch after this. */
const SESSION_REFRESH_TIMEOUT_MS = 20000;
/** Sentinel so a slow refresh never wipes an already-good session. */
const SESSION_REFRESH_TIMED_OUT = Symbol("session_refresh_timed_out");
/** Hard escape if auth events keep superseding refresh and leave loading true. */
const BOOT_ESCAPE_MS = 12000;

/**
 * Screens:
 * login | onboarding | pending | restricted | app | policy_reack
 */
/**
 * Cold-launch restores a persisted session and can fire TOKEN_REFRESHED before the
 * native bridge/Activity is ready — that's what crashed boot on Samsung. Give the
 * app a moment to finish launching before treating TOKEN_REFRESHED as safe to act on.
 */
const HAS_BOOTED_MS = 4000;

function isReachabilitySessionError(ctx) {
  if (!ctx || ctx.routeTarget !== "session_error") return false;
  const msg = String(ctx.linkError ?? "");
  return /timed out|check your connection|could not reach|could not restore/i.test(msg);
}

export function DriverSupabaseAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [pendingCompanySelection, setPendingCompanySelection] = useState(false);
  const [loading, setLoading] = useState(true);
  /** Bumped to ignore stale getDriverSessionContext results (e.g. SIGNED_IN vs login()). */
  const refreshGeneration = useRef(0);
  const hasBootedRef = useRef(false);
  /** Password/biometric login already loads context — skip SIGNED_IN refresh race. */
  const loginInFlightRef = useRef(false);
  /** Latest session for offline keep-alive (refresh must not clobber mid-flight). */
  const sessionRef = useRef(null);
  sessionRef.current = session;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      hasBootedRef.current = true;
    }, HAS_BOOTED_MS);
    return () => window.clearTimeout(timer);
  }, []);

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    try {
      const ctx = await withTimeout(
        getDriverSessionContext(),
        SESSION_REFRESH_TIMEOUT_MS,
        SESSION_REFRESH_TIMED_OUT,
      );
      if (generation !== refreshGeneration.current) {
        return ctx === SESSION_REFRESH_TIMED_OUT ? null : ctx;
      }
      // Timeout ≠ signed out. Keep prior session so a slow Command call cannot
      // bounce the driver back to the password screen mid-sign-in.
      if (ctx === SESSION_REFRESH_TIMED_OUT) {
        return sessionRef.current;
      }

      // Airplane / patchy 4G: Command timed out inside getDriverSessionContext and
      // returned session_error. That must NOT replace an already-good operational
      // session — otherwise walkaround offline drops to "Sign-in could not finish".
      if (isReachabilitySessionError(ctx)) {
        const prior = sessionRef.current;
        if (prior?.driver && prior.routeTarget !== "session_error" && prior.routeTarget !== "not_driver") {
          return prior;
        }
      }

      const driverId = ctx?.driver?.id;
      if (driverId) {
        const security = await withTimeout(
          enforceRemoteDeviceSecurity(driverId)
            .catch(() => {
              // Fail closed for biometrics; keep operational session below.
              return { revoked: false, requirePassword: true };
            }),
          DEVICE_SECURITY_TIMEOUT_MS,
          { revoked: false, requirePassword: true },
        );
        if (security.revoked) {
          refreshGeneration.current += 1;
          resetBiometricLockOnSignOut();
          await signOutDriver().catch(() => undefined);
          setSession(null);
          return null;
        }
        if (security.requirePassword) {
          // Network / status failure: wipe biometric unlock, keep duty session.
          await invalidateBiometricAccess(driverId).catch(() => undefined);
        }
      }

      setSession(ctx);
      if (ctx?.driver) setPendingCompanySelection(false);
      return ctx;
    } catch {
      if (generation !== refreshGeneration.current) return null;
      return null;
    } finally {
      // Always clear the boot loader for the latest attempt. Older superseded
      // refreshes used to return early and leave loading=true forever.
      if (generation === refreshGeneration.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading((still) => {
        if (still) {
          // Force the auth shell so a hung refresh cannot trap the driver.
          setSession((prev) => prev);
        }
        return false;
      });
    }, BOOT_ESCAPE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, sessionArg) => {
      window.setTimeout(() => {
        void (async () => {
          if (event === "SIGNED_IN" && window.location.pathname === "/auth/verify") {
            await linkDriverAccountIfNeeded();
          }
          if (event === "SIGNED_IN" && window.location.pathname.startsWith("/auth/")) {
            const isOAuthReturn =
              window.location.hash.includes("access_token") || window.location.search.includes("code=");
            if (isOAuthReturn) {
              await linkDriverAccountIfNeeded();
            }
          }
          if (["SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED", "PASSWORD_RECOVERY"].includes(event)) {
            // login()/loginWithBiometrics already call getDriverSessionContext — a parallel
            // refresh can time out and clear session while Signing in… is still showing.
            if (loginInFlightRef.current && event === "SIGNED_IN") {
              return;
            }
            const ctx = await refresh();
            const driverId = ctx?.driver?.id;
            if (driverId && shouldRebindBiometricCredential(event, hasBootedRef.current)) {
              window.setTimeout(() => {
                void rebindBiometricCredentialIfEnabled(driverId).catch(() => undefined);
              }, 1500);
            }
          }
          if (event === "SIGNED_OUT") {
            // Token refresh fails hard while airplane is on; Supabase emits SIGNED_OUT.
            // Keep the in-memory operational session so offline queue / walkaround continue.
            const offline =
              typeof navigator !== "undefined" && navigator.onLine === false;
            if (offline && sessionRef.current?.driver) {
              setLoading(false);
              return;
            }
            refreshGeneration.current += 1;
            resetBiometricLockOnSignOut();
            setSession(null);
            setLoading(false);
          }
        })();
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const access = session
    ? buildAccessContext(session, session.driver, {
        driverRow: session.driverRow,
        rejectionReason: session.driver?.rejectionReason,
        resubmitItems: session.resubmitItems ?? [],
        outdatedPolicies: session.outdatedPolicies ?? [],
        dispatchBlockers: session.dispatchBlockers ?? [],
        temporaryAccess: session.temporaryAccess ?? null,
      })
    : { mode: "login" };

  const screen = access.mode;

  const applyAuthenticatedContext = (context) => {
    refreshGeneration.current += 1;
    setSession(context);
    setLoading(false);
    markBiometricUnlocked();
    const driverId = context?.driver?.id;
    if (driverId) {
      rememberLastBiometricDriverId(driverId);
    }
  };

  const value = {
    session,
    driver: session?.driver ?? null,
    bootstrap: session?.bootstrap ?? null,
    homeSummary: session?.homeSummary ?? null,
    screen,
    access,
    loading,
    pendingCompanySelection,
    refresh,
    login: async (email, password) => {
      loginInFlightRef.current = true;
      try {
        const result = await signInDriver(email, password);
        if (result.requiresCompanySelection) {
          savePendingCompanySelection({
            memberships: result.memberships ?? [],
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          });
          setPendingCompanySelection(true);
          return result;
        }
        setPendingCompanySelection(false);
        // Prefer the context already loaded during sign-in so we don't wait on a
        // second session round-trip before leaving the auth shell.
        if (result.ok && result.context) {
          applyAuthenticatedContext(result.context);
          const driverId = result.context?.driver?.id;
          if (driverId) {
            window.setTimeout(() => {
              void rebindBiometricCredentialIfEnabled(driverId).catch(() => undefined);
            }, 1500);
          }
        } else if (result.ok) {
          const ctx = await refresh();
          markBiometricUnlocked();
          const driverId = ctx?.driver?.id;
          if (driverId) {
            window.setTimeout(() => {
              void rebindBiometricCredentialIfEnabled(driverId).catch(() => undefined);
            }, 1500);
          }
        }
        return result;
      } finally {
        loginInFlightRef.current = false;
      }
    },
    loginWithBiometrics: async (driverId) => {
      loginInFlightRef.current = true;
      try {
        const result = await signInDriverWithBiometrics(driverId);
        if (result.ok && result.context) {
          applyAuthenticatedContext(result.context);
        } else if (result.ok) {
          await refresh();
          markBiometricUnlocked();
        }
        return result;
      } finally {
        loginInFlightRef.current = false;
      }
    },
    logout: async () => {
      refreshGeneration.current += 1;
      resetBiometricLockOnSignOut();
      const scope = resolveDriverWorkspaceScope(
        { id: session?.driverId, organisation_id: session?.activeCompanyId ?? session?.companyId },
        session,
      );
      if (scope.companyId && scope.membershipId) {
        await clearDriverSensitiveWorkspace(scope.companyId, scope.membershipId).catch(() => undefined);
      }
      setLoading(false);
      setSession(null);
      await signOutDriver().catch(() => undefined);
    },
  };

  return <DriverSupabaseAuthContext.Provider value={value}>{children}</DriverSupabaseAuthContext.Provider>;
}

export function useDriverSupabaseAuth() {
  const ctx = useContext(DriverSupabaseAuthContext);
  if (!ctx) throw new Error("useDriverSupabaseAuth must be used within DriverSupabaseAuthProvider");
  return ctx;
}
