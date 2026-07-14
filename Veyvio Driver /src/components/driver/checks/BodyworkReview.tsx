import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { KnownBodyworkDamage } from "@/types/vehicle-check";

export function BodyworkReview({
  records,
  onNoNewDamage,
  onReportNew,
}: {
  records: KnownBodyworkDamage[];
  onNoNewDamage: () => void;
  onReportNew: () => void;
}) {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Exterior condition</p>
        <h2 className="font-display text-lg font-extrabold">Existing bodywork records</h2>
      </header>

      <ul className="space-y-2">
        {records.map((r) => (
          <li key={r.id} className="flex gap-2 text-sm">
            <span className="text-vor" aria-hidden>
              ●
            </span>
            <span>{r.label}</span>
          </li>
        ))}
      </ul>

      <p className="text-sm font-medium">Has the vehicle developed any new or worsened damage?</p>

      <div className="space-y-2">
        <Button className="h-12 w-full" onClick={onNoNewDamage}>
          No new damage
        </Button>
        <Button variant="outline" className="h-12 w-full" onClick={onReportNew}>
          Report new damage
        </Button>
      </div>

      <p className="text-xs text-muted">
        New reports create a separate observation and do not overwrite onboarding or previous evidence.
      </p>
    </div>
  );
}

export function VehicleMismatchScreen({
  assignedRegistration,
  assignedFleet,
  scannedRegistration,
  scannedFleet,
  onScanAgain,
}: {
  assignedRegistration: string;
  assignedFleet: string;
  scannedRegistration: string;
  scannedFleet: string;
  onScanAgain: () => void;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-vor/30 bg-vor/5 p-4">
      <h2 className="font-display text-lg font-extrabold text-vor">This is not your assigned vehicle</h2>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Scanned</p>
          <p className="mt-1 font-mono font-semibold">
            {scannedRegistration} · Fleet {scannedFleet}
          </p>
        </div>
        <div className="rounded-lg border border-link/30 bg-link/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Assigned</p>
          <p className="mt-1 font-mono font-semibold">
            {assignedRegistration} · Fleet {assignedFleet}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onScanAgain}>Scan again</Button>
        <Button variant="outline" asChild>
          <Link to="/messages">Contact operations</Link>
        </Button>
      </div>
    </div>
  );
}
