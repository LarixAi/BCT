import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthCard, AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { driverCopy } from "@/copy/driver-messages";
import { requestPasswordResetEmail } from "@/platform/auth/password-reset";
import { useSessionStore } from "@/platform/auth/session-store";
import { useMoreStore } from "@/store/more";

export const Route = createFileRoute("/_app/more/security/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Veyvio Driver" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const sessionEmail = useSessionStore((s) => s.user?.email);
  const personalEmail = useMoreStore((s) => s.driverMore.personal.email);
  const email = sessionEmail ?? personalEmail;

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSendLink() {
    setLoading(true);
    const result = await requestPasswordResetEmail(email);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.reason);
      return;
    }

    setSent(true);
    toast.success(driverCopy.security.resetSentTitle);
  }

  return (
    <MoreSubpageLayout title="Reset password" backTo="/more/security">
      <p className="text-sm text-muted">{driverCopy.security.resetIntro}</p>

      {sent ? (
        <HomeCard tone="green">
          <p className="font-semibold">{driverCopy.security.resetSentTitle}</p>
          <p className="mt-2 text-sm text-muted">{driverCopy.security.resetSentHint(email)}</p>
          <p className="mt-3 text-xs text-muted">{driverCopy.security.resetSentFollowUp}</p>
        </HomeCard>
      ) : (
        <AuthCard>
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 shrink-0 text-link" aria-hidden />
            <div>
              <p className="text-sm font-semibold">{driverCopy.security.resetEmailLabel}</p>
              <p className="mt-1 break-all text-sm text-muted">{email}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">{driverCopy.security.resetEmailHint}</p>
          <AuthPrimaryButton
            type="button"
            className="mt-5"
            disabled={loading}
            onClick={() => void handleSendLink()}
          >
            {loading ? driverCopy.security.resetSending : driverCopy.security.resetSendAction}
          </AuthPrimaryButton>
        </AuthCard>
      )}

      <p className="text-sm text-muted">
        {driverCopy.security.resetNoAccess}{" "}
        <Link to="/more/support" className="font-bold text-link">
          {driverCopy.security.contactOperations}
        </Link>
      </p>
    </MoreSubpageLayout>
  );
}
