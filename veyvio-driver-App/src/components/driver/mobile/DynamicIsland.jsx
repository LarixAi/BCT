/**
 * DynamicIsland — center pill in the driver home header.
 * Tap to expand: CoreSupportFleet summary carousel.
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, MapPin, Zap, Car, Gem } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { base44 } from "@/api/base44Client";
import { startOfWeek, endOfWeek } from "date-fns";
import { DRIVER_SAFE_TOP } from "@/lib/driverSafeArea";
import {
  IslandTodayCard,
  IslandWeekCard,
  IslandRewardsCard,
  IslandDemandCard,
  IslandPromoCard,
  IslandPrefsCard,
  ISLAND_CARD_HEIGHT_PX,
} from "./IslandCarouselCards";

const DRIVER_NET_SHARE = 0.85;
const POINTS_GOAL = 600;
const PREFS_KEY = "fleet_driver_trip_prefs";
/** Inset per slide edge — 6px × 2 = 12px gap between cards when swiping */
const SLIDE_INSET_PX = 6;

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : { electric: false, pets: false };
  } catch {
    return { electric: false, pets: false };
  }
}

export default function DynamicIsland({
  todayEarnings = 0,
  todayTrips = 0,
  driverId,
  islandPulse = null,
  onPulseEnd,
  onSeeWeeklySummary,
  onOpenHotAreas,
  zoneLabel = "South London",
}) {
  const [expanded, setExpanded] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [hideEarnings, setHideEarnings] = useState(false);
  const [weekStats, setWeekStats] = useState({ net: 0, trips: 0 });
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [prefs, setPrefs] = useState(loadPrefs);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    loop: false,
    dragFree: false,
  });

  const points = Math.min(POINTS_GOAL, todayTrips * 120 + Math.round(todayEarnings * 8));
  const weekPoints = Math.min(POINTS_GOAL, weekStats.trips * 120 + Math.round(weekStats.net * 8));
  const goldPct = Math.min(100, Math.round((points / POINTS_GOAL) * 100)) || 0;

  useEffect(() => {
    if (!islandPulse?.id) return;
    setPulsing(true);
    setActiveSlideIndex(0);
    emblaApi?.scrollTo(0);
    const timer = window.setTimeout(() => {
      setPulsing(false);
      onPulseEnd?.();
    }, 3600);
    return () => window.clearTimeout(timer);
  }, [islandPulse?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!expanded || !driverId) return;
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    base44.entities.Booking.filter({ assigned_driver_id: driverId }, "-completion_time", 100)
      .then((jobs) => {
        const weekJobs = jobs.filter((j) => {
          if (j.booking_status !== "completed") return false;
          const t = j.completion_time ? new Date(j.completion_time) : new Date(j.created_date);
          return t >= weekStart && t <= weekEnd;
        });
        const gross = weekJobs.reduce((s, j) => s + (j.final_fare || j.fare_estimate || 0), 0);
        setWeekStats({ net: gross * DRIVER_NET_SHARE, trips: weekJobs.length });
      })
      .catch(() => {});
  }, [expanded, driverId]);

  const onEmblaSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveSlideIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const goToSlide = useCallback(
    (index) => {
      emblaApi?.scrollTo(index);
      setActiveSlideIndex(index);
    },
    [emblaApi]
  );

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onEmblaSelect);
    onEmblaSelect();
    return () => emblaApi.off("select", onEmblaSelect);
  }, [emblaApi, onEmblaSelect]);

  useEffect(() => {
    if (!expanded || !emblaApi) return;
    emblaApi.reInit();
    emblaApi.scrollTo(activeSlideIndex, true);
  }, [expanded, emblaApi]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAnd = (fn) => {
    setExpanded(false);
    fn?.();
  };

  const togglePref = (key) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const prefsActive = prefs.electric || prefs.pets;
  const prefsLabel = prefs.electric && prefs.pets
    ? "2 filters"
    : prefs.electric
      ? "Electric"
      : prefs.pets
        ? "Pets"
        : "Prefs";

  const islandDisplay = [
    {
      key: "today",
      Icon: TrendingUp,
      label: hideEarnings ? "••••" : `£${Number(todayEarnings).toFixed(2)}`,
      accent: "text-emerald-400",
    },
    {
      key: "week",
      Icon: TrendingUp,
      label: hideEarnings ? "••••" : `£${Number(weekStats.net).toFixed(2)}`,
      accent: "text-emerald-400",
    },
    {
      key: "rewards",
      Icon: Gem,
      label: `${points} pts`,
      accent: "text-amber-400",
    },
    {
      key: "demand",
      Icon: MapPin,
      label: zoneLabel.split(" ")[0] || "Zones",
      accent: "text-violet-400",
    },
    {
      key: "promo",
      Icon: Zap,
      label: "2× Boost",
      accent: "text-amber-400",
    },
    {
      key: "prefs",
      Icon: Car,
      label: prefsLabel,
      accent: prefsActive ? "text-blue-400" : "text-gray-300",
    },
  ];

  const activeDisplay = islandDisplay[activeSlideIndex] || islandDisplay[0];
  const ActiveIcon = activeDisplay.Icon;

  const slides = [
    {
      key: "today",
      render: () => (
        <IslandTodayCard
          amount={todayEarnings}
          trips={todayTrips}
          points={points}
          hideEarnings={hideEarnings}
          onToggleHide={() => setHideEarnings((h) => !h)}
          onOpenEarnings={() => closeAnd(onSeeWeeklySummary)}
          pulsing={pulsing}
          pulseAmount={islandPulse?.amount}
        />
      ),
    },
    {
      key: "week",
      render: () => (
        <IslandWeekCard
          amount={weekStats.net}
          trips={weekStats.trips}
          points={weekPoints}
          hideEarnings={hideEarnings}
          onToggleHide={() => setHideEarnings((h) => !h)}
          onOpenEarnings={() => closeAnd(onSeeWeeklySummary)}
        />
      ),
    },
    {
      key: "rewards",
      render: () => (
        <IslandRewardsCard
          points={points}
          pointsGoal={POINTS_GOAL}
          goldPct={goldPct}
          trips={todayTrips}
          onOpenEarnings={() => closeAnd(onSeeWeeklySummary)}
        />
      ),
    },
    {
      key: "demand",
      render: () => (
        <IslandDemandCard
          zoneLabel={zoneLabel}
          onOpenHotAreas={() => closeAnd(onOpenHotAreas)}
        />
      ),
    },
    {
      key: "promo",
      render: () => (
        <IslandPromoCard onOpenHotAreas={() => closeAnd(onOpenHotAreas)} />
      ),
    },
    {
      key: "prefs",
      render: () => (
        <IslandPrefsCard prefs={prefs} onTogglePref={togglePref} />
      ),
    },
  ];

  const pillLabel =
    pulsing && islandPulse?.amount != null
      ? `+£${Number(islandPulse.amount).toFixed(2)}`
      : activeDisplay.label;

  const pillAccent = pulsing ? "text-blue-300" : activeDisplay.accent;

  return (
    <div className="flex flex-col items-center relative" style={{ zIndex: 40 }}>
      <div className="relative">
        <AnimatePresence>
          {pulsing && (
            <motion.span
              key={islandPulse?.id}
              className="absolute inset-0 rounded-full pointer-events-none"
              initial={{ opacity: 0.9, scale: 1 }}
              animate={{
                opacity: [0.9, 0.35, 0.9],
                scale: [1, 1.18, 1],
                boxShadow: [
                  "0 0 0 0 rgba(59, 130, 246, 0.85)",
                  "0 0 0 10px rgba(59, 130, 246, 0)",
                  "0 0 0 0 rgba(59, 130, 246, 0.85)",
                ],
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.1, repeat: 2, ease: "easeInOut" }}
              aria-hidden
            />
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className={`relative z-10 bg-gray-950 text-white rounded-full flex items-center gap-2 shadow-xl min-w-[120px] px-3.5 py-2.5 ${
            pulsing ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent" : ""
          }`}
          whileTap={{ scale: 0.96 }}
          animate={
            pulsing
              ? {
                  boxShadow: [
                    "0 0 0 0 rgba(59,130,246,0.5)",
                    "0 0 16px 4px rgba(59,130,246,0.75)",
                    "0 0 0 0 rgba(59,130,246,0.5)",
                  ],
                }
              : { boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }
          }
          transition={
            pulsing ? { duration: 1.1, repeat: 2 } : { type: "spring", damping: 22, stiffness: 260 }
          }
        >
          <ActiveIcon className={`w-3.5 h-3.5 shrink-0 ${pillAccent}`} />
          <span
            className={`text-xs font-bold whitespace-nowrap truncate max-w-[90px] tabular-nums ${pillAccent}`}
          >
            {pillLabel}
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <svg
              className="w-3 h-3 text-gray-400 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </motion.div>
        </motion.button>
      </div>

      <AnimatePresence>
        {expanded && (
          <>
            <motion.button
              type="button"
              aria-label="Close summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[99998] bg-black/25"
              onClick={() => setExpanded(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 4 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: "spring", damping: 28, stiffness: 340 }}
              className="fixed left-0 right-0 z-[99999]"
              style={{
                top: `calc(${DRIVER_SAFE_TOP} + 52px)`,
                paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
                paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
              }}
            >
              {/* Embla viewport — horizontal swipe only; no vertical drag on this layer */}
              <div ref={emblaRef} className="overflow-hidden select-none">
                <div className="flex items-stretch">
                  {slides.map((slide) => (
                    <div
                      key={slide.key}
                      className="min-w-0 shrink-0 grow-0 basis-full box-border"
                      style={{
                        height: ISLAND_CARD_HEIGHT_PX,
                        paddingLeft: SLIDE_INSET_PX,
                        paddingRight: SLIDE_INSET_PX,
                      }}
                    >
                      {slide.render()}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center items-center gap-1.5 mt-3 pb-1">
                {slides.map((slide, i) => (
                  <button
                    key={slide.key}
                    type="button"
                    aria-label={`Card ${i + 1}`}
                    onClick={() => goToSlide(i)}
                    className={`rounded-full transition-all duration-200 ${
                      i === activeSlideIndex
                        ? "w-[18px] h-1.5 bg-white"
                        : "w-1.5 h-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
