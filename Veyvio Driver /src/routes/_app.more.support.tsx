import { createFileRoute, Link } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { MoreSubpageLayout, MoreSection, MoreRow } from "@/components/driver/more/MoreLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/more/support")({
  head: () => ({ meta: [{ title: "Help and support — Veyvio Driver" }] }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <MoreSubpageLayout title="Contact operations">
      <div className="space-y-3 rounded-xl border border-vor/30 bg-vor/5 p-4">
        <p className="text-sm font-semibold text-vor">Emergency</p>
        <p className="text-sm text-muted">For immediate danger, call emergency services (999).</p>
        <Button variant="destructive" className="w-full">
          Call 999
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button className="h-12">
          <Phone className="size-4" />
          Call operations
        </Button>
        <Button asChild variant="outline" className="h-12">
          <Link to="/messages/new">Message operations</Link>
        </Button>
      </div>

      <MoreSection title="Operational support">
        <MoreRow label="Report a trip issue" href="/messages/new" />
        <MoreRow label="Report a safeguarding concern" href="/messages/new" />
      </MoreSection>

      <MoreSection title="Help centre">
        <MoreRow label="Starting and ending a shift" href="/more/support" />
        <MoreRow label="Understanding trips" href="/more/support" />
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
