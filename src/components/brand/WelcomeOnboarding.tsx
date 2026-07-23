import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { YardAuthBrandHero } from "@/components/auth/YardAuthWordmark";
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
            step === i ? "bg-[#12A89D]" : "bg-[#e5e7eb]",
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
    <div className="yard-auth-page yard-auth-shell">
      <div className="yard-auth-inner">
        <div className="yard-auth-content min-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] justify-between">
          <div className="space-y-4">
            {step === 1 ? <YardAuthBrandHero /> : null}
            <WelcomeStepLabel step={step} />
            <h1
              className={cn(
                "yard-auth-title",
                step === 1 ? "font-marketing" : "font-display",
              )}
            >
              {title}
            </h1>
            <p className="max-w-prose text-sm leading-relaxed text-[#6b7280]">{message}</p>
          </div>

          <div className="space-y-3 pb-2">{children}</div>
        </div>
      </div>
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

      {step < 3 && nextHref ? (
        <Link to={nextHref} className="yard-auth-primary yard-auth-primary--ready no-underline">
          <span>{yardCopy.buttons.continue}</span>
        </Link>
      ) : null}

      {step === 3 ? (
        <>
          <Link
            to="/sign-in"
            onClick={onComplete}
            className="yard-auth-primary yard-auth-primary--ready no-underline"
          >
            <span>{yardCopy.buttons.signIn}</span>
          </Link>
          <p className="px-2 text-center text-[11px] leading-relaxed text-muted-foreground">
            {yardCopy.welcome.authorisedNote}
          </p>
        </>
      ) : null}

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
