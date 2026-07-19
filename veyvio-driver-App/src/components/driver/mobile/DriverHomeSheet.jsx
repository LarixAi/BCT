/**
 * DriverHomeSheet — context-aware bottom sheet on the map home screen.
 *
 * Level 1: peek status bar (filter | status | menu)
 * Level 2: trip summary or mid panel
 * Level 3: online searching panel OR trip options (slides up; right button toggles)
 *
 * Arrived at pickup: Uber-style wait card with timer + profile → options panel.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  SlidersHorizontal, AlignJustify, MapPin, ChevronRight, AlertCircle, Navigation,
} from "lucide-react";
import { formatRouteSummary } from "@/lib/formatRouteMeta";
import {
  DRIVER_SHEET_PEEK_PX,
  DRIVER_LEVEL3_FULL_HEIGHT,
  driverGoButtonBottom,
} from "@/lib/driverSafeArea";
import { advanceJobStep } from "@/lib/jobFlow";
import DriverArrivedWaitCard from "./DriverArrivedWaitCard";
import DriverTripOptionsPanel from "./DriverTripOptionsPanel";
import DriverTripPlannerPanel from "./DriverTripPlannerPanel";
import DriverTripActionPanel from "./DriverTripActionPanel";
import { peekStatusForBooking } from "@/lib/tripPhase";

const PEEK_H = DRIVER_SHEET_PEEK_PX;
const MID_H = 340;
const ARRIVED_H = 248;
/** Taller panel for trip options. */
const LEVEL3_OPTIONS_H = 400;

const SHEET_SPRING = { type: "spring", damping: 34, stiffness: 300, mass: 0.85 };
const SHEET_SPRING_TALL = { type: "spring", damping: 36, stiffness: 260, mass: 0.95 };

const DRAG_UP_PX = 40;
const DRAG_DOWN_PX = 40;
const DRAG_VEL = 320;

function peekStatusLabel({ activeBooking, pendingOffer, isOnline, onBreak }) {
  if (activeBooking) {
    return peekStatusForBooking(activeBooking);
  }
  if (pendingOffer) return "New trip offer";
  if (isOnline && onBreak) return "On a break";
  if (isOnline) return "Searching for a job";
  return "You're offline";
}

