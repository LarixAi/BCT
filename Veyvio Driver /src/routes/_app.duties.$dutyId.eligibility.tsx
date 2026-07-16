import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { Badge } from "@/components/ui/badge";
import {
  eligibilityGateCopy,
  getDriverEligibilityDecision,
} from "@/domain/duty/driver-eligibility";
import { useDriverStore } from "@/store/driver";

export const Route = createFileRoute("/_app/duties/$dutyId/eligibility")({
  head: () => ({ meta: [{ title: "Fitness & eligibility — Veyvio Driver" }] }),
  component: DutyEligibilityPage,
});

function DutyEligibilityPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const duty = useDriverStore((s) => s.getDuty(dutyId));
  const decision = getDriverEligibilityDecision();
  const copy = eligibilityGateCopy(decision);

  return (
    <FocusedPageShell
      title="Fitness & eligibility"
      backLabel="Duties"
      onBack={() =>
        void navigate({ to: "/trips", search: { demo: "normal", dutyId } })
      }
      eyebrow="Before clock-in"
      subtitle="Operations eligibility and your fit-for-duty declaration for this assignment."
    >
      <div className="animate-in-up space-y-5">
        <section className="rounded-[14px] border border-border bg-background p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
              Operations decision
            </p>
            <Badge
              variant={
                decision.status === "blocked"
                  ? "warn"
                  : decision.status === "eligible_with_warning"
                    ? "warn"
                    : "ok"
              }
            >
              {decision.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="mt-3 text-sm font-semibold leading-snug">{copy.detail}</p>
          {copy.warning ? <p className="mt-2 text-sm text-warn">{copy.warning}</p> : null}
          {copy.blockReason ? <p className="mt-2 text-sm text-vor">{copy.blockReason}</p> : null}
        </section>

        <section className="rounded-[14px] border border-border bg-background p-4">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">
            Fit for duty
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Clock-in means you confirm you are fit and able to work, hold the required credentials for
            this duty, and will not drive if impairment or fatigue could affect safety.
          </p>
          {duty ? (
            <p className="mt-3 text-sm">
              Vehicle:{" "}
              <strong className="font-mono">
                {duty.vehicle?.registrationNumber ?? "Not assigned"}
              </strong>
              {duty.clockedInAt ? (
                <span className="mt-1 block text-ok">Already clocked in for this duty.</span>
              ) : null}
            </p>
          ) : null}
        </section>

        <button
          type="button"
          className="flex min-h-[52px] w-full items-center justify-center rounded-[14px] bg-accent text-sm font-extrabold uppercase tracking-wide text-white"
          onClick={() =>
            void navigate({ to: "/trips", search: { demo: "normal", dutyId } })
          }
        >
          Return to clock in
        </button>
      </div>
    </FocusedPageShell>
  );
}
