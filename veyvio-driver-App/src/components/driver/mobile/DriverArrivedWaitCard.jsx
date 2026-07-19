import { Phone, User, Navigation, SlidersHorizontal, AlignJustify } from "lucide-react";
import { useWaitingTimer } from "@/hooks/useWaitingTimer";
import { jobStartButtonLabel } from "@/lib/jobFlow";

function stopTap(e) {
  e.stopPropagation();
}

/**
 * Uber-style "waiting at pickup" card — timer, passenger row, start trip CTA.
 */
export default function DriverArrivedWaitCard({
  booking,
  onOpenFilters,
  onOpenOptions,
  onCall,
  onStartTrip,
  starting = false,
}) {
  const timer = useWaitingTimer(booking.arrival_time || booking.dispatch_time);
  const firstName = booking.customer_name?.split(" ")[0] || "Passenger";

  return (
    <div className="flex flex-col touch-auto">
      <div className="flex items-center justify-between px-3 pt-1 pb-2">
        <button
          type="button"
          aria-label="Trip filters"
          onClick={onOpenFilters}
          onPointerDown={stopTap}
          className="w-11 h-11 flex items-center justify-center shrink-0 rounded-full active:bg-gray-100"
        >
          <SlidersHorizontal className="w-5 h-5 text-gray-700" />
        </button>

        <div className="flex flex-col items-center -mt-1 pointer-events-none">
          <div className="bg-white border border-gray-200 rounded-full px-4 py-1 shadow-sm">
            <span className="font-bold text-black text-sm tabular-nums">{timer}</span>
          </div>
          <div className="w-16 h-0.5 bg-black rounded-full mt-0.5" />
        </div>

        <button
          type="button"
          aria-label="Trip options"
          onClick={onOpenOptions}
          onPointerDown={stopTap}
          className="w-11 h-11 flex items-center justify-center shrink-0 rounded-full active:bg-gray-100"
        >
          <AlignJustify className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      <div className="flex items-center justify-between px-5 py-3">
        {booking.customer_phone ? (
          <a
            href={`tel:${booking.customer_phone}`}
            onClick={stopTap}
            onPointerDown={stopTap}
            className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
            aria-label="Call passenger"
          >
            <Phone className="w-5 h-5 text-black" />
          </a>
        ) : (
          <div className="w-12 h-12" aria-hidden />
        )}

        <p className="font-black text-black text-2xl truncate px-3 text-center flex-1">
          {firstName}
        </p>

        <button
          type="button"
          aria-label="Passenger details"
          onClick={onOpenOptions}
          onPointerDown={stopTap}
          className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
        >
          <User className="w-5 h-5 text-black" />
        </button>
      </div>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={onStartTrip}
          onPointerDown={stopTap}
          disabled={starting}
          className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-60 rounded-2xl py-4 px-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
        >
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shrink-0">
            <Navigation className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-black text-base">
            {starting ? "Starting..." : jobStartButtonLabel(booking)}
          </span>
        </button>
      </div>
    </div>
  );
}
