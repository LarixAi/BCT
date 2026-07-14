import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AuthCheckbox } from "@/components/auth/AuthField";
import { Button } from "@/components/ui/button";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { driverCopy } from "@/copy/driver-messages";
import {
  declarationCanSubmit,
  declarationHasReportedChanges,
  getDeclarationProgress,
} from "@/domain/more/declaration-compliance";
import type { DriverDeclaration } from "@/types/declarations";
import { useMoreStore } from "@/store/more";
import { cn } from "@/lib/utils";

export function DeclarationFlowPanel({ declaration }: { declaration: DriverDeclaration }) {
  const setDeclarationStatementResponse = useMoreStore((s) => s.setDeclarationStatementResponse);
  const submitDeclaration = useMoreStore((s) => s.submitDeclaration);
  const [submitting, setSubmitting] = useState(false);
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const progress = getDeclarationProgress(declaration);
  const hasReportedChanges = declarationHasReportedChanges(declaration);
  const canSubmit = declarationCanSubmit(declaration);
  const isComplete = declaration.status === "submitted" || declaration.status === "on_file";

  function startHold() {
    if (!canSubmit || submitting) return;
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setHolding(false);
      void handleSubmit();
    }, 1500);
  }

  function cancelHold() {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }

  async function handleSubmit() {
    setSubmitting(true);
    const result = await submitDeclaration(declaration.id);
    setSubmitting(false);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    toast.success(driverCopy.declarations.submitted, {
      description: driverCopy.declarations.submittedHint,
    });
  }

  if (isComplete) {
    return (
      <HomeCard tone="green">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
          <div>
            <p className="font-semibold">{driverCopy.declarations.onFile}</p>
            {declaration.submittedAt && (
              <p className="mt-1 text-sm text-muted">
                {new Date(declaration.submittedAt).toLocaleString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
            {declaration.submittedBy && (
              <p className="mt-1 text-xs text-muted">Signed by {declaration.submittedBy}</p>
            )}
            {declaration.auditNote && (
              <p className="mt-2 text-xs text-muted">{declaration.auditNote}</p>
            )}
          </div>
        </div>
      </HomeCard>
    );
  }

  return (
    <div className="space-y-4">
      <HomeCard>
        <p className="text-sm font-semibold">{declaration.summary}</p>
        <p className="mt-2 text-xs text-muted">
          {driverCopy.declarations.progress(progress.confirmed, progress.total)}
        </p>
      </HomeCard>

      {hasReportedChanges && (
        <HomeCard tone="amber">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
            <div className="space-y-2">
              <p className="text-sm font-semibold">{driverCopy.declarations.changeReportedTitle}</p>
              <p className="text-sm text-muted">{driverCopy.declarations.changeReportedHint}</p>
              <Button asChild variant="outline" className="h-11 w-full">
                <Link to="/more/support">{driverCopy.declarations.contactOperations}</Link>
              </Button>
            </div>
          </div>
        </HomeCard>
      )}

      <div className="space-y-3">
        {declaration.statements.map((statement) => {
          const isConfirmed = statement.response === "confirmed";
          const isReported = statement.response === "change_reported";

          return (
            <div key={statement.id} className="space-y-2">
              <AuthCheckbox
                id={`${declaration.id}-${statement.id}`}
                label={statement.label}
                description={statement.confirmText}
                checked={isConfirmed}
                onChange={(checked) =>
                  setDeclarationStatementResponse(
                    declaration.id,
                    statement.id,
                    checked ? "confirmed" : "unanswered",
                  )
                }
              />

              {statement.allowsReportChange && (
                <button
                  type="button"
                  onClick={() =>
                    setDeclarationStatementResponse(
                      declaration.id,
                      statement.id,
                      isReported ? "unanswered" : "change_reported",
                    )
                  }
                  className={cn(
                    "text-xs font-bold",
                    isReported ? "text-vor" : "text-link",
                  )}
                >
                  {isReported
                    ? driverCopy.declarations.undoReportChange
                    : statement.reportChangeLabel}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted">{driverCopy.declarations.auditNote}</p>

      <Button
        className="h-14 w-full font-bold uppercase tracking-widest"
        variant={holding ? "secondary" : "default"}
        disabled={!canSubmit || submitting || hasReportedChanges}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {driverCopy.declarations.submitting}
          </>
        ) : holding ? (
          driverCopy.declarations.holding
        ) : (
          driverCopy.declarations.holdToSubmit
        )}
      </Button>
    </div>
  );
}
