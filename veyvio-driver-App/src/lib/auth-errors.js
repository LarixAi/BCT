import { Capacitor } from "@capacitor/core";
import { getSupabaseAnonKey, getSupabaseUrl } from "./supabase/env";

const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
const RATE_LIMIT_STORAGE_KEY = "fleet.driver.login.rateLimitUntil";

export function isRateLimitError(message = "") {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("rate limit") ||
    normalized.includes("too many sign-in") ||
    normalized.includes("too many requests") ||
    normalized.includes("429")
  );
}

export function formatAuthError(message = "") {
  if (isRateLimitError(message)) {
    return "Too many sign-in attempts. Please wait about 5 minutes before trying again.";
  }
  if (message.toLowerCase().includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  return message || "Sign in failed.";
}

export function readRateLimitUntil() {
  if (typeof window === "undefined") return 0;
  const raw = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY);
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function rememberRateLimitUntil(untilMs) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, String(untilMs));
}

export function clearRateLimitStorage() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(RATE_LIMIT_STORAGE_KEY);
}

export function markRateLimitCooldown() {
  const until = Date.now() + RATE_LIMIT_COOLDOWN_MS;
  rememberRateLimitUntil(until);
  return until;
}

export function getFleetApiUrl() {
  const native = import.meta.env.VITE_FLEET_API_NATIVE_URL?.replace(/\/$/, "");
  if (Capacitor.isNativePlatform() && native) return native;
  const configured = import.meta.env.VITE_FLEET_API_URL?.replace(/\/$/, "");
  if (configured) return configured;
  if (import.meta.env.DEV) return "http://localhost:8080";
  return null;
}

export async function signInViaSupabaseEdge(email, password) {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();

  try {
    const response = await fetch(`${url}/functions/v1/driver-sign-in`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      return { ok: false, message: formatAuthError(payload.error ?? "Sign in failed.") };
    }

    return { ok: true, session: payload.session };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reach sign-in service.",
    };
  }
}

export async function signInViaFleetApi(email, password) {
  const baseUrl = getFleetApiUrl();
  if (!baseUrl) {
    return { ok: false, message: formatAuthError("Request rate limit reached") };
  }

  try {
    const response = await fetch(`${baseUrl}/api/driver/sign-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      return { ok: false, message: formatAuthError(payload.error ?? "Sign in failed.") };
    }

    return { ok: true, session: payload.session };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not reach fleet auth service.",
    };
  }
}
