import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getDriverSessionContext, signInDriver, signOutDriver } from "@/services/session.service";
import { linkDriverAccountIfNeeded } from "@/services/link-driver.service";
import { buildAccessContext } from "@/lib/driver-access-mode";

const DriverSupabaseAuthContext = createContext(null);

/**
 * Screens:
 * login | onboarding | pending | restricted | app | policy_reack
 */
export function DriverSupabaseAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const ctx = await getDriverSessionContext();
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
            await refresh();
          }
          if (event === "SIGNED_OUT") {
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
      if (result.ok) await refresh();
      return result;
    },
    logout: async () => {
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
