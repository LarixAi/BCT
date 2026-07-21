import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, BookOpen, CheckCircle2, Clock3, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  eligibilityRestrictionCopy,
  formatTrainingDue,
  loadDriverTrainingCentre,
  trainingPrimaryAction,
} from "@/services/training.service";
import { OperationalPage, StatusPill } from "./DriverOperationalPageParts";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";

const FILTERS = [
  { id: "required", label: "Required" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
  { id: "all", label: "All training" },
];

function statusTone(assignment) {
  if (assignment.warningStatus === "overdue") return "blocked";
  if (assignment.warningStatus === "due_soon" || assignment.warningStatus === "due_today") return "warning";
  if (assignment.status === "completed") return "good";
  if (assignment.status === "in_progress") return "warning";
  return "neutral";
}

function statusLabel(assignment) {
  const parts = [];
  const statusMap = {
    assigned: "Assigned",
    not_started: "Not started",
    in_progress: "In progress",
    assessment_required: "Assessment required",
    evidence_required: "Evidence required",
    awaiting_review: "Awaiting review",
    changes_requested: "Changes requested",
    completed: "Completed",
    failed: "Failed assessment",
    expired: "Expired",
    waived: "Waived",
    superseded: "Superseded",
  };
  parts.push(statusMap[assignment.status] ?? assignment.status);
  if (assignment.warningStatus === "overdue") parts.push("Overdue");
  if (assignment.warningStatus === "due_soon") parts.push("Due soon");
  if (assignment.warningStatus === "due_today") parts.push("Due today");
  if (assignment.warningStatus === "expires_soon") parts.push("Expires soon");
  if (assignment.warningStatus === "expired") parts.push("Expired");
  return parts.join(" · ");
}

function filterAssignments(assignments, filter, query) {
  let list = assignments ?? [];
  if (filter === "required") {
    list = list.filter((a) => a.mandatory && !["completed", "waived", "superseded"].includes(a.status));
  } else if (filter === "in_progress") {
    list = list.filter((a) => a.status === "in_progress" || (a.progressPercentage > 0 && a.progressPercentage < 100));
  } else if (filter === "completed") {
    list = list.filter((a) => a.status === "completed");
  }
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (a) =>
        a.title?.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.courseId?.toLowerCase().includes(q),
    );
  }
  return list;
}

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-[var(--ridova-teal)] transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

