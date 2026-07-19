import { Capacitor } from "@capacitor/core";
import { toast } from "@/components/ui/use-toast";

export const NAV_ERROR = {
  NO_TRIP: "no_trip",
  NO_DESTINATION: "no_destination",
  LAUNCH_FAILED: "launch_failed",
  GOOGLE_UNAVAILABLE: "google_unavailable",
};

/** Map internal errors to driver-friendly copy. */
export function getNavigationErrorMessage(error, platform = Capacitor.getPlatform()) {
  const code = error?.code || error?.message;
  const raw = typeof error === "string" ? error : error?.message || "";

  if (code === NAV_ERROR.NO_TRIP || raw.includes("No active trip")) {
    return "No active trip to navigate to.";
  }
  if (code === NAV_ERROR.NO_DESTINATION || raw.includes("no coordinates")) {
    return "This stop has no map coordinates yet. Contact dispatch.";
  }
  if (code === NAV_ERROR.GOOGLE_UNAVAILABLE) {
    return platform === "ios"
      ? "Google Maps isn't installed. We opened Apple Maps instead."
      : "Google Maps isn't installed. Install it from the Play Store, or use the browser link.";
  }
  if (raw.includes("android_google_navigation")) {
    return "Couldn't open Google Maps navigation. Try again or install Google Maps.";
  }

  return "Couldn't open turn-by-turn navigation. Check that a maps app is installed and try again.";
}

export function showNavigationFailureToast(error, { usedFallback = false, fallbackName } = {}) {
  if (usedFallback && fallbackName) {
    toast({
      title: "Opened in " + fallbackName,
      description: "Google Maps wasn't available — using " + fallbackName + " instead.",
    });
    return;
  }

  toast({
    variant: "destructive",
    title: "Navigation unavailable",
    description: getNavigationErrorMessage(error),
  });
}

export class NavigationLaunchError extends Error {
  constructor(message, { code, launchMethod, cause } = {}) {
    super(message);
    this.name = "NavigationLaunchError";
    this.code = code || NAV_ERROR.LAUNCH_FAILED;
    this.launchMethod = launchMethod || null;
    this.cause = cause;
  }
}
