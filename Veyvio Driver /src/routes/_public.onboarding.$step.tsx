import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  OnboardingChromeHeader,
  OnboardingFeaturePreview,
  OnboardingProgress,
} from "@/components/driver/onboarding/OnboardingScreens";
import { DRIVER_ONBOARDING_PAGES } from "@/domain/onboarding/onboarding-content";

export const Route = createFileRoute("/_public/onboarding/$step")({
  head: () => ({ meta: [{ title: "Onboarding — Veyvio Driver" }] }),
  component: DriverOnboardingStepPage,
});

function DriverOnboardingStepPage() {
  const { step } = Route.useParams();
  const navigate = useNavigate();
  const stepNum = Number(step);
  const page = DRIVER_ONBOARDING_PAGES[stepNum - 1];

  if (!page) {
    navigate({ to: "/onboarding/1" });
    return null;
  }

  const handleContinue = () => {
    if (stepNum >= 5) {
      navigate({ to: "/onboarding/complete" });
    } else {
      navigate({ to: `/onboarding/${stepNum + 1}` });
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <OnboardingChromeHeader step={stepNum} skipTo="/onboarding/complete" />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-8 pt-6">
        <OnboardingProgress step={stepNum} />

        <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-link">
          {page.eyebrow}
        </p>
        <h1 className="mt-2 font-display text-xl font-extrabold leading-tight tracking-tight">
          {page.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{page.message}</p>

        <div className="mt-8">
          <OnboardingFeaturePreview step={stepNum as 1 | 2 | 3 | 4 | 5} />
        </div>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-auto w-full rounded-md bg-accent py-4 text-sm font-bold uppercase tracking-widest text-white"
          data-testid="onboarding-continue"
        >
          {page.cta}
        </button>
      </div>
    </div>
  );
}
