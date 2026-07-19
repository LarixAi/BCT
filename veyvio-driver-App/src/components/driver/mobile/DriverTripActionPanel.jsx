/**
 * Workflow-aware trip actions on the map home sheet.
 * Ensures advanceJobStep runs before / alongside navigation — no dead zone after accept.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Navigation, ChevronRight, AlertCircle } from "lucide-react";
import {
  getOperationalPhase,
  TRIP_PHASE,
  nextJobAction,
} from "@/lib/tripPhase";
import { startJourneyAndNavigate, advanceTripStep } from "@/lib/startJourneyAndNavigate";
import { hasNavCoordinates, getTripNavTarget, openGoogleNavigation } from "@/lib/googleNavLauncher";

export default function DriverTripActionPanel({
  booking,
  driver,
  onBookingUpdate,
  compact = false,
}) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  const phase = getOperationalPhase(booking);
  const target = getTripNavTarget(booking);
  const canNavigate = target && (hasNavCoordinates(target) || Boolean(target.address));

  const run = async (key, fn) => {
    if (loading) return;
    setLoading(key);
    setError("");
    try {
      await fn();
    } catch (err) {
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(null);
    }
  };

  const btn = compact ? "py-3 rounded-xl text-sm" : "py-4 rounded-2xl text-[15px]";

  if (phase === TRIP_PHASE.ACCEPTED) {
    return (
      <ActionBlock error={error} compact={compact}>
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
          Start the journey in the app so dispatch and TfL records show you en route — then open Google Maps.
        </p>
        <button
          type="button"
          disabled={!canNavigate || loading}
          onClick={() =>
            run("start", () =>
              startJourneyAndNavigate({
                booking,
                driver,
                driverLat: driver.current_lat,
                driverLng: driver.current_lng,
                onBookingUpdate,
              })
            )
          }
          className={`w-full flex items-center justify-center gap-2 font-bold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50 ${btn}`}
        >
          {loading === "start" ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Navigation className="w-5 h-5" />
          )}
          {loading === "start" ? "Starting…" : "Start journey & navigate"}
        </button>
        {!canNavigate && <MissingCoordsHint />}
      </ActionBlock>
    );
  }

  if (phase === TRIP_PHASE.EN_ROUTE) {
    const arriveLabel = nextJobAction(booking) || "I've arrived at pickup";
    return (
      <ActionBlock error={error} compact={compact}>
        <button
          type="button"
          disabled={!canNavigate || loading}
          onClick={() =>
            run("nav", () =>
              openGoogleNavigation({
                booking,
                driver,
                driverLat: driver.current_lat,
                driverLng: driver.current_lng,
              })
            )
          }
          className={`w-full flex items-center justify-center gap-2 font-bold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50 mb-2 ${btn}`}
        >
          {loading === "nav" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
          {loading === "nav" ? "Opening…" : "Navigate to pickup"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            run("advance", async () => {
              const updated = await advanceTripStep({ booking, driver, onBookingUpdate });
              if (updated.booking_status === "arrived") return;
            })
          }
          className={`w-full flex items-center justify-center gap-2 font-bold text-black bg-gray-100 active:bg-gray-200 disabled:opacity-50 ${btn}`}
        >
          {loading === "advance" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
          {loading === "advance" ? "Updating…" : arriveLabel}
        </button>
      </ActionBlock>
    );
  }

  if (phase === TRIP_PHASE.IN_PROGRESS) {
    return (
      <ActionBlock error={error} compact={compact}>
        <button
          type="button"
          disabled={!canNavigate || loading}
          onClick={() =>
            run("nav", () =>
              openGoogleNavigation({
                booking,
                driver,
                driverLat: driver.current_lat,
                driverLng: driver.current_lng,
              })
            )
          }
          className={`w-full flex items-center justify-center gap-2 font-bold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50 mb-2 ${btn}`}
        >
          {loading === "nav" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
          {loading === "nav" ? "Opening…" : "Navigate to drop-off"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() =>
            run("complete", async () => {
              const updated = await advanceTripStep({ booking, driver, onBookingUpdate });
              navigate(`/driver/job/${booking.id}`, {
                state: { returnToMap: true, bookingSnapshot: updated },
              });
            })
          }
          className={`w-full flex items-center justify-center gap-2 font-bold text-white bg-black active:bg-gray-900 disabled:opacity-50 ${btn}`}
        >
          {loading === "complete" ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
          {loading === "complete" ? "Completing…" : "Complete trip"}
        </button>
      </ActionBlock>
    );
  }

  return null;
}

function ActionBlock({ children, error, compact }) {
  return (
    <div className={compact ? "" : "mt-4"}>
      {children}
      {error && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function MissingCoordsHint() {
  return (
    <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      Pickup coordinates missing — contact dispatch before starting.
    </p>
  );
}
