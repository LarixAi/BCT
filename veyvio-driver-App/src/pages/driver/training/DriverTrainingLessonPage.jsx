import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { completeTrainingLesson, loadDriverTrainingCentre } from "@/services/training.service";
import { OperationalPage } from "../DriverOperationalPageParts";

export default function DriverTrainingLessonPage({ driver }) {
  const { assignmentId, lessonId } = useParams();
  const navigate = useNavigate();
  const { session } = useDriverSupabaseAuth();
  const [assignment, setAssignment] = useState(null);
  const [checks, setChecks] = useState({});
  const [openedAt] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const refresh = useCallback(async () => {
    const result = await loadDriverTrainingCentre({
      ...session,
      driverId: driver?.id ?? session?.driverId,
    });
    if (!result.ok) {
      setLoadError(result.message);
      return;
    }
    const found = (result.assignments ?? []).find((a) => a.id === assignmentId || a.courseId === assignmentId);
    setAssignment(found ?? null);
    if (!found) setLoadError("Training assignment not found.");
  }, [session, driver?.id, assignmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const lesson = useMemo(
    () => assignment?.content?.lessons?.find((l) => l.id === lessonId) ?? null,
    [assignment, lessonId],
  );

  const lessonIndex = useMemo(() => {
    if (!assignment?.content?.lessons || !lesson) return -1;
    return assignment.content.lessons.findIndex((l) => l.id === lesson.id);
  }, [assignment, lesson]);

  const prevLesson = lessonIndex > 0 ? assignment.content.lessons[lessonIndex - 1] : null;
  const nextLesson =
    lessonIndex >= 0 && lessonIndex < (assignment?.content?.lessons?.length ?? 0) - 1
      ? assignment.content.lessons[lessonIndex + 1]
      : null;

  const allChecked = (lesson?.checklist ?? []).every((item) => checks[item]);
  const minTimeOk = !lesson?.minSeconds || Date.now() - openedAt >= lesson.minSeconds * 1000;
  const canComplete = (!lesson?.requiresAcknowledgement || allChecked) && minTimeOk;

  async function markCompleteAndGo(target) {
    if (!assignment || !lesson) return;
    if (!canComplete) {
      setError(
        !minTimeOk
          ? "Spend a little longer on this section before continuing."
          : "Confirm each checklist item before continuing.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    const result = await completeTrainingLesson(
      { ...session, driverId: driver?.id },
      assignment,
      lesson.id,
      { acknowledged: true },
    );
    setBusy(false);
    if (result.assignment) setAssignment(result.assignment);
    if (target === "next" && nextLesson) {
      navigate(`/training/${assignment.id}/lesson/${nextLesson.id}`);
      return;
    }
    if (target === "next") {
      navigate(`/training/${assignment.id}/declaration`);
      return;
    }
    navigate(`/training/${assignment.id}`);
  }

  if (loadError) {
    return (
      <OperationalPage title="Lesson" subtitle={loadError} backTo="/training">
        <Button asChild className={op.secondaryBtn}>
          <Link to="/training">Back to Training Centre</Link>
        </Button>
      </OperationalPage>
    );
  }

  if (!assignment || !lesson) {
    return (
      <OperationalPage title="Lesson" subtitle="Loading…" backTo={`/training/${assignmentId}`}>
        <p className="text-sm text-muted-foreground">Loading lesson…</p>
      </OperationalPage>
    );
  }

  return (
    <OperationalPage
      title={lesson.title}
      subtitle={`${assignment.title} · Lesson ${lessonIndex + 1} of ${assignment.content.lessons.length}`}
      backTo={`/training/${assignment.id}`}
    >
      <div className={`${op.card} space-y-4 p-4`}>
        {(lesson.body ?? []).map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-foreground">
            {paragraph}
          </p>
        ))}
      </div>

      {lesson.checklist?.length ? (
        <div className={`${op.card} mt-4 p-4`}>
          <p className="text-sm font-semibold text-foreground">Confirm before continuing</p>
          <ul className="mt-3 space-y-3">
            {lesson.checklist.map((item) => (
              <label key={item} className="flex items-start gap-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded border-border"
                  checked={Boolean(checks[item])}
                  onChange={(e) => setChecks((prev) => ({ ...prev, [item]: e.target.checked }))}
                />
                <span>{item}</span>
              </label>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-6 flex gap-3">
        {prevLesson ? (
          <Button asChild className={`h-12 flex-1 ${op.secondaryBtn}`}>
            <Link to={`/training/${assignment.id}/lesson/${prevLesson.id}`}>Previous</Link>
          </Button>
        ) : (
          <Button asChild className={`h-12 flex-1 ${op.secondaryBtn}`}>
            <Link to={`/training/${assignment.id}`}>Back</Link>
          </Button>
        )}
        <Button
          type="button"
          disabled={busy}
          className={`h-12 flex-1 ${op.primaryBtn}`}
          onClick={() => markCompleteAndGo("next")}
        >
          {busy ? "Saving…" : nextLesson ? "Next lesson" : "Continue"}
        </Button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Progress saves automatically when you complete each section.
      </p>
    </OperationalPage>
  );
}
