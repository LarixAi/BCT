import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
  const [opsReason, setOpsReason] = useState<string | null>(null);
  const opsHref = operationsTelHref();

  return (
    <div className="space-y-4 animate-in-up">
      <h1 className="font-display text-xl font-extrabold">Help</h1>
      <div className="space-y-2 text-sm">
        <a
          href={emergencyTelHref()}
          className="block rounded-xs border border-vor/30 bg-vor/10 p-4 font-bold text-vor"
        >
          Emergency — Call 999
        </a>
        {opsHref ? (
          <a href={opsHref} className="block rounded-xs border border-border bg-card p-4 font-bold">
            Call Operations
          </a>
        ) : (
          <Button
            variant="outline"
            className="h-auto w-full justify-start whitespace-normal p-4 text-left"
            onClick={() => {
              const result = callOperations();
              if (!result.started) setOpsReason(result.reason ?? "Unavailable");
            }}
          >
            <span>
              <span className="font-bold">Call Operations</span>
              <span className="mt-1 block text-muted font-normal">
                Contact your depot for duty changes or assistance.
              </span>
            </span>
          </Button>
        )}
        {opsReason ? <p className="text-xs text-warn">{opsReason}</p> : null}
        <Link
          to="/duties/$dutyId/journey/defect"
          params={{ dutyId }}
          className="block rounded-xs border border-border bg-card p-4 font-bold"
        >
          Report defect
        </Link>
        <Link
          to="/messages/new"
          className="block rounded-xs border border-border bg-card p-4 font-bold"
        >
          Message Operations
        </Link>
      </div>
    </div>
  );
}
