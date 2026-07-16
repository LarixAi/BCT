import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import {
  callOperations,
  emergencyTelHref,
  operationsTelHref,
} from "@/platform/ops-contacts";

export const Route = createFileRoute("/_app/duties/$dutyId/help")({
  head: () => ({ meta: [{ title: "Help — Veyvio Driver" }] }),
  component: HelpPage,
});

function HelpPage() {
  const { dutyId } = Route.useParams();
  const navigate = useNavigate();
  const [opsReason, setOpsReason] = useState<string | null>(null);
  const opsHref = operationsTelHref();

  return (
    <FocusedPageShell
      title="Help & escalation"
      backLabel="Duties"
      onBack={() =>
        void navigate({ to: "/trips", search: { demo: "normal", dutyId } })
      }
      eyebrow="Safety"
      subtitle="Use these contacts when you need Operations support on this duty."
    >
      <div className="animate-in-up space-y-2 text-sm">
        <a
          href={emergencyTelHref()}
          className="block rounded-[14px] border border-vor/30 bg-vor/10 p-4 font-bold text-vor"
        >
          Emergency — Call 999
        </a>
        {opsHref ? (
          <a href={opsHref} className="block rounded-[14px] border border-border bg-background p-4 font-bold">
            Call Operations
          </a>
        ) : (
          <Button
            variant="outline"
            className="h-auto w-full justify-start whitespace-normal rounded-[14px] p-4 text-left"
            onClick={() => {
              const result = callOperations();
              if (!result.started) setOpsReason(result.reason ?? "Unavailable");
            }}
          >
            <span>
              <span className="font-bold">Call Operations</span>
              <span className="mt-1 block font-normal text-muted">
                Contact your depot for duty changes or assistance.
              </span>
            </span>
          </Button>
        )}
        {opsReason ? <p className="text-xs text-warn">{opsReason}</p> : null}
        <Link
          to="/duties/$dutyId/journey/defect"
          params={{ dutyId }}
          className="block rounded-[14px] border border-border bg-background p-4 font-bold"
        >
          Report defect
        </Link>
        <Link
          to="/messages/new"
          search={{ type: undefined }}
          className="block rounded-[14px] border border-border bg-background p-4 font-bold"
        >
          Message Operations
        </Link>
      </div>
    </FocusedPageShell>
  );
}
