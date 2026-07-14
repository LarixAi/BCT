import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BrandWordmarkGraphic } from "@/components/brand/BrandWordmarkGraphic";
import { cn } from "@/lib/utils";

export function OnboardingChromeHeader({
  step,
  total = 5,
  showSkip = true,
  skipTo = "/",
}: {
  step: number;
  total?: number;
  showSkip?: boolean;
  skipTo?: string;
}) {
  return (
    <header className="border-b border-white/10 bg-accent pt-safe text-white">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <BrandWordmarkGraphic size="header" />
        <p className="text-[8px] font-bold uppercase tracking-widest text-driver-sky">
          Step {step} of {total}
        </p>
        {showSkip ? (
          <Link to={skipTo} className="text-[8px] font-bold uppercase tracking-widest text-white/55">
            Skip
          </Link>
        ) : (
          <span className="w-8" />
        )}
      </div>
    </header>
  );
}

export function WelcomeProgress({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <div className="flex justify-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
        <div
          key={i}
          className={cn("h-[3px] w-7 rounded-sm", i <= step ? "bg-link" : "bg-border")}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function OnboardingProgress({ step, total = 5 }: { step: number; total?: number }) {
  return (
    <div className="flex justify-center gap-1">
      {Array.from({ length: total }, (_, i) => i + 1).map((i) => (
        <div
          key={i}
          className={cn("h-1.5 rounded-full", i === step ? "w-6 bg-link" : "w-1.5 bg-border")}
          aria-hidden
        />
      ))}
    </div>
  );
}

export function OnboardingFeaturePreview({ step }: { step: 1 | 2 | 3 | 4 | 5 }) {
  const previews: Record<number, ReactNode> = {
    1: (
      <div className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Today&apos;s duty</p>
        <p className="mt-1 text-sm font-extrabold">Walkaround due before departure</p>
        <p className="mt-2 font-mono text-sm font-extrabold">LK23 ABC</p>
        <p className="mt-2 rounded-md bg-accent py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
          Start walkaround
        </p>
      </div>
    ),
    2: (
      <div className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Trip</p>
        <p className="mt-1 font-display text-base font-extrabold">School Morning Run</p>
        <p className="text-xs text-muted">Depart 07:30 · Bay 4</p>
        <p className="mt-2 rounded-md bg-accent py-2 text-center text-[10px] font-bold uppercase tracking-widest text-white">
          Open journey
        </p>
      </div>
    ),
    3: (
      <div className="rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Walkaround</p>
          <p className="text-sm font-extrabold text-link">3 / 12</p>
        </div>
        <p className="mt-1 text-sm font-extrabold">Lights and indicators</p>
        <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] font-bold uppercase">
          <span className="rounded border border-ok/30 py-1 text-center text-ok">Pass</span>
          <span className="rounded border border-border py-1 text-center text-muted">Defect</span>
          <span className="rounded border border-border py-1 text-center text-muted">N/A</span>
        </div>
      </div>
    ),
    4: (
      <div className="overflow-hidden rounded-md border border-border">
        <div className="h-16 bg-gradient-to-br from-secondary to-background" />
        <div className="bg-card p-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-link">Next stop</p>
          <p className="text-sm font-extrabold">Oak Lane · 07:48</p>
        </div>
      </div>
    ),
    5: (
      <div className="rounded-md border border-border bg-card p-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-link">Dispatch</p>
        <p className="mt-1 text-sm font-bold">Defect acknowledged on LK23 ABC</p>
        <p className="mt-2 rounded-md border border-border py-2 text-center text-[10px] font-bold uppercase tracking-widest text-link">
          Report defect
        </p>
      </div>
    ),
  };
  return previews[step];
}
