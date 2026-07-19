import { isDriverNativeApp } from "@/lib/driverAppSurface";

/** Custom URL scheme for native auth callbacks (OAuth + email links). */
export const DRIVER_NATIVE_AUTH_SCHEME = "com.coresupport.fleet.driver";

export function getDriverAppBaseUrl() {
  if (import.meta.env.VITE_DRIVER_APP_URL) {
    return import.meta.env.VITE_DRIVER_APP_URL.replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "https://localhost:5173";
}

function driverNativeAuthRedirect(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const withoutSlash = normalized.replace(/^\//, "");
  return `${DRIVER_NATIVE_AUTH_SCHEME}://${withoutSlash}`;
}

export function driverAuthRedirectPath(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (isDriverNativeApp()) {
    return driverNativeAuthRedirect(normalized);
  }
  const base = getDriverAppBaseUrl();
  return `${base}${normalized}`;
}

export const DRIVER_AUTH_PATH = "/auth";
