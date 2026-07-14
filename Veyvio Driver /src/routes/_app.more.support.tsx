import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { useState } from "react";
import { MoreSubpageLayout, MoreSection, MoreRow } from "@/components/driver/more/MoreLayout";
import { Button } from "@/components/ui/button";
import {
  callEmergency999,
  callOperations,
  emergencyTelHref,
  operationsTelHref,
} from "@/platform/ops-contacts";

export const Route = createFileRoute("/_app/more/support")({
  head: () => ({ meta: [{ title: "Help and support — Veyvio Driver" }] }),
  component: SupportPage,
});

function SupportPage() {
  const [opsReason, setOpsReason] = useState<string | null>(null);
  const opsHref = operationsTelHref();

  return (
    <MoreSubpageLayout title="Contact Operations">
      <div className="space-y-3 rounded-xl border border-vor/30 bg-vor/5 p-4">
        <p className="text-sm font-semibold text-vor">Emergency</p>
        <p className="text-sm text-muted">For immediate danger, call emergency services (999).</p>
        <Button
          variant="destructive"
          className="w-full"
          asChild
        >
          <a href={emergencyTelHref()} onClick={() => callEmergency999()}>
            Call 999
          </a>
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {opsHref ? (
          <Button asChild className="h-12">
            <a href={opsHref}>
              <Phone className="size-4" />
              Call Operations
            </a>
          </Button>
        ) : (
          <Button
            className="h-12"
            onClick={() => {
              const result = callOperations();
              if (!result.started) setOpsReason(result.reason ?? "Unavailable");
            }}
          >
            <Phone className="size-4" />
            Call Operations
          </Button>
        )}
        <Button asChild variant="outline" className="h-12">
          <Link to="/messages/new">Message Operations</Link>
        </Button>
      </div>
      {opsReason ? <p className="text-xs text-warn">{opsReason}</p> : null}

      <MoreSection title="Operational support">
        <MoreRow label="Report a duty issue" href="/messages/new" />
        <MoreRow label="Report a safeguarding concern" href="/messages/new" />
      </MoreSection>

      <MoreSection title="Help centre">
        <MoreRow label="Starting and ending a shift" href="/more/offline-sync" />
        <MoreRow label="Understanding duties" href="/trips" />
        <MoreRow label="Completing vehicle checks" href="/checks" />
        <MoreRow label="Using the app offline" href="/more/offline-sync" />
        <MoreRow label="Uploading documents" href="/more/documents" />
        <MoreRow label="Passenger centred journeys — barriers to transport" href="/more/training/barriers-to-transport" />
        <MoreRow label="Angie's perspective — difficult journey" href="/more/training/angie-bad-journey" />
        <MoreRow label="What would you say or do?" href="/more/training/say-or-do" />
        <MoreRow label="Replay driver onboarding" href="/onboarding/1" />
      </MoreSection>
    </MoreSubpageLayout>
  );
}