function TrainingCard({ assignment }) {
  const action = trainingPrimaryAction(assignment);
  const href =
    action.to === "completed"
      ? `/training/${assignment.id}/completed`
      : action.to === "evidence"
        ? `/training/${assignment.id}/evidence`
        : `/training/${assignment.id}`;
  const restriction = eligibilityRestrictionCopy(assignment);

  return (
    <div className={`${op.card} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-foreground">{assignment.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {assignment.category}
            {" · "}
            {assignment.mandatory ? "Mandatory" : "Optional"}
            {assignment.estimatedMinutes ? ` · ${assignment.estimatedMinutes} min` : null}
          </p>
        </div>
        <StatusPill status={statusTone(assignment)}>{statusLabel(assignment)}</StatusPill>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {assignment.assignedByName ? <p>Assigned by {assignment.assignedByName}</p> : null}
        {assignment.dueAt ? <p>Due {formatTrainingDue(assignment.dueAt)}</p> : null}
        {assignment.completedAt ? <p>Completed {formatTrainingDue(assignment.completedAt)}</p> : null}
        {assignment.expiresAt ? <p>Valid until {formatTrainingDue(assignment.expiresAt)}</p> : null}
      </div>

      {assignment.status !== "completed" ? (
        <>
          <p className="mt-3 text-xs font-medium text-foreground">Progress: {assignment.progressPercentage ?? 0}%</p>
          <ProgressBar value={assignment.progressPercentage} />
        </>
      ) : null}

      {restriction ? (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {restriction}
        </p>
      ) : null}

      <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
        <Link to={href}>{action.label}</Link>
      </Button>
    </div>
  );
}

function UrgentBanner({ assignment }) {
  if (!assignment) return null;
  const overdue = assignment.warningStatus === "overdue";
  const restriction = eligibilityRestrictionCopy(assignment);
  return (
    <div
      className={`rounded-2xl border p-4 ${
        overdue ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${overdue ? "text-red-700" : "text-amber-800"}`}>
        {overdue ? "Action required" : assignment.warningStatus === "due_today" ? "Due today" : "Due soon"}
      </p>
      <p className="mt-1 text-base font-semibold text-foreground">{assignment.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {overdue
          ? `${assignment.title} is overdue.`
          : assignment.dueAt
            ? `Due ${formatTrainingDue(assignment.dueAt)}.`
            : "Complete this training when ready."}
        {assignment.estimatedMinutes ? ` Approximately ${Math.max(5, Math.round(assignment.estimatedMinutes * (1 - (assignment.progressPercentage || 0) / 100)))} minutes remaining.` : ""}
      </p>
      {restriction ? <p className="mt-2 text-sm font-medium text-foreground">{restriction}</p> : null}
      <Button asChild className={`mt-4 h-11 w-full ${op.primaryBtn}`}>
        <Link to={`/training/${assignment.id}`}>
          {assignment.progressPercentage > 0 ? "Continue training" : "Start training"}
        </Link>
      </Button>
    </div>
  );
}

export default function DriverTrainingCentre({ driver }) {
  const { session } = useDriverSupabaseAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "required";
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payload, setPayload] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadDriverTrainingCentre({
      ...session,
      driverId: driver?.id ?? session?.driverId,
    });
    if (!result.ok) {
      setError(result.message ?? "Training could not be loaded.");
      setPayload(null);
    } else {
      setPayload(result);
    }
    setLoading(false);
  }, [session, driver?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(
    () => filterAssignments(payload?.assignments ?? [], filter, query),
    [payload?.assignments, filter, query],
  );

  const summary = payload?.summary;
  const openRequired = (payload?.assignments ?? []).filter(
    (a) => a.mandatory && !["completed", "waived", "superseded"].includes(a.status),
  );

  return (
    <OperationalPage
      title="Training Centre"
      subtitle="Complete your assigned training and keep your driver qualifications up to date."
      backTo="/more"
    >
      <CommandBackendNotice
        status={
          error
            ? "missing"
            : loading
              ? "partial"
              : payload?.wired !== false && (payload?.assignments?.length ?? 0) > 0
                ? "ready"
                : "partial"
        }
        title={
          error
            ? "Training could not reach Command"
            : loading
              ? "Loading from Command…"
              : (payload?.assignments?.length ?? 0) > 0
                ? "Synced with Command"
                : "No assigned courses yet"
        }
        description={
          error
            ? error
            : loading
              ? "Checking GET /driver/training on the Command API."
              : (payload?.assignments?.length ?? 0) > 0
                ? `${payload.assignments.length} course${payload.assignments.length === 1 ? "" : "s"} from your operator.`
                : "If Admin sent training, your operator must assign internal training or deploy the latest Command API, then pull to refresh here."
        }
      />

      {summary ? (
        <div className={`${op.accountHero} mb-4`}>
          <div className="flex items-center gap-3">
            <div className={op.iconWrap}>
              <GraduationCap className={`h-5 w-5 ${op.iconTeal}`} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Training compliance</p>
              <p className="text-2xl font-bold text-foreground">{summary.compliancePercent}%</p>
            </div>
          </div>
          <ProgressBar value={summary.compliancePercent} />
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
            <p>
              <span className="font-semibold text-foreground">{summary.requiredOpen}</span> to complete
            </p>
            <p>
              <span className="font-semibold text-foreground">{summary.dueSoon}</span> due soon
            </p>
            <p>
              <span className="font-semibold text-foreground">{summary.overdue}</span> overdue
            </p>
            <p>
              {summary.nextDeadline ? (
                <>
                  Next due <span className="font-semibold text-foreground">{formatTrainingDue(summary.nextDeadline)}</span>
                </>
              ) : (
                <span className="font-semibold text-foreground">{summary.statusLabel}</span>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {payload?.urgent ? <div className="mb-4"><UrgentBanner assignment={payload.urgent} /></div> : null}

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSearchParams(item.id === "required" ? {} : { filter: item.id })}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs ${
              filter === item.id ? op.tabActive : "border-border bg-card text-muted-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filter === "all" ? (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses"
          className={`mb-3 h-11 w-full rounded-xl border px-3 text-sm ${op.input}`}
        />
      ) : null}

      {loading ? <p className="text-sm text-muted-foreground">Loading training…</p> : null}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <Button type="button" className={`mt-3 h-10 ${op.secondaryBtn}`} onClick={refresh}>
            Try again
          </Button>
        </div>
      ) : null}

      {!loading && !error && openRequired.length === 0 && filter === "required" ? (
        <div className={`${op.card} p-5 text-center`}>
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <p className="mt-3 text-lg font-semibold text-foreground">You’re up to date</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You currently have no required training. New courses assigned by your manager will appear here.
          </p>
          <Button asChild className={`mt-4 h-11 ${op.secondaryBtn}`}>
            <Link to="/training?filter=completed">View completed training</Link>
          </Button>
        </div>
      ) : null}

      <div className="space-y-3">
        {visible.map((assignment) => (
          <TrainingCard key={assignment.id} assignment={assignment} />
        ))}
      </div>

      {!loading && !error && visible.length === 0 && !(openRequired.length === 0 && filter === "required") ? (
        <div className={`${op.card} p-4 text-sm text-muted-foreground`}>
          No courses in this view.
          {filter !== "all" ? (
            <Link className={`ml-1 ${op.linkAccent}`} to="/training?filter=all">
              Show all training
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-3 gap-2 text-center text-[11px] text-muted-foreground">
        <div className="rounded-xl border border-border bg-card p-2">
          <BookOpen className="mx-auto h-4 w-4" />
          <p className="mt-1">Assigned courses</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2">
          <Clock3 className="mx-auto h-4 w-4" />
          <p className="mt-1">Due dates tracked</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-2">
          <AlertTriangle className="mx-auto h-4 w-4" />
          <p className="mt-1">Eligibility linked</p>
        </div>
      </div>
    </OperationalPage>
  );
}
