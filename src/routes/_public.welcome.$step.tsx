import { createFileRoute } from "@tanstack/react-router";
import { useSessionStore } from "@/platform/auth/session-store";
import { WelcomeActions, WelcomeOnboarding } from "@/components/brand/WelcomeOnboarding";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_public/welcome/$step")({
  component: WelcomePage,
});

function WelcomePage() {
  const { step } = Route.useParams();
  const markWelcomeSeen = useSessionStore(s => s.markWelcomeSeen);
  const page = yardCopy.welcome.pages.find(p => String(p.step) === step) ?? yardCopy.welcome.pages[0];

  return (
    <WelcomeOnboarding step={page.step} title={page.title} message={page.message}>
      <WelcomeActions
        step={page.step}
        nextHref={"next" in page ? page.next : undefined}
        prevHref={"prev" in page ? page.prev : undefined}
        onComplete={markWelcomeSeen}
      />
    </WelcomeOnboarding>
  );
}
