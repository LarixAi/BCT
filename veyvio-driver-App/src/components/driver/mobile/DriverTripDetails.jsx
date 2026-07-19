/**
 * DriverTripDetails — Uber-style completed trip details screen.
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { HelpCircle, Gem } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { withTimeout } from "@/lib/withTimeout";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import DriverBlackHeader from "@/components/driver/mobile/DriverBlackHeader";
import { paymentLabel } from "@/lib/tripOfferStats";
import {
  formatTripDuration,
  parseFareBreakdown,
  paymentStatusLabel,
  tripDisplayDate,
  tripDistanceMiles,
  tripEarningsSummary,
  tripPointsEarned,
  tripServiceLabel,
} from "@/lib/tripDetails";
import TripDetailsMap from "./TripDetailsMap";

const REFRESH_TIMEOUT_MS = 8000;

function StatBlock({ label, value }) {
  return (
    <div className="flex-1 py-4 px-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-[17px] font-bold text-black mt-1 leading-snug">{value}</p>
    </div>
  );
}

export default function DriverTripDetails({ booking: initialBooking, driver, onBack }) {
  const navigate = useNavigate();
  const [booking, setBooking] = useState(initialBooking);
  const [routeMeta, setRouteMeta] = useState(null);

  useEffect(() => {
    setBooking(initialBooking);
  }, [initialBooking]);

  // Always refresh from API so direct links and snapshots get the latest record.
  useEffect(() => {
    if (!initialBooking?.id) return;
    let cancelled = false;

    withTimeout(
      base44.entities.Booking.filter({ id: initialBooking.id }, "-created_date", 1),
      REFRESH_TIMEOUT_MS
    )
      .then(results => {
        if (!cancelled && results?.[0]) setBooking(results[0]);
      })
      .catch(() => {
        // Keep snapshot / initial data on failure.
      });

    return () => {
      cancelled = true;
    };
  }, [initialBooking?.id]);

  const handleRouteMeta = useCallback(meta => {
    setRouteMeta(meta);
  }, []);

  const { gross, net, fee, feePct } = tripEarningsSummary(booking);
  const upfrontEstimate = booking.fare_estimate ?? gross;
  const finalFare = booking.final_fare;
  const tripTime = tripDisplayDate(booking);
  const distanceMi = tripDistanceMiles(booking, routeMeta);
  const durationLabel = formatTripDuration(booking, routeMeta);
  const points = tripPointsEarned(booking);
  const cancelled = booking.booking_status === "cancelled";
  const breakdown = parseFareBreakdown(booking);

  const goBack = () => {
    if (onBack) onBack();
    else navigate(-1);
  };

  const displayAmount = cancelled ? "£0.00" : `£${net.toFixed(2)}`;

  return (
    <div className="fixed inset-0 bg-white flex flex-col z-[100]">
      <DriverBlackHeader
        title="Trip details"
        onBack={goBack}
        right={
          <button
            type="button"
            onClick={() => navigate("/driver/messages")}
            aria-label="Help"
            className="w-9 h-9 flex items-center justify-center rounded-full border border-white/30 active:bg-white/10"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        }
      />

      <div
        className="flex-1 overflow-y-auto overscroll-y-contain min-h-0"
        style={{ paddingBottom: `calc(24px + ${DRIVER_SAFE_BOTTOM})`, WebkitOverflowScrolling: "touch" }}
      >
        <div className="px-5 pt-5 pb-4">
          {tripTime && (
            <p className="text-sm text-gray-600">
              {tripServiceLabel(booking)}
              {" · "}
              {format(new Date(tripTime), "d MMM yyyy")}
              {" · "}
              {format(new Date(tripTime), "HH:mm")}
            </p>
          )}
          <p className="text-[42px] font-bold text-black leading-none mt-3 tracking-tight">{displayAmount}</p>
          {!cancelled && (
            <p className="text-sm text-gray-500 mt-2">
              Upfront estimate: £{Number(upfrontEstimate).toFixed(2)}
              {finalFare != null && Math.abs(finalFare - upfrontEstimate) > 0.01 && (
                <span> · Final fare: £{Number(finalFare).toFixed(2)}</span>
              )}
            </p>
          )}
          {cancelled && <p className="text-sm text-gray-500 mt-2">This trip was cancelled</p>}
        </div>

        <TripDetailsMap booking={booking} onRouteMeta={handleRouteMeta} />

        <div className="flex border-b border-gray-100">
          <StatBlock label="Duration" value={durationLabel} />
          <div className="w-px bg-gray-100 my-4" />
          <StatBlock label="Distance" value={distanceMi != null ? `${distanceMi.toFixed(2)} mi` : "—"} />
        </div>

        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex gap-4">
            <div className="flex flex-col items-center pt-1.5 shrink-0 w-3">
              <div className="w-2.5 h-2.5 rounded-full bg-black" />
              <div className="w-px flex-1 bg-gray-300 my-1 min-h-[48px]" />
              <div className="w-2.5 h-2.5 bg-black" />
            </div>
            <div className="flex-1 space-y-6 min-w-0">
              <p className="text-[15px] text-black leading-snug">{booking.pickup_address || "Pickup address"}</p>
              <p className="text-[15px] text-black leading-snug">{booking.dropoff_address || "Drop-off address"}</p>
            </div>
          </div>
        </div>

        {!cancelled && points > 0 && (
          <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100">
            <Gem className="w-4 h-4 text-black shrink-0" strokeWidth={2.25} />
            <p className="text-[15px] text-black">
              {points} point{points !== 1 ? "s" : ""} earned
            </p>
          </div>
        )}

        <div className="px-5 pt-5 pb-2">
          <h2 className="text-[17px] font-bold text-black mb-4">Your earnings and entitlements</h2>

          <div className="space-y-0">
            {!cancelled && (
              <>
                <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                  <span className="text-gray-600">Customer fare</span>
                  <span className="font-medium text-black tabular-nums">£{gross.toFixed(2)}</span>
                </div>
                {breakdown?.base_fare != null && (
                  <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                    <span className="text-gray-600">Base fare</span>
                    <span className="font-medium text-black tabular-nums">
                      £{Number(breakdown.base_fare).toFixed(2)}
                    </span>
                  </div>
                )}
                {breakdown?.mile_charge != null && (
                  <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                    <span className="text-gray-600">
                      Distance
                      {breakdown.est_miles != null ? ` (${Number(breakdown.est_miles).toFixed(1)} mi)` : ""}
                    </span>
                    <span className="font-medium text-black tabular-nums">
                      £{Number(breakdown.mile_charge).toFixed(2)}
                    </span>
                  </div>
                )}
                {breakdown?.minute_charge > 0 && (
                  <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                    <span className="text-gray-600">Time charge</span>
                    <span className="font-medium text-black tabular-nums">
                      £{Number(breakdown.minute_charge).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                  <span className="text-gray-600">Platform fee ({feePct}%)</span>
                  <span className="font-medium text-black tabular-nums">-£{fee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                  <span className="text-gray-600">Your payout</span>
                  <span className="font-bold text-black tabular-nums">£{net.toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
              <span className="text-gray-600">Payment method</span>
              <span className="font-medium text-black">{paymentLabel(booking.payment_method)}</span>
            </div>
            <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
              <span className="text-gray-600">Payment status</span>
              <span
                className={`font-medium ${
                  booking.payment_status === "captured" ? "text-green-700" : "text-gray-800"
                }`}
              >
                {paymentStatusLabel(booking)}
              </span>
            </div>
            {booking.booking_reference && (
              <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                <span className="text-gray-600">Booking ref</span>
                <span className="font-mono text-sm text-black">{booking.booking_reference}</span>
              </div>
            )}
            {booking.customer_name && (
              <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                <span className="text-gray-600">Passenger</span>
                <span className="font-medium text-black">{booking.customer_name}</span>
              </div>
            )}
            {booking.pickup_time && (
              <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                <span className="text-gray-600">Passenger on board</span>
                <span className="font-medium text-black">
                  {format(new Date(booking.pickup_time), "d MMM · HH:mm")}
                </span>
              </div>
            )}
            {booking.completion_time && (
              <div className="flex justify-between py-3 border-b border-gray-100 text-[15px]">
                <span className="text-gray-600">Trip completed</span>
                <span className="font-medium text-black">
                  {format(new Date(booking.completion_time), "d MMM · HH:mm")}
                </span>
              </div>
            )}
          </div>
        </div>

        {driver?.full_name && (
          <p className="px-5 pt-4 text-xs text-gray-400">
            Driver: {driver.full_name}
            {driver.phv_licence_number ? ` · PHV ${driver.phv_licence_number}` : ""}
          </p>
        )}
      </div>
    </div>
  );
}
