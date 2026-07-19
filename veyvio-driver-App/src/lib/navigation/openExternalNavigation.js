import { Capacitor } from "@capacitor/core";
import { AppLauncher } from "@capacitor/app-launcher";
import { toast } from "@/components/ui/use-toast";
import { buildUniversalGoogleMapsUrl } from "@/lib/googleNavLauncher";
import { logNavigationTelemetry } from "@/lib/navigation/navigationTelemetry";
import { startExternalNavSession, loadExternalNavSession, clearExternalNavSession } from "@/lib/navigation/externalNavSession";
import { prepareNavOverlayForExternalMaps, hideFloatingBubble } from "@/lib/navigation/floatingBubble";
import { syncInCarActiveTrip } from "@/lib/navigation/activeTripInCar";

let launchInFlight = false;

export function stopToNavDestination(stop) {
  if (!stop) return null;
  const lat = stop.lat ?? stop.latitude;
  const lng = stop.lng ?? stop.longitude;
  if (lat == null || lng == null) return null;
  return {
    latitude: lat,
    longitude: lng,
    label: stop.shortLabel ?? stop.label ?? "Stop",
    address: stop.address ?? null,
  };
}

async function tryOpenUrl(url) {
  if (Capacitor.isNativePlatform()) {
    try {
      const { completed } = await AppLauncher.openUrl({ url });
      if (completed) return true;
      return !url.startsWith("http://") && !url.startsWith("https://");
    } catch {
      return false;
    }
  }

  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened) return true;
  window.location.href = url;
  return true;
}

function buildWazeUrl({ latitude, longitude }) {
  return `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
}

function buildAndroidGoogleNavUrl({ latitude, longitude }) {
  return `google.navigation:q=${latitude},${longitude}&mode=d`;
}

export async function openGoogleMapsNavigation(destination, { driver, job } = {}) {
  if (!destination?.latitude || !destination?.longitude) {
    toast({ title: "Navigation unavailable", description: "This stop has no coordinates." });
    return { ok: false };
  }

  if (launchInFlight) return { ok: true, debounced: true };
  launchInFlight = true;

  try {
    const platform = Capacitor.getPlatform();
    const universal = buildUniversalGoogleMapsUrl(destination.latitude, destination.longitude);
    let url = universal;
    if (platform === "android") {
      url = buildAndroidGoogleNavUrl(destination);
    }

    startExternalNavSession({
      destination,
      jobId: job?.id ?? `nav-${Date.now()}`,
      jobRoute: job?.id ? `/job/${job.id}` : null,
      leg: destination.label?.toLowerCase().includes("drop") ? "dropoff" : "pickup",
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

    let ok = await tryOpenUrl(url);
    if (!ok && platform === "android") {
      ok = await tryOpenUrl(universal);
    }

    if (ok) {
      void syncInCarActiveTrip(loadExternalNavSession());
      toast({
        title: "Google Maps opened",
        description:
          "Use Google Maps voice for directions. Tap the Veyvio button to return to your trip.",
      });
      void logNavigationTelemetry({
        driver,
        job,
        action: "driver_opened_google_maps",
        metadata: {
          destination_lat: destination.latitude,
          destination_lng: destination.longitude,
          destination_label: destination.label,
        },
      });
      return { ok: true };
    }

    clearExternalNavSession();
    await hideFloatingBubble();
    toast({ title: "Navigation unavailable", description: "Google Maps could not be opened." });
    return { ok: false };
  } finally {
    window.setTimeout(() => {
      launchInFlight = false;
    }, 2500);
  }
}

export async function openWazeNavigation(destination, { driver, job } = {}) {
  if (!destination?.latitude || !destination?.longitude) {
    toast({ title: "Navigation unavailable", description: "This stop has no coordinates." });
    return { ok: false };
  }

  const wazeUrl = buildWazeUrl(destination);
  let ok = await tryOpenUrl(wazeUrl);

  if (!ok) {
    return openGoogleMapsNavigation(destination, { driver, job });
  }

  void logNavigationTelemetry({
    driver,
    job,
    action: "driver_opened_waze",
    metadata: {
      destination_lat: destination.latitude,
      destination_lng: destination.longitude,
      destination_label: destination.label,
    },
  });

  return { ok: true };
}
