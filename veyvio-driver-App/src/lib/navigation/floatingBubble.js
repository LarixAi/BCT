import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { toast } from "@/components/ui/use-toast";
import { buildActiveTripCompanion } from "@/lib/navigation/activeTripCompanion";
import { isFloatingBubbleEnabled } from "@/lib/navigation/floatingBubblePrefs";

const DriverFloatingBubble = registerPlugin("DriverFloatingBubble");

export function isFloatingBubbleSupported() {
  return Capacitor.getPlatform() === "android";
}

export async function checkOverlayPermission() {
  if (!isFloatingBubbleSupported()) return { granted: false, supported: false };
  try {
    const result = await DriverFloatingBubble.checkOverlayPermission();
    return { granted: Boolean(result?.granted), supported: true };
  } catch (err) {
    console.warn("[floatingBubble] checkOverlayPermission failed:", err);
    return { granted: false, supported: true };
  }
}

export async function requestOverlayPermission() {
  if (!isFloatingBubbleSupported()) return { granted: false };
  try {
    const result = await DriverFloatingBubble.requestOverlayPermission();
    return { granted: Boolean(result?.granted) };
  } catch (err) {
    console.warn("[floatingBubble] requestOverlayPermission failed:", err);
    return { granted: false };
  }
}

function delay(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForAppForeground(timeoutMs = 120_000) {
  const state = await App.getState();
  if (!state.isActive) {
    return waitForNextActive(timeoutMs);
  }

  await delay(350);
  const afterDelay = await App.getState();
  if (!afterDelay.isActive) {
    return waitForNextActive(timeoutMs);
  }

  return waitForNextActive(Math.min(timeoutMs, 15_000), { requireInactiveFirst: true });
}

function waitForNextActive(timeoutMs, { requireInactiveFirst = false } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let sawInactive = !requireInactiveFirst;
    let listenerHandle = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      void listenerHandle?.remove();
      resolve();
    };

    const timer = window.setTimeout(finish, timeoutMs);

    void App.addListener("appStateChange", ({ isActive }) => {
      if (!isActive) {
        sawInactive = true;
        return;
      }
      if (sawInactive) {
        void delay(250).then(finish);
      }
    }).then((handle) => {
      listenerHandle = handle;
    });
  });
}

/**
 * Open Android overlay settings and wait for the driver to return.
 * @returns {{ granted: boolean, skipped?: boolean }}
 */
export async function ensureOverlayPermissionBeforeNav() {
  if (!isFloatingBubbleSupported() || !isFloatingBubbleEnabled()) {
    return { granted: false, skipped: true };
  }

  const initial = await checkOverlayPermission();
  if (initial.granted) {
    return { granted: true };
  }

  toast({
    title: "Allow Veyvio over Google Maps",
    description:
      "On the next screen, turn on “Display over other apps” for Veyvio Driver, then come back here.",
    duration: 8000,
  });

  await delay(700);

  try {
    await requestOverlayPermission();
  } catch (err) {
    console.warn("[overlay-permission] requestOverlayPermission failed:", err);
  }

  await waitForAppForeground();

  const after = await checkOverlayPermission();
  return { granted: after.granted };
}

export async function canShowFloatingBubble() {
  if (!isFloatingBubbleSupported() || !isFloatingBubbleEnabled()) {
    return false;
  }
  const { granted } = await checkOverlayPermission();
  return granted;
}

export async function showFloatingBubble(companion) {
  if (!companion?.jobId || !isFloatingBubbleSupported() || !isFloatingBubbleEnabled()) {
    return { shown: false };
  }

  const { granted } = await checkOverlayPermission();
  if (!granted) {
    return { shown: false, reason: "permission_denied" };
  }

  try {
    await DriverFloatingBubble.show({
      jobId: companion.jobId,
      jobRoute: companion.jobRoute ?? `/job/${companion.jobId}`,
    });
    return { shown: true };
  } catch (err) {
    console.warn("[floatingBubble] show failed:", err);
    return { shown: false, reason: "native_error" };
  }
}

export async function hideFloatingBubble() {
  if (!isFloatingBubbleSupported()) return;
  try {
    await DriverFloatingBubble.hide();
  } catch (err) {
    console.warn("[floatingBubble] hide failed:", err);
  }
}

export async function showFloatingBubbleForSession(session) {
  if (!session) return { shown: false };
  const companion = buildActiveTripCompanion({
    jobId: session.jobId,
    jobRoute: session.jobRoute,
    leg: session.leg,
    destination: session.destination,
  });
  return showFloatingBubble(companion);
}

/**
 * Ensure overlay permission before opening external maps.
 * The floating button is shown only when the app goes to the background (see FloatingBubbleLayer).
 * Returns permissionDenied when Maps should not open yet.
 */
export async function prepareNavOverlayForExternalMaps(session) {
  if (!isFloatingBubbleSupported() || !isFloatingBubbleEnabled()) {
    return { shown: false, reason: "unsupported_or_disabled", permissionDenied: false };
  }
  if (!session?.jobId) {
    return { shown: false, reason: "no_job", permissionDenied: false };
  }

  const permission = await ensureOverlayPermissionBeforeNav();
  if (permission.skipped) {
    return { shown: false, reason: "disabled", permissionDenied: false };
  }
  if (!permission.granted) {
    return { shown: false, reason: "permission_denied", permissionDenied: true };
  }

  return { shown: false, reason: "deferred_until_background", permissionDenied: false };
}

export function addFloatingBubbleTapListener(handler) {
  if (!isFloatingBubbleSupported()) {
    return Promise.resolve({ remove: async () => {} });
  }
  return DriverFloatingBubble.addListener("bubbleTap", handler);
}
