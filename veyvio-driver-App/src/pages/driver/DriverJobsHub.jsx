import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, CheckCircle2, Clock3, Navigation, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  dutyHasNavigableStops,
  flattenDutyStops,
} from "@/lib/command-duty-nav-job";
import { playNotificationSound } from "@/lib/notifications/notification-sound";
import { loadDriverBootstrap } from "@/services/driver-bootstrap.service";
import {
  acknowledgeDuty,
  needsAck,
} from "@/services/command-driver-ops.service";

/** Poll while waiting — push for duty_published is not fully wired server-side yet. */
const DUTY_POLL_MS = 20_000;

function lifecycleLabel(status) {
  const s = String(status ?? "");
  if (needsAck(s)) return "Needs acknowledgement";
  if (s === "acknowledged") return "Acknowledged";
  if (s === "ready") return "Ready";
  if (s === "in_progress") return "In progress";
  return s.replace(/_/g, " ") || "Published";
}

function dutyIds(list) {
  return new Set((list ?? []).map((d) => String(d.id)).filter(Boolean));
}

export default function DriverJobsHub({ driver }) {
  const { bootstrap: sessionBootstrap, session, refresh } = useDriverSupabaseAuth();
  const [bootstrap, setBootstrap] = useState(sessionBootstrap);
  const [loading, setLoading] = useState(() => !(sessionBootstrap?.duties || sessionBootstrap?.legacy));
  const [error, setError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busyId, setBusyId] = useState(null);
  const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
  const knownDutyIdsRef = useRef(dutyIds(sessionBootstrap?.duties));
  const primedRef = useRef(Boolean(sessionBootstrap));
  const bootstrapRef = useRef(bootstrap);
  bootstrapRef.current = bootstrap;

  const applyBootstrap = useCallback((nextBootstrap, { announceNew = false } = {}) => {
    if (!nextBootstrap) return;
    const nextList = nextBootstrap.duties ?? [];
    const nextIds = dutyIds(nextList);
    if (announceNew && primedRef.current) {
      const arrived = nextList.filter((d) => !knownDutyIdsRef.current.has(String(d.id)));
      if (arrived.length > 0) {
        const first = arrived[0];
        const label = first.routeName || first.reference || "New duty";
        const message =
          arrived.length === 1
            ? `New duty assigned: ${label}`
            : `${arrived.length} new duties assigned`;
        playNotificationSound();
        toast.success(message, { duration: 6000 });
        setActionMsg(message);
      }
    }
    knownDutyIdsRef.current = nextIds;
    primedRef.current = true;
    setBootstrap(nextBootstrap);
  }, []);

  const reload = useCallback(
    async ({ force = false, announceNew = false } = {}) => {
      setError("");
      const hasPaint = Boolean(sessionBootstrap || bootstrapRef.current);
      if (!hasPaint) setLoading(true);

      const result = await loadDriverBootstrap({ depotId, force });
      if (!result.ok) {
        if (!hasPaint) {
          setError(result.message ?? "Could not load duties from Command.");
        }
        setLoading(false);
        return;
      }
      applyBootstrap(result.bootstrap, { announceNew });
      setLoading(false);
    },
    [applyBootstrap, depotId, sessionBootstrap],
  );

  useEffect(() => {
    if (sessionBootstrap) {
      applyBootstrap(sessionBootstrap, { announceNew: false });
      setLoading(false);
    }
  }, [applyBootstrap, sessionBootstrap]);

  useEffect(() => {
    let cancelled = false;
    void loadDriverBootstrap({ depotId, force: false }).then((result) => {
      if (cancelled) return;
      if (result?.ok) {
        applyBootstrap(result.bootstrap, { announceNew: false });
        setLoading(false);
        return;
      }
      if (!sessionBootstrap) {
        setError(result?.message ?? "Could not load duties from Command.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [applyBootstrap, depotId, sessionBootstrap]);

  // Keep checking for the next published duty while this screen is open.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void reload({ force: true, announceNew: true });
    };
    const interval = window.setInterval(tick, DUTY_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reload]);

  const duties = bootstrap?.duties ?? [];
  const todayTrips = bootstrap?.legacy?.tripsSchedule?.today ?? [];
  const waitingForDuty = !loading && !error && duties.length === 0;

  async function handleAcknowledge(dutyId) {
    setBusyId(dutyId);
    setActionMsg("");
    const result = await acknowledgeDuty(dutyId);
    setBusyId(null);
    if (!result.ok) {
      setActionMsg(result.message ?? "Acknowledgement failed.");
      return;
    }
    setActionMsg("Duty acknowledged — dispatch can see you have received it.");
    await reload({ force: true, announceNew: false });
    await refresh();
  }

  return (
    <DriverPageContainer>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={op.appLabel}>Trips</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Your duties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {waitingForDuty
              ? "Off duty — waiting for the next assignment"
              : `Published assignments from ${bootstrap?.operator?.companyName ?? "your operator"}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void reload({ force: true, announceNew: true })}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card"
          aria-label="Refresh duties"
        >
          <RefreshCw className={`h-5 w-5 ${op.iconTeal}`} />
        </button>
      </div>

      {waitingForDuty ? (
        <CommandBackendNotice
          status="ready"
          title="Watching for your next duty"
          description="When dispatch creates and assigns a duty to you, it will appear here automatically. You will get an alert on this screen."
        />
      ) : (
        <CommandBackendNotice
          status="ready"
          title="Connected to Veyvio Command"
          description="Acknowledge duties here, then open navigation when you are signed on and ready to run the stops."
        />
      )}

      {loading ? <DriverPageLoader label="Loading duties…" /> : null}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      {actionMsg ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-foreground">{actionMsg}</div>
      ) : null}

      {waitingForDuty ? (
        <DriverEmptyState
          icon={Briefcase}
          title="No job found"
          description="You are off duty with nothing published yet. Stay on Trips or Home — as soon as the next duty is assigned to you, it will show here with an alert."
          action={
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-[44px]"
              onClick={() => void reload({ force: true, announceNew: true })}
            >
              Check again
            </Button>
          }
        />
      ) : null}

      <div className="mt-4 space-y-3">
        {duties.map((duty) => {
          const vehicle = duty.vehicle;
          const reg = vehicle?.registrationNumber || vehicle?.registration;
          const ackNeeded = needsAck(duty.lifecycleStatus);
          const tripMeta = todayTrips.find((t) => t.dutyId === duty.id || t.id === duty.id);
          const signedOn =
            Boolean(duty.actualSignOnAt) || String(duty.lifecycleStatus) === "in_progress";
          const signedOff = Boolean(duty.actualSignOffAt) || String(duty.lifecycleStatus) === "completed";
          const canNavigate = !signedOff && dutyHasNavigableStops(duty);
          const stopCount = flattenDutyStops(duty).length;
          const nextStop = flattenDutyStops(duty)[0];

          return (
            <article key={duty.id} className={`p-4 ${op.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {duty.dutyDate || tripMeta?.scheduledDate || "Duty"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-foreground">
                    {duty.routeName || duty.reference || "Published duty"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[duty.startTime || tripMeta?.scheduledStart, reg, duty.reportingLocation]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {stopCount > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stopCount} stop{stopCount === 1 ? "" : "s"}
                      {nextStop?.name || nextStop?.address
                        ? ` · next ${nextStop.name || nextStop.address}`
                        : ""}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${
                    ackNeeded
                      ? "border-amber-200 bg-amber-50 text-amber-900"
                      : "border-emerald-200 bg-emerald-50 text-emerald-900"
                  }`}
                >
                  {lifecycleLabel(duty.lifecycleStatus)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {canNavigate ? (
                  <Button asChild className={`h-11 min-h-[44px] flex-1 ${op.primaryBtn}`}>
                    <Link to={`/duty/${duty.id}/navigate`}>
                      <Navigation className="mr-2 h-4 w-4" />
                      {signedOn ? "Start navigation" : "Preview route"}
                    </Link>
                  </Button>
                ) : null}
                {ackNeeded ? (
                  <Button
                    type="button"
                    disabled={busyId === duty.id}
                    className={`h-11 min-h-[44px] flex-1 ${canNavigate ? "" : op.primaryBtn}`}
                    variant={canNavigate ? "outline" : "default"}
                    onClick={() => void handleAcknowledge(duty.id)}
                  >
                    {busyId === duty.id ? "Acknowledging…" : "Acknowledge duty"}
                  </Button>
                ) : (
                  <div className="flex min-h-[44px] flex-1 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-sm font-medium text-emerald-900">
                    <CheckCircle2 className="h-4 w-4" />
                    Received by you
                  </div>
                )}
                <Button asChild variant="outline" className="h-11 min-h-[44px]">
                  <Link to="/duty">
                    <Clock3 className="mr-2 h-4 w-4" />
                    My duty
                  </Link>
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <DriverSectionTitle>Driver</DriverSectionTitle>
      <p className="text-sm text-muted-foreground">
        Signed in as {driver?.fullName || bootstrap?.driver?.displayName || "Driver"}. Depot{" "}
        {bootstrap?.operator?.depotName || "not set"}.
      </p>
    </DriverPageContainer>
  );
}
