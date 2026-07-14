import { Link } from "@tanstack/react-router";
import { Phone, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Persistent Help / Safety launcher for active navigation and journey screens. */
export function JourneyHelpLauncher({ dutyId }: { dutyId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-50 max-w-lg">
      {open && (
        <div className="mb-2 w-64 space-y-2 rounded-xl border border-border bg-card p-3 shadow-lg">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Help &amp; safety</p>
          <a
            href="tel:999"
            className="flex items-center gap-2 rounded-md border border-vor/30 bg-vor/10 px-3 py-2 text-sm font-bold text-vor"
          >
            <Phone className="size-4" />
            Emergency — 999
          </a>
          <Link
            to="/duties/$dutyId/help"
            params={{ dutyId }}
            className="block rounded-md border border-border px-3 py-2 text-sm font-medium"
            onClick={() => setOpen(false)}
          >
            Operations help
          </Link>
          <Link
            to="/incidents/report"
            className="block rounded-md border border-border px-3 py-2 text-sm font-medium"
            onClick={() => setOpen(false)}
          >
            Report incident
          </Link>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      )}
      <Button
        type="button"
        size="lg"
        className="h-12 gap-2 rounded-full bg-vor px-4 font-bold text-white shadow-md hover:bg-vor/90"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Open help and safety"
      >
        <ShieldAlert className="size-5" />
        Help
      </Button>
    </div>
  );
}
