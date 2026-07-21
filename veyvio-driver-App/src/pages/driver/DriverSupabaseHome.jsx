import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  Briefcase,
  CalendarOff,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  Package,
  Send,
  Shield,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_DISPLAY_NAME } from "@/lib/app-branding";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { useFleetTracking } from "@/hooks/useFleetTracking";
import DriverActionCard from "@/components/driver/operational/DriverActionCard";
import DriverComplianceStrip from "@/components/driver/operational/DriverComplianceStrip";
import { DriverHeaderActionButtons } from "@/components/driver/operational/DriverHeaderIconButton";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverQuickChips from "@/components/driver/operational/DriverQuickChips";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import DriverShiftHero from "@/components/driver/operational/DriverShiftHero";
import DriverSyncBanner from "@/components/driver/operational/DriverSyncBanner";
import DriverStatusBanner from "@/components/driver/operational/DriverStatusBanner";
import WalkaroundSafetyBanner from "@/components/driver/walkaround/WalkaroundSafetyBanner";
import { greetingForHour, op } from "@/lib/driver-operational-theme";
import { getDriverOnboardingState } from "@/services/onboarding.service";
import { getPrimaryComplianceFix, loadDriverComplianceReadiness } from "@/services/driver-compliance.service";
import { loadDriverTrainingCentre, formatTrainingDue, eligibilityRestrictionCopy } from "@/services/training.service";
import { getDriverWorkingTimeSummary } from "@/services/working-time.service";
import { getTachographReminders } from "@/services/tachograph-reminders.service";
import { countUnread } from "@/services/notifications.service";
import { getPendingJobOffers } from "@/services/job-offers.service";
import {
  flushPendingWalkaroundSubmissions,
  getPendingSyncCount,
  getWalkaroundSafetyStatus,
} from "@/services/vehicle-check.service";
import { getDriverDutyState } from "@/services/duty-timeline.service";
import { getNextApprovedLeave } from "@/services/time-off.service";
import { getRecentRemovedTransfers } from "@/services/jobs.service";
import {
  commandDutyStateFromBootstrap,
  loadDriverBootstrap,
  mergeDutyState,
  walkaroundSafetyFromHomeSummary,
} from "@/services/driver-bootstrap.service";
import RemovedJobNotice from "@/components/jobs/RemovedJobNotice";
import DriverSosModal from "@/components/driver/mobile/DriverSosModal";
import BiometricEnrollmentHost from "@/features/auth/biometrics/BiometricEnrollmentHost";

