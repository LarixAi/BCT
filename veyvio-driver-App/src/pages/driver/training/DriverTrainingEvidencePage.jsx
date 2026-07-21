import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { formatTrainingDue, loadDriverTrainingCentre } from "@/services/training.service";
import { OperationalPage, StatusPill } from "../DriverOperationalPageParts";

export default function DriverTrainingEvidencePage({ driver }) {
  const { assignmentId } = useParams();
  const { session } = useDriverSupabaseAuth();
  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const result = await loadDriverTrainingCentre({
      ...session,
      driverId: driver?.id ?? session?.driverId,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setAssignment((result.assignments ?? []).find((a) => a.id === assignmentId || a.courseId === assignmentId) ?? null);
  }, [session, driver?.id, assignmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!assignment) {
    return (
      <OperationalPage title="Evidence" subtitle={error ?? "Loading…"} backTo="/training">
        {error ? (
          <Button asChild className={op.secondaryBtn}>
            <Link to="/training">Back</Link>
          </Button>
        ) : null}
      </OperationalPage>
    );
  }

  return (
    <OperationalPage title="Practical evidence" subtitle={assignment.title} backTo={`/training/${assignment.id}`}>
      <div className={`${op.card} p-4`}>
        <p className="text-sm font-semibold text-foreground">Practical assessment required</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Your theory section can be completed in the app. A practical assessment or certificate must be signed off by a
          trainer or manager — you cannot approve your own practical evidence.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Status</span>
            <StatusPill status="warning">Awaiting assessment</StatusPill>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Assessor</span>
            <span className="font-medium text-foreground">Not assigned</span>
          </div>
          {assignment.dueAt ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Due</span>
              <span className="font-medium text-foreground">{formatTrainingDue(assignment.dueAt)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className={`${op.card} mt-4 p-4 text-sm text-muted-foreground`}>
        <p className="font-semibold text-foreground">What may be required</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Trainer sign-off</li>
          <li>Driver signature</li>
          <li>Manager approval</li>
          <li>Photo or certificate upload</li>
          <li>Practical assessment date and score</li>
        </ul>
        <p className="mt-3">Ask your training lead to schedule the practical, or upload certificate evidence from Documents when requested.</p>
      </div>

      <Button asChild className={`mt-5 h-11 w-full ${op.secondaryBtn}`}>
        <Link to="/documents">Open documents</Link>
      </Button>
    </OperationalPage>
  );
}
