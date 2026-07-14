import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { OnboardingChromeHeader } from "@/components/driver/onboarding/OnboardingScreens";
import { useSessionStore } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_public/onboarding/complete")({
  head: () => ({ meta: [{ title: "Onboarding complete — Veyvio Driver" }] }),
  component: DriverOnboardingCompletePage,
});

function DriverOnboardingCompletePage() {
  const navigate = useNavigate();
  const markDriverOnboardingComplete = useSessionStore((s) => s.markDriverOnboardingComplete);

  const handleStart = () => {
    markDriverOnboardingComplete();
    navigate({ to: "/" });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <OnboardingChromeHeader step={5} showSkip={false} />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ok/15">
          <CheckCircle2 className="h-8 w-8 text-ok" strokeWidth={2} />
        </div>
        <h1 className="mt-8 font-display text-2xl font-extrabold tracking-tight">
          You&apos;re ready to drive
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
          Your duty board is set up. Complete your walkaround and open your journey when the vehicle
          is ready.
        </p>

        <button
          type="button"
          onClick={handleStart}
          className="mt-10 w-full rounded-md bg-accent py-4 text-sm font-bold uppercase tracking-widest text-white"
          data-testid="onboarding-complete-start"
        >
          Go to home
        </button>
      </div>
    </div>
  );
}
