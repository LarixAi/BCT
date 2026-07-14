import { useRef, useState } from "react";
import { sectionProgress } from "@/domain/vehicle-check/check-helpers";
import { getApplicableSections } from "@/domain/vehicle-check/check-template";
import type { VehicleCheckSession } from "@/types/vehicle-check";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function ReviewDeclaration({
  session,
  accessibilityCapable,
  onSubmit,
}: {
  session: VehicleCheckSession;
  accessibilityCapable: boolean;
  onSubmit: () => void;
}) {
  const [holding, setHolding] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sections = getApplicableSections(accessibilityCapable);

  function startHold() {
    setHolding(true);
    holdTimer.current = setTimeout(() => {
      setHolding(false);
      onSubmit();
    }, 1500);
  }

  function cancelHold() {
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Final declaration</p>
        <h1 className="font-display text-xl font-extrabold">Review your vehicle check</h1>
      </header>

      <ul className="space-y-2">
        {sections.map((section) => {
          const { defect, pending } = sectionProgress(session, section.id, accessibilityCapable);
          const ok = pending === 0 && defect === 0;
          const hasDefect = defect > 0;

          return (
            <li key={section.id} className="flex items-center gap-2 text-sm">
              {ok && <CheckCircle2 className="size-4 text-ok" />}
              {hasDefect && <AlertCircle className="size-4 text-warn" />}
              {!ok && !hasDefect && <span className="size-4" />}
              <span>
                {section.title}
                {hasDefect && ` — ${defect} defect${defect === 1 ? "" : "s"}`}
              </span>
            </li>
          );
        })}
      </ul>

      {session.defects.length > 0 && (
        <div className="rounded-md border border-warn/30 bg-warn/5 p-3 text-sm">
          <p className="font-medium">{session.defects.length} defect report(s) included</p>
        </div>
      )}

      <p className="text-sm text-muted">
        I confirm this vehicle inspection was completed honestly and accurately, and that all defects
        found were reported. This is not a personal fitness declaration.
      </p>

      <Button
        className="h-14 w-full font-bold uppercase tracking-widest"
        variant={holding ? "secondary" : "default"}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
      >
        {holding ? "Submitting…" : "Hold to submit"}
      </Button>

      <p className="text-center text-xs text-muted">
        Odometer: {session.odometer?.toLocaleString() ?? "—"} · Check recorded as duty activity
      </p>
    </div>
  );
}
