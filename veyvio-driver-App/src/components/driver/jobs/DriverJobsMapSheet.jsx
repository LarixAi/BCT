import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Car,
  CheckCircle2,
  Circle,
  Clock,
  List,
  MapPin,
  MoreVertical,
  Navigation,
  Phone,
  SlidersHorizontal,
  User,
} from "lucide-react";
import { getJobExecutionState } from "@/lib/jobExecutionState";
import {
  buildActionButtonLabel,
  formatEtaDistance,
  formatJobTypeLabel,
  getActiveLegPhrase,
  getJobCustomerName,
  getStopTypeHeading,
} from "@/lib/jobs/jobSheetDisplay";
import { DRIVER_SAFE_BOTTOM, DRIVER_SAFE_TOP } from "@/lib/driverSafeArea";
import {
  openGoogleMapsNavigation,
  openWazeNavigation,
  stopToNavDestination,
} from "@/lib/navigation/openExternalNavigation";
import { getDriverJobDetail } from "@/services/jobs.service";
import DriverJobManifestPanel from "@/components/driver/jobs/DriverJobManifestPanel";
import DriverJobItineraryPanel from "@/components/driver/jobs/DriverJobItineraryPanel";
import SlideToConfirm from "@/components/driver/jobs/SlideToConfirm";

const SHEET_SPRING = { type: "spring", damping: 34, stiffness: 300, mass: 0.85 };
const DRAG_UP_PX = 28;
const DRAG_DOWN_PX = 28;
const DRAG_VEL = 220;
const LEVEL_1_HEIGHT_PX = 128;
const LEVEL_2_HEIGHT_PX = 320;
const SHEET_BOTTOM_PAD = `max(calc(${DRIVER_SAFE_BOTTOM} + 18px), 34px)`;

function stopTap(e) {
  e.stopPropagation();
}

function nextActiveStop(job) {
  if (!job?.stops?.length) return null;
  return (
    job.stops.find((s) => s.status === "arrived") ??
    job.stops.find((s) => s.status === "planned") ??
    job.stops[0]
  );
}

function stopIcon(status) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />;
  if (status === "arrived") return <Navigation className="w-4 h-4 text-blue-600 shrink-0" />;
  return <Circle className="w-4 h-4 text-gray-300 shrink-0" />;
}

function statusLabel(status) {
  return status?.replace(/_/g, " ") ?? "assigned";
}

function computeLevel3Height(hasInstructionCard) {
  if (typeof window === "undefined") return "82dvh";
  const instructionCard = hasInstructionCard ? 72 : 0;
  const header = 56;
  const mapPeek = 56;
  return `calc(100dvh - ${DRIVER_SAFE_TOP} - ${instructionCard + header + mapPeek}px)`;
}

function SheetDragHeader({ level, onDragEnd, children }) {
  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.2, bottom: 0.2 }}
      onDragEnd={onDragEnd}
      className="shrink-0 cursor-grab active:cursor-grabbing touch-pan-y"
    >
      <div className="flex justify-center pt-2.5 pb-1.5 pointer-events-none">
        <div className={`bg-gray-300 rounded-full ${level >= 2 ? "w-10 h-1.5" : "w-9 h-1"}`} />
      </div>
      {children}
    </motion.div>
  );
}

function EtaRow({ eta, distance, onExpand, onOpenPlanner }) {
  const hasBoth = Boolean(eta && distance);

  return (
    <div className="flex items-center justify-between px-2 min-h-[44px] shrink-0">
      <button
        type="button"
        aria-label="Filters"
        onClick={stopTap}
        onPointerDown={stopTap}
        className="w-11 h-11 flex items-center justify-center shrink-0 rounded-full active:bg-gray-100"
      >
        <SlidersHorizontal className="w-5 h-5 text-gray-800" />
      </button>

      <button type="button" className="flex-1 min-w-0 text-center px-1" onClick={onExpand} onPointerDown={stopTap}>
        {hasBoth ? (
          <p className="text-sm font-bold text-black tabular-nums flex items-center justify-center gap-1.5">
            <span>{eta}</span>
            <span className="inline-flex w-4 h-4 rounded-full bg-red-500 items-center justify-center">
              <User className="w-2.5 h-2.5 text-white" />
            </span>
            <span>{distance}</span>
          </p>
        ) : (
          <p className="text-sm font-bold text-black tabular-nums">
            {formatEtaDistance(eta, distance)}
          </p>
        )}
      </button>

      <button
        type="button"
        aria-label="Trip planner"
        onClick={(e) => {
          stopTap(e);
          onOpenPlanner();
        }}
        onPointerDown={stopTap}
        className="w-11 h-11 flex items-center justify-center shrink-0 rounded-full active:bg-gray-100"
      >
        <List className="w-5 h-5 text-gray-800" />
      </button>
    </div>
  );
}

