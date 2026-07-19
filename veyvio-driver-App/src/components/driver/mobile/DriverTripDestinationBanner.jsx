import { primaryAddressLine } from "@/lib/jobFlow";
import { formatRouteSummary } from "@/lib/formatRouteMeta";

/**
 * Black floating destination bar (Uber-style) shown on the map during active trips.
 */
export default function DriverTripDestinationBanner({ booking, routePreview }) {
  if (!booking) return null;

  const toPickup = ["driver_assigned", "en_route", "arrived"].includes(booking.booking_status);
  const address = toPickup ? booking.pickup_address : booking.dropoff_address;
  const line1 = primaryAddressLine(address);
  const line2 = address?.includes(",") ? address.split(",").slice(1).join(",").trim() : "";
  const eta =
    routePreview && !routePreview.loading ? formatRouteSummary(routePreview) : null;

  return (
    <div className="mx-4 mt-2">
      <div className="bg-black rounded-2xl px-4 py-3 shadow-xl flex items-start gap-3">
        <div className={`w-3 h-3 rounded-sm shrink-0 mt-1 ${toPickup ? "bg-green-500" : "bg-red-500"}`} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white text-base leading-tight truncate">{line1}</p>
          {line2 && (
            <p className="text-gray-400 text-xs mt-0.5 leading-snug line-clamp-2">{line2}</p>
          )}
          {eta && (
            <p className="text-blue-300 text-xs font-semibold mt-1">{eta}</p>
          )}
        </div>
      </div>
    </div>
  );
}
