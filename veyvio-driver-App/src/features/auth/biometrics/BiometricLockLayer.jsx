import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { isExternalNavActive } from "@/lib/navigation/externalNavSession";
import BiometricLockScreen from "./BiometricLockScreen";
import { checkBiometricAvailability } from "./biometric-service.js";
import { getBiometricPreference } from "./biometric-preference.js";
import {
  isBiometricUnlockedThisSession,
  markBiometricUnlocked,
} from "./biometric-lock-state.js";
import { shouldRequireBiometricLock, unlockBiometricAppLock } from "./biometric-session.js";

/**
 * Covers the signed-in app with a biometric lock after cold start or long background.
 * Does not interrupt active external navigation.
 */
export default function BiometricLockLayer({ driverId, active, onUsePassword: onUsePasswordProp }) {
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState("Face ID");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const backgroundedAtRef = useRef(null);
  const evaluatedColdStartRef = useRef(false);

  useEffect(() => {
    if (!active || !driverId || !Capacitor.isNativePlatform()) {
      setLocked(false);
      return undefined;
    }

    if (evaluatedColdStartRef.current) return undefined;
    evaluatedColdStartRef.current = true;

    let cancelled = false;
    void (async () => {
      const prefs = getBiometricPreference(driverId);
      if (!prefs.enabled) {
        markBiometricUnlocked();
        return;
      }
      if (isBiometricUnlockedThisSession()) return;

      const availability = await checkBiometricAvailability();
      if (cancelled || !availability.available) return;

      if (
        shouldRequireBiometricLock({
          driverId,
          coldStart: true,
          navigating: isExternalNavActive(),
        })
      ) {
        setLabel(prefs.label || availability.label);
        setLocked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, driverId]);

  useEffect(() => {
    if (!active || !driverId || !Capacitor.isNativePlatform()) return undefined;

    let listener;
    let cancelled = false;

    void App.addListener("appStateChange", ({ isActive }) => {
      if (cancelled) return;

      if (!isActive) {
        backgroundedAtRef.current = Date.now();
        return;
      }

      if (isExternalNavActive()) {
        backgroundedAtRef.current = null;
        return;
      }

      const prefs = getBiometricPreference(driverId);
      if (!prefs.enabled) return;

      const bgAt = backgroundedAtRef.current;
      backgroundedAtRef.current = null;
      if (bgAt == null) return;

      const requireLock = shouldRequireBiometricLock({
        driverId,
        backgroundedForMs: Date.now() - bgAt,
        navigating: false,
      });

      if (requireLock) {
        void checkBiometricAvailability().then((availability) => {
          if (!availability.available) return;
          setLabel(prefs.label || availability.label);
          setError("");
          setLocked(true);
        });
      }
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, [active, driverId]);

  const onUnlock = useCallback(async () => {
    if (!driverId || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await unlockBiometricAppLock(driverId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLocked(false);
    } catch {
      setError("Fingerprint check did not finish. Use password instead, or try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, driverId]);

  const onUsePassword = useCallback(() => {
    // Always allow escape — even if a biometric prompt is still busy.
    setBusy(false);
    setLocked(false);
    onUsePasswordProp?.();
  }, [onUsePasswordProp]);

  if (!locked) return null;

  return (
    <BiometricLockScreen
      label={label}
      busy={busy}
      error={error}
      onUnlock={() => void onUnlock()}
      onUsePassword={onUsePassword}
    />
  );
}
