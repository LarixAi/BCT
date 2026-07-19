import { lazy, Suspense } from "react";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { useDriverMatchedTrip } from "@/hooks/useDriverMatchedTrip";

// Pulls in react-leaflet/maplibre for the live trip map — only worth loading
// once a trip is actually matched, not on every screen of the app.
const DriverMatchedTripOverlay = lazy(() => import("@/components/driver/phv-job/DriverMatchedTripOverlay"));

/** Global PHV matched-trip card — shown over any driver screen when a trip is assigned. */
export default function DriverMatchedTripLayer() {
  const { driver, session, screen } = useDriverSupabaseAuth();
  const enabled = screen === "app" && Boolean(driver?.id && session?.userId);

  const matched = useDriverMatchedTrip({
    driver,
    userId: session?.userId,
    enabled,
  });

  if (!enabled || !matched.visible) return null;

  return (
    <Suspense fallback={null}>
      <DriverMatchedTripOverlay
        trip={matched.trip}
        driver={driver}
        notificationId={matched.notificationId}
        onDismiss={matched.dismiss}
      />
    </Suspense>
  );
}
