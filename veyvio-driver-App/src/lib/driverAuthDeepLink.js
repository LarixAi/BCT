import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isDriverNativeApp } from "@/lib/driverAppSurface";
import { DRIVER_NATIVE_AUTH_SCHEME } from "@/lib/driverAuthConfig";
import { getSupabaseClient } from "@/lib/supabase/client";

const AUTH_CALLBACK_HOSTS = new Set(["verify", "reset-password", "auth", "auth-callback"]);

function hasAuthCallbackParams(urlString) {
  return (
    urlString.includes("access_token=") ||
    urlString.includes("token_hash=") ||
    (urlString.includes("code=") && urlString.includes("auth"))
  );
}

/**
 * True only for real OAuth / email-verify / reset callbacks — never the login page itself.
 * Capacitor serves the app as https://localhost, so `/auth` must NOT count as a callback.
 */
export function isDriverAuthCallbackUrl(urlString) {
  if (!urlString) return false;
  if (hasAuthCallbackParams(urlString)) return true;

  try {
    const url = new URL(urlString);
    const path = url.pathname || "";
    const host = (url.hostname || "").toLowerCase();

    // Explicit callback routes (browser + Capacitor https://localhost/auth/verify…)
    if (path.startsWith("/auth/verify") || path.startsWith("/auth/reset-password")) {
      return true;
    }

    // Custom scheme: com.coresupport.fleet.driver://verify or …://auth/verify
    const isNativeScheme =
      url.protocol === `${DRIVER_NATIVE_AUTH_SCHEME}:` ||
      urlString.startsWith(`${DRIVER_NATIVE_AUTH_SCHEME}:`);

    if (isNativeScheme) {
      if (AUTH_CALLBACK_HOSTS.has(host)) return true;
      if (path.includes("verify") || path.includes("reset-password")) return true;
    }

    // Hostname-style deep links (not localhost login)
    if (AUTH_CALLBACK_HOSTS.has(host) && host !== "localhost" && host !== "127.0.0.1") {
      return true;
    }
  } catch {
    return (
      urlString.includes(DRIVER_NATIVE_AUTH_SCHEME) &&
      (urlString.includes("verify") || urlString.includes("reset-password"))
    );
  }

  return false;
}

export function isDriverAuthCallbackLocation(href = "", pathname = "") {
  if (pathname === "/auth/verify" || pathname === "/auth/reset-password") return true;
  return isDriverAuthCallbackUrl(href);
}

export function driverAuthRouteFromUrl(urlString) {
  if (!urlString) return null;

  try {
    const url = new URL(urlString);

    if (urlString.startsWith(`${DRIVER_NATIVE_AUTH_SCHEME}:`)) {
      const host = url.hostname?.toLowerCase() ?? "";
      const combined = `/${host}${url.pathname}`.replace(/\/+/g, "/");
      if (combined.includes("reset-password") || host === "reset-password") {
        return "/auth/reset-password";
      }
      if (combined.includes("verify") || host === "verify" || host === "auth") {
        return "/auth/verify";
      }
    }

    const host = url.hostname?.toLowerCase() ?? "";
    const path = `${url.pathname}${url.search}${url.hash}`;

    if (host === "reset-password" || path.includes("reset-password")) {
      return "/auth/reset-password";
    }
    if (
      host === "verify" ||
      host === "auth" ||
      path.includes("/auth/verify") ||
      host === "auth-callback"
    ) {
      return "/auth/verify";
    }
    if (url.pathname.startsWith("/auth/verify")) return "/auth/verify";
    if (url.pathname.startsWith("/auth/reset-password")) return "/auth/reset-password";
  } catch {
    /* fall through */
  }

  if (urlString.includes("reset-password")) return "/auth/reset-password";
  if (urlString.includes("verify") || urlString.includes("access_token")) return "/auth/verify";
  return null;
}

export async function driverRecoverAuthSessionFromUrl(urlString) {
  const supabase = getSupabaseClient();
  const sources = [urlString];
  if (typeof window !== "undefined" && urlString !== window.location.href) {
    sources.push(window.location.href);
  }

  for (const source of sources) {
    if (!source) continue;

    try {
      const url = new URL(source);
      const code = url.searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) return { ok: true };
        return { ok: false, message: error.message };
      }

      const token_hash = url.searchParams.get("token_hash") ?? url.searchParams.get("token");
      const type = url.searchParams.get("type");
      if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!error) return { ok: true };
        return { ok: false, message: error.message };
      }

      const hash = url.hash?.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (!error) return { ok: true };
          return { ok: false, message: error.message };
        }
      }
    } catch {
      /* try next source */
    }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? { ok: true } : { ok: false, message: "Could not complete sign-in from link." };
}

export async function driverExchangeAuthCallback(urlString) {
  return driverRecoverAuthSessionFromUrl(urlString);
}

export async function driverHandleAuthDeepLink(urlString) {
  if (!isDriverAuthCallbackUrl(urlString)) return null;

  const route = driverAuthRouteFromUrl(urlString);
  await driverRecoverAuthSessionFromUrl(urlString);

  try {
    await Browser.close();
  } catch {
    /* browser may not be open */
  }

  return route;
}

export function installDriverAuthDeepLink(onNavigate) {
  if (!isDriverNativeApp()) return () => {};

  let disposed = false;

  async function handle(urlString) {
    const route = await driverHandleAuthDeepLink(urlString);
    if (route && !disposed) onNavigate(route);
  }

  void App.getLaunchUrl().then((result) => {
    if (result?.url && !disposed) void handle(result.url);
  });

  const listener = App.addListener("appUrlOpen", (event) => {
    void handle(event.url);
  });

  return () => {
    disposed = true;
    void listener.then((handle) => handle.remove());
  };
}

export async function driverRecoverAuthSessionFromCurrentLocation() {
  if (typeof window === "undefined") return { ok: false };
  return driverRecoverAuthSessionFromUrl(window.location.href);
}
