import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/duties/$dutyId/help")({
  head: () => ({ meta: [{ title: "Help — Veyvio Driver" }] }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="space-y-4 animate-in-up">
      <h1 className="font-display text-xl font-extrabold">Help</h1>
      <div className="space-y-2 text-sm">
        <a href="tel:999" className="block rounded-xs border border-vor/30 bg-vor/10 p-4 font-bold text-vor">
          Emergency — 999
        </a>
        <div className="rounded-xs border border-border bg-card p-4">
          <p className="font-bold">Operations</p>
          <p className="text-muted">Contact your depot for duty changes or assistance.</p>
        </div>
      </div>
    </div>
  );
}
