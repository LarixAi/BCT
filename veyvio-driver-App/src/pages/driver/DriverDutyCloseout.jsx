import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { Button } from "@/components/ui/button";
import { op } from "@/lib/driver-operational-theme";
import { DRIVER_SAFE_BOTTOM } from "@/lib/driverSafeArea";
import { getDriverJobDetail, hasJobDutyCloseout, submitJobDutyCloseout } from "@/services/jobs.service";

const ROUTE_OPTIONS = [
  { value: "yes", label: "Yes — completed" },
  { value: "partial", label: "Partial" },
  { value: "failed", label: "Failed / not completed" },
];

function nowTimeValue() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function DriverDutyCloseout({ driver }) {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [jobCompleted, setJobCompleted] = useState(true);
  const [passengersSafe, setPassengersSafe] = useState(true);
  const [vehicleSafeForNextDuty, setVehicleSafeForNextDuty] = useState(true);
  const [routeCompleted, setRouteCompleted] = useState("yes");
  const [actualStartTime, setActualStartTime] = useState("");
  const [actualPickupTime, setActualPickupTime] = useState("");
  const [actualDropoffTime, setActualDropoffTime] = useState("");
  const [actualFinishTime, setActualFinishTime] = useState(nowTimeValue());
  const [hadDelay, setHadDelay] = useState(false);
  const [delayReason, setDelayReason] = useState("");
  const [hadIncident, setHadIncident] = useState(false);
  const [hadLostProperty, setHadLostProperty] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const [detail, done] = await Promise.all([
          getDriverJobDetail(jobId, driver.id),
          hasJobDutyCloseout(driver.id, jobId),
        ]);
        if (cancelled) return;
        if (!detail) {
          setError("Job not found.");
          return;
        }
        setJob(detail);
        setAlreadyDone(done);
        if (detail.assignment?.startedAt) {
          setActualStartTime(formatTimeInput(detail.assignment.startedAt));
        }
        if (detail.startTime && detail.startTime !== "—") {
          setActualPickupTime(detail.startTime);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load job");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driver.id, jobId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!jobCompleted || !passengersSafe) {
      setError("Confirm the job is complete and passengers/customers are safely dropped off.");
      return;
    }

    setSaving(true);
    setError("");

    let lat;
    let lng;
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      /* optional GPS */
    }

    const result = await submitJobDutyCloseout(driver, jobId, {
      jobCompleted,
      passengersSafe,
      vehicleSafeForNextDuty,
      routeCompleted,
      actualStartTime,
      actualPickupTime,
      actualDropoffTime,
      actualFinishTime,
      hadDelay,
      delayReason,
      hadIncident,
      hadLostProperty,
      notes,
      lat,
      lng,
    });

    setSaving(false);
    if (!result.ok) {
      setError(result.message ?? "Could not save closeout");
      return;
    }
    navigate("/jobs", { replace: true });
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <DriverOperationalHeader
        title="Duty closeout"
        subtitle={job ? `${job.routeName} · ${job.startTime}` : "Per-job sign-off"}
        backTo={job ? `/job/${jobId}` : "/jobs"}
      />

      <div className="flex-1 px-4 pb-28 space-y-4">
        {loading ? <DriverPageLoader label="Loading job…" /> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {alreadyDone && !loading ? (
          <div className={`p-4 text-sm ${op.card}`}>
            <p className="font-medium text-foreground">Closeout already submitted for this job.</p>
            <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/jobs")}>
              Back to jobs
            </Button>
          </div>
        ) : null}

        {job && !loading && !alreadyDone ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className={`p-4 space-y-3 ${op.card}`}>
              <p className="text-sm font-semibold text-foreground">Quick confirmations</p>
              <label className="flex items-start gap-3 text-sm min-h-[44px]">
                <input type="checkbox" className="mt-1" checked={jobCompleted} onChange={(e) => setJobCompleted(e.target.checked)} />
                <span>Job / route completed</span>
              </label>
              <label className="flex items-start gap-3 text-sm min-h-[44px]">
                <input type="checkbox" className="mt-1" checked={passengersSafe} onChange={(e) => setPassengersSafe(e.target.checked)} />
                <span>All passengers / customers safely dropped off — no one left onboard</span>
              </label>
              <label className="flex items-start gap-3 text-sm min-h-[44px]">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={vehicleSafeForNextDuty}
                  onChange={(e) => setVehicleSafeForNextDuty(e.target.checked)}
                />
                <span>Vehicle is still safe for the next duty</span>
              </label>
            </div>

            <div className={`p-4 space-y-3 ${op.card}`}>
              <p className="text-sm font-semibold text-foreground">Actual times</p>
              <TimeField label="Start" value={actualStartTime} onChange={setActualStartTime} />
              <TimeField label="Pickup" value={actualPickupTime} onChange={setActualPickupTime} />
              <TimeField label="Drop-off" value={actualDropoffTime} onChange={setActualDropoffTime} />
              <TimeField label="Finish" value={actualFinishTime} onChange={setActualFinishTime} />
            </div>

            <div className={`p-4 space-y-3 ${op.card}`}>
              <p className="text-sm font-semibold text-foreground">Route status</p>
              <div className="flex flex-wrap gap-2">
                {ROUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRouteCompleted(opt.value)}
                    className={`text-xs font-medium rounded-full px-3 py-2 border min-h-[44px] ${
                      routeCompleted === opt.value
                        ? "bg-[#1eaeae]/15 border-[#1eaeae] text-[#1eaeae]"
                        : "border-border text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`p-4 space-y-3 ${op.card}`}>
              <p className="text-sm font-semibold text-foreground">Issues to report</p>
              <label className="flex items-center gap-3 text-sm min-h-[44px]">
                <input type="checkbox" checked={hadDelay} onChange={(e) => setHadDelay(e.target.checked)} />
                <span>There was a delay</span>
              </label>
              {hadDelay ? (
                <input
                  type="text"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="Reason for delay"
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                />
              ) : null}
              <label className="flex items-center gap-3 text-sm min-h-[44px]">
                <input type="checkbox" checked={hadIncident} onChange={(e) => setHadIncident(e.target.checked)} />
                <span>Incident or safeguarding issue to report</span>
              </label>
              <label className="flex items-center gap-3 text-sm min-h-[44px]">
                <input type="checkbox" checked={hadLostProperty} onChange={(e) => setHadLostProperty(e.target.checked)} />
                <span>Lost property found or reported</span>
              </label>
              <textarea
                className="w-full rounded-lg border border-border px-3 py-2 text-sm min-h-[80px]"
                placeholder="Notes for dispatch (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <p className="text-xs text-muted-foreground px-1">
              Full end-of-day vehicle check is separate — complete that when you sign off for the day.
            </p>
          </form>
        ) : null}
      </div>

      {job && !loading && !alreadyDone ? (
        <div
          className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur-md px-4 pt-3"
          style={{ paddingBottom: `calc(12px + ${DRIVER_SAFE_BOTTOM})` }}
        >
          <Button className="w-full min-h-[48px]" disabled={saving} onClick={onSubmit}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit duty closeout
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function TimeField({ label, value, onChange }) {
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <input
        type="time"
        className="mt-1 w-full rounded-lg border border-border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function formatTimeInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
