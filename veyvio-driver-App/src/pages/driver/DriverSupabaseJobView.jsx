import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Circle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { op } from "@/lib/driver-operational-theme";
import { formatUkTime } from "@/lib/uk-locale";
import { getJobExecutionState } from "@/lib/jobExecutionState";
import {
  arriveAtStop,
  completeJob,
  completeStop,
  getDriverJobDetail,
  reportJobIssue,
  runJobPrimaryAction,
} from "@/services/jobs.service";
import { getWalkaroundSafetyStatusForJob } from "@/services/vehicle-check.service";
import { useFleetTracking } from "@/hooks/useFleetTracking";
import DriverSpeedCard from "@/components/driver/operational/DriverSpeedCard";
import DriverTripSummary from "@/components/driver/operational/DriverTripSummary";
import DriverJobManifestPanel from "@/components/driver/jobs/DriverJobManifestPanel";
import DriverJobItineraryPanel from "@/components/driver/jobs/DriverJobItineraryPanel";
import DriverPhvTripPanel from "@/components/driver/jobs/DriverPhvTripPanel";
import { isPhvCustomerBookingJob } from "@/services/customer-phv-job.service";

function stopState(stop) {
  if (stop.status === "completed") return "done";
  if (stop.status === "arrived") return "active";
  return "pending";
}

