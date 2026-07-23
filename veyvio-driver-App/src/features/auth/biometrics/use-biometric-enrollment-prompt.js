import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  declineBiometricEnrollmentPermanently,
  enableBiometricSignIn,
  remindBiometricEnrollmentNextWeek,
  shouldOfferBiometricEnrollment,
} from "./biometric-enrollment.js";
import { checkBiometricAvailability } from "./biometric-service.js";

function sessionOfferKey(driverId) {
  return `veyvio.biometric.offer.session.${driverId}`;
}

function hasOfferedThisSession(driverId) {
  try {
    return sessionStorage.getItem(sessionOfferKey(driverId)) === "1";
  } catch {
    return false;
  }
}

function markOfferedThisSession(driverId) {
  try {
    sessionStorage.setItem(sessionOfferKey(driverId), "1");
  } catch {
    // ignore
  }
}

/**
 * Progressive enrollment controller for Walkaround success / Home delay.
 * @param {{
 *   driverId: string | null | undefined,
 *   ready: boolean,
 *   delayMs?: number,
 * }} opts
 */
export function useBiometricEnrollmentPrompt({ driverId, ready, delayMs = 3500 }) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("Face ID");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [successLabel, setSuccessLabel] = useState("");
  const offeredRef = useRef(false);

  useEffect(() => {
    if (!ready || !driverId || !Capacitor.isNativePlatform()) return undefined;
    if (offeredRef.current || hasOfferedThisSession(driverId)) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const offer = await shouldOfferBiometricEnrollment(driverId);
        if (cancelled || !offer) return;
        const availability = await checkBiometricAvailability();
        if (cancelled || !availability.available) return;
        offeredRef.current = true;
        markOfferedThisSession(driverId);
        setLabel(availability.label);
        setOpen(true);
      })();
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ready, driverId, delayMs]);

  const close = useCallback(() => {
    setOpen(false);
    setError("");
  }, []);

  const onEnable = useCallback(async () => {
    if (!driverId || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await enableBiometricSignIn(driverId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSuccessLabel(result.label);
      setOpen(true);
      // Keep the success state visible briefly so drivers know the next sign-in
      // screen will show “Sign in with Fingerprint”.
      window.setTimeout(() => {
        setOpen(false);
        setSuccessLabel("");
      }, 1800);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not set up fingerprint. Try again.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }, [busy, driverId]);

  const onRemindNextWeek = useCallback(() => {
    if (!driverId) return;
    remindBiometricEnrollmentNextWeek(driverId);
    close();
  }, [close, driverId]);

  const onDontAskAgain = useCallback(() => {
    if (!driverId) return;
    declineBiometricEnrollmentPermanently(driverId);
    close();
  }, [close, driverId]);

  return {
    open,
    setOpen,
    label,
    busy,
    error,
    successLabel,
    clearSuccess: () => setSuccessLabel(""),
    onEnable,
    onRemindNextWeek,
    onDontAskAgain,
  };
}
