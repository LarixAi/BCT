import { getSupabaseClient } from "@/lib/supabase/client";
import { formatAuthError } from "@/lib/auth-errors";
import { withTimeout } from "@/lib/withTimeout";
import { getDriverSessionContext } from "@/services/session.service";
import {
  invalidateBiometricAccess,
  unlockStoredRefreshToken,
} from "./biometric-enrollment.js";
import { markBiometricUnlocked } from "./biometric-lock-state.js";
import { rememberLastBiometricDriverId } from "./biometric-session.js";
import { isPlausibleRefreshToken, saveBiometricCredential } from "./biometric-credential-store.js";

const REFRESH_SESSION_TIMEOUT_MS = 15000;
const SESSION_CONTEXT_TIMEOUT_MS = 20000;

function isRefreshTokenFailure(message = "") {
  return /invalid refresh token|refresh token not found|session.*expired/i.test(message);
}

/**
 * Signed-out recovery: unlock the protected refresh token and rebuild a server session.
 * @param {string} driverId
 */
export async function signInDriverWithBiometrics(driverId) {
  if (!driverId) {
    return { ok: false, message: "Biometric sign-in must be set up again.", clearOffer: true };
  }

  let refreshToken;
  try {
    refreshToken = await unlockStoredRefreshToken(driverId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Biometric sign-in failed.";
    const needsSetup = /must be set up again|not enabled|incomplete/i.test(message);
    return {
      ok: false,
      clearOffer: needsSetup,
      message: needsSetup
        ? "Fingerprint sign-in needs setting up again. Sign in with your password first."
        : message,
    };
  }

  if (!isPlausibleRefreshToken(refreshToken)) {
    await invalidateBiometricAccess(driverId).catch(() => undefined);
    return {
      ok: false,
      clearOffer: true,
      message: "Fingerprint sign-in needs setting up again. Sign in with your password first.",
    };
  }

  console.log(
    "[BIOMETRIC_DEBUG] retrieved token len=" + refreshToken.length + " prefix=" + refreshToken.slice(0, 6),
  );

  const supabase = getSupabaseClient();
  const refreshed = await withTimeout(
    supabase.auth.refreshSession({ refresh_token: refreshToken }),
    REFRESH_SESSION_TIMEOUT_MS,
    null,
  );
  if (!refreshed) {
    console.log("[BIOMETRIC_DEBUG] refreshSession timed out");
    return {
      ok: false,
      message: "Sign-in timed out. Check your connection, then try again or use your password.",
    };
  }

  const { data, error } = refreshed;
  console.log(
    "[BIOMETRIC_DEBUG] refreshSession result: error=" +
      (error ? error.message + " status=" + (error.status ?? "?") + " code=" + (error.code ?? "?") : "none") +
      " hasSession=" + Boolean(data?.session),
  );
  if (error || !data.session) {
    await invalidateBiometricAccess(driverId).catch(() => undefined);
    const raw = error?.message ?? "";
    return {
      ok: false,
      clearOffer: true,
      message: isRefreshTokenFailure(raw)
        ? "Fingerprint sign-in expired. Sign in with your password, then set up fingerprint again."
        : formatAuthError(raw || "Your saved session expired. Sign in with your password."),
    };
  }

  if (data.session.refresh_token) {
    window.setTimeout(() => {
      void saveBiometricCredential({
        driverId,
        refreshToken: data.session.refresh_token,
      }).catch(() => undefined);
    }, 1500);
  }

  const context = await withTimeout(getDriverSessionContext(), SESSION_CONTEXT_TIMEOUT_MS, null);
  if (
    !context ||
    context.routeTarget === "session_error" ||
    context.routeTarget === "not_driver" ||
    !context.driver
  ) {
    await supabase.auth.signOut().catch(() => undefined);
    if (context?.routeTarget === "not_driver") {
      await invalidateBiometricAccess(driverId).catch(() => undefined);
    }
    return {
      ok: false,
      clearOffer: context?.routeTarget === "not_driver",
      message:
        context?.linkError ??
        (!context
          ? "Could not finish signing in in time. Try again, or use your password."
          : "This account can no longer sign in. Ask your transport manager if you need access."),
    };
  }

  rememberLastBiometricDriverId(driverId);
  markBiometricUnlocked();
  return { ok: true, context };
}
