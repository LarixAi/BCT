import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BrandPublicHeader } from "@/components/brand/SplashBrandMark";
import { BrandWordmarkGraphic } from "@/components/brand/BrandWordmarkGraphic";
import { BrandTagline } from "@/components/brand/BrandTagline";
import { resolveStartupRoute } from "@/features/startup/resolve-startup-route";
import { getSessionSnapshot, useSessionStore } from "@/platform/auth/session-store";
import { getTenancySnapshot } from "@/platform/tenancy/context-store";

export const Route = createFileRoute("/_public/biometric-unlock")({
  head: () => ({ meta: [{ title: "Unlock — Veyvio Driver" }] }),
  component: BiometricUnlockPage,
});

function BiometricUnlockPage() {
  const navigate = useNavigate();
  const unlockBiometric = useSessionStore((s) => s.unlockBiometric);

  const handleUnlock = () => {
    unlockBiometric();
    const session = getSessionSnapshot();
    const target = resolveStartupRoute({
      session,
      tenancy: getTenancySnapshot(),
      offlineCacheAvailable: session.bootstrapComplete,
    });
    navigate({ to: target });
  };

  const handleUsePin = () => {
    navigate({ to: "/sign-in" });
  };

  return (
    <div className="flex min-h-dvh flex-col bg-accent pt-safe text-white">
      <BrandPublicHeader />

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 pb-12 text-center">
        <div className="mb-2 flex flex-col items-center">
          <div className="mb-3.5 h-0.5 w-10 rounded-full bg-link" aria-hidden />
          <BrandWordmarkGraphic size="splash" />
        </div>
        <BrandTagline variant="splash" className="mb-10 max-w-sm" />
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Unlock Veyvio Driver</h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
          Use Face ID or fingerprint to continue on this trusted device.
        </p>

        <button
          type="button"
          onClick={handleUnlock}
          className="mt-10 h-12 w-full max-w-md rounded-xl bg-white text-sm font-bold uppercase tracking-widest text-accent"
          data-testid="biometric-unlock-button"
        >
          Unlock
        </button>
        <button
          type="button"
          onClick={handleUsePin}
          className="mt-4 text-sm font-bold text-driver-sky"
        >
          Use password instead
        </button>
      </div>
    </div>
  );
}
