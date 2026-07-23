import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fingerprint } from "lucide-react";
import { useSessionStore } from "@/platform/auth/session-store";
import { YardAuthPrimaryButton, YardMobileAuthLayout } from "@/components/auth/YardMobileAuthLayout";

export const Route = createFileRoute("/_public/biometric-unlock")({
  head: () => ({ meta: [{ title: "Unlock — Veyvio Yard" }] }),
  component: BiometricUnlockPage,
});

function BiometricUnlockPage() {
  const navigate = useNavigate();
  const unlockBiometric = useSessionStore(s => s.unlockBiometric);

  function handleUnlock() {
    unlockBiometric();
    navigate({ to: "/" });
  }

  return (
    <YardMobileAuthLayout
      title="Unlock Veyvio Yard"
      subtitle="Use Face ID, Touch ID, or your device biometrics."
      centerContent
      animate
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <Fingerprint className="size-16 text-[#12A89D]" aria-hidden />
        <YardAuthPrimaryButton ready onClick={handleUnlock}>
          Unlock
        </YardAuthPrimaryButton>
        <button type="button" className="yard-auth-link text-sm">
          Use app PIN instead
        </button>
      </div>
    </YardMobileAuthLayout>
  );
}
