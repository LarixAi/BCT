import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { withTimeout } from "@/lib/withTimeout";

const DriverAuthContext = createContext(null);

const SESSION_KEY = "driver_session_v2";
const VALIDATE_TIMEOUT_MS = 6000;

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function saveSession(driver) {
  if (driver) localStorage.setItem(SESSION_KEY, JSON.stringify(driver));
  else localStorage.removeItem(SESSION_KEY);
}

function screenForDriver(d) {
  if (!d) return "login";
  if (d.status === "suspended") return "suspended";
  if (d.status === "pending_verification") return "pending";
  if (d.status === "inactive") return "suspended";
  const needsSetup = !d.profile_photo_url || !d.assigned_vehicle_id || !d.operator_terms_accepted;
  if (needsSetup) return "setup";
  return "app";
}

function readInitialAuth() {
  const cached = loadSession();
  if (!cached?.id) return { driver: null, screen: "login" };
  return { driver: cached, screen: screenForDriver(cached) };
}

/**
 * Possible screens:
 * "login" | "signup" | "onboarding" | "pending" | "suspended" | "setup" | "app"
 */
export function DriverAuthProvider({ children }) {
  const initial = readInitialAuth();
  const [driver, setDriver] = useState(initial.driver);
  const [screen, setScreen] = useState(initial.screen);

  // Revalidate cached session in the background — never block the UI on this.
  useEffect(() => {
    const cached = loadSession();
    if (!cached?.id) return;

    let cancelled = false;

    withTimeout(
      base44.entities.Driver.filter({ id: cached.id }, "-created_date", 1),
      VALIDATE_TIMEOUT_MS
    )
      .then(results => {
        if (cancelled) return;
        if (!results.length) {
          saveSession(null);
          setDriver(null);
          setScreen("login");
          return;
        }
        const fresh = results[0];
        saveSession(fresh);
        setDriver(fresh);
        setScreen(screenForDriver(fresh));
      })
      .catch(() => {
        // Offline or slow API — keep the cached session already shown.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((d) => {
    saveSession(d);
    setDriver(d);
    setScreen(screenForDriver(d));
  }, []);

  const logout = useCallback(() => {
    saveSession(null);
    setDriver(null);
    setScreen("login");
  }, []);

  const updateDriver = useCallback((updates) => {
    setDriver(prev => {
      const updated = { ...prev, ...updates };
      saveSession(updated);
      return updated;
    });
  }, []);

  const refreshDriver = useCallback(async () => {
    if (!driver?.id) return;
    try {
      const results = await withTimeout(
        base44.entities.Driver.filter({ id: driver.id }, "-created_date", 1),
        VALIDATE_TIMEOUT_MS
      );
      if (results.length) {
        saveSession(results[0]);
        setDriver(results[0]);
      }
    } catch {
      // Keep current session on failure.
    }
  }, [driver?.id]);

  return (
    <DriverAuthContext.Provider value={{ driver, screen, setScreen, login, logout, updateDriver, refreshDriver }}>
      {children}
    </DriverAuthContext.Provider>
  );
}

export function useDriverAuth() {
  const ctx = useContext(DriverAuthContext);
  if (!ctx) throw new Error("useDriverAuth must be used inside DriverAuthProvider");
  return ctx;
}
