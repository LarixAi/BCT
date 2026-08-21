import { MapPin } from "lucide-react";
import { openGoogleMapsNavigation } from "@/lib/navigation/openExternalNavigation";

/**
 * Read-only route / stops list for the published duty.
 * Drivers cannot add, reorder, skip, or otherwise edit stops — Command owns the itinerary.
 */
export default function DriverJobItineraryPanel({ job, driver }) {
  const stops = job?.stops ?? [];
  if (!stops.length) return null;

  const activeStop =
    stops.find((s) => s.status === "arrived") ?? stops.find((s) => s.status === "planned");

  return (
    <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase text-gray-500">Route / stops</p>
          {activeStop ? (
            <p className="mt-1 text-sm font-semibold text-gray-900">Current: {activeStop.label}</p>
          ) : null}
        </div>
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Stops are set by your operator. Changes must be made in Command — you cannot edit this route
        here.
      </p>

      <ul className="mt-3 space-y-2">
        {stops.map((stop, index) => (
          <li
            key={stop.id}
            className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">
                <span className="mr-1 font-mono text-xs text-gray-500">
                  #{stop.stopOrder ?? index + 1}
                </span>
                <span className="capitalize">{stop.stopType}</span> — {stop.label}
              </p>
              {stop.address ? <p className="truncate text-xs text-gray-500">{stop.address}</p> : null}
              <p className="mt-0.5 text-[10px] capitalize text-gray-400">{stop.status}</p>
            </div>
            {stop.latitude != null && stop.longitude != null ? (
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-[#1eaeae]"
                onClick={() =>
                  void openGoogleMapsNavigation(
                    { latitude: stop.latitude, longitude: stop.longitude, label: stop.label },
                    { driver, job },
                  )
                }
                aria-label={`Navigate to ${stop.label}`}
              >
                <MapPin className="inline h-3 w-3" />
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
