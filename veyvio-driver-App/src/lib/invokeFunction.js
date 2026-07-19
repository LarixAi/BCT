/**
 * Invoke a deployed Base44 backend function.
 *
 * The SDK routes through /api/apps/{appId}/functions/{name}, which hangs on our
 * deployed app. The working path is /api/functions/{name} on the app base URL.
 */
import { appParams } from "@/lib/app-params";
import { resolveApiHeaders, resolveServerUrl } from "@/lib/api-config";

const DEFAULT_TIMEOUT_MS = 20_000;

function getLocalFunctionsBaseUrl() {
  const url = import.meta.env.VITE_LOCAL_FUNCTIONS_URL;
  return typeof url === "string" && url.trim() ? url.trim().replace(/\/$/, "") : "";
}

function shouldPreferLocalFunctions(functionName) {
  const local = getLocalFunctionsBaseUrl();
  if (!local) return false;
  // Route fare-engine calls to local dev server when configured
  return functionName === "createFareQuote" || functionName === "confirmBooking";
}

export async function invokeFunction(functionName, payload, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const localBase = getLocalFunctionsBaseUrl();
  const useLocal = shouldPreferLocalFunctions(functionName);
  const serverUrl = (useLocal ? localBase : resolveServerUrl()).replace(/\/$/, "");
  const headers = {
    "Content-Type": "application/json",
    "X-App-Id": String(appParams.appId || ""),
    ...resolveApiHeaders(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${serverUrl}/api/functions/${functionName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload ?? {}),
      signal: controller.signal,
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      return {
        data: {
          error: data.error || data.message || data.detail || `Request failed (${res.status})`,
        },
      };
    }

    return { data };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { data: { error: "Request timed out. Check your connection and try again." } };
    }
    return { data: { error: err?.message || "Network error" } };
  } finally {
    clearTimeout(timer);
  }
}
