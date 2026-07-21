import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import {
  eligibilityRestrictionCopy,
  formatTrainingDue,
  loadDriverTrainingCentre,
  startTrainingAssignment,
  trainingPrimaryAction,
} from "@/services/training.service";
import { OperationalPage, StatusPill } from "../DriverOperationalPageParts";

export default function DriverTrainingAssignmentPage({ driver }) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { session } = useDriverSupabaseAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await loadDriverTrainingCentre({
      ...session,
      driverId: driver?.id ?? session?.driverId,
    });
    if (!result.ok) {
      setError(result.message);
      setAssignment(null);
    } else {
      const found = (result.assignments ?? []).find((a) => a.id === assignmentId || a.courseId === assignmentId);
      setAssignment(found ?? null);
      if (!found) setError("This training assignment was not found.");
    }
    setLoading(false);
  }, [session, driver?.id, assignmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onPrimary() {
    if (!assignment) return;
    const action = trainingPrimaryAction(assignment);
    if (action.to === "completed") {
      navigate(`/training/${assignment.id}/completed`);
      return;
    }
    if (action.to === "evidence") {
      navigate(`/training/${assignment.id}/evidence`);
      return;
    }

    setBusy(true);
    if (action.to === "start") {
      await startTrainingAssignment({ ...session, driverId: driver?.id }, assignment);
    }
    const nextId = assignment.nextLessonId ?? assignment.content?.lessons?.[0]?.id;
    setBusy(false);
    if (nextId) navigate(`/training/${assignment.id}/lesson/${nextId}`);
    else navigate(`/training/${assignment.id}/declaration`);
  }

  if (loading) {
    return (
      <OperationalPage title="Training" subtitle="Loading course…" backTo="/training">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </OperationalPage>
    );
  }

  if (error || !assignment) {
    return (
      <OperationalPage title="Training" subtitle="Course unavailable" backTo="/training">
        <p className="text-sm text-muted-foreground">{error ?? "Not found"}</p>
      </OperationalPage>
    );
  }

  const content = assignment.content;
  const restriction = eligibilityRestrictionCopy(assignment);
  const lessons = content?.lessons ?? [];
  let unlocked = true;

  return (
    <OperationalPage title={assignment.title} subtitle={assignment.category} backTo="/training">
      <div className={`${op.card} p-4`}>
        <div className="flex flex-wrap gap-2">
          <StatusPill status={assignment.mandatory ? "warning" : "neutral"}>
            {assignment.mandatory ? "Mandatory" : "Optional"}
          </StatusPill>
          {assignment.dueAt ? <StatusPill status="neutral">Due {formatTrainingDue(assignment.dueAt)}</StatusPill> : null}
          <StatusPill status="neutral">{assignment.estimatedMinutes ?? content?.estimatedMinutes} min</StatusPill>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Assigned by {assignment.assignedByName ?? "Training lead"}
          {assignment.courseVersionId ? ` · Version ${assignment.courseVersionId}` : null}
        </p>

        <p className="mt-3 text-sm font-medium text-foreground">Progress: {assignment.progressPercentage ?? 0}%</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[var(--ridova-teal)]"
            style={{ width: `${Math.min(100, assignment.progressPercentage ?? 0)}%` }}
          />
        </div>

        {restriction ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Work restriction</p>
            <p className="mt-1 text-sm text-amber-950">{restriction}</p>
          </div>
        ) : null}
      </div>

      <div className={`${op.card} mt-4 p-4`}>
        <p className="text-sm font-semibold text-foreground">Course overview</p>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What you will learn</dt>
            <dd className="mt-1 text-foreground">{content.overview.learn}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why it is required</dt>
            <dd className="mt-1 text-foreground">{content.overview.why}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Who it applies to</dt>
            <dd className="mt-1 text-foreground">{content.overview.appliesTo}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pass requirements</dt>
            <dd className="mt-1 text-foreground">{content.overview.passRequirements}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Certificate</dt>
            <dd className="mt-1 text-foreground">
              {content.overview.certificate ? "A certificate or evidence may be required." : "No certificate awarded for this module."}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Valid for</dt>
            <dd className="mt-1 text-foreground">{content.overview.validFor}</dd>
          </div>
        </dl>
      </div>

      <div className={`${op.listCard} mt-4`}>
        <p className="border-b border-border px-4 py-3 text-sm font-semibold">Lessons</p>
        {lessons.map((lesson, index) => {
          const done = Boolean(assignment.lessonProgress?.[lesson.id]?.completedAt);
          const locked = !unlocked && !done;
          if (!done) unlocked = false;
          return (
            <div key={lesson.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : locked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{lesson.title}</p>
                <p className="text-xs text-muted-foreground">
                  {done ? "Completed" : locked ? "Locked" : assignment.nextLessonId === lesson.id ? "In progress" : "Not started"}
                </p>
              </div>
              {!locked ? (
                <Link className={`text-xs ${op.linkAccent}`} to={`/training/${assignment.id}/lesson/${lesson.id}`}>
                  Open
                </Link>
              ) : null}
            </div>
          );
        })}
      </div>

      {assignment.requiresEvidence && assignment.progressPercentage >= 100 ? (
        <div className={`${op.card} mt-4 border-amber-200 bg-amber-50 p-4`}>
          <p className="text-sm font-semibold text-amber-950">Practical assessment / evidence may be required</p>
          <p className="mt-1 text-sm text-amber-900">
            Your theory section can be completed in the app. Practical sign-off or certificate upload may still be needed.
          </p>
          <Button asChild className={`mt-3 h-11 w-full ${op.secondaryBtn}`}>
            <Link to={`/training/${assignment.id}/evidence`}>View requirements</Link>
          </Button>
        </div>
      ) : null}

      <Button type="button" disabled={busy} className={`mt-5 h-12 w-full ${op.primaryBtn}`} onClick={onPrimary}>
        {busy ? "Opening…" : trainingPrimaryAction(assignment).label}
      </Button>

      {assignment.progressPercentage >= 100 && assignment.status !== "completed" ? (
        <Button asChild className={`mt-3 h-11 w-full ${op.secondaryBtn}`}>
          <Link to={`/training/${assignment.id}/declaration`}>Complete declaration</Link>
        </Button>
      ) : null}
    </OperationalPage>
  );
}
