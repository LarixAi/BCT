import { useState } from "react";
import { Navigation, MapPin, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getTripNavTarget,
  hasNavCoordinates,
  openGoogleNavigation,
  buildAppleMapsUrl,
} from "@/lib/googleNavLauncher";

/**
 * NavigationPanel — shown in DriverJobView.
 *
 * Primary: Google Maps turn-by-turn (external handoff via googleNavLauncher).
 * Secondary: Apple Maps, OpenStreetMap.
 */
export default function NavigationPanel({ booking, driver }) {
  const [loading, setLoading] = useState(false);

  const target = getTripNavTarget(booking);
  if (!target) return null;

  const { leg, lat, lng, address, label } = target;
  const dotColor = leg === "pickup" ? "#4ade80" : "#f87171";
  const canNavigate = hasNavCoordinates(target) || Boolean(address);

  const appleUrl = hasNavCoordinates(target)
    ? buildAppleMapsUrl(lat, lng)
    : `https://maps.apple.com/?daddr=${encodeURIComponent(address)}&dirflg=d`;

  const osmUrl = hasNavCoordinates(target)
    ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=;;${lat},${lng}`
    : `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=html`;

  const handleGoogleNav = async () => {
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

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full shrink-0" style={{ background: dotColor }} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 uppercase tracking-wide">
            Navigate to {label}
          </p>
          <p className="text-sm font-medium text-white truncate">{address}</p>
        </div>
      </div>

      <Button
        type="button"
        onClick={handleGoogleNav}
        disabled={!canNavigate || loading}
        className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
      >
        <Navigation className="w-4 h-4" />
        {loading ? "Opening Google Maps…" : "Google Maps Navigation"}
      </Button>

      {!canNavigate && (
        <p className="text-xs text-amber-400 text-center">
          Add map coordinates for this stop to enable navigation.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <a href={appleUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full text-xs gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-700">
            <MapPin className="w-3.5 h-3.5" />
            Apple Maps
          </Button>
        </a>
        <a href={osmUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full text-xs gap-1.5 border-slate-600 text-slate-300 hover:bg-slate-700">
            <ExternalLink className="w-3.5 h-3.5" />
            OpenStreetMap
          </Button>
        </a>
      </div>

      <p className="text-xs text-slate-500 text-center">
        {leg === "pickup"
          ? "Navigate to collect your passenger"
          : "Navigate to passenger's destination"}
      </p>
    </div>
  );
}
