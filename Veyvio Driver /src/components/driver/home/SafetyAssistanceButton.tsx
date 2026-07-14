import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import type { IncidentCategoryCode } from "@veyvio/incidents";
import { Button } from "@/components/ui/button";

const ASSISTANCE_ACTIONS: {
  id: string;
  label: string;
  category?: IncidentCategoryCode;
  href?: string;
}[] = [
  { id: "accident", label: "Report accident", category: "road_collision" },
  { id: "passenger", label: "Report passenger incident", category: "passenger_injury" },
  { id: "breakdown", label: "Report vehicle breakdown", category: "vehicle_breakdown" },
  { id: "ops", label: "Contact operations", href: "/more/support" },
  { id: "emergency", label: "Request emergency assistance", category: "other" },
  { id: "safeguarding", label: "Record safeguarding concern", category: "safeguarding" },
];

export function SafetyAssistanceButton() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  function handleAction(action: (typeof ASSISTANCE_ACTIONS)[number]) {
    setOpen(false);
    if (action.href) return;
    navigate({
      to: "/incidents/report",
      search: action.category ? { category: action.category } : undefined,
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full border-accent/30 font-bold uppercase tracking-widest"
        onClick={() => setOpen(true)}
      >
        <Shield className="size-4" />
        Safety &amp; assistance
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 pb-safe">
          <div
            className="w-full max-w-lg animate-in-up rounded-t-xl border border-border bg-card p-4 shadow-xl"
            role="dialog"
            aria-labelledby="safety-sheet-title"
          >
            <h2 id="safety-sheet-title" className="font-display text-lg font-extrabold">
              Safety &amp; assistance
            </h2>
            <p className="mt-2 rounded-xs border border-vor/30 bg-vor/10 p-3 text-sm text-vor">
              Call <strong>999</strong> first when there is immediate danger.
            </p>
            <ul className="mt-4 space-y-2">
              {ASSISTANCE_ACTIONS.map((action) => (
                <li key={action.id}>
                  {action.href ? (
                    <Link
                      to={action.href}
                      className="flex h-12 w-full items-center rounded-xs border border-border px-4 text-left text-sm font-semibold hover:bg-secondary"
                      onClick={() => setOpen(false)}
                    >
                      {action.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="flex h-12 w-full items-center rounded-xs border border-border px-4 text-left text-sm font-semibold hover:bg-secondary"
                      onClick={() => handleAction(action)}
                    >
                      {action.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <Button variant="ghost" className="mt-4 h-11 w-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
