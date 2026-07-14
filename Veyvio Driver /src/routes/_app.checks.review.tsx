import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ReviewDeclaration } from "@/components/driver/checks/ReviewDeclaration";
import { applyCheckSubmissionToDriverState } from "@/domain/vehicle-check/complete-check-flow";
import { useVehicleCheckStore } from "@/store/vehicle-check";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/checks/review")({
  head: () => ({ meta: [{ title: "Review check — Veyvio Driver" }] }),
  component: ReviewPage,
});

function ReviewPage() {
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const session = useVehicleCheckStore((s) => s.activeSession);
  const checksHome = useVehicleCheckStore((s) => s.checksHome);
  const setDeclarationHeld = useVehicleCheckStore((s) => s.setDeclarationHeld);
  const submitCheck = useVehicleCheckStore((s) => s.submitCheck);

  if (!session) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">No check to review.</p>
        <Button asChild>
          <Link to="/checks">Back to checks</Link>
        </Button>
      </div>
    );
  }

  function handleSubmit() {
    setSubmitError(null);
    try {
      setDeclarationHeld(true);
      submitCheck();
      const { activeSession, checksHome: home } = useVehicleCheckStore.getState();
      if (!activeSession?.outcome) {
        throw new Error("Check did not finish submitting");
      }
      applyCheckSubmissionToDriverState(activeSession.outcome, home, activeSession);
      void navigate({ to: "/checks/result", replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not submit check");
    }
  }

  return (
    <div className="animate-in-up">
      <Link to="/checks/walkaround" className="text-sm text-link">
        ← Walkaround
      </Link>
      <div className="mt-4">
        {submitError && (
          <p className="mb-4 rounded-md border border-vor/30 bg-vor/10 p-3 text-sm text-vor">{submitError}</p>
        )}
        <ReviewDeclaration
          session={session}
          accessibilityCapable={checksHome.vehicle.accessibilityCapable}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
