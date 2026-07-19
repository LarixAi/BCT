import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverJobsMapView from "@/components/driver/jobs/DriverJobsMapView";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { useDriverChrome } from "@/lib/driverChromeContext";
import { op } from "@/lib/driver-operational-theme";
import {
  applyDutyNavAction,
  commandDutyToNavJob,
  dutyHasNavigableStops,
} from "@/lib/command-duty-nav-job";
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";

export default function DriverDutyNavigation({ driver }) {
  const { dutyId } = useParams();
  const navigate = useNavigate();
  const { bootstrap: sessionBootstrap, session } = useDriverSupabaseAuth();
  const { setHideBottomNav } = useDriverChrome();
  const [duty, setDuty] = useState(null);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

  useEffect(() => {
    setHideBottomNav(true);
    return () => setHideBottomNav(false);
  }, [setHideBottomNav]);

  const rebuildJob = useCallback((nextDuty) => {
    if (!nextDuty) {
      setJob(null);
      return;
    }
    setJob(commandDutyToNavJob(nextDuty, { autoStart: true }));
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
    const result = await refreshCommandBootstrap(depotId).catch(() => null);
    const bootstrap = result?.ok ? result.bootstrap : sessionBootstrap;
    const found =
      (bootstrap?.duties ?? []).find((row) => String(row.id) === String(dutyId)) ?? null;

    if (!found) {
      setDuty(null);
      setJob(null);
      setError("This duty is not on your published list.");
      setLoading(false);
      return;
    }

    if (!dutyHasNavigableStops(found)) {
      setDuty(found);
      setJob(null);
      setError("This duty has no stop locations for navigation yet.");
      setLoading(false);
      return;
    }

    setDuty(found);
    rebuildJob(found);
    setLoading(false);
  }, [dutyId, rebuildJob, session?.activeDepotId, session?.depots, sessionBootstrap]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const handleJobAction = async (action) => {
    if (!duty) return;
    setActionBusy(true);
    setActionMsg("");
    const result = applyDutyNavAction(duty, action);
    setActionBusy(false);
    if (!result.ok) {
      setActionMsg(result.message ?? "Could not update stop.");
      return;
    }
    setActionMsg(result.message ?? "");
    setJob(result.job);
    if (result.allDone) {
      window.setTimeout(() => navigate("/duty"), 1200);
    }
  };

  if (loading) {
    return (
      <DriverPageContainer>
        <DriverPageLoader label="Opening navigation…" />
      </DriverPageContainer>
    );
  }

  if (error || !job) {
    return (
      <DriverPageContainer>
        <div className={`mt-6 p-4 ${op.card}`}>
          <div className="flex items-start gap-3">
            <MapPin className={`mt-0.5 h-5 w-5 shrink-0 ${op.iconTeal}`} />
            <div>
              <p className="text-lg font-semibold text-foreground">Navigation unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {error || "Could not build a route for this duty."}
              </p>
            </div>
          </div>
          {actionMsg ? <p className="mt-3 text-sm text-muted-foreground">{actionMsg}</p> : null}
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild className={`h-11 ${op.primaryBtn}`}>
              <Link to="/jobs">Back to trips</Link>
            </Button>
            <Button asChild variant="outline" className="h-11">
              <Link to="/duty">My duty</Link>
            </Button>
          </div>
        </div>
      </DriverPageContainer>
    );
  }

  return (
    <>
      {actionMsg ? (
        <div className="pointer-events-none fixed left-1/2 top-16 z-[300] w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-950 shadow-md">
          {actionMsg}
        </div>
      ) : null}
      <DriverJobsMapView
        driver={driver}
        activeJob={job}
        onClose={() => navigate("/jobs")}
        onJobAction={(action) => void handleJobAction(action)}
        actionBusy={actionBusy}
        onJobReload={() => void reload()}
      />
    </>
  );
}
