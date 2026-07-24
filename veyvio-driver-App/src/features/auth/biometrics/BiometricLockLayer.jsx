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

/** Force-reset a wedged native prompt / busy state (Android timers can pause in background). */
const UNLOCK_WATCHDOG_MS = 22_000;

/**
 * Covers the signed-in app with a biometric lock after cold start or long background.
 * Does not interrupt active external navigation.
 */
export default function BiometricLockLayer({ driverId, active, onUsePassword: onUsePasswordProp }) {
  const [locked, setLocked] = useState(false);
  const [label, setLabel] = useState("Face ID");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** Hide the WebView overlay while the OS biometric sheet is open (Android layering). */
  const [nativePromptActive, setNativePromptActive] = useState(false);
  /** Bumped on resume so the lock DOM is recreated — fixes stale touch targets after idle. */
  const [lockEpoch, setLockEpoch] = useState(0);
  const backgroundedAtRef = useRef(null);
  const evaluatedColdStartRef = useRef(false);
  const unlockGenerationRef = useRef(0);
  const unlockStartedAtRef = useRef(0);
  const unlockingRef = useRef(false);
  const lastActivityRef = useRef(Date.now());

  const resetUnlockAttempt = useCallback((message = "") => {
    unlockGenerationRef.current += 1;
    unlockingRef.current = false;
    setBusy(false);
    setNativePromptActive(false);
    if (message) setError(message);
  }, []);

  const wakeLockUi = useCallback(() => {
    resetUnlockAttempt();
    setLockEpoch((n) => n + 1);
    lastActivityRef.current = Date.now();
  }, [resetUnlockAttempt]);

  /** After long idle the WebView can drop touch targets — refresh before handling a tap. */
  const prepareForInteraction = useCallback(() => {
    const idleMs = Date.now() - lastActivityRef.current;
    lastActivityRef.current = Date.now();
    if (idleMs > 25_000) {
      setLockEpoch((n) => n + 1);
      resetUnlockAttempt();
    }
  }, [resetUnlockAttempt]);

  useEffect(() => {
    if (locked) {
      lastActivityRef.current = Date.now();
    }
  }, [locked]);

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

      // Returning to the app while locked — clear any wedged native prompt from before sleep.
      if (locked) {
        wakeLockUi();
      }

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
          wakeLockUi();
        });
      }
    }).then((handle) => {
      listener = handle;
    });

    return () => {
      cancelled = true;
      void listener?.remove();
    };
  }, [active, driverId, locked, wakeLockUi]);

  // After the screen has been idle (dimmed / switched away), recreate touch targets.
  useEffect(() => {
    if (!locked) return undefined;

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        wakeLockUi();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [locked, wakeLockUi]);

  // Watchdog: native verifyIdentity can hang when Android pauses timers in background.
  useEffect(() => {
    if (!locked) return undefined;

    const tick = window.setInterval(() => {
      if (!unlockingRef.current) return;
      const elapsed = Date.now() - unlockStartedAtRef.current;
      if (elapsed < UNLOCK_WATCHDOG_MS) return;
      wakeLockUi();
      setError("Fingerprint check timed out. Tap unlock to try again, or use your password.");
    }, 2000);

    return () => window.clearInterval(tick);
  }, [locked, wakeLockUi]);

  const onUnlock = useCallback(async () => {
    if (!driverId) return;
    prepareForInteraction();

    // A second tap cancels a wedged attempt and starts fresh.
    if (unlockingRef.current) {
      resetUnlockAttempt();
      await new Promise((resolve) => window.setTimeout(resolve, 120));
    }

    const generation = ++unlockGenerationRef.current;
    unlockingRef.current = true;
    unlockStartedAtRef.current = Date.now();
    setBusy(true);
    setError("");

    // Drop the full-screen WebView layer so Android can show BiometricPrompt on top.
    setNativePromptActive(true);

    try {
      // Wake the native plugin after idle before opening the prompt.
      await checkBiometricAvailability({ useFallback: true });

      const result = await unlockBiometricAppLock(driverId);
      if (generation !== unlockGenerationRef.current) return;
      if (!result.ok) {
        setError(
          /timed out/i.test(result.message)
            ? "Fingerprint check timed out. Try again, or use your password."
            : result.message,
        );
        return;
      }
      setLocked(false);
    } catch {
      if (generation !== unlockGenerationRef.current) return;
      setError("Fingerprint check did not finish. Use password instead, or try again.");
    } finally {
      if (generation === unlockGenerationRef.current) {
        unlockingRef.current = false;
        setNativePromptActive(false);
        setBusy(false);
      }
    }
  }, [driverId, prepareForInteraction, resetUnlockAttempt]);

  const onUsePassword = useCallback(() => {
    prepareForInteraction();
    resetUnlockAttempt();
    setLocked(false);
    onUsePasswordProp?.();
  }, [onUsePasswordProp, prepareForInteraction, resetUnlockAttempt]);

  if (!locked) return null;

  // While the OS prompt is active, do not render a blocking WebView overlay.
  if (nativePromptActive) return null;

  return (
    <BiometricLockScreen
      key={lockEpoch}
      label={label}
      busy={busy}
      error={error}
      onUnlock={() => void onUnlock()}
      onUsePassword={onUsePassword}
    />
  );
}
