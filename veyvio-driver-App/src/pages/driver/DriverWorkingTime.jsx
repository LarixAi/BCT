import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import DriverDailyHoursChart from "@/components/driver/operational/DriverDailyHoursChart";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverOperationalHeader from "@/components/driver/operational/DriverOperationalHeader";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import DriverWtdUsageBar from "@/components/driver/operational/DriverWtdUsageBar";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDate, formatUkTime } from "@/lib/uk-locale";
import {
  formatWorkingHours,
  getDriverWorkingTimeSummary,
  logDriverOtherWork,
  shiftWeek,
} from "@/services/working-time.service";
import { Button } from "@/components/ui/button";

const STATUS_LABEL = {
  ok: { text: "Within limits", className: "bg-emerald-100 text-emerald-800" },
  warning: { text: "Approaching limit", className: "bg-amber-100 text-amber-900" },
  critical: { text: "Near weekly max", className: "bg-amber-100 text-amber-900" },
  breach: { text: "Weekly limit reached", className: "bg-red-100 text-red-800" },
};

function formatWeekLabel(weekStart, weekEnd) {
  return `${formatUkDate(`${weekStart}T12:00:00`)} – ${formatUkDate(`${weekEnd}T12:00:00`)} ${new Date(`${weekEnd}T12:00:00`).getFullYear()}`;
}

