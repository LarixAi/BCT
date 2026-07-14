import { Link } from "@tanstack/react-router";
import { sectionProgress } from "@/domain/vehicle-check/check-helpers";
import { getApplicableSections } from "@/domain/vehicle-check/check-template";
import type { VehicleCheckSession } from "@/types/vehicle-check";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Circle } from "lucide-react";

export function SectionProgressList({
  session,
  accessibilityCapable,
}: {
  session: VehicleCheckSession;
  accessibilityCapable: boolean;
}) {
  const sections = getApplicableSections(accessibilityCapable);

  return (
    <ul className="space-y-2">
      {sections.map((section) => {
        const { pass, defect, pending, total } = sectionProgress(
          session,
          section.id,
          accessibilityCapable,
        );
        const complete = pending === 0;
        const hasDefect = defect > 0;

        return (
          <li key={section.id}>
            <Link
              to="/checks/walkaround"
              search={{ section: section.id }}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-3 transition-colors",
                complete && !hasDefect && "border-ok/30 bg-ok/5",
                hasDefect && "border-warn/30 bg-warn/5",
                !complete && "border-border bg-card hover:bg-secondary/40",
              )}
            >
              <div className="flex items-center gap-3">
                {complete && !hasDefect && <CheckCircle2 className="size-5 text-ok" />}
                {hasDefect && <AlertCircle className="size-5 text-warn" />}
                {!complete && !hasDefect && <Circle className="size-5 text-muted" />}
                <div>
                  <p className="text-sm font-semibold">{section.title}</p>
                  <p className="text-xs text-muted">
                    {pass + defect} of {total} answered
                  </p>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
