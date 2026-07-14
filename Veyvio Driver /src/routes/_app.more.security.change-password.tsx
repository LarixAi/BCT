import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { AuthField } from "@/components/auth/AuthField";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { driverCopy } from "@/copy/driver-messages";
import {
  validateNewPassword,
  validatePasswordConfirmation,
} from "@/domain/auth/password-policy";
import { changeAccountPassword } from "@/platform/auth/password-reset";

export const Route = createFileRoute("/_app/more/security/change-password")({
  head: () => ({ meta: [{ title: "Change password — Veyvio Driver" }] }),
  component: ChangePasswordPage,
});

function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const newPasswordValidation = validateNewPassword(newPassword, { currentPassword });
    if (!newPasswordValidation.ok) {
      setError(newPasswordValidation.reason);
      return;
    }

    const confirmationValidation = validatePasswordConfirmation(newPassword, confirmPassword);
    if (!confirmationValidation.ok) {
      setError(confirmationValidation.reason);
      return;
    }

    setLoading(true);
    const result = await changeAccountPassword({ currentPassword, newPassword });
    setLoading(false);

    if (!result.ok) {
      setError(result.reason);
      toast.error(result.reason);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    toast.success(driverCopy.security.changeSuccess, {
      description: driverCopy.security.changeSuccessHint,
    });
  }

  return (
    <MoreSubpageLayout title="Change password" backTo="/more/security">
      <p className="text-sm text-muted">{driverCopy.security.changeIntro}</p>

      <AuthCard>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <AuthField
            label="Current password"
            type="password"
            name="current-password"
            autoComplete="current-password"
            icon={Lock}
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder={driverCopy.auth.passwordPlaceholder}
          />
          <AuthField
            label="New password"
            type="password"
            name="new-password"
            autoComplete="new-password"
            icon={Lock}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder={driverCopy.security.newPasswordPlaceholder}
          />
          <AuthField
            label="Confirm new password"
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            icon={Lock}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={driverCopy.security.confirmPasswordPlaceholder}
            error={error ?? undefined}
          />
          <p className="text-xs text-muted">{driverCopy.security.passwordRules}</p>
          <AuthPrimaryButton type="submit" disabled={loading || !currentPassword || !newPassword || !confirmPassword}>
            {loading ? driverCopy.security.changeSaving : driverCopy.security.changeAction}
          </AuthPrimaryButton>
        </form>
      </AuthCard>
    </MoreSubpageLayout>
  );
}
