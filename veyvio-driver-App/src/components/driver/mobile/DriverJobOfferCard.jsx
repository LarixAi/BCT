/**
 * Compact trip offer card — countdown, accept or decline.
 * Sits above the bottom sheet; action buttons pinned so they are never clipped.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert, Users, AlertTriangle } from "lucide-react";
import { acceptJobOffer, acceptJobOfferClientFallback } from "@/lib/acceptJobOffer";
import { declineJobOffer } from "@/lib/declineJobOffer";
import { getOfferRemainingSec, JOB_OFFER_DURATION_SEC } from "@/lib/jobOfferConfig";
import { getTripOfferStats, vehicleTypeLabel, paymentLabel } from "@/lib/tripOfferStats";
import {
  DRIVER_NAV_CONTENT_PX,
  DRIVER_SHEET_PEEK_PX,
  DRIVER_SAFE_BOTTOM,
} from "@/lib/driverSafeArea";
import OfferRouteMapPreview from "./OfferRouteMapPreview";

const OFFER_CARD_BOTTOM = `calc(${DRIVER_SAFE_BOTTOM} + ${DRIVER_NAV_CONTENT_PX}px + ${DRIVER_SHEET_PEEK_PX}px + 12px)`;
const OFFER_CARD_MAX_H = `calc(100dvh - ${DRIVER_SAFE_BOTTOM} - ${DRIVER_NAV_CONTENT_PX}px - ${DRIVER_SHEET_PEEK_PX}px - 120px)`;

function getComplianceBlock(driver) {
  const today = new Date().toISOString().split("T")[0];
  if (!driver.daily_check_completed_today || driver.daily_check_date !== today) {
    return "Complete your daily vehicle check before accepting.";
  }
  if (driver.status !== "active") {
    return `Account status: ${driver.status}. Contact your operator.`;
  }
  return "";
}

export default function DriverJobOfferCard({ booking, driver, offerSeenAt, onResolved }) {
  const seenAt = offerSeenAt ?? Date.now();
  const [remaining, setRemaining] = useState(() => getOfferRemainingSec(seenAt));
  const [submitting, setSubmitting] = useState(null);
  const [error, setError] = useState("");
  const resolvedRef = useRef(false);
  const expiredHandledRef = useRef(false);
  const acceptLockRef = useRef(false);

  const complianceBlocked = getComplianceBlock(driver);
  const customerFare = booking.fare_estimate ?? 0;
  const driverPayout = booking.driver_payout ?? customerFare * 0.8;
  const progress = remaining / JOB_OFFER_DURATION_SEC;
  const stats = useMemo(() => getTripOfferStats(booking, driver), [booking, driver]);
  const passengers = booking.passenger_count || 1;
  const payment = paymentLabel(booking.payment_method);
  const vehicle = vehicleTypeLabel(booking.vehicle_type_requested);

  const finish = useCallback((kind, payload) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolved?.(kind, payload);
  }, [onResolved]);

  const handleDecline = useCallback(async (reason = "declined") => {
    if (resolvedRef.current || submitting || acceptLockRef.current) return;
    setSubmitting("decline");
    setError("");
    try {
      await declineJobOffer({
        booking,
        driver,
        skipRedispatch: reason === "expired",
      });
      finish(reason);
    } catch (err) {
      resolvedRef.current = false;
      if (reason === "expired") expiredHandledRef.current = false;
      setError(err?.message || "Could not decline.");
    } finally {
      setSubmitting(null);
    }
  }, [booking, driver, finish, submitting]);

  const handleAccept = useCallback(async () => {
    if (resolvedRef.current || submitting || complianceBlocked || remaining <= 0) return;

    acceptLockRef.current = true;
    setSubmitting("accept");
    setError("");

    try {
      let accepted;
      try {
        accepted = await acceptJobOffer({ booking, driver });
      } catch (fnErr) {
        accepted = await acceptJobOfferClientFallback({ booking, driver });
        if (!accepted?.driver_accept_time) throw fnErr;
      }
      finish("accepted", accepted);
    } catch (err) {
      resolvedRef.current = false;
      acceptLockRef.current = false;
      setError(err?.message || "Could not accept.");
    } finally {
      setSubmitting(null);
    }
  }, [booking, driver, complianceBlocked, finish, remaining, submitting]);

  useEffect(() => {
    const id = setInterval(() => setRemaining(getOfferRemainingSec(seenAt)), 100);
    return () => clearInterval(id);
  }, [seenAt]);

  useEffect(() => {
    if (
      remaining <= 0 &&
      !submitting &&
      !resolvedRef.current &&
      !expiredHandledRef.current &&
      !acceptLockRef.current
    ) {
      expiredHandledRef.current = true;
      handleDecline("expired");
    }
  }, [remaining, submitting, handleDecline]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="absolute left-3 right-3 z-50 pointer-events-auto"
      style={{ bottom: OFFER_CARD_BOTTOM, maxHeight: OFFER_CARD_MAX_H }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-[inherit]">
        <div className="h-1 bg-gray-100 shrink-0">
          <div
            className="h-full bg-blue-600 transition-all duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-3.5 py-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="font-bold text-sm text-black truncate">New trip offer</p>
            <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full shrink-0 ${
              remaining <= 5 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
            }`}>
              {Math.ceil(remaining)}s
            </span>
          </div>

          <OfferRouteMapPreview
            booking={booking}
            driverLat={driver.current_lat}
            driverLng={driver.current_lng}
            className="mb-2.5"
          />

          {(complianceBlocked || error) && (
            <div className="mb-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{complianceBlocked || error}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Your payout</p>
              <p className="text-2xl font-extrabold text-black leading-none">£{driverPayout.toFixed(2)}</p>
              {customerFare !== driverPayout && (
                <p className="text-[10px] text-gray-500 mt-0.5">Customer fare £{customerFare.toFixed(2)}</p>
              )}
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                <span className="text-yellow-500">★</span>
                {booking.customer_name || "Passenger"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1 justify-end max-w-[52%]">
              <span className="text-[10px] font-semibold bg-black text-white px-2 py-0.5 rounded-full">{vehicle}</span>
              <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{payment}</span>
              {passengers > 1 && (
                <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                  <Users className="w-2.5 h-2.5" /> {passengers}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-2.5">
            {stats.toPickupMins != null && (
              <span className="text-[10px] font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full">
                {stats.toPickupMins} min to pickup
                {stats.toPickupMi ? ` · ${stats.toPickupMi} mi` : ""}
              </span>
            )}
            {stats.tripMins != null && stats.tripMi != null && (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                {stats.tripMins} min trip · {stats.tripMi} mi
              </span>
            )}
          </div>

          <div className="border border-gray-100 rounded-xl px-2.5 py-2 mb-2 space-y-1.5">
            <p className="text-xs font-semibold text-black leading-snug line-clamp-2">
              <span className="text-green-600 font-bold">● </span>{booking.pickup_address}
            </p>
            <p className="text-xs font-semibold text-black leading-snug line-clamp-2">
              <span className="text-red-500 font-bold">■ </span>{booking.dropoff_address}
            </p>
          </div>

          {booking.special_requirements && (
            <div className="mb-2 flex items-start gap-1.5 text-[10px] text-amber-800 bg-amber-50 rounded-lg px-2 py-1.5">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{booking.special_requirements}</span>
            </div>
          )}

          {booking.booking_reference && (
            <p className="text-[10px] text-gray-400">{booking.booking_reference}</p>
          )}
        </div>

        <div className="shrink-0 px-3.5 pb-3 pt-2 border-t border-gray-100 bg-white flex gap-2">
          <button
            type="button"
            onClick={() => handleDecline("declined")}
            disabled={!!submitting || remaining <= 0}
            className="flex-1 h-11 rounded-xl border border-gray-300 font-semibold text-gray-700 text-sm disabled:opacity-50"
          >
            {submitting === "decline" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Decline"}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!!submitting || !!complianceBlocked || remaining <= 0}
            className="flex-[1.4] h-11 rounded-xl bg-black font-bold text-white text-sm disabled:opacity-50"
          >
            {submitting === "accept" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Accept job"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
