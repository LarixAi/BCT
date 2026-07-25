import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { dutyHasNavigableStops } from "@/lib/command-duty-nav-job";
import { resolveDriverWorkspaceScope } from "@/lib/driver-workspace-storage";
import { loadDriverBootstrap } from "@/services/driver-bootstrap.service";
import {
  acknowledgeDuty,
  needsAck,
} from "@/services/command-driver-ops.service";
import {
  signOffDutyWithOutbox,
  signOnDutyWithOutbox,
  hasPendingDutyOps,
} from "@/services/driver-ops-outbox.service";
import { canSignOnForDuty, getDutySignOnBlockers } from "@/lib/driver-sign-on-gate";

export default function DriverMyDuty({ driver }) {
  const { session, bootstrap: sessionBootstrap, refresh } = useDriverSupabaseAuth();
  const [bootstrap, setBootstrap] = useState(sessionBootstrap);
  const [loading, setLoading] = useState(() => !sessionBootstrap);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [actionBlocked, setActionBlocked] = useState(false);
  const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;

  const reload = useCallback(async ({ force = false } = {}) => {
    if (!sessionBootstrap && !bootstrap) setLoading(true);
    setError("");
    const result = await loadDriverBootstrap({ depotId, force });
    if (!result.ok) {
      if (!sessionBootstrap && !bootstrap) {
        setError(result.message ?? "Could not load duty from Command.");
      }
      setLoading(false);
      return;
    }
    setBootstrap(result.bootstrap);
    setLoading(false);
  }, [bootstrap, depotId, sessionBootstrap]);

  useEffect(() => {
    if (sessionBootstrap) {
      setBootstrap(sessionBootstrap);
      setLoading(false);
    }
  }, [sessionBootstrap]);

  useEffect(() => {
    let cancelled = false;
    void loadDriverBootstrap({ depotId, force: false }).then((result) => {
      if (cancelled) return;
      if (result?.ok) {
        setBootstrap(result.bootstrap);
        setLoading(false);
        return;
      }
      if (!sessionBootstrap) {
        setError(result?.message ?? "Could not load duty from Command.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [depotId, sessionBootstrap]);

  const duties = bootstrap?.duties ?? [];
  const next = duties[0];
  const homeSummary = bootstrap?.legacy?.homeSummary;
  const signedOn = Boolean(next?.actualSignOnAt) || next?.lifecycleStatus === "in_progress";
  const signedOff = Boolean(next?.actualSignOffAt) || next?.lifecycleStatus === "completed";
  const workspace = resolveDriverWorkspaceScope(driver, session);
  const signOnBlockers = next ? getDutySignOnBlockers({ duty: next, bootstrap }) : [];
  const signOnAllowed = next ? canSignOnForDuty({ duty: next, bootstrap }) : false;
  const pendingSignOn =
    next?.id && driver?.id
      ? hasPendingDutyOps(driver.id, next.id, workspace.companyId, workspace.membershipId)
      : false;

  async function handleAcknowledge(dutyId) {
    setBusyId(dutyId);
    setActionMsg("");
    setActionBlocked(false);
    const result = await acknowledgeDuty(dutyId);
    setBusyId(null);
    if (!result.ok) {
      setActionMsg(result.message ?? "Acknowledgement failed.");
      return;
    }
    setActionMsg("Duty acknowledged — Admin can see you received it.");
    await reload({ force: true });
    await refresh();
  }

  async function handleSignOn(dutyId) {
    setBusyId(dutyId);
    setActionMsg("");
    setActionBlocked(false);
    const result = await signOnDutyWithOutbox(driver, session, dutyId);
    setBusyId(null);
    if (!result.ok) {
      setActionBlocked(Boolean(result.blocked));
      setActionMsg(result.message ?? "Sign-on failed.");
      return;
    }
    if (result.queued) {
      setActionBlocked(false);
      setActionMsg(result.message ?? "Sign-on queued on this device.");
      return;
    }
    setActionMsg("Signed on — Admin can see you on duty.");
    await reload({ force: true });
    await refresh();
  }

  async function handleSignOff(dutyId) {
    setBusyId(dutyId);
    setActionMsg("");
    setActionBlocked(false);
    const result = await signOffDutyWithOutbox(driver, session, dutyId);
    setBusyId(null);
    if (!result.ok) {
      setActionMsg(result.message ?? "Sign-off failed.");
      return;
    }
    if (result.queued) {
      setActionMsg(result.message ?? "Sign-off queued on this device.");
      return;
    }
    setActionMsg("Signed off — duty closed in Admin.");
    await reload({ force: true });
    await refresh();
  }

  return (
    <div>
      <DriverOperationalHeader
        title="My duty"
        subtitle={bootstrap?.operator?.depotName || "Published assignments from Command"}
        backTo="/"
      />
      <div className="px-4 pb-10">
        <CommandBackendNotice
          status="ready"
          title="Sign-on writes to Admin"
          description="Acknowledge, sign on and sign off update the same duty record dispatch sees in Command."
        />

        {loading ? <DriverPageLoader label="Loading duty…" /> : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
        ) : null}
        {actionMsg ? (
          <div
            className={`mt-4 rounded-xl border p-3 text-sm ${
              actionBlocked
                ? "border-amber-200 bg-amber-50 text-amber-950"
                : "border-border bg-muted/40"
            }`}
          >
            {actionBlocked ? <p className="font-semibold">Sign-on blocked</p> : null}
            <p className={actionBlocked ? "mt-1" : undefined}>{actionMsg}</p>
          </div>
        ) : null}

        {!loading && !next ? (
          <div className={`mt-6 p-4 ${op.card}`}>
            <p className="text-lg font-semibold">Not signed on</p>
            <p className="mt-1 text-sm text-muted-foreground">No duty published for you today.</p>
            <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
              <Link to="/jobs">Open trips</Link>
            </Button>
          </div>
        ) : null}

        {next ? (
          <div className={`mt-6 space-y-3 p-4 ${op.card}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Next duty</p>
            <p className="text-xl font-bold text-foreground">
              {next.routeName || next.reference || "Published duty"}
            </p>
            <p className="text-sm text-muted-foreground">
              {[next.startTime, next.vehicle?.registrationNumber || next.vehicle?.registration, next.reportingLocation]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="text-sm text-muted-foreground">
              Status: {String(next.lifecycleStatus || "").replace(/_/g, " ")}
            </p>
            {next.actualSignOnAt ? (
              <p className="text-sm text-emerald-800">
                Signed on {new Date(next.actualSignOnAt).toLocaleString("en-GB")}
              </p>
            ) : null}

            {needsAck(next.lifecycleStatus) ? (
              <Button
                type="button"
                disabled={busyId === next.id}
                className={`mt-2 h-11 w-full ${op.primaryBtn}`}
                onClick={() => void handleAcknowledge(next.id)}
              >
                {busyId === next.id ? "Acknowledging…" : "Acknowledge duty"}
              </Button>
            ) : null}

            {!needsAck(next.lifecycleStatus) && !signedOn && !signedOff ? (
              <>
                {pendingSignOn ? (
                  <div className="mt-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-950">
                    <p className="font-semibold">Sign-on pending sync</p>
                    <p className="mt-1">
                      This device recorded your sign-on — Command will apply it when connection returns.
                    </p>
                  </div>
                ) : null}
                {signOnBlockers.length ? (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-semibold">Sign-on blocked</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4">
                      {signOnBlockers.map((blocker) => (
                        <li key={blocker}>{blocker}</li>
                      ))}
                    </ul>
                    {signOnBlockers.some((b) => /vehicle check/i.test(b)) ? (
                      <Button asChild variant="outline" className="mt-3 h-10 w-full">
                        <Link to="/check">Open vehicle check</Link>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                <Button
                  type="button"
                  disabled={busyId === next.id || !signOnAllowed}
                  className={`mt-2 h-11 w-full ${op.primaryBtn}`}
                  onClick={() => void handleSignOn(next.id)}
                >
                  {busyId === next.id ? "Signing on…" : "Sign on for duty"}
                </Button>
              </>
            ) : null}

            {signedOn && !signedOff ? (
              <>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm font-medium text-emerald-900">
                  <CheckCircle2 className="h-4 w-4" />
                  On duty — Admin can see you signed on
                </div>
                {dutyHasNavigableStops(next) ? (
                  <Button asChild className={`mt-2 h-11 w-full ${op.primaryBtn}`}>
                    <Link to={`/duty/${next.id}/navigate`}>
                      <Navigation className="mr-2 h-4 w-4" />
                      Start navigation
                    </Link>
                  </Button>
                ) : null}
                <Button
                  type="button"
                  disabled={busyId === next.id}
                  variant="outline"
                  className="mt-2 h-11 w-full"
                  onClick={() => void handleSignOff(next.id)}
                >
                  {busyId === next.id ? "Signing off…" : "Sign off duty"}
                </Button>
              </>
            ) : null}

            {signedOff ? (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-3 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Duty signed off
              </div>
            ) : null}
          </div>
        ) : null}

        {homeSummary?.requiredActions?.length ? (
          <div className={`mt-4 p-4 ${op.card}`}>
            <p className="font-semibold">Needs attention</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {homeSummary.requiredActions.map((action) => (
                <li key={action.id}>• {action.title || action.label}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-6 text-sm text-muted-foreground">
          <Clock3 className="mr-1 inline h-4 w-4" />
          Driver {driver?.fullName || bootstrap?.driver?.displayName || "Driver"}
        </p>
      </div>
    </div>
  );
}
