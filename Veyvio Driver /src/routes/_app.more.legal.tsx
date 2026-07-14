import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout, MoreRow } from "@/components/driver/more/MoreLayout";

export const Route = createFileRoute("/_app/more/legal")({
  head: () => ({ meta: [{ title: "Privacy and legal — Veyvio Driver" }] }),
  component: LegalPage,
});

function LegalPage() {
  return (
    <MoreSubpageLayout title="Privacy and legal">
      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        <MoreRow label="Privacy notice" href="/more/legal" />
        <MoreRow label="Terms of use" href="/more/legal" />
        <MoreRow label="Driver app policy" href="/more/legal" />
        <MoreRow label="Data retention information" href="/more/legal" />
        <MoreRow label="Open-source licences" href="/more/legal" />
        <MoreRow label="Accessibility statement" href="/more/legal" />
      </div>
    </MoreSubpageLayout>
  );
}
