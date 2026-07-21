import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { formatTrainingDue, loadDriverTrainingCentre } from "@/services/training.service";
import { OperationalPage } from "../DriverOperationalPageParts";

export default function DriverTrainingCompletedPage({ driver }) {
  const { assignmentId } = useParams();
  const { session } = useDriverSupabaseAuth();
  const [assignment, setAssignment] = useState(null);

  const refresh = useCallback(async () => {
    const result = await loadDriverTrainingCentre({
      ...session,
      driverId: driver?.id ?? session?.driverId,
    });
    if (!result.ok) return;
    setAssignment((result.assignments ?? []).find((a) => a.id === assignmentId || a.courseId === assignmentId) ?? null);
  }, [session, driver?.id, assignmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!assignment) {
    return (
      <OperationalPage title="Completion" subtitle="Loading…" backTo="/training">
        <p className="text-sm text-muted-foreground">Loading completion record…</p>
      </OperationalPage>
    );
  }

  return (
    <OperationalPage title="Training completed" subtitle={assignment.title} backTo="/training">
      <div className={`${op.card} p-5 text-center`}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
        <p className="mt-3 text-lg font-semibold text-foreground">{assignment.title}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Completed {formatTrainingDue(assignment.completedAt) ?? "today"}
          {assignment.expiresAt ? ` · Valid until ${formatTrainingDue(assignment.expiresAt)}` : null}
        </p>
        {assignment.assessmentScore != null ? (
          <p className="mt-2 text-sm font-medium text-foreground">Assessment score: {assignment.assessmentScore}%</p>
        ) : null}
        {assignment.declarationAt ? (
          <p className="mt-2 text-xs text-muted-foreground">Declaration recorded</p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3">
        <Button asChild className={`h-11 ${op.secondaryBtn}`}>
          <Link to={`/training/${assignment.id}`}>Review training</Link>
        </Button>
        <Button asChild className={`h-11 ${op.primaryBtn}`}>
          <Link to="/training">Back to Training Centre</Link>
        </Button>
      </div>
    </OperationalPage>
  );
}
