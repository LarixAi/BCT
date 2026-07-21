import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { completeTrainingDeclaration, loadDriverTrainingCentre } from "@/services/training.service";
import { OperationalPage } from "../DriverOperationalPageParts";

export default function DriverTrainingDeclarationPage({ driver }) {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const { session } = useDriverSupabaseAuth();
  const [assignment, setAssignment] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
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
    const found = (result.assignments ?? []).find((a) => a.id === assignmentId || a.courseId === assignmentId);
    setAssignment(found ?? null);
    if (!found) setError("Training assignment not found.");
  }, [session, driver?.id, assignmentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function onSubmit() {
    if (!assignment || !confirmed) {
      setError("Confirm the declaration before submitting.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await completeTrainingDeclaration({ ...session, driverId: driver?.id }, assignment);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Declaration could not be saved.");
      return;
    }
    navigate(`/training/${assignment.id}/completed`, { replace: true });
  }

  if (!assignment && !error) {
    return (
      <OperationalPage title="Declaration" subtitle="Loading…" backTo={`/training/${assignmentId}`}>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </OperationalPage>
    );
  }

  if (error && !assignment) {
    return (
      <OperationalPage title="Declaration" subtitle={error} backTo="/training">
        <Button asChild className={op.secondaryBtn}>
          <Link to="/training">Back</Link>
        </Button>
      </OperationalPage>
    );
  }

  return (
    <OperationalPage title="Driver declaration" subtitle={assignment.title} backTo={`/training/${assignment.id}`}>
      <div className={`${op.card} p-4`}>
        <p className="text-sm leading-relaxed text-foreground">{assignment.content?.declarationText}</p>
        <label className="mt-4 flex items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 rounded border-border"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>I agree to this declaration.</span>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">
          We record your identity, date and time, device, course version, and confirmation for compliance.
        </p>
      </div>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      <Button type="button" disabled={busy || !confirmed} className={`mt-5 h-12 w-full ${op.primaryBtn}`} onClick={onSubmit}>
        {busy ? "Submitting…" : "Submit declaration"}
      </Button>
    </OperationalPage>
  );
}
