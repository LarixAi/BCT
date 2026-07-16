import type { ReactNode } from "react";
import { JourneyFlowShell } from "./JourneyFlowShell";

/** Open-journey wizard — Splash focused light chrome via JourneyFlowShell. */
export function OpenJourneyShell({
  step,
  total = 4,
  routeLabel,
  backTo,
  backLabel = "Back",
  footer,
  children,
}: {
  step: number;
  total?: number;
  routeLabel: string;
  backTo: string;
  backLabel?: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <JourneyFlowShell
      kind="open"
      step={step}
      total={total}
      routeLabel={routeLabel}
      backTo={backTo}
      backLabel={backLabel}
      footer={footer}
    >
      {children}
    </JourneyFlowShell>
  );
}
