import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { driverCopy } from "@/copy/driver-messages";
import { useSessionStore } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_app/more/security/biometric-unlock")({
  head: () => ({ meta: [{ title: "Biometric unlock — Veyvio Driver" }] }),
  component: BiometricUnlockSettingsPage,
});

function BiometricUnlockSettingsPage() {
  const biometricEnabled = useSessionStore((s) => s.biometricEnabled);
  const trustedDevice = useSessionStore((s) => s.trustedDevice);
  const enableBiometric = useSessionStore((s) => s.enableBiometric);
  const disableBiometric = useSessionStore((s) => s.disableBiometric);

  function handleToggle() {
    if (biometricEnabled) {
      disableBiometric();
      toast.success(driverCopy.security.biometricDisabledToast);
      return;
    }

    enableBiometric();
    toast.success(driverCopy.security.biometricEnabledToast);
  }

  return (
    <MoreSubpageLayout title="Biometric unlock" backTo="/more/security">
      <p className="text-sm text-muted">{driverCopy.security.biometricIntro}</p>

      <HomeCard tone={biometricEnabled ? "green" : "default"}>
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 size-5 shrink-0 text-link" aria-hidden />
          <div>
            <p className="font-semibold">
              {biometricEnabled
                ? driverCopy.security.biometricEnabledTitle
                : driverCopy.security.biometricDisabledTitle}
            </p>
            <p className="mt-2 text-sm text-muted">
              {biometricEnabled
                ? driverCopy.security.biometricEnabledHint
                : driverCopy.security.biometricDisabledHint}
            </p>
          </div>
        </div>
      </HomeCard>

      <AuthCard>
        <p className="text-sm text-muted">
          {trustedDevice
            ? "This phone is marked as a trusted device for your account."
            : driverCopy.security.biometricRequiresTrusted}
        </p>
        <AuthPrimaryButton type="button" className="mt-5" onClick={handleToggle}>
          {biometricEnabled
            ? driverCopy.security.biometricDisableAction
            : driverCopy.security.biometricEnableAction}
        </AuthPrimaryButton>
      </AuthCard>
    </MoreSubpageLayout>
  );
}
