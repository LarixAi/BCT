/**
 * Open Google Maps for live turn-by-turn navigation (external handoff).
 *
 * Preview routes stay on Leaflet via OSRM (fetchRoadRoute.js).
 * Do not use Google Directions/Routes geometry on Leaflet — see NAVIGATION_PLAN.md.
 */
import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";
import { logBookingEvent } from "@/lib/auditLogger";
import {
  NAV_ERROR,
  NavigationLaunchError,
  showNavigationFailureToast,
} from "@/lib/navigationFeedback";
import { toast } from "@/components/ui/use-toast";
import { startExternalNavSession, loadExternalNavSession, clearExternalNavSession } from "@/lib/navigation/externalNavSession";
import { prepareNavOverlayForExternalMaps, hideFloatingBubble } from "@/lib/navigation/floatingBubble";
import { syncInCarActiveTrip } from "@/lib/navigation/activeTripInCar";

const UTM_SOURCE = "phfs_driver";
const UTM_CAMPAIGN = "driver_navigation";

/** Prevent double-tap launching two intents back-to-back (kills navigation). */
let launchInFlight = false;

/** Which leg to navigate based on trip status. */
export function getTripNavTarget(booking) {
  if (!booking) return null;

  const toPickup = ["driver_assigned", "en_route", "arrived"].includes(booking.booking_status);
  const leg = toPickup ? "pickup" : "dropoff";
  const lat = toPickup ? booking.pickup_lat : booking.dropoff_lat;
  const lng = toPickup ? booking.pickup_lng : booking.dropoff_lng;
  const address = toPickup ? booking.pickup_address : booking.dropoff_address;
  const label = toPickup ? "Pickup" : "Drop-off";

  return { leg, lat, lng, address, label };
}

export function hasNavCoordinates(target) {
  return target != null && target.lat != null && target.lng != null;
}

