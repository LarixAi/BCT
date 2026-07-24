import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getDriverSessionContext, signInDriver, signOutDriver } from "@/services/session.service";
import { savePendingCompanySelection } from "@/pages/driver/DriverAuthSelectCompany";
import { linkDriverAccountIfNeeded } from "@/services/link-driver.service";
import { buildAccessContext } from "@/lib/driver-access-mode";
import { withTimeout } from "@/lib/withTimeout";
import { rebindBiometricCredentialIfEnabled } from "@/features/auth/biometrics/biometric-enrollment";
import { signInDriverWithBiometrics } from "@/features/auth/biometrics/biometric-login";
import {
  markBiometricUnlocked,
  rememberLastBiometricDriverId,
  resetBiometricLockOnSignOut,
  shouldRebindBiometricCredential,
} from "@/features/auth/biometrics";
import { enforceRemoteDeviceSecurity } from "@/features/auth/biometrics/biometric-security-sync";

const DriverSupabaseAuthContext = createContext(null);

/** Device security check must never block app boot indefinitely. */
const DEVICE_SECURITY_TIMEOUT_MS = 5000;
/** Full session refresh ceiling — show UI or an escape hatch after this. */
const SESSION_REFRESH_TIMEOUT_MS = 20000;
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

export function DriverSupabaseAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [pendingCompanySelection, setPendingCompanySelection] = useState(false);
  const [loading, setLoading] = useState(true);
  /** Bumped to ignore stale getDriverSessionContext results (e.g. SIGNED_IN vs login()). */
  const refreshGeneration = useRef(0);
  const hasBootedRef = useRef(false);

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
        null,
      );
      if (generation !== refreshGeneration.current) return ctx;

      const driverId = ctx?.driver?.id;
      if (driverId) {
        const security = await withTimeout(
          enforceRemoteDeviceSecurity(driverId)
            .catch((err) => {
              console.log("[BIOMETRIC_DEBUG] enforceRemoteDeviceSecurity threw: " + (err instanceof Error ? err.message : String(err)));
              return { revoked: false, requirePassword: false };
            }),
          DEVICE_SECURITY_TIMEOUT_MS,
          { revoked: false, requirePassword: false },
        );
        console.log("[BIOMETRIC_DEBUG] security result: " + JSON.stringify(security));
        if (security.revoked || security.requirePassword) {
          console.log("[BIOMETRIC_DEBUG] forcing sign-out due to device security check");
          refreshGeneration.current += 1;
          resetBiometricLockOnSignOut();
          await signOutDriver().catch(() => undefined);
          setSession(null);
          return null;
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
      const rt = sessionArg?.refresh_token;
      console.log(
        "[BIOMETRIC_DEBUG] onAuthStateChange event=" + event + " refresh " +
          (typeof rt === "string" && rt ? "len=" + rt.length + " prefix=" + rt.slice(0, 6) : "null"),
      );
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
            if (driverId && shouldRebindBiometricCredential(event, hasBootedRef.current)) {
              window.setTimeout(() => {
                void rebindBiometricCredentialIfEnabled(driverId).catch(() => undefined);
              }, 1500);
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
    pendingCompanySelection,
    refresh,
    login: async (email, password) => {
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
