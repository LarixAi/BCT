import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { yardCopy } from "@/copy/yard-messages";
import { cn } from "@/lib/utils";

type WelcomeProgressProps = {
  step: number;
  total?: number;
  className?: string;
};

export function WelcomeStepLabel({ step }: { step: number }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
      {yardCopy.welcome.stepLabel(step)}
    </p>
  );
}

export function WelcomeProgress({ step, total = 3, className }: WelcomeProgressProps) {
  return (
    <div className={cn("flex justify-center gap-1", className)} aria-hidden>
      {Array.from({ length: total }, (_, i) => i + 1).map(i => (
        <div
          key={i}
          className={cn(
            "h-1 w-8 rounded-xs transition-colors",
            step === i ? "bg-primary" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

export function WelcomeFooterLinks() {
  return (
    <div className="flex justify-center gap-4 text-[10px] text-muted-foreground">
      <span>Privacy</span>
      <span>Terms</span>
      <span>Support</span>
    </div>
  );
}

type WelcomeOnboardingProps = {
  step: number;
  title: string;
  message: string;
  children: ReactNode;
};

/** Phone brand layout for the three-step welcome carousel. */
export function WelcomeOnboarding({ step, title, message, children }: WelcomeOnboardingProps) {
  return (
    <div className="flex min-h-[calc(100dvh-5.5rem)] flex-col justify-between animate-in-up pb-safe sm:min-h-[70vh]">
      <div className="space-y-4 pt-2 sm:pt-4">
        <WelcomeStepLabel step={step} />
        <h1
          className={cn(
            "text-2xl font-extrabold tracking-tight text-foreground",
            step === 1 ? "font-marketing" : "font-display",
          )}
        >
          {title}
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>

      <div className="space-y-3 pb-2 sm:pb-4">{children}</div>
    </div>
  );
}

type WelcomeActionsProps = {
  step: number;
  nextHref?: string;
  prevHref?: string;
  onComplete?: () => void;
};

export function WelcomeActions({ step, nextHref, prevHref, onComplete }: WelcomeActionsProps) {
  return (
    <>
      <WelcomeProgress step={step} />

      {step < 3 && nextHref && (
        <Button asChild className="w-full bg-accent text-white uppercase tracking-widest font-bold hover:bg-accent/90">
          <Link to={nextHref}>{yardCopy.buttons.continue}</Link>
        </Button>
      )}

      {step === 3 && (
        <>
          <Button
            className="w-full bg-accent text-white uppercase tracking-widest font-bold hover:bg-accent/90"
            onClick={onComplete}
            asChild
          >
            <Link to="/sign-in">{yardCopy.buttons.signIn}</Link>
          </Button>
          <p className="px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            {yardCopy.welcome.authorisedNote}
          </p>
        </>
      )}

      {prevHref && (
        <Link
          to={prevHref}
          className="block text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground"
        >
          {yardCopy.buttons.back}
        </Link>
      )}

      <WelcomeFooterLinks />
    </>
  );
}