function LegLine({ leg, onExpand }) {
  const text = `${leg.verb} ${leg.name}`.trim();
  return (
    <button type="button" onClick={onExpand} className="w-full px-4 pb-3 text-center shrink-0">
      <p className="text-sm font-semibold text-black truncate">{text}</p>
    </button>
  );
}

function ExternalNavButtons({ stop, driver, job }) {
  const destination = stopToNavDestination(stop);
  if (!destination) return null;

  return (
    <div className="flex gap-2 px-4 mb-3 shrink-0">
      <button
        type="button"
        className="flex-1 h-11 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-800 active:bg-gray-50"
        onClick={() => void openGoogleMapsNavigation(destination, { driver, job })}
      >
        Google Maps
      </button>
      <button
        type="button"
        className="flex-1 h-11 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-800 active:bg-gray-50"
        onClick={() => void openWazeNavigation(destination, { driver, job })}
      >
        Waze
      </button>
    </div>
  );
}

function PrimaryJobButton({ execution, job, busy, onAction, nearDestination, uberStyle = false }) {
  if (!execution.primaryAction) return null;

  const isArrive = execution.primaryAction === "arrive";
  const arriveReady = isArrive && nearDestination;
  const disabled = busy;
  const label = buildActionButtonLabel(execution, job);
  const displayLabel = busy
    ? "Working…"
    : arriveReady
      ? `${label} — you're here`
      : isArrive && !nearDestination
        ? `${label} — slide to confirm`
        : label;

  const hint =
    isArrive && !nearDestination
      ? "GPS is still far from this stop. Slide to confirm when you are actually there."
      : null;

  // Slide-to-confirm for operational actions (arrive / pickup / drop-off / leave).
  if (
    uberStyle ||
    ["arrive", "confirm_pickup", "confirm_dropoff", "complete_stop", "complete_job"].includes(
      execution.primaryAction,
    )
  ) {
    return (
      <SlideToConfirm
        label={displayLabel}
        busy={busy}
        disabled={disabled}
        pulse={arriveReady}
        hint={hint}
        onConfirm={() => onAction?.(execution.primaryAction)}
      />
    );
  }

  return (
    <div className="space-y-1.5 px-4 mb-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAction?.(execution.primaryAction)}
        className={`w-full h-12 rounded-2xl text-sm font-bold disabled:opacity-50 ${
          arriveReady
            ? "bg-[#2874EA] text-white ring-2 ring-[#2874EA]/40 animate-pulse"
            : "bg-black text-white"
        }`}
      >
        {displayLabel}
      </button>
      {hint ? <p className="text-[11px] leading-snug text-gray-500">{hint}</p> : null}
    </div>
  );
}

