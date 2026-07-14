import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSessionStore } from "@/platform/auth/session-store";
import { Button } from "@/components/ui/button";
import { Fingerprint } from "lucide-react";

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
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center space-y-6 animate-in-up">
      <Fingerprint className="size-16 text-primary" />
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Unlock Veyvio Yard</h1>
        <p className="mt-1 text-sm text-muted">Use Face ID, Touch ID, or your device biometrics.</p>
      </div>
      <Button onClick={handleUnlock} className="bg-accent hover:bg-accent/90 text-white uppercase tracking-widest font-bold px-8">
        Unlock
      </Button>
      <button type="button" className="text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        Use app PIN instead
      </button>
    </div>
  );
}
