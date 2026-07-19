/**
 * Primary navigate CTA — opens Google Maps externally (turn-by-turn).
 */
import { useState } from "react";
import { Navigation, AlertCircle } from "lucide-react";
import {
  getTripNavTarget,
  hasNavCoordinates,
  openGoogleNavigation,
} from "@/lib/googleNavLauncher";

export default function DriverNavigateButton({ booking, driver, className = "", compact = false }) {
  const [loading, setLoading] = useState(false);

  const target = getTripNavTarget(booking);
  const canNavigate = target && (hasNavCoordinates(target) || Boolean(target.address));

  const handleNavigate = async () => {
    if (!canNavigate || loading) return;
    setLoading(true);
    try {
      await openGoogleNavigation({
        booking,
        driver,
        showToast: true,
        driverLat: driver.current_lat,
        driverLng: driver.current_lng,
      });
    } catch {
      // Toast shown by launcher
    } finally {
      setLoading(false);
    }
  };

  if (!target) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleNavigate}
        disabled={!canNavigate || loading}
        className={`w-full flex items-center justify-center gap-2 font-bold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:bg-gray-400 ${
          compact ? "py-3 rounded-xl text-sm" : "py-4 rounded-2xl text-[15px]"
        }`}
      >
        <Navigation className="w-5 h-5 shrink-0" />
        {loading ? "Opening…" : `Navigate to ${target.label.toLowerCase()}`}
      </button>
      {!canNavigate && (
        <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          Add map coordinates for this stop to enable navigation.
        </p>
      )}
    </div>
  );
}