function JobStopsList({ stops, nextStopId }) {
  if (!stops?.length) return null;
  return (
    <div className="space-y-2">
      {stops.map((stop) => {
        const isNext = stop.id === nextStopId;
        return (
          <div
            key={stop.id}
            className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
              isNext ? "bg-blue-50 border border-blue-100" : "bg-gray-50"
            }`}
          >
            {stopIcon(stop.status)}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  {getStopTypeHeading(stop)}
                </span>
                {isNext ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-blue-700">Next</span>
                ) : null}
              </div>
              <p
                className={`text-sm font-semibold truncate ${
                  stop.status === "completed" ? "text-gray-400 line-through" : "text-black"
                }`}
              >
                {stop.label}
              </p>
              {stop.address ? (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{stop.address}</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Level 1 — leg line only (ETA row lives in shared drag header). */
function SheetLevel1Body({ leg, onExpand }) {
  return <LegLine leg={leg} onExpand={onExpand} />;
}

/** Level 2 — customer row, route summary, and action button. */
function SheetLevel2Body({
  job,
  execution,
  leg,
  actionBusy,
  nearDestination,
  onJobAction,
  onOpenPlanner,
}) {
  const customerName = getJobCustomerName(job, execution.currentStop);
  const stopCount = job?.stops?.length ?? 0;

  return (
    <div className="touch-auto shrink-0 flex flex-col min-w-0 overflow-hidden">
      <div className="flex items-center gap-2 px-4 pb-2 shrink-0 min-w-0">
        <button
          type="button"
          aria-label="Call passenger"
          className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center shrink-0 active:bg-gray-50"
        >
          <Phone className="w-5 h-5 text-black" />
        </button>
        <div className="flex-1 min-w-0 text-center">
          <p className="text-base font-black text-black uppercase truncate">{customerName}</p>
          {job?.routeName ? (
            <p className="text-xs text-gray-500 truncate mt-0.5">{job.routeName}</p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Trip planner"
          onClick={onOpenPlanner}
          className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center shrink-0 active:bg-gray-50"
        >
          <User className="w-5 h-5 text-black" />
        </button>
      </div>

      <div className="px-4 pb-2 shrink-0 min-w-0">
        <p className="text-xs font-semibold text-gray-700 text-center truncate">
          {leg.verb} · {leg.name}
        </p>
        {(job?.pickupLabel || job?.dropoffLabel) ? (
          <p className="mt-1 text-xs text-gray-500 text-center line-clamp-2 break-words">
            {job.pickupLabel}
            {job.dropoffLabel ? ` → ${job.dropoffLabel}` : ""}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {job?.startTime ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              {job.startTime}
            </span>
          ) : null}
          {job?.vehicleRegistration ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-600">
              <Car className="w-3.5 h-3.5" />
              {job.vehicleRegistration}
            </span>
          ) : null}
          {stopCount > 0 ? (
            <span className="text-[11px] font-semibold text-gray-500">{execution.progressLabel}</span>
          ) : null}
        </div>
      </div>

      <PrimaryJobButton
        execution={execution}
        job={job}
        busy={actionBusy}
        nearDestination={nearDestination}
        onAction={onJobAction}
        uberStyle
      />
    </div>
  );
}

/** Level 3 — full trip planner with all stops and job info. */
function SheetLevel3({
  job,
  driver,
  execution,
  actionBusy,
  nearDestination,
  onJobAction,
  onCollapse,
  onViewFullJob,
  onDragEnd,
  onJobReload,
}) {
  const nextStop = nextActiveStop(job);
  const customerName = getJobCustomerName(job, execution.currentStop);
  const currentStop = execution.currentStop ?? nextStop;
  const typeHeading = getStopTypeHeading(currentStop);
  const serviceLabel = job.vehicleRegistration ?? formatJobTypeLabel(job.jobType) ?? "Job";

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden touch-auto">
      <SheetDragHeader level={3} onDragEnd={onDragEnd}>
        <div className="flex items-center justify-between px-5 pb-1">
          <span className="font-black text-black text-base">Trip planner</span>
          <button type="button" onClick={onCollapse} className="text-xs font-semibold text-gray-400">
            Collapse
          </button>
        </div>
      </SheetDragHeader>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-4 mb-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-black">
              {typeHeading}
              <span className="text-gray-400 font-semibold"> · </span>
              {serviceLabel}
            </p>
            <p className="text-sm font-black text-black uppercase mt-0.5 truncate">{customerName}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{job.routeName}</p>
          </div>
          <button type="button" aria-label="More options" className="p-1 shrink-0">
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <button
          type="button"
          onClick={onViewFullJob}
          className="w-full text-center text-sm font-semibold text-[#2874EA] mb-4"
        >
          Waybill
        </button>

        <div className="mb-4 flex items-start gap-3 bg-gray-50 rounded-2xl p-3.5">
          <MapPin className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />
          <div className="min-w-0 text-sm">
            <p className="text-xs text-gray-500">Route overview</p>
            <p className="font-semibold text-black leading-snug">
              {job.pickupLabel}
              {job.dropoffLabel ? ` → ${job.dropoffLabel}` : ""}
            </p>
          </div>
        </div>

        {job.stops?.length ? (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">All stops</p>
              <p className="text-xs font-semibold text-gray-500">{execution.progressLabel}</p>
            </div>
            <JobStopsList stops={job.stops} nextStopId={nextStop?.id} />
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 mb-4 px-1">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 capitalize text-gray-700">
            {statusLabel(job.status)}
          </span>
          {job.vehicleRegistration ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
              <Car className="w-3.5 h-3.5" />
              {job.vehicleRegistration}
            </span>
          ) : null}
          {job.serviceDate ? (
            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              {job.serviceDate} · {job.startTime}
            </span>
          ) : null}
        </div>

        <ExternalNavButtons stop={currentStop} driver={driver} job={job} />

        {job?.id && driver?.id ? (
          <TripPlannerExtras job={job} driver={driver} onReload={onJobReload} />
        ) : null}

        <div className="px-0 mb-2">
          <PrimaryJobButton
            execution={execution}
            job={job}
            busy={actionBusy}
            nearDestination={nearDestination}
            onAction={onJobAction}
          />
        </div>

        <button
          type="button"
          onClick={onViewFullJob}
          className="w-full h-11 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-700"
        >
          View full job details
        </button>
      </div>
    </div>
  );
}

function TripPlannerExtras({ job, driver, onReload }) {
  const [detail, setDetail] = useState(null);
  const isCommandDuty = job?.source === "command_duty";

  useEffect(() => {
    if (!job?.id || !driver?.id || isCommandDuty) return;
    void getDriverJobDetail(job.id, driver.id).then(setDetail);
  }, [job?.id, driver?.id, isCommandDuty]);

  const enriched = isCommandDuty ? job : detail ?? job;

  const refresh = async () => {
    if (!isCommandDuty) {
      const next = await getDriverJobDetail(job.id, driver.id);
      setDetail(next);
    }
    if (onReload) await onReload();
  };

  return (
    <>
      {!isCommandDuty ? (
        <DriverJobManifestPanel job={enriched} driver={driver} onUpdated={refresh} />
      ) : null}
      <DriverJobItineraryPanel job={enriched} driver={driver} onUpdated={refresh} />
    </>
  );
}

export default function DriverJobsMapSheet({
  job,
  driver,
  onJobAction,
  actionBusy,
  nearDestination = false,
  navigationMode = false,
  eta = "",
  distance = "",
  hasNavBanner = false,
  onJobReload,
  jobDetailHref,
  onSheetLayoutChange,
}) {
  const navigate = useNavigate();
  const [level, setLevel] = useState(1);
  const detailHref =
    jobDetailHref ||
    (job?.source === "command_duty" ? "/duty" : job?.id ? `/job/${job.id}` : "/jobs");

  const execution = useMemo(() => getJobExecutionState(job), [job]);
  const leg = useMemo(
    () => getActiveLegPhrase(job, execution.currentStop, execution.phase),
    [job, execution.currentStop, execution.phase],
  );

  const level3Height = useMemo(() => computeLevel3Height(hasNavBanner), [hasNavBanner]);

  useEffect(() => {
    setLevel(1);
  }, [job?.id, navigationMode]);

  useEffect(() => {
    onSheetLayoutChange?.();
    const t = window.setTimeout(() => onSheetLayoutChange?.(), 280);
    return () => window.clearTimeout(t);
  }, [level, hasNavBanner, navigationMode, onSheetLayoutChange]);

  const handleDragEnd = useCallback(
    (_e, info) => {
      if (!job) return;
      const dy = info.offset.y;
      const vel = info.velocity.y;

      setLevel((current) => {
        if (dy < -DRAG_UP_PX || vel < -DRAG_VEL) {
          return Math.min(3, current + 1);
        }
        if (dy > DRAG_DOWN_PX || vel > DRAG_VEL) {
          return Math.max(1, current - 1);
        }
        return current;
      });
    },
    [job],
  );

  const sheetHeight =
    level === 3
      ? level3Height
      : level === 2
        ? `${LEVEL_2_HEIGHT_PX}px`
        : `${LEVEL_1_HEIGHT_PX}px`;

  const isFullscreen = level === 3;

  if (!job) {
    return (
      <div
        className="relative z-[10] shrink-0 w-full bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden"
        style={{ paddingBottom: SHEET_BOTTOM_PAD }}
      >
        <SheetDragHeader level={1} onDragEnd={() => {}} />
        <div className="px-4 pb-4 text-center">
          <p className="font-bold text-black text-sm">{execution.peekTitle}</p>
          <p className="text-xs text-gray-500 mt-0.5">{execution.peekSub}</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      animate={{ height: sheetHeight }}
      transition={SHEET_SPRING}
      className={`w-full max-w-full min-w-0 bg-white rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] overflow-hidden flex flex-col touch-none ${
        isFullscreen ? "fixed bottom-0 left-0 right-0 z-[250]" : "relative z-[10] shrink-0"
      }`}
      style={{ paddingBottom: SHEET_BOTTOM_PAD }}
    >
      {level < 3 ? (
        <SheetDragHeader level={level} onDragEnd={handleDragEnd}>
          <EtaRow
            eta={eta}
            distance={distance}
            onExpand={() => setLevel((l) => Math.min(3, l + 1))}
            onOpenPlanner={() => setLevel(3)}
          />
        </SheetDragHeader>
      ) : null}

      {level === 1 ? <SheetLevel1Body leg={leg} onExpand={() => setLevel(2)} /> : null}

      {level === 2 ? (
        <SheetLevel2Body
          job={job}
          execution={execution}
          leg={leg}
          actionBusy={actionBusy}
          nearDestination={nearDestination}
          onJobAction={onJobAction}
          onOpenPlanner={() => setLevel(3)}
        />
      ) : null}

      {level === 3 ? (
        <SheetLevel3
          job={job}
          driver={driver}
          execution={execution}
          actionBusy={actionBusy}
          nearDestination={nearDestination}
          onJobAction={onJobAction}
          onCollapse={() => setLevel(2)}
          onViewFullJob={() => navigate(detailHref)}
          onDragEnd={handleDragEnd}
          onJobReload={onJobReload}
        />
      ) : null}
    </motion.div>
  );
}
