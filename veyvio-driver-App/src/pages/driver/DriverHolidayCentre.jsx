import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronRight, Loader2, Plus } from "lucide-react";
import DriverPageContainer from "@/components/driver/operational/DriverPageContainer";
import DriverSectionTitle from "@/components/driver/operational/DriverSectionTitle";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  formatDateRange,
  listDriverTimeOffRequests,
  loadDriverHolidayBalance,
} from "@/services/time-off.service";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "requests", label: "Requests" },
];

function formatDays(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, "");
}

export default function DriverHolidayCentre({ driver }) {
  const { session } = useDriverSupabaseAuth();
  const driverId = driver?.id ?? session?.driverId;
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [wired, setWired] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    const [bal, list] = await Promise.all([
      loadDriverHolidayBalance(session),
      listDriverTimeOffRequests(driverId, { session, limit: 40 }),
    ]);
    setWired(Boolean(bal.wired ?? list.source === "command"));
    if (!bal.ok) {
      setError(bal.message || "Could not load holiday balance.");
      setBalance(null);
    } else {
      setBalance(bal);
    }
    setRequests(list.items ?? []);
    if (!list.ok && list.message && bal.ok) {
      setError(list.message);
    }
    setLoading(false);
  }, [driverId, session]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const days = balance?.days;
  const next = balance?.nextApprovedHoliday;

  return (
    <DriverPageContainer>
      <div className="rounded-2xl bg-[var(--ridova-navy)] p-4 text-white shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ridova-lime)]">
          Holiday & time off
        </p>
        <h1 className="mt-2 text-2xl font-bold">Your leave balance</h1>
        <p className="mt-1 text-sm text-white/70">
          Complete your requests here — Veyvio keeps the balance up to date from your contract and
          approved leave.
        </p>
      </div>

      <CommandBackendNotice
        status={wired ? "live" : "partial"}
        title={wired ? "Connected to Command" : "Command not connected"}
        description={
          wired
            ? "Balance and requests sync with Admin Time Off."
            : "Sign in again so holiday requests reach your transport manager."
        }
      />

      {loading ? (
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading holiday balance…
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}

      {!loading && days ? (
        <div className={`mt-4 p-4 ${op.card}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Annual leave balance
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-foreground">
            {balance?.displayUnit === "hours"
              ? `${formatDays((balance?.minutes?.remaining ?? 0) / 60)} `
              : `${formatDays(days.remaining)} `}
            <span className="text-lg font-semibold text-muted-foreground">
              {balance?.displayUnit === "hours" ? "hours remaining" : "days remaining"}
            </span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatDays(days.taken)} days used · {formatDays(days.pending)} days awaiting approval
          </p>
          {balance?.displayUnit === "hours" ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Approximately {formatDays(days.remaining)} standard days
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Leave year: {balance.leaveYearLabel}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <Stat label="Entitlement" value={`${formatDays(days.entitlementTotal)} days`} />
            <Stat label="Approved future" value={`${formatDays(days.approvedFuture)} days`} />
            <Stat label="Available now" value={`${formatDays(days.remaining)} days`} />
            <Stat
              label="If pending approved"
              value={`${formatDays(days.remainingIfPendingApproved)} days`}
            />
          </div>
          <Button asChild className={`mt-4 h-12 w-full ${op.primaryBtn}`}>
            <Link to="/time-off">
              <Plus className="mr-2 h-4 w-4" />
              Request time off
            </Link>
          </Button>
        </div>
      ) : null}

      {!loading && next ? (
        <div className={`mt-4 p-4 ${op.card}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Next approved holiday
          </p>
          <p className="mt-1 text-[15px] font-semibold">
            {formatDateRange(next.startDate, next.endDate)}
          </p>
          <p className="text-sm text-muted-foreground">
            {next.workingDays} working day{next.workingDays === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex gap-1 rounded-xl bg-muted/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
              tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && !loading && days ? (
        <div className="mt-4 space-y-3">
          <DriverSectionTitle>Overview</DriverSectionTitle>
          <div className={`divide-y divide-border ${op.listCard}`}>
            <OverviewRow label="Current entitlement" value={`${formatDays(days.entitlementTotal)} days`} />
            <OverviewRow label="Carried forward" value={`${formatDays(days.carriedForward)} days`} />
            <OverviewRow label="Used leave" value={`${formatDays(days.taken)} days`} />
            <OverviewRow label="Approved future leave" value={`${formatDays(days.approvedFuture)} days`} />
            <OverviewRow label="Pending leave" value={`${formatDays(days.pending)} days`} />
            <OverviewRow label="Remaining balance" value={`${formatDays(days.remaining)} days`} />
          </div>
          {balance?.pendingRequestCount > 0 ? (
            <p className="text-sm text-amber-800">
              {balance.pendingRequestCount} request
              {balance.pendingRequestCount === 1 ? "" : "s"} awaiting approval ·{" "}
              {formatDays(days.pending)} days
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "requests" ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <DriverSectionTitle>Requests</DriverSectionTitle>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-xs font-semibold text-[var(--ridova-teal)]"
            >
              Refresh
            </button>
          </div>
          {requests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              No time-off requests yet.
            </p>
          ) : (
            <div className={`divide-y divide-border ${op.listCard}`}>
              {requests.map((row) => (
                <div key={row.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground">
                        {formatDateRange(row.dateFrom, row.dateTo)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.absenceLabel}
                        {row.decidedBy ? ` · ${row.decidedBy}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        row.status === "approved"
                          ? "bg-emerald-100 text-emerald-900"
                          : row.status === "rejected"
                            ? "bg-red-100 text-red-900"
                            : row.status === "requested"
                              ? "bg-amber-100 text-amber-950"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {row.statusLabel}
                    </span>
                  </div>
                  {row.reason ? (
                    <p className="mt-1 text-xs text-muted-foreground">{row.reason}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <Link
        to="/schedule"
        className="mt-6 flex min-h-[52px] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
      >
        <CalendarDays className={`h-5 w-5 ${op.iconTeal}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium">View schedule calendar</p>
          <p className="text-xs text-muted-foreground">See duties alongside approved leave</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/60" />
      </Link>
    </DriverPageContainer>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function OverviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}