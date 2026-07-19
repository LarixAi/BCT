import { Phone, MapPin, User, X, CreditCard, Banknote, Building2 } from "lucide-react";
import { format } from "date-fns";
import DriverTripActionPanel from "./DriverTripActionPanel";

function stopTap(e) {
  e.stopPropagation();
}

const PAYMENT = {
  card: { label: "Card", Icon: CreditCard },
  cash: { label: "Cash", Icon: Banknote },
  account: { label: "Account", Icon: Building2 },
};

/**
 * Full trip / passenger options panel (opened from arrived profile button or level 3).
 */
export default function DriverTripOptionsPanel({ booking, driver, onClose, onOpenTrip, onBookingUpdate }) {
  const pay = PAYMENT[booking.payment_method] || PAYMENT.cash;
  const PayIcon = pay.Icon;
  const fare = booking.fare_estimate ?? booking.final_fare;

  return (
    <div className="flex flex-col h-full min-h-0 touch-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
        <h2 className="font-black text-black text-base">Trip details</h2>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          onPointerDown={stopTap}
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        <DriverTripActionPanel
          booking={booking}
          driver={driver}
          onBookingUpdate={onBookingUpdate}
          compact
        />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-gray-700" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-black text-lg">{booking.customer_name}</p>
            <p className="text-gray-500 text-sm">
              {booking.passenger_count || 1} passenger{(booking.passenger_count || 1) > 1 ? "s" : ""}
              {booking.booking_reference ? ` · ${booking.booking_reference}` : ""}
            </p>
          </div>
          {booking.customer_phone && (
            <a
              href={`tel:${booking.customer_phone}`}
              onClick={stopTap}
              className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center shrink-0"
              aria-label="Call passenger"
            >
              <Phone className="w-5 h-5 text-white" />
            </a>
          )}
        </div>

        {booking.special_requirements && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900">
            {booking.special_requirements}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Pickup</p>
              <p className="font-semibold text-black text-sm">{booking.pickup_address}</p>
              {booking.pickup_postcode && (
                <p className="text-xs text-gray-400">{booking.pickup_postcode}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-700 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Dropoff</p>
              <p className="font-semibold text-black text-sm">{booking.dropoff_address}</p>
              {booking.dropoff_postcode && (
                <p className="text-xs text-gray-400">{booking.dropoff_postcode}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
          <PayIcon className="w-5 h-5 text-gray-600 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Payment</p>
            <p className="font-semibold text-black text-sm">{pay.label}</p>
          </div>
          {fare != null && (
            <p className="ml-auto font-black text-black text-lg">£{Number(fare).toFixed(2)}</p>
          )}
        </div>

        {(booking.dispatch_time || booking.arrival_time) && (
          <div className="text-xs text-gray-500 space-y-1">
            {booking.dispatch_time && (
              <p>En route since {format(new Date(booking.dispatch_time), "HH:mm")}</p>
            )}
            {booking.arrival_time && (
              <p>Arrived at {format(new Date(booking.arrival_time), "HH:mm")}</p>
            )}
          </div>
        )}

        {onOpenTrip && (
          <button
            type="button"
            onClick={onOpenTrip}
            onPointerDown={stopTap}
            className="w-full bg-black text-white font-bold py-3 rounded-2xl text-sm"
          >
            Open full trip screen
          </button>
        )}
      </div>
    </div>
  );
}
