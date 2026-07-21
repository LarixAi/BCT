import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getDriverSessionContext, signInDriver, signOutDriver } from "@/services/session.service";
import { linkDriverAccountIfNeeded } from "@/services/link-driver.service";
import { buildAccessContext } from "@/lib/driver-access-mode";
import { rebindBiometricCredentialIfEnabled } from "@/features/auth/biometrics/biometric-enrollment";
import { signInDriverWithBiometrics } from "@/features/auth/biometrics/biometric-login";
import {
  markBiometricUnlocked,
  rememberLastBiometricDriverId,
  resetBiometricLockOnSignOut,
} from "@/features/auth/biometrics";
import { enforceRemoteDeviceSecurity } from "@/features/auth/biometrics/biometric-security-sync";

const DriverSupabaseAuthContext = createContext(null);

/**
 * Screens:
 * login | onboarding | pending | restricted | app | policy_reack
 */
export function DriverSupabaseAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  /** Bumped to ignore stale getDriverSessionContext results (e.g. SIGNED_IN vs login()). */
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++refreshGeneration.current;
    const ctx = await getDriverSessionContext();
    if (generation !== refreshGeneration.current) return ctx;

    const driverId = ctx?.driver?.id;
    if (driverId) {
      const security = await enforceRemoteDeviceSecurity(driverId).catch(() => ({
        revoked: false,
        requirePassword: false,
      }));
      if (security.revoked || security.requirePassword) {
        refreshGeneration.current += 1;
        resetBiometricLockOnSignOut();
        await signOutDriver().catch(() => undefined);
        setSession(null);
        setLoading(false);
        return null;
      }
    }

    setSession(ctx);
    setLoading(false);
    return ctx;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
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
            const ctx = await refresh();
            const driverId = ctx?.driver?.id;
            if (driverId && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
              await rebindBiometricCredentialIfEnabled(driverId).catch(() => undefined);
            }
          }
          if (event === "SIGNED_OUT") {
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
    refresh,
    login: async (email, password) => {
      const result = await signInDriver(email, password);
      // Prefer the context already loaded during sign-in so we don't wait on a
      // second session round-trip before leaving the auth shell.
      if (result.ok && result.context) {
        applyAuthenticatedContext(result.context);
        const driverId = result.context?.driver?.id;
        if (driverId) {
          await rebindBiometricCredentialIfEnabled(driverId).catch(() => undefined);
        }
      } else if (result.ok) {
        const ctx = await refresh();
        markBiometricUnlocked();
        const driverId = ctx?.driver?.id;
        if (driverId) {
          await rebindBiometricCredentialIfEnabled(driverId).catch(() => undefined);
        }
      }
      return result;
    },
    loginWithBiometrics: async (driverId) => {
      const result = await signInDriverWithBiometrics(driverId);
      if (result.ok && result.context) {
        applyAuthenticatedContext(result.context);
      } else if (result.ok) {
        await refresh();
        markBiometricUnlocked();
      }
      return result;
    },
    logout: async () => {
      refreshGeneration.current += 1;
      resetBiometricLockOnSignOut();
      await signOutDriver();
      setSession(null);
    },
  };

  return <DriverSupabaseAuthContext.Provider value={value}>{children}</DriverSupabaseAuthContext.Provider>;
}

export function useDriverSupabaseAuth() {
  const ctx = useContext(DriverSupabaseAuthContext);
  if (!ctx) throw new Error("useDriverSupabaseAuth must be used within DriverSupabaseAuthProvider");
  return ctx;
}
