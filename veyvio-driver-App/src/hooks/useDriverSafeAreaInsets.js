import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

/** Fallback when env(safe-area-inset-bottom) is 0 on Android WebView (gesture pill). */
const ANDROID_GESTURE_FALLBACK_PX = 24;
/** Fallback status bar inset when env(safe-area-inset-top) is 0. */
const ANDROID_STATUS_FALLBACK_PX = 28;

function measureEnvInset(edge) {
  const prop = edge === "top" ? "padding-top" : "padding-bottom";
  const env = edge === "top" ? "env(safe-area-inset-top,0px)" : "env(safe-area-inset-bottom,0px)";
  const pos = edge === "top" ? "top:0" : "bottom:0";
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;${pos};left:0;${prop}:${env};visibility:hidden;pointer-events:none`;
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe)[prop]) || 0;
  document.body.removeChild(probe);
  return px;
}

/**
 * Sets --driver-safe-bottom and --driver-safe-top on :root.
 */
export function useDriverSafeAreaInsets() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const bottomPx = measureEnvInset("bottom");
      if (bottomPx > 0) {
        root.style.setProperty("--driver-safe-bottom", `${bottomPx}px`);
      } else if (Capacitor.isNativePlatform()) {
        root.style.setProperty("--driver-safe-bottom", `${ANDROID_GESTURE_FALLBACK_PX}px`);
      } else {
        root.style.setProperty(
          "--driver-safe-bottom",
          "max(16px, env(safe-area-inset-bottom, 0px))"
        );
      }

      const topPx = measureEnvInset("top");
      if (topPx > 0) {
        root.style.setProperty("--driver-safe-top", `${topPx}px`);
      } else if (Capacitor.isNativePlatform()) {
        root.style.setProperty("--driver-safe-top", `${ANDROID_STATUS_FALLBACK_PX}px`);
      } else {
        root.style.setProperty(
          "--driver-safe-top",
          "max(0px, env(safe-area-inset-top, 0px))"
        );
      }
    };

    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--driver-safe-bottom");
      root.style.removeProperty("--driver-safe-top");
    };
  }, []);
}

export function driverSafeBottomHeight() {
  return "var(--driver-safe-bottom, 24px)";
}