function SearchingPeekLabel() {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setDots(d => (d + 1) % 4), 450);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="flex items-center justify-center gap-2 min-w-0 px-1 pointer-events-none">
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 animate-ping" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <motion.span
        className="font-bold text-black text-sm truncate"
        animate={{ opacity: [1, 0.55, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        Searching for a job{".".repeat(dots)}
      </motion.span>
    </span>
  );
}

function TripRouteEta({ routePreview, compact = false }) {
  if (!routePreview) return null;

  const summary = routePreview.loading
    ? "Calculating route…"
    : formatRouteSummary(routePreview);

  if (!summary) return null;

  const legLabel = routePreview.leg === "dropoff" ? "To drop-off" : "To pickup";

  if (compact) {
    return (
      <span className="block text-xs font-medium text-gray-500 mt-0.5 truncate">
        {legLabel} · {summary}
      </span>
    );
  }

  return (
    <div className="mb-3 flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
      <Navigation className="w-4 h-4 text-blue-600 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-blue-700 font-medium">{legLabel}</p>
        <p className="text-sm font-bold text-blue-900">{summary}</p>
      </div>
    </div>
  );
}

function TripSummary({ booking, routePreview }) {
  return (
    <div className="space-y-3">
      <TripRouteEta routePreview={routePreview} />
      <div className="flex items-start gap-3">
        <div className="w-3 h-3 rounded-full bg-blue-600 mt-1 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Pickup</p>
          <p className="font-semibold text-black text-sm leading-snug truncate">{booking.pickup_address}</p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <MapPin className="w-3.5 h-3.5 text-gray-700 mt-1 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Dropoff</p>
          <p className="font-semibold text-black text-sm leading-snug truncate">{booking.dropoff_address}</p>
        </div>
      </div>
      {booking.fare_estimate != null && (
        <p className="text-sm text-gray-600">
          Est. fare <span className="font-bold text-black">£{booking.fare_estimate.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}

function stopTap(e) {
  e.stopPropagation();
}

export default function DriverHomeSheet({
  driver,
  onToggleOnline,
  togglingOnline,
  onBreak = false,
  onToggleBreak,
  onGoOffline,
  activeBooking,
  pendingOffer,
  offerCardActive = false,
  inStack = false,
  onBookingUpdate,
  routePreview = null,
  expandTripSignal = 0,
}) {
  const navigate = useNavigate();
  const [level, setLevel] = useState(1);
  const [showTripOptions, setShowTripOptions] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const prevLevelRef = useRef(1);
  const prevOfferIdRef = useRef(null);
  const prevBookingStatusRef = useRef(null);
  const hadActiveBookingRef = useRef(!!activeBooking);

  const today = new Date().toISOString().split("T")[0];
  const dailyCheckDone = driver.daily_check_completed_today && driver.daily_check_date === today;
  const canGoOnline = driver.assigned_vehicle_id && driver.vehicle_verified && driver.operator_terms_accepted;
  const isOnline = driver.is_online;

  const sheetPendingOffer = offerCardActive ? null : pendingOffer;
  const job = activeBooking || sheetPendingOffer;
  const isArrived = activeBooking?.booking_status === "arrived";
  const isSearchingPeek = level === 1 && isOnline && !onBreak && !activeBooking && !sheetPendingOffer;
  const isOnBreakPeek = level === 1 && isOnline && onBreak && !activeBooking && !sheetPendingOffer;
  const isOnlineOnlyPeek = level === 1 && isOnline && !activeBooking && offerCardActive;
  const canReachLevel3 = !activeBooking && !isArrived && !showTripOptions;
  const maxSheetLevel = canReachLevel3 ? 3 : 2;

  const setSheetLevel = (next) => {
    setLevel((prev) => {
      const resolved = typeof next === "function" ? next(prev) : next;
      prevLevelRef.current = prev;
      return resolved;
    });
  };

  // Offer overlay takes over — collapse sheet to peek
  useEffect(() => {
    if (offerCardActive) {
      setSheetLevel(1);
      setShowTripOptions(false);
    }
  }, [offerCardActive]);

  // New trip offer → expand to level 2 (do NOT reset level when offer clears — user may be on level 3)
  useEffect(() => {
    if (!sheetPendingOffer?.id) {
      prevOfferIdRef.current = null;
      return;
    }
    if (sheetPendingOffer.id !== prevOfferIdRef.current) {
      prevOfferIdRef.current = sheetPendingOffer.id;
      setSheetLevel(2);
      setShowTripOptions(false);
    }
  }, [sheetPendingOffer?.id]);

  // Expand sheet when parent signals (e.g. right after accept)
  useEffect(() => {
    if (expandTripSignal > 0 && activeBooking) {
      setSheetLevel(2);
      setShowTripOptions(false);
    }
  }, [expandTripSignal, activeBooking?.id]);

  // Active trip started or ended — reset sheet (not on every idle re-render)
  useEffect(() => {
    const hasActive = !!activeBooking;
    if (hasActive && !hadActiveBookingRef.current) {
      setSheetLevel(2);
      setShowTripOptions(false);
    }
    if (!hasActive && hadActiveBookingRef.current) {
      setSheetLevel(1);
      setShowTripOptions(false);
    }
    hadActiveBookingRef.current = hasActive;
  }, [activeBooking?.id]);

  useEffect(() => {
    const status = activeBooking?.booking_status;
    if (status !== prevBookingStatusRef.current) {
      prevBookingStatusRef.current = status;
      if (status === "arrived") {
        setSheetLevel(1);
        setShowTripOptions(false);
      } else if (status && status !== "arrived") {
        setShowTripOptions(false);
      }
    }
  }, [activeBooking?.booking_status, activeBooking]);

  const openFilters = (e) => {
    stopTap(e);
    navigate("/driver/filters", { state: { returnToMap: true } });
  };

  const goToJobPage = (e) => {
    stopTap(e);
    if (!activeBooking) return;
    navigate(`/driver/job/${activeBooking.id}`, {
      state: { returnToMap: true, bookingSnapshot: activeBooking },
    });
  };

  const handlePeekAction = (e) => {
    stopTap(e);
    if (showTripOptions) {
      setShowTripOptions(false);
      return;
    }
    if (level === 3) {
      setSheetLevel(1);
      return;
    }
    if (offerCardActive) {
      setSheetLevel(3);
      return;
    }
    if (sheetPendingOffer && !activeBooking) return;
    if (activeBooking) {
      if (isArrived) {
        setShowTripOptions(true);
        return;
      }
      setShowTripOptions(true);
      return;
    }
    setSheetLevel(3);
  };

  const handleSheetDragEnd = (_e, info) => {
    if (isArrived || showTripOptions) return;
    const dy = info.offset.y;
    const vel = info.velocity.y;
    if (dy < -DRAG_UP_PX || vel < -DRAG_VEL) {
      setSheetLevel((l) => Math.min(maxSheetLevel, l + 1));
    } else if (dy > DRAG_DOWN_PX || vel > DRAG_VEL) {
      setSheetLevel((l) => Math.max(1, l - 1));
    }
  };

  const handleGoOnline = (e) => {
    stopTap(e);
    if (!canGoOnline) return;
    if (!dailyCheckDone) {
      navigate("/driver/daily-check", { state: { returnToMap: true } });
      return;
    }
    onToggleOnline();
  };

  const handleStartTrip = async (e) => {
    stopTap(e);
    if (!activeBooking || advancing) return;
    setAdvancing(true);
    try {
      const result = await advanceJobStep({ booking: activeBooking, driver });
      if (result.error) {
        console.error(result.error);
        return;
      }
      onBookingUpdate?.(result.booking);
      setShowTripOptions(false);
    } finally {
      setAdvancing(false);
    }
  };

  const sheetH = (() => {
    if (isArrived) return showTripOptions ? LEVEL3_OPTIONS_H : ARRIVED_H;
    if (showTripOptions && activeBooking) return LEVEL3_OPTIONS_H;
    if (level === 3) return DRIVER_LEVEL3_FULL_HEIGHT;
    if (level === 2) return MID_H;
    return PEEK_H;
  })();

  const showLevel1Peek = level === 1 && !isArrived && !showTripOptions;
  const isTallLevel = level === 3 || (prevLevelRef.current === 3 && level < 3);
  const heightTransition = isTallLevel ? SHEET_SPRING_TALL : SHEET_SPRING;

  useEffect(() => {
    const id = window.setTimeout(() => {
      prevLevelRef.current = level;
    }, 450);
    return () => window.clearTimeout(id);
  }, [level]);

  return (
    <>
      {!isOnline && level === 1 && !isArrived && (
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleGoOnline}
          onPointerDown={stopTap}
          disabled={togglingOnline || !canGoOnline}
          className={`fixed left-1/2 -translate-x-1/2 w-20 h-20 rounded-full shadow-2xl flex items-center justify-center font-black text-white text-lg z-30 ${
            canGoOnline && dailyCheckDone ? "bg-blue-600" : "bg-gray-400"
          }`}
          style={{ bottom: driverGoButtonBottom(PEEK_H) }}
        >
          {togglingOnline ? "..." : "GO"}
        </motion.button>
      )}

      <motion.div
        layout
        animate={{ height: sheetH }}
        transition={heightTransition}
        className={`${inStack ? "relative w-full" : "absolute left-0 right-0 z-20"} bg-white overflow-hidden flex flex-col touch-none ${
          inStack ? (level === 3 ? "rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)]" : "") : "rounded-t-3xl shadow-2xl"
        }`}
        style={inStack ? undefined : { bottom: `calc(52px + max(32px, env(safe-area-inset-bottom, 0px)))` }}
      >
        {!isArrived && (
          <motion.div
            drag={showTripOptions ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.12}
            onDragEnd={handleSheetDragEnd}
            onClick={() => {
              if (level === 3 || showTripOptions) return;
              if (!job && canReachLevel3) {
                setSheetLevel((l) => (l >= maxSheetLevel ? 1 : l + 1));
                return;
              }
              setSheetLevel((l) => (l === 1 ? 2 : 1));
            }}
            className={`flex justify-center shrink-0 cursor-grab active:cursor-grabbing touch-pan-y z-10 ${
              level === 3 ? "pt-3 pb-2" : "pt-2.5 pb-1"
            }`}
          >
            <div className={`bg-gray-300 rounded-full ${level === 3 ? "w-10 h-1.5" : "w-9 h-1"}`} />
          </motion.div>
        )}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {isArrived && !showTripOptions && (
            <motion.div
              key="arrived"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="flex-1 min-h-0"
            >
              <DriverArrivedWaitCard
                booking={activeBooking}
                onOpenFilters={openFilters}
                onOpenOptions={() => setShowTripOptions(true)}
                onStartTrip={handleStartTrip}
                starting={advancing}
              />
            </motion.div>
          )}

          {(showTripOptions && activeBooking) && (
            <motion.div
              key="trip-options"
              initial={{ opacity: 0, y: "100%" }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="flex-1 min-h-0"
            >
              <DriverTripOptionsPanel
                booking={activeBooking}
                driver={driver}
                onClose={() => setShowTripOptions(false)}
                onOpenTrip={goToJobPage}
                onBookingUpdate={onBookingUpdate}
              />
            </motion.div>
          )}

          {level === 3 && !activeBooking && !showTripOptions && (
            <div className="flex-1 min-h-0">
              <DriverTripPlannerPanel
                driver={driver}
                isOnline={isOnline}
                onBreak={onBreak}
                onClose={() => setSheetLevel(1)}
                onGoOffline={onGoOffline}
                onToggleBreak={onToggleBreak}
                goingOffline={togglingOnline}
                onOpenFilters={openFilters}
              />
            </div>
          )}

          {showLevel1Peek && (
            <div className="flex items-center justify-between px-3 pb-2 flex-1 min-h-[52px] touch-auto">
              <button
                type="button"
                aria-label="Trip filters"
                onClick={openFilters}
                onPointerDown={stopTap}
                className="w-11 h-11 flex items-center justify-center shrink-0 rounded-full active:bg-gray-100"
              >
                <SlidersHorizontal className="w-5 h-5 text-gray-700 pointer-events-none" />
              </button>

              {isSearchingPeek ? (
                <SearchingPeekLabel />
              ) : isOnBreakPeek ? (
                <span className="font-bold text-amber-700 text-sm text-center px-2 truncate flex-1 pointer-events-none">
                  On a break
                </span>
              ) : isOnlineOnlyPeek ? (
                <span className="font-bold text-black text-sm text-center px-2 truncate flex-1 pointer-events-none">
                  Online
                </span>
              ) : (
                <span className="flex-1 min-w-0 text-center px-2 pointer-events-none">
                  <span className="font-bold text-black text-sm truncate block">
                    {peekStatusLabel({ activeBooking, pendingOffer: sheetPendingOffer, isOnline, onBreak })}
                  </span>
                  {activeBooking && (
                    <TripRouteEta routePreview={routePreview} compact />
                  )}
                </span>
              )}

              <button
                type="button"
                aria-label={
                  level === 3 ? "Close panel"
                    : activeBooking ? "Trip options"
                    : "Expand panel"
                }
                onClick={handlePeekAction}
                onPointerDown={stopTap}
                className="w-11 h-11 flex items-center justify-center shrink-0 rounded-full active:bg-gray-100"
              >
                <AlignJustify className="w-5 h-5 text-gray-700 pointer-events-none" />
              </button>
            </div>
          )}

          {level === 2 && !isArrived && !showTripOptions && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden touch-auto">
              <motion.div
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.12}
                onDragEnd={handleSheetDragEnd}
                className="shrink-0 cursor-grab active:cursor-grabbing touch-pan-y"
              >
                <button
                  type="button"
                  onClick={(e) => { stopTap(e); setSheetLevel(1); }}
                  onPointerDown={stopTap}
                  className="flex items-center justify-between w-full px-5 py-2"
                >
                  <span className="font-black text-black text-sm">
                    {job ? (sheetPendingOffer && !activeBooking ? "Trip offer" : "Active trip") : "Status"}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 rotate-90" />
                </button>
              </motion.div>
              <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4">
              {job ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">{job.customer_name}</p>
                  <TripSummary booking={job} routePreview={activeBooking ? routePreview : null} />
                  {sheetPendingOffer && !activeBooking ? (
                    <p className="mt-4 text-center text-xs text-gray-500">
                      Accept or decline using the trip offer card
                    </p>
                  ) : (
                    <>
                      <DriverTripActionPanel
                        booking={activeBooking}
                        driver={driver}
                        onBookingUpdate={onBookingUpdate}
                        compact
                      />
                      <button
                        type="button"
                        onClick={goToJobPage}
                        onPointerDown={stopTap}
                        className="mt-3 w-full bg-gray-100 text-black font-bold py-3 rounded-2xl text-sm"
                      >
                        Open trip
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className={`rounded-2xl px-4 py-4 mb-4 ${isOnline ? "bg-amber-400" : "bg-gray-100"}`}>
                    <p className={`font-black text-lg ${isOnline ? "text-black" : "text-gray-500"}`}>
                      {isOnline ? "Searching for a job" : "You're offline"}
                    </p>
                    {isOnline && (
                      <p className="text-black/70 text-sm mt-1">Trip offers will appear here.</p>
                    )}
                  </div>

                  {!isOnline && !canGoOnline && (
                    <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-900 text-xs">Setup incomplete</p>
                        <p className="text-amber-700 text-xs">Assign and verify a vehicle to go online.</p>
                      </div>
                    </div>
                  )}

                  {!isOnline && (
                    <button
                      type="button"
                      onClick={handleGoOnline}
                      onPointerDown={stopTap}
                      disabled={togglingOnline || !canGoOnline || !dailyCheckDone}
                      className="w-full bg-blue-600 text-white font-bold py-3 rounded-2xl text-sm disabled:opacity-40"
                    >
                      {!dailyCheckDone ? "Complete daily check first" : togglingOnline ? "..." : "Go online"}
                    </button>
                  )}

                  {isOnline && canReachLevel3 && (
                    <button
                      type="button"
                      onClick={(e) => { stopTap(e); setSheetLevel(3); }}
                      onPointerDown={stopTap}
                      className="w-full bg-gray-900 text-white font-bold py-3 rounded-2xl text-sm"
                    >
                      Open trip planner
                    </button>
                  )}
                </>
              )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
