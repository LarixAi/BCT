import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarOff, CalendarPlus } from "lucide-react";
import ScheduleMonthCalendar from "@/components/driver/schedule/ScheduleMonthCalendar";
import {
  OperationalPage,
  DriverSectionTitle,
  StatusPill,
} from "./DriverOperationalPageParts";
import DriverEmptyState from "@/components/driver/operational/DriverEmptyState";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { formatLocalDate } from "@/lib/local-date";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDate } from "@/lib/uk-locale";
import { refreshCommandBootstrap, needsAck } from "@/services/command-driver-ops.service";
import {
  eachDateInRange,
  formatDateRange,
  listDriverTimeOffRequests,
} from "@/services/time-off.service";

function dutyIso(duty) {
  const raw = duty.dutyDate || duty.serviceDate || duty.scheduledStartAt || duty.plannedStartAt;
  return raw ? String(raw).slice(0, 10) : null;
}

export default function DriverSchedule({ driver }) {
  const { session } = useDriverSupabaseAuth();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const [duties, setDuties] = useState([]);
  const [requests, setRequests] = useState([]);
  const [source, setSource] = useState("empty");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const [boot, leave] = await Promise.all([
        refreshCommandBootstrap(depotId).catch(() => ({ ok: false, message: "Could not load schedule." })),
        listDriverTimeOffRequests(driver?.id).catch(() => ({ items: [], source: "empty" })),
      ]);

      if (boot.ok) {
        setDuties(boot.bootstrap?.duties ?? []);
        setError("");
      } else {
        setDuties([]);
        setError(boot.message ?? "Could not load schedule.");
      }
      setRequests(leave.items ?? []);
      setSource(leave.source || "empty");
      setLoading(false);
    })();
  }, [session?.activeDepotId, session?.depots, driver?.id]);

  const markersByDate = useMemo(() => {
    const map = {};
    for (const duty of duties) {
      const iso = dutyIso(duty);
      if (!iso) continue;
      map[iso] = { ...(map[iso] || {}), duty: true };
    }
    for (const req of requests) {
      for (const iso of eachDateInRange(req.dateFrom, req.dateTo)) {
        map[iso] = {
          ...(map[iso] || {}),
          leave: true,
          leaveStatus: req.status,
        };
      }
    }
    return map;
  }, [duties, requests]);

  const dayDuties = useMemo(
    () => duties.filter((d) => dutyIso(d) === selectedDate),
    [duties, selectedDate],
  );

  const dayLeave = useMemo(
    () =>
      requests.filter(
        (r) => selectedDate >= r.dateFrom && selectedDate <= r.dateTo,
      ),
    [requests, selectedDate],
  );

  const pendingCount = requests.filter((r) => r.status === "requested").length;

  return (
    <OperationalPage
      title="Schedule & availability"
      subtitle="See published duties and request time off."
      backTo="/more"
    >
      <CommandBackendNotice
        status={source === "remote" ? "partial" : "partial"}
        title="Duties from Command · leave for your manager"
        description="Published duties are live from Admin. Time-off requests are sent for manager review — Command leave approval may still be on-device until Admin leave is live."
      />

      <div className="mt-4">
        <Button asChild className={`h-12 w-full ${op.primaryBtn}`}>
          <Link to={`/time-off?from=schedule${selectedDate ? `&start=${selectedDate}` : ""}`}>
            <CalendarPlus className="mr-2 h-5 w-5" />
            Request time off
          </Link>
        </Button>
      </div>

      {loading ? <DriverPageLoader label="Loading calendar…" /> : null}
      {error ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          {error}
        </p>
      ) : null}

      {!loading ? (
        <div className="mt-4">
          <ScheduleMonthCalendar
            month={month}
            onMonthChange={setMonth}
            markersByDate={markersByDate}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            mode="view"
          />
        </div>
      ) : null}

      <DriverSectionTitle>
        {formatUkDate(`${selectedDate}T12:00:00`, "long")}
      </DriverSectionTitle>

      {dayDuties.length === 0 && dayLeave.length === 0 ? (
        <div className={`p-4 ${op.card}`}>
          <p className="font-semibold text-foreground">Nothing on this day</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No published duty or leave marked. You can still request time off for this date.
          </p>
          <Button asChild variant="outline" className="mt-3 h-11 w-full">
            <Link to={`/time-off?from=schedule&start=${selectedDate}`}>Book leave for this day</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {dayDuties.map((duty) => (
            <Link key={duty.id} to="/jobs" className={`block p-4 ${op.card} active:bg-muted/60`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Published duty
                  </p>
                  <p className="mt-1 font-semibold text-foreground">
                    {duty.routeName || duty.reference || "Duty"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[duty.startTime, duty.vehicle?.registrationNumber || duty.vehicle?.registration]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <StatusPill status={needsAck(duty.lifecycleStatus) ? "warning" : "good"}>
                  {needsAck(duty.lifecycleStatus) ? "Ack needed" : "On roster"}
                </StatusPill>
              </div>
              <p className="mt-2 text-xs font-medium text-[var(--ridova-teal)]">
                {needsAck(duty.lifecycleStatus) ? "Needs acknowledgement →" : "Open in Trips →"}
              </p>
            </Link>
          ))}

          {dayLeave.map((req) => (
            <div key={req.id} className={`p-4 ${op.card}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Time off
                  </p>
                  <p className="mt-1 font-semibold text-foreground">{req.absenceLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDateRange(req.dateFrom, req.dateTo)}
                    {req.partOfDay !== "full_day" ? ` · ${req.partOfDay.toUpperCase()}` : ""}
                  </p>
                </div>
                <StatusPill
                  status={
                    req.status === "approved" ? "good" : req.status === "rejected" ? "blocked" : "warning"
                  }
                >
                  {req.statusLabel}
                </StatusPill>
              </div>
            </div>
          ))}
        </div>
      )}

      <DriverSectionTitle>
        Your leave requests{pendingCount ? ` · ${pendingCount} pending` : ""}
      </DriverSectionTitle>

      {requests.length === 0 ? (
        <DriverEmptyState
          icon={CalendarOff}
          title="No leave requests yet"
          description="Use Request time off to book holiday, sickness, or training with your transport manager."
        />
      ) : (
        <div className={op.listCard}>
          {requests.slice(0, 8).map((req) => (
            <div
              key={req.id}
              className="flex min-h-[56px] items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="text-[15px] font-medium text-foreground">{req.absenceLabel}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatDateRange(req.dateFrom, req.dateTo)}
                  {req.source === "local" ? " · On this device" : ""}
                </p>
              </div>
              <StatusPill
                status={
                  req.status === "approved" ? "good" : req.status === "rejected" ? "blocked" : "warning"
                }
              >
                {req.statusLabel}
              </StatusPill>
            </div>
          ))}
        </div>
      )}
    </OperationalPage>
  );
}
