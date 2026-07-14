import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

type FlowKind = "open" | "end";

const titles: Record<FlowKind, string> = {
  open: "Open journey",
  end: "End journey",
};

export function JourneyFlowShell({
  kind,
  step,
  total = 4,
  routeLabel,
  backTo,
  backLabel = "Back",
  children,
}: {
  kind: FlowKind;
  step: number;
  total?: number;
  routeLabel: string;
  backTo: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 bg-accent pt-safe text-white">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <Link
            to={backTo}
            className="inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-white/55"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Link>
          <div className="text-center">
            <p className="text-[10px] font-extrabold tracking-wide">{titles[kind]}</p>
            <p className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-driver-sky">
              Step {step} of {total}
            </p>
          </div>
          <p className="max-w-[72px] truncate text-right text-[9px] font-bold text-white/55">{routeLabel}</p>
        </div>
        <div className="mx-auto flex max-w-lg gap-1 px-4 pb-3">
          {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
            <div
              key={i}
              className={cn("h-[3px] flex-1 rounded-sm", i <= step ? "bg-link" : "bg-white/15")}
              aria-hidden
            />
          ))}
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5 pb-safe">{children}</main>
    </div>
  );
}
