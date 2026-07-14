import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthPage, AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { WelcomeProgress } from "@/components/driver/onboarding/OnboardingScreens";
import { WELCOME_PAGES } from "@/domain/onboarding/onboarding-content";
import { useSessionStore } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_public/welcome/$step")({
  head: () => ({ meta: [{ title: "Welcome — Veyvio Driver" }] }),
  component: WelcomeStepPage,
});

function WelcomeStepPage() {
  const { step } = Route.useParams();
  const navigate = useNavigate();
  const markWelcomeSeen = useSessionStore((s) => s.markWelcomeSeen);

  const stepNum = Number(step);
  const page = WELCOME_PAGES[stepNum - 1];

  if (!page) {
    return (
      <AuthPage>
        <p className="text-sm text-muted">Welcome step not found.</p>
        <Link to="/welcome/1" className="mt-4 text-sm font-bold text-link">
          Start welcome
        </Link>
      </AuthPage>
    );
  }

  const handleContinue = () => {
    if (stepNum === 3) markWelcomeSeen();
    navigate({ to: page.next });
  };

  return (
    <AuthPage className="min-h-[60vh]">
      <WelcomeProgress step={stepNum} />

      <div className="mt-10 flex flex-1 flex-col">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
          Before sign in · Step {stepNum} of 3
        </p>
        <h1 className="mt-3 font-display text-[1.65rem] font-extrabold leading-tight tracking-tight">
          {page.title}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">{page.message}</p>
      </div>

      <AuthPrimaryButton onClick={handleContinue} className="mt-8">
        {page.cta}
      </AuthPrimaryButton>

      {stepNum > 1 && (
        <button
          type="button"
          onClick={() => navigate({ to: `/welcome/${stepNum - 1}` })}
          className="mt-4 text-center text-xs font-bold uppercase tracking-widest text-muted"
        >
          Back
        </button>
      )}
    </AuthPage>
  );
}
