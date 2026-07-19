import { MapPin, AlertCircle } from "lucide-react";

/**
 * Shown on the driver map when location is unavailable — route preview may be inaccurate.
 */
export default function DriverGpsBanner({ status = "unavailable" }) {
  if (status === "ok") return null;

  const isDenied = status === "denied";

  return (
    <div className="mx-4 mt-2">
      <div
        className={`rounded-xl px-3 py-2.5 shadow-lg flex items-start gap-2 ${
          isDenied ? "bg-amber-500 text-black" : "bg-gray-900/90 text-white"
        }`}
      >
        {isDenied ? (
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        ) : (
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 text-xs leading-snug">
          <p className="font-bold">
            {isDenied ? "Location access off" : "Finding your location…"}
          </p>
          <p className={isDenied ? "text-black/80" : "text-gray-300"}>
            {isDenied
              ? "Enable location in settings for an accurate route preview. Navigation still works via Google Maps."
              : "Route preview will update once GPS is available."}
          </p>
        </div>
      </div>
    </div>
  );
}