export default function DriverSupabaseJobView({ driver }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [checkSafety, setCheckSafety] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [issueText, setIssueText] = useState("");
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [tripSummary, setTripSummary] = useState(null);

  const reload = async () => {
    if (!id || !driver?.id) return;
    const [detail, safety] = await Promise.all([
      getDriverJobDetail(id, driver.id),
      getWalkaroundSafetyStatusForJob(driver, id),
    ]);
    if (!detail) {
      setJob(null);
      setError("Job not found or you are not assigned.");
    } else {
      setJob(detail);
      setCheckSafety(safety);
      setError(null);
    }
  };

  useEffect(() => {
    if (!id || !driver?.id) {
      setLoading(false);
      if (!driver?.id) setError("Sign in to view this job.");
      return;
    }
    setLoading(true);
    void reload()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load job"))
      .finally(() => setLoading(false));
  }, [id, driver?.id]);

  const execution = useMemo(() => getJobExecutionState(job, { isActive: true }), [job]);
  const nextStop = execution.currentStop;
  const jobStarted = Boolean(job?.assignment?.startedAt);
  const jobDone = job?.status === "completed" || job?.status === "cancelled";

  useEffect(() => {
    if (!job?.id || !driver?.id || jobDone) return;
    void import("@/services/fleet-tracking.service").then(({ ensureJobLinkedToFleetSession }) =>
      ensureJobLinkedToFleetSession(driver, {
        jobId: job.id,
        vehicleId: job.assignment?.vehicleId ?? job.vehicleId ?? null,
      }),
    );
  }, [job?.id, driver?.id, job?.assignment?.vehicleId, job?.vehicleId, jobDone, driver]);
  const checkBlocksJob = checkSafety && !checkSafety.routeStartAllowed && !checkSafety.checkComplete;
  const completedStops = job?.stops?.filter((s) => s.status === "completed").length ?? 0;
  const totalStops = job?.stops?.length ?? 0;

  const tracking = useFleetTracking({ driver, active: true });

  const runAction = async (fn, { allowIncompleteConfirm = false } = {}) => {
    setBusy(true);
    setActionMsg("");
    const result = await fn();
    setBusy(false);
    if (!result.ok) {
      if (result.needsConfirm && allowIncompleteConfirm) {
        const confirmed = window.confirm(`${result.message}\n\nComplete anyway?`);
        if (confirmed) {
          setBusy(true);
          const retry = await completeJob(driver, id, { confirmIncomplete: true });
          setBusy(false);
          setActionMsg(retry.ok ? (retry.warning ?? retry.message) : retry.message);
          if (retry.ok) {
            if (retry.tripSummary) setTripSummary(retry.tripSummary);
            await reload();
            if (retry.needsDutyCloseout) navigate(`/job/${id}/closeout`);
          }
        }
        return;
      }
      setActionMsg(result.message);
      return;
    }
    setActionMsg(result.warning ?? result.message);
    if (result.tripSummary) setTripSummary(result.tripSummary);
    await reload();
    if (result.needsDutyCloseout) navigate(`/job/${id}/closeout`);
  };

  return (
    <div className="min-h-full bg-white">
      <DriverOperationalHeader
        title={job?.routeName ?? "Job details"}
        subtitle={job ? `${job.serviceDate} · ${job.startTime}` : loading ? "Loading…" : "Job"}
        backTo="/jobs"
      />

      <div className="px-4 pb-6">
        {loading ? <DriverPageLoader label="Loading job…" /> : null}
        {error ? <p className="mt-6 text-red-600 text-sm">{error}</p> : null}

        {!loading && job ? (
          <>
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 capitalize text-gray-800">
                {job.status?.replace(/_/g, " ")}
              </span>
              {execution.progressLabel ? (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-800">
                  {execution.progressLabel}
                </span>
              ) : null}
            </div>

            {jobStarted && !jobDone ? (
              <div className="mt-4">
                <DriverSpeedCard
                  compact
                  speedMph={tracking.speedMph}
                  speedLimitMph={tracking.speedLimitMph}
                  accuracyMeters={tracking.accuracyMeters}
                  trackingActive={tracking.trackingActive}
                  vehicleRegistration={job.vehicleRegistration ?? job.registration}
                  jobLabel={job.routeName}
                />
              </div>
            ) : null}

            {job.brief && Object.keys(job.brief).length > 0 ? (
              <div className="mt-4 p-4 rounded-2xl border border-gray-200 bg-gray-50">
                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Job brief</p>
                <dl className="space-y-1 text-sm">
                  {Object.entries(job.brief).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <dt className="text-gray-500 capitalize">{key.replace(/_/g, " ")}</dt>
                      <dd className="font-medium text-right text-gray-900">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {totalStops > 0 ? (
              <div className="mt-4 p-4 rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-500">Stop progress</span>
                  <span className="font-semibold text-[#8ec63f]">
                    {completedStops}/{totalStops}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8ec63f] rounded-full transition-all duration-300"
                    style={{ width: `${totalStops ? (completedStops / totalStops) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ) : null}

            {checkSafety?.checkComplete ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                {checkSafety.resultLabel ?? "Vehicle check complete"}
                {(checkSafety.startedAt ?? checkSafety.submittedAt)
                  ? ` · started ${formatUkTime(checkSafety.startedAt ?? checkSafety.submittedAt)}`
                  : ""}
                {checkSafety.checkId ? (
                  <Link to={`/check/history/${checkSafety.checkId}`} className="block mt-2 text-xs font-medium text-[#1eaeae]">
                    View check detail
                  </Link>
                ) : null}
              </div>
            ) : checkSafety && !checkSafety.checkComplete ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <p className="font-semibold">Vehicle check required</p>
                <p className="mt-1 text-amber-900">
                  Complete today&apos;s walkaround for {checkSafety.registration ?? "your vehicle"} before starting this job.
                </p>
                <Button asChild className={`mt-3 h-10 ${op.primaryBtn}`}>
                  <Link to="/check">Start walkaround</Link>
                </Button>
              </div>
            ) : null}

            {isPhvCustomerBookingJob(job) && !jobDone ? (
              <DriverPhvTripPanel
                job={job}
                driver={driver}
                disabled={busy || checkBlocksJob}
                onUpdated={reload}
              />
            ) : null}

            {!jobDone && !isPhvCustomerBookingJob(job) ? (
              <div className="mt-5 space-y-2">
                {execution.primaryAction ? (
                  <Button
                    className={`w-full h-12 rounded-xl ${op.primaryBtn}`}
                    disabled={busy || (execution.primaryAction === "start" && checkBlocksJob)}
                    onClick={() =>
                      void runAction(() => runJobPrimaryAction(driver, job, execution.primaryAction))
                    }
                  >
                    {busy ? "Working…" : execution.primaryLabel}
                  </Button>
                ) : jobStarted ? (
                  <p className="text-xs text-emerald-700 text-center">Job in progress — use the stop actions below</p>
                ) : job?.assignment?.acceptedAt ? (
                  <p className="text-xs text-gray-600 text-center">Job accepted — tap Start job when you are ready</p>
                ) : null}

                {jobStarted ? (
                  <Button
                    variant="secondary"
                    className="w-full h-11 rounded-xl"
                    disabled={busy}
                    onClick={() => void runAction(() => completeJob(driver, id), { allowIncompleteConfirm: true })}
                  >
                    Complete job
                  </Button>
                ) : null}

                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-gray-200 text-gray-800 hover:bg-gray-50"
                  disabled={busy}
                  onClick={() => setShowIssueForm((v) => !v)}
                >
                  Report issue
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="w-full h-11 rounded-xl border-gray-200 text-gray-800 hover:bg-gray-50"
                >
                  <Link to={`/lost-property/report?jobId=${id}&back=/job/${id}`}>Report found item</Link>
                </Button>
              </div>
            ) : null}

            {!jobDone && isPhvCustomerBookingJob(job) ? (
              <div className="mt-5 space-y-2">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl border-gray-200 text-gray-800 hover:bg-gray-50"
                  disabled={busy}
                  onClick={() => setShowIssueForm((v) => !v)}
                >
                  Report issue
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-11 rounded-xl border-gray-200 text-gray-800 hover:bg-gray-50"
                >
                  <Link to={`/lost-property/report?jobId=${id}&back=/job/${id}`}>Report found item</Link>
                </Button>
              </div>
            ) : null}

            {showIssueForm && !jobDone ? (
              <div className="mt-4 p-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50">
                <textarea
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  rows={3}
                  placeholder="Describe the issue for dispatch…"
                  className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900 resize-none placeholder:text-gray-400"
                />
                <Button
                  size="sm"
                  className={op.primaryBtn}
                  disabled={busy || !issueText.trim()}
                  onClick={() =>
                    void runAction(async () => {
                      const r = await reportJobIssue(driver, id, { description: issueText });
                      if (r.ok) {
                        setIssueText("");
                        setShowIssueForm(false);
                      }
                      return r;
                    })
                  }
                >
                  Send to dispatch
                </Button>
              </div>
            ) : null}

            {actionMsg ? <p className="mt-3 text-sm text-gray-600">{actionMsg}</p> : null}

            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mt-8 mb-3">Stops</h2>
            {!job.stops?.length ? (
              <p className="text-gray-500 text-sm">No stops listed for this job.</p>
            ) : (
              <ol className="space-y-0">
                {job.stops.map((stop, i) => {
                  const state = stopState(stop);
                  const isLast = i === job.stops.length - 1;
                  return (
                    <li key={stop.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        {state === "done" ? (
                          <CheckCircle2 className="w-6 h-6 text-[#8ec63f] shrink-0" />
                        ) : state === "active" ? (
                          <MapPin className="w-6 h-6 text-[#1eaeae] shrink-0" />
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300 shrink-0" />
                        )}
                        {!isLast ? <div className="w-0.5 flex-1 bg-gray-200 my-1 min-h-[24px]" /> : null}
                      </div>
                      <div className="flex-1 pb-4">
                        <div
                          className={`p-4 rounded-2xl border ${
                            state === "active" ? "border-[#1eaeae]/40 bg-[#1eaeae]/6" : "border-gray-200 bg-white"
                          }`}
                        >
                          <p className="text-xs text-gray-500">Stop {i + 1}</p>
                          <p className="font-medium mt-0.5 text-gray-900">{stop.label}</p>
                          {stop.address ? <p className="text-sm text-gray-500 mt-1">{stop.address}</p> : null}
                          <p className="text-xs text-gray-500 mt-2 capitalize">
                            {stop.status?.replace(/_/g, " ")}
                            {stop.arrivalTime ? ` · ${stop.arrivalTime}` : ""}
                          </p>
                          {jobStarted && !jobDone ? (
                            <div className="flex gap-2 mt-3">
                              {stop.status === "planned" && stop.id === nextStop?.id ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={busy}
                                  onClick={() => void runAction(() => arriveAtStop(driver, id, stop.id))}
                                >
                                  I&apos;ve arrived
                                </Button>
                              ) : null}
                              {stop.status === "arrived" ? (
                                <Button
                                  size="sm"
                                  className={op.primaryBtn}
                                  disabled={busy}
                                  onClick={() => void runAction(() => completeStop(driver, id, stop.id))}
                                >
                                  Complete stop
                                </Button>
                              ) : null}
                            </div>
                          ) : !jobDone && !jobStarted ? (
                            <p className="text-xs text-gray-400 mt-3">Start the job to begin stop actions</p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {jobStarted && !jobDone ? (
              <>
                <DriverJobManifestPanel job={job} driver={driver} disabled={busy} onUpdated={reload} />
                <DriverJobItineraryPanel job={job} driver={driver} onUpdated={reload} disabled={busy} />
              </>
            ) : null}
          </>
        ) : null}
      </div>
      <DriverTripSummary summary={tripSummary} onClose={() => setTripSummary(null)} />
    </div>
  );
}