export function distanceMiles(lat1, lng1, lat2, lng2) {
  if ([lat1, lng1, lat2, lng2].some((v) => v == null)) return null;
  const R = 3958.8;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildUniversalGoogleMapsUrl(lat, lng, travelMode = "driving") {
  const params = new URLSearchParams({
    api: "1",
    destination: `${lat},${lng}`,
    travelmode: travelMode,
    dir_action: "navigate",
    utm_source: UTM_SOURCE,
    utm_campaign: UTM_CAMPAIGN,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildUniversalGoogleMapsUrlFromAddress(address, travelMode = "driving") {
  const params = new URLSearchParams({
    api: "1",
    destination: address,
    travelmode: travelMode,
    dir_action: "navigate",
    utm_source: UTM_SOURCE,
    utm_campaign: UTM_CAMPAIGN,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Android — documented turn-by-turn entry (current location → destination). */
export function buildAndroidNavigationUrl(lat, lng) {
  return `google.navigation:q=${lat},${lng}&mode=d`;
}

/**
 * Android intent URL — pins com.google.android.apps.maps so Chrome/WebView
 * doesn't steal the handoff. See Google Maps Platform Android intents docs.
 */
export function buildAndroidMapsIntentUrl(lat, lng, fallbackHttps) {
  const daddr = `${lat},${lng}`;
  const fallback = encodeURIComponent(fallbackHttps);
  return (
    `intent://maps.google.com/maps?f=d&daddr=${daddr}&dirflg=d` +
    `#Intent;scheme=geo;package=com.google.android.apps.maps;` +
    `S.browser_fallback_url=${fallback};end`
  );
}

/** iOS Google Maps app scheme. */
export function buildIosGoogleMapsUrl(lat, lng) {
  return `comgooglemaps://?saddr=&daddr=${lat},${lng}&directionsmode=driving`;
}

export function buildAppleMapsUrl(lat, lng) {
  return `https://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`;
}

export function buildAppleMapsUrlFromAddress(address) {
  return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;
}

/**
 * Open external URL.
 * On Android, google.navigation / intent:// often return completed:false even when
 * Maps opened — treat that as success so we don't fire a second URL (kills navigation).
 */
async function tryOpenUrlOnce(url) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { completed } = await AppLauncher.openUrl({ url });
      if (completed) return true;
      const isNativeScheme =
        !url.startsWith("http://") && !url.startsWith("https://");
      return isNativeScheme;
    } catch {
      return false;
    }
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return true;

  window.location.href = url;
  return true;
}

function scheduleNavigationLog(payload) {
  // Defer so Base44 logging doesn't run in the same tick as the intent handoff
  window.setTimeout(() => {
    logBookingEvent(payload).catch(() => {});
  }, 2500);
}

function logNavigationLaunch({
  bookingId,
  driver,
  target,
  launchMethod,
  result,
  errorMessage,
  distanceMi,
}) {
  if (!bookingId) return;

  const actorName = driver?.full_name || "Driver";
  const desc =
    result === "ok"
      ? `Opened navigation (${launchMethod}) → ${target.label}: ${target.address || `${target.lat},${target.lng}`}`
      : `Navigation launch failed (${launchMethod}): ${errorMessage || "unknown"}`;

  scheduleNavigationLog({
    bookingId,
    eventType: result === "ok" ? "navigation_launched" : "navigation_failed",
    actorId: driver?.id,
    actorName,
    actorRole: "driver",
    description: desc,
    metadata: {
      leg: target.leg,
      launch_method: launchMethod,
      destination_lat: target.lat,
      destination_lng: target.lng,
      destination_label: target.label,
      distance_mi: distanceMi,
      result,
      error: errorMessage || null,
    },
  });
}

/**
 * Pick exactly one launch URL for this platform — never fire multiple intents.
 */
function pickLaunchUrl({ platform, lat, lng, address, universal }) {
  // google.navigation: is Google's documented turn-by-turn entry on Android.
  if (platform === "android" && lat != null && lng != null) {
    return {
      method: "android_google_navigation",
      url: buildAndroidNavigationUrl(lat, lng),
    };
  }
  if (platform === "ios" && lat != null && lng != null) {
    return { method: "ios_comgooglemaps", url: buildIosGoogleMapsUrl(lat, lng) };
  }
  return { method: "universal_maps_url", url: universal };
}

function warnIfVeryClose({ target, driverLat, driverLng }) {
  if (driverLat == null || driverLng == null || !hasNavCoordinates(target)) return;

  const dist = distanceMiles(driverLat, driverLng, target.lat, target.lng);
  if (dist == null || dist > 0.08) return;

  toast({
    title: "You're already very close",
    description:
      dist < 0.02
        ? `You're at the ${target.label.toLowerCase()} — Maps may end navigation immediately.`
        : `Only ~${Math.max(1, Math.round(dist * 1760))} yd to ${target.label.toLowerCase()}.`,
  });
}

/**
 * Open Google Maps for the correct trip leg (pickup or dropoff).
 * @returns {{ ok: boolean, launchMethod: string, usedFallback?: boolean }}
 */
export async function openGoogleNavigation({
  booking,
  driver,
  showToast = true,
  driverLat,
  driverLng,
}) {
  if (launchInFlight) {
    return { ok: true, launchMethod: "debounced" };
  }

  const target = getTripNavTarget(booking);
  if (!target) {
    const err = new NavigationLaunchError("No active trip to navigate.", {
      code: NAV_ERROR.NO_TRIP,
    });
    if (showToast) showNavigationFailureToast(err);
    throw err;
  }

  if (!hasNavCoordinates(target) && !target.address) {
    const err = new NavigationLaunchError("Destination has no coordinates or address.", {
      code: NAV_ERROR.NO_DESTINATION,
    });
    if (showToast) showNavigationFailureToast(err);
    throw err;
  }

  const { lat, lng } = target;
  const platform = Capacitor.getPlatform();
  const universal = hasNavCoordinates(target)
    ? buildUniversalGoogleMapsUrl(lat, lng)
    : buildUniversalGoogleMapsUrlFromAddress(target.address);

  const originLat = driverLat ?? driver?.current_lat;
  const originLng = driverLng ?? driver?.current_lng;
  const distanceMi =
    originLat != null && originLng != null && hasNavCoordinates(target)
      ? distanceMiles(originLat, originLng, lat, lng)
      : null;

  launchInFlight = true;
  try {
    startExternalNavSession({
      destination: {
        latitude: lat,
        longitude: lng,
        label: target.label,
      },
      jobId: booking.id ?? `nav-${Date.now()}`,
      jobRoute: booking.id ? `/job/${booking.id}` : null,
      leg: target.leg,
    });

    if (platform === "android") {
      const overlay = await prepareNavOverlayForExternalMaps(loadExternalNavSession());
      if (overlay.permissionDenied) {
        clearExternalNavSession();
        toast({
          title: "Turn on overlay permission",
          description:
            "Open Settings → Navigation return button → Allow display over other apps, then tap Navigate again.",
        });
        return { ok: false, needOverlayPermission: true };
      }
    }

    const primary = pickLaunchUrl({ platform, lat, lng, address: target.address, universal });
    let launched = await tryOpenUrlOnce(primary.url);
    let method = primary.method;

    // Android: intent URL only if google.navigation: could not be handled
    if (!launched && platform === "android" && lat != null && lng != null) {
      const intentUrl = buildAndroidMapsIntentUrl(lat, lng, universal);
      launched = await tryOpenUrlOnce(intentUrl);
      method = "android_maps_intent";
    }

    // iOS / web fallback
    if (!launched && method !== "universal_maps_url") {
      launched = await tryOpenUrlOnce(universal);
      method = "universal_maps_url";
    }

    // iOS Apple Maps last resort
    if (!launched && platform === "ios") {
      const appleUrl = hasNavCoordinates(target)
        ? buildAppleMapsUrl(lat, lng)
        : buildAppleMapsUrlFromAddress(target.address);
      launched = await tryOpenUrlOnce(appleUrl);
      if (launched) {
        method = "apple_maps_fallback";
        if (showToast) {
          showNavigationFailureToast(
            new NavigationLaunchError("Google Maps unavailable", {
              code: NAV_ERROR.GOOGLE_UNAVAILABLE,
            }),
            { usedFallback: true, fallbackName: "Apple Maps" }
          );
        }
      }
    }

    if (launched) {
      void syncInCarActiveTrip(loadExternalNavSession());
      toast({
        title: "Google Maps opened",
        description: "Tap the Veyvio button to return to your trip.",
      });
      warnIfVeryClose({ target, driverLat: originLat, driverLng: originLng });
      logNavigationLaunch({
        bookingId: booking.id,
        driver,
        target,
        launchMethod: method,
        result: "ok",
        distanceMi,
      });
      return { ok: true, launchMethod: method };
    }

    logNavigationLaunch({
      bookingId: booking.id,
      driver,
      target,
      launchMethod: method,
      result: "failed",
      errorMessage: "No handler could open the navigation URL",
      distanceMi,
    });

    clearExternalNavSession();
    await hideFloatingBubble();

    const err = new NavigationLaunchError("Could not open Google Maps.", {
      code: NAV_ERROR.LAUNCH_FAILED,
    });
    if (showToast) showNavigationFailureToast(err);
    throw err;
  } finally {
    window.setTimeout(() => {
      launchInFlight = false;
    }, 3000);
  }
}