export default function DriverWorkingTime({ driver }) {
  const { bootstrap, homeSummary } = useDriverSupabaseAuth();
  const [summary, setSummary] = useState(null);
  const [weekStart, setWeekStart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showLogForm, setShowLogForm] = useState(false);
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:00");
  const [entryType, setEntryType] = useState("yard");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const duty = bootstrap?.duties?.[0];
  const signedOnAt = duty?.actualSignOnAt || homeSummary?.duty?.signOnAt || null;
  const dutyStatus = homeSummary?.duty?.status || duty?.lifecycleStatus || null;

  const load = async (week) => {
    setLoading(true);
    setError("");
    try {
      const data = await getDriverWorkingTimeSummary(driver.id, week ?? undefined, {
        organisationId: driver.organisationId,
        commandDuties: bootstrap?.duties ?? [],
        hasLiveSignOn: Boolean(signedOnAt),
      });
      setSummary(data);
      setWeekStart(data.weekStart);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message.replace(/organisation_id/gi, "company")
          : "Could not load working time",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when Command duty set changes
  }, [driver.id, driver.organisationId, duty?.id, duty?.actualSignOnAt]);

  const submitOtherWork = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const result = await logDriverOtherWork(
      driver.id,
      { entryDate, startTime, endTime, entryType, notes },
      { organisationId: driver.organisationId },
    );
    setSaving(false);
    if (!result.ok) {
      setError(result.message ?? "Failed to log other work");
      return;
    }
    setShowLogForm(false);
    setNotes("");
    await load(weekStart);
  };

  const status = summary ? STATUS_LABEL[summary.status] ?? STATUS_LABEL.ok : null;
  const dailyHours = summary?.dailyBreakdown ?? [];
  const timelineItems = summary?.timelineItems ?? summary?.duties ?? [];

  return (
    <div>
      <DriverOperationalHeader
        title="My working time"
        subtitle="Weekly hours from your duties (WTD)"
        backTo="/more"
      />
      <div className="px-4 pb-8 space-y-4">
        <CommandBackendNotice
          status={summary?.source === "command_duties" ? "partial" : "partial"}
          title="Duty sign-on is live on Command"
          description="Sign on/off from My duty updates Admin immediately. Weekly hours below use Command published duties when legacy WTD tables are not available."
        />
        {(signedOnAt || dutyStatus) && (
          <div className={`p-4 ${op.card}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Command duty today</p>
            <p className="mt-1 text-lg font-semibold">
              {duty?.routeName || duty?.reference || "Published duty"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {signedOnAt
                ? `Signed on ${new Date(signedOnAt).toLocaleString("en-GB")}`
                : `Status: ${String(dutyStatus || "").replace(/_/g, " ")}`}
            </p>
            <Button asChild className={`mt-3 h-11 w-full ${op.primaryBtn}`}>
              <Link to="/duty">{signedOnAt ? "Manage sign-off" : "Sign on for duty"}</Link>
            </Button>
          </div>
        )}
        {loading ? <DriverPageLoader label="Loading…" /> : null}
        {error ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : null}

        {summary && weekStart ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                className="text-sm font-medium text-[#1eaeae] min-h-[44px] px-2"
                onClick={() => void load(shiftWeek(weekStart, -1))}
              >
                ← Prev
              </button>
              <p className="text-sm font-semibold text-center">{formatWeekLabel(summary.weekStart, summary.weekEnd)}</p>
              <button
                type="button"
                className="text-sm font-medium text-[#1eaeae] min-h-[44px] px-2"
                onClick={() => void load(shiftWeek(weekStart, 1))}
              >
                Next →
              </button>
            </div>

            <div className={`p-4 ${op.card} space-y-4`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Projected this week</p>
                  <p className="text-3xl font-bold mt-1">{formatWorkingHours(summary.projectedHours)}</p>
                </div>
                {status ? (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${status.className}`}>
                    {status.text}
                  </span>
                ) : null}
              </div>
              <DriverWtdUsageBar
                projectedHours={summary.projectedHours}
                actualHours={summary.actualHours}
                scheduledHours={summary.scheduledHours}
              />
            </div>

            <div className={`p-4 ${op.card}`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-semibold">Hours by day</p>
                {summary.restDays > 0 ? (
                  <span className="text-xs text-muted-foreground">{summary.restDays} rest day{summary.restDays === 1 ? "" : "s"}</span>
                ) : null}
              </div>
              <DriverDailyHoursChart days={dailyHours} />
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                Days with no work are counted as rest under WTD. Live hours come from My Duty sign-on and activity timeline.
              </p>
            </div>

            <div className={`grid grid-cols-2 gap-3 text-sm ${op.card} p-4`}>
              <div>
                <p className="text-muted-foreground text-xs">Recorded (timeline)</p>
                <p className="font-semibold">{formatWorkingHours(summary.liveRecordedHours ?? summary.actualHours)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Scheduled (roster)</p>
                <p className="font-semibold">{formatWorkingHours(summary.scheduledHours)}</p>
              </div>
            </div>

            {timelineItems.length > 0 ? (
              <div className={op.listCard}>
                <p className="px-4 py-3 text-xs font-medium text-muted-foreground border-b border-border">
                  {summary.hasLiveTimeline ? "Activity this week" : "Duties this week"}
                </p>
                <ul>
                  {timelineItems.map((item) => (
                    <li key={item.id ?? item.assignmentId} className="px-4 py-3 border-b border-border last:border-b-0 min-h-[52px]">
                      <div className="flex justify-between gap-2">
                        <p className="font-medium text-[15px]">{item.routeName}</p>
                        <p className="font-semibold shrink-0">
                          {item.isBreak ? "Break" : formatWorkingHours(item.hours)}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.serviceDate}
                        {item.startAt
                          ? ` · ${formatUkTime(item.startAt)}`
                          : ""}
                        {item.source && item.source !== "actual" ? ` · ${item.source}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <DriverEmptyState
                icon={Clock}
                title="No activity recorded"
                description="Sign on via My Duty and your working time will update from your activity timeline."
              />
            )}

            {summary.openWorkingTimeInfringements > 0 ? (
              <div className={`p-4 text-sm ${op.card} border-amber-200 bg-amber-50`}>
                <p className="font-semibold text-amber-900">
                  {summary.openWorkingTimeInfringements} open hours-related issue
                  {summary.openWorkingTimeInfringements === 1 ? "" : "s"}
                </p>
                <Link to="/acknowledgements" className="text-[#1eaeae] font-bold text-sm mt-2 inline-block min-h-[44px] flex items-center">
                  View acknowledgements →
                </Link>
              </div>
            ) : null}

            <div className={op.card}>
              {!showLogForm ? (
                <Button type="button" variant="outline" className="w-full min-h-[44px]" onClick={() => setShowLogForm(true)}>
                  Log other work (yard, training, waiting)
                </Button>
              ) : (
                <form onSubmit={submitOtherWork} className="space-y-3">
                  <p className="text-sm font-semibold">Log other work</p>
                  <label className="block text-xs text-muted-foreground">
                    Date
                    <input type="date" className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm min-h-[44px]" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs text-muted-foreground">
                      Start
                      <input type="time" className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm min-h-[44px]" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                    </label>
                    <label className="block text-xs text-muted-foreground">
                      End
                      <input type="time" className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm min-h-[44px]" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                    </label>
                  </div>
                  <label className="block text-xs text-muted-foreground">
                    Type
                    <select className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm min-h-[44px]" value={entryType} onChange={(e) => setEntryType(e.target.value)}>
                      <option value="yard">Yard / depot</option>
                      <option value="training">Training</option>
                      <option value="waiting">Waiting (POA)</option>
                      <option value="other">Other</option>
                    </select>
                  </label>
                  <label className="block text-xs text-muted-foreground">
                    Notes (optional)
                    <textarea className="mt-1 w-full rounded-lg border px-3 py-2.5 text-sm" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" className={`${op.primaryBtn} min-h-[44px]`} disabled={saving}>
                      {saving ? "Saving…" : "Submit for approval"}
                    </Button>
                    <Button type="button" variant="ghost" className="min-h-[44px]" onClick={() => setShowLogForm(false)}>
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Your transport manager must approve before it counts toward WTD totals.</p>
                </form>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed px-1">
              UK working time rules include a 48-hour weekly average and a 60-hour maximum in any single week.
              Contact your transport manager before accepting extra work if you are near your limit.
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