export default function DriverSupabaseHome({ driver }) {
  const { homeSummary: sessionHomeSummary, bootstrap: sessionBootstrap, session, refresh } =
    useDriverSupabaseAuth();
  const [homeSummary, setHomeSummary] = useState(sessionHomeSummary);
  const [bootstrap, setBootstrap] = useState(sessionBootstrap);
  const [state, setState] = useState(null);
  const [sosOpen, setSosOpen] = useState(false);
  const [complianceFix, setComplianceFix] = useState(null);
  const [tachoReminders, setTachoReminders] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [walkaroundSafety, setWalkaroundSafety] = useState(() =>
    walkaroundSafetyFromHomeSummary(sessionHomeSummary),
  );
  const [safetyLoading, setSafetyLoading] = useState(
    () => !walkaroundSafetyFromHomeSummary(sessionHomeSummary),
  );
  const [pendingSync, setPendingSync] = useState(0);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [workingTime, setWorkingTime] = useState(null);
  // Paint Command sign-on immediately — do not wait for slow Ridova lookups.
  const [dutyState, setDutyState] = useState(() =>
    commandDutyStateFromBootstrap(sessionBootstrap, sessionHomeSummary),
  );
  const [nextLeave, setNextLeave] = useState(null);
  const [removedTransfers, setRemovedTransfers] = useState([]);
  const [bootstrapError, setBootstrapError] = useState("");
  const [trainingHome, setTrainingHome] = useState(null);
  // Keep GPS flowing to Command whenever this duty is live — not only after local shift flags settle.
  const trackingActive = Boolean(
    dutyState?.dutyId &&
      !dutyState?.isShiftEnded &&
      (dutyState?.isSignedOn ||
        dutyState?.operationalState === "on_duty" ||
        Boolean(dutyState?.shift?.signOnAt)),
  );
  useFleetTracking({
    driver,
    active: trackingActive,
    dutyId: dutyState?.dutyId ?? null,
  });
  const reloadGenRef = useRef(0);
  const sessionRef = useRef({ session, sessionBootstrap, sessionHomeSummary });
  sessionRef.current = { session, sessionBootstrap, sessionHomeSummary };

  const reloadHomeData = useCallback(async ({ force = false } = {}) => {
    const gen = ++reloadGenRef.current;
    const {
      session: currentSession,
      sessionBootstrap: fallbackBootstrap,
      sessionHomeSummary: fallbackSummary,
    } = sessionRef.current;

    const hadCommandPaint =
      Boolean(fallbackBootstrap) || Boolean(walkaroundSafetyFromHomeSummary(fallbackSummary));
    if (!hadCommandPaint) setSafetyLoading(true);
    setBootstrapError("");
    setPendingSync(getPendingSyncCount(driver.id));

    const depotId = currentSession?.activeDepotId ?? currentSession?.depots?.[0]?.id ?? null;
    const boot = await loadDriverBootstrap({ depotId, force }).catch(() => null);
    if (gen !== reloadGenRef.current) return;

    if (boot?.ok) {
      setBootstrap(boot.bootstrap);
      setHomeSummary(boot.bootstrap?.legacy?.homeSummary ?? null);
    } else if (boot && !boot.ok) {
      setBootstrapError(boot.message ?? "Could not refresh operational data.");
    }

    const activeBootstrap = boot?.ok ? boot.bootstrap : fallbackBootstrap;
    const summary = boot?.ok ? boot.bootstrap?.legacy?.homeSummary : fallbackSummary;
    const fromBootstrapDuty = commandDutyStateFromBootstrap(activeBootstrap, summary);
    const fromBootstrapSafety = walkaroundSafetyFromHomeSummary(summary);

    // Paint Command projection immediately — do not wait on Ridova enrichment.
    if (fromBootstrapDuty) {
      setDutyState((prev) => mergeDutyState(fromBootstrapDuty, prev));
    }
    if (fromBootstrapSafety) {
      setWalkaroundSafety(fromBootstrapSafety);
    }
    setSafetyLoading(false);

    const unreadFromBootstrap = activeBootstrap?.messages?.unreadTotal;
    if (typeof unreadFromBootstrap === "number") {
      setUnreadCount(unreadFromBootstrap);
    }

    // Soft enrichment — missing Ridova tables must never block tab paint.
    const [nextState, readiness, reminders, safety, offers, wtd, duty, leave, removed, training] =
      await Promise.all([
        getDriverOnboardingState(driver).catch(() => null),
        loadDriverComplianceReadiness(driver).catch(() => null),
        getTachographReminders(driver.id).catch(() => []),
        getWalkaroundSafetyStatus(driver).catch(() => null),
        getPendingJobOffers(driver.id).catch(() => []),
        getDriverWorkingTimeSummary(driver.id).catch(() => null),
        getDriverDutyState(driver).catch(() => null),
        getNextApprovedLeave(driver.id, currentSession).catch(() => null),
        getRecentRemovedTransfers(driver.id).catch(() => []),
        loadDriverTrainingCentre({
          ...currentSession,
          driverId: driver.id,
        }).catch(() => null),
      ]);
    if (gen !== reloadGenRef.current) return;

    setState(nextState);
    setComplianceFix(readiness ? getPrimaryComplianceFix(readiness) : null);
    setTachoReminders(Array.isArray(reminders) ? reminders : []);
    setWalkaroundSafety(safety ?? fromBootstrapSafety);
    setPendingOffer(offers?.[0] ?? null);
    setWorkingTime(wtd);
    // Command sign-on wins; Ridova is fallback only when Command has no sign-on.
    setDutyState(mergeDutyState(fromBootstrapDuty, duty));
    setNextLeave(leave);
    setRemovedTransfers(Array.isArray(removed) ? removed : []);
    setPendingSync(getPendingSyncCount(driver.id));
    setTrainingHome(training?.ok ? training : null);
  }, [driver]);

  useEffect(() => {
    setHomeSummary(sessionHomeSummary);
    setBootstrap(sessionBootstrap);
    const fromSession = commandDutyStateFromBootstrap(sessionBootstrap, sessionHomeSummary);
    if (fromSession) {
      setDutyState((prev) => mergeDutyState(fromSession, prev));
    }
    const safetyFromSession = walkaroundSafetyFromHomeSummary(sessionHomeSummary);
    if (safetyFromSession) {
      setWalkaroundSafety((prev) => prev ?? safetyFromSession);
      setSafetyLoading(false);
    }
  }, [sessionHomeSummary, sessionBootstrap]);

  useEffect(() => {
    void flushPendingWalkaroundSubmissions(driver)
      .then(({ synced }) => {
        if (synced > 0) void reloadHomeData({ force: true });
      })
      .catch(() => {});
    void reloadHomeData({ force: false });

    const refreshOnReturn = () => {
      if (document.visibilityState === "visible") void reloadHomeData({ force: false });
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("pageshow", refreshOnReturn);

    void (async () => {
      try {
        const { getSupabaseClient } = await import("@/lib/supabase/client");
        const supabase = getSupabaseClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const n = await countUnread(user.id).catch(() => 0);
          setUnreadCount(n);
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("pageshow", refreshOnReturn);
    };
  }, [driver, reloadHomeData]);

  const displayName = bootstrap?.driver?.displayName || driver.fullName;
  const firstName = displayName.split(" ")[0];
  const companyName = bootstrap?.operator?.companyName || session?.organisationName;
  const depotName = bootstrap?.operator?.depotName || homeSummary?.driver?.depotName;
  const requiredActions = bootstrap?.requiredActions ?? homeSummary?.requiredActions ?? [];
  const eligibilityBlocked = bootstrap?.eligibility && bootstrap.eligibility.allowed === false;

  const dispatchBlocked = Boolean(state?.dispatchBlocked) || Boolean(eligibilityBlocked);
  const checkBlocksRoute = Boolean(
    walkaroundSafety?.checkRequired &&
      walkaroundSafety?.registration &&
      !walkaroundSafety?.checkComplete &&
      !dutyState?.isSignedOn,
  );
  const dispatchLabel = dispatchBlocked
    ? "Dispatch blocked"
    : dutyState?.isSignedOn
      ? "On duty"
      : checkBlocksRoute
        ? "Check pending"
        : homeSummary?.operationalState === "no_duty_scheduled"
          ? "No duty today"
          : "Dispatch ready";

  const nextDutyCard = useMemo(() => {
    const trips = bootstrap?.legacy?.tripsSchedule?.today ?? [];
    return trips[0] ?? null;
  }, [bootstrap]);

  const quickChips = [
    { to: "/jobs", icon: Briefcase, label: "Jobs", disabled: dispatchBlocked || checkBlocksRoute },
    { to: "/defects", icon: Wrench, label: "Defect" },
    { to: "/incidents/new", icon: Shield, label: "Incident" },
    { to: "/lost-property/report", icon: Package, label: "Found item" },
    { to: "/schedule", icon: CalendarOff, label: "Book leave" },
    { to: "/working-time", icon: Clock, label: "Working time" },
  ];

  const showSafetyDetail =
    walkaroundSafety?.registration &&
    !walkaroundSafety?.checkComplete &&
    !walkaroundSafety?.vehicleBlocked;

  // Offer Face ID / fingerprint once per session when the driver opens Home.
  const enrollmentReady = Boolean(driver?.id);

  return (
    <DriverPageContainer>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={op.appLabel}>{APP_DISPLAY_NAME}</p>
          <p className="text-muted-foreground text-sm mt-2">
            {greetingForHour()}, {firstName}
          </p>
          <h1 className="text-2xl font-bold mt-0.5 text-foreground">Today&apos;s shift</h1>
          {companyName || depotName ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {[companyName, depotName].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <DriverHeaderActionButtons onSafetyClick={() => setSosOpen(true)} />
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card active:bg-muted"
            aria-label="Open profile"
          >
            <User className="h-5 w-5 text-muted-foreground" />
          </Link>
        </div>
      </div>

      <DriverSosModal open={sosOpen} onClose={() => setSosOpen(false)} activeBooking={pendingOffer} />

      <div className="mt-4 space-y-3">
        {bootstrapError ? (
          <DriverStatusBanner variant="warning" title="Could not refresh from Command">
            <p>{bootstrapError}</p>
            <button
              type="button"
              className="mt-2 text-sm font-semibold text-[var(--ridova-teal)]"
              onClick={() => void refresh()}
            >
              Try again
            </button>
          </DriverStatusBanner>
        ) : null}

        <DriverShiftHero
          dutyState={dutyState}
          workingTime={workingTime}
          dispatchLabel={dispatchLabel}
          dispatchBlocked={dispatchBlocked}
          vehicleRegistration={walkaroundSafety?.registration}
        />

        {nextDutyCard ? (
          <div className={`p-4 ${op.card}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next duty</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {nextDutyCard.runName || nextDutyCard.reference || "Published duty"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {[nextDutyCard.scheduledStart, nextDutyCard.vehicleRegistration, nextDutyCard.origin]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Button asChild className={`mt-3 h-11 min-h-[44px] ${op.primaryBtn}`}>
              <Link to={nextDutyCard.primaryActionHref || "/duty"}>
                {nextDutyCard.primaryActionLabel || "Open duty"}
              </Link>
            </Button>
          </div>
        ) : null}

        {requiredActions.length > 0 ? (
          <DriverStatusBanner variant="warning" title="Needs attention">
            <ul className="space-y-1">
              {requiredActions.map((action) => (
                <li key={action.id || action.code || action.title}>
                  • {action.title || action.label || action.code}
                  {action.description ? ` — ${action.description}` : ""}
                </li>
              ))}
            </ul>
          </DriverStatusBanner>
        ) : null}

        <DriverSyncBanner pendingCount={pendingSync} />

        <RemovedJobNotice transfers={removedTransfers} />

        <DriverComplianceStrip
          walkaroundSafety={walkaroundSafety}
          pendingSync={pendingSync}
          dispatchBlocked={dispatchBlocked}
          dispatchBlockers={state?.dispatchBlockers ?? []}
          outdatedPolicies={state?.outdatedPolicies ?? []}
          tachoReminders={tachoReminders}
          expiringDocuments={state?.expiringDocuments ?? []}
          complianceFix={complianceFix}
        />

        {nextLeave ? (
          <div className={`p-3 text-sm ${op.card}`}>
            <p className="font-medium text-foreground">Upcoming leave</p>
            <p className="text-muted-foreground mt-0.5">
              {nextLeave.absenceLabel} · {nextLeave.dateFrom}
              {nextLeave.dateTo !== nextLeave.dateFrom ? ` – ${nextLeave.dateTo}` : ""}
            </p>
          </div>
        ) : null}
      </div>

      {pendingOffer ? (
        <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold">Incoming job offer</p>
          <p className="mt-1 text-sm text-muted-foreground">{pendingOffer.job?.route_name ?? "New job"}</p>
          <Button asChild className={`mt-3 h-11 min-h-[44px] ${op.primaryBtn}`}>
            <Link to={`/offers/${pendingOffer.id}`}>View offer</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-4">
        <p className="text-xs font-medium text-muted-foreground mb-2 px-1">Quick actions</p>
        <DriverQuickChips items={quickChips} />
      </div>

      {showSafetyDetail ? (
        <div className="mt-4">
          <WalkaroundSafetyBanner safety={walkaroundSafety} loading={safetyLoading} />
        </div>
      ) : null}

      {walkaroundSafety?.checkComplete ? (
        <div className="mt-4">
          <WalkaroundSafetyBanner safety={walkaroundSafety} loading={safetyLoading} />
        </div>
      ) : null}

      {!showSafetyDetail && !walkaroundSafety?.checkComplete && walkaroundSafety?.vehicleBlocked ? (
        <div className="mt-4">
          <WalkaroundSafetyBanner safety={walkaroundSafety} loading={safetyLoading} />
        </div>
      ) : null}

      {state?.dispatchBlockers?.length > 0 && dispatchBlocked ? (
        <div className="mt-4">
          <DriverStatusBanner variant="warning" title="Dispatch blocked">
            <ul className="space-y-1">
              {state.dispatchBlockers.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
          </DriverStatusBanner>
        </div>
      ) : null}

      <DriverSectionTitle>Compliance</DriverSectionTitle>
      <div className={op.listCard}>
        <DriverActionCard to="/documents" icon={FileText} title="Documents" subtitle="Required compliance uploads" compact inList />
        <DriverActionCard
          to="/acknowledgements"
          icon={ClipboardList}
          title="Acknowledgements"
          subtitle="Debriefs and corrective actions"
          compact
          inList
        />
        <DriverActionCard
          to="/training"
          icon={GraduationCap}
          title="Training"
          subtitle={
            trainingHome?.summary
              ? `${trainingHome.summary.requiredOpen} required · ${trainingHome.summary.dueSoon} due soon`
              : "Mandatory modules and certificates"
          }
          badge={trainingHome?.summary?.overdue > 0 ? trainingHome.summary.overdue : null}
          compact
          inList
        />
      </div>

      {trainingHome?.urgent ? (
        <div
          className={`mt-4 rounded-2xl border p-4 ${
            trainingHome.urgent.warningStatus === "overdue" ||
            ["block_all_work", "block_specific_work"].includes(trainingHome.urgent.eligibilityEffect)
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
          }`}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-900">
            {["block_all_work", "block_specific_work"].includes(trainingHome.urgent.eligibilityEffect)
              ? "Training required before duty"
              : "Training"}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{trainingHome.urgent.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {eligibilityRestrictionCopy(trainingHome.urgent) ??
              (trainingHome.urgent.dueAt
                ? `Due ${formatTrainingDue(trainingHome.urgent.dueAt)}`
                : "Complete this training to stay duty-ready.")}
          </p>
          <Button asChild className={`mt-3 h-11 min-h-[44px] ${op.primaryBtn}`}>
            <Link to={`/training/${trainingHome.urgent.id}`}>
              {trainingHome.urgent.progressPercentage > 0 ? "Continue" : "Start now"}
            </Link>
          </Button>
        </div>
      ) : null}

      <DriverSectionTitle>Messages</DriverSectionTitle>
      <div className={op.listCard}>
        <DriverActionCard
          to="/notifications"
          icon={Bell}
          title="Notifications"
          subtitle={unreadCount > 0 ? `${unreadCount} unread from Command` : "Training and compliance alerts"}
          badge={unreadCount > 0 ? unreadCount : null}
          compact
          inList
        />
        <DriverActionCard to="/messages" icon={MessageSquare} title="Messages" subtitle="Dispatch and yard conversations" compact inList />
        <DriverActionCard to="/contact" icon={Send} title="Contact admin" subtitle="Reach dispatch or compliance" compact inList />
      </div>

      <BiometricEnrollmentHost driverId={driver?.id} ready={enrollmentReady} delayMs={3500} />
    </DriverPageContainer>
  );
}
