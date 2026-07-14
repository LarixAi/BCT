import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AUTH_FLOW_STEPS, AUTH_FLOW_TOTAL_STEPS } from "@/components/auth/auth-flow";
import { AuthCard, AuthPage, AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { AuthCheckbox, AuthField } from "@/components/auth/AuthField";
import { AuthStepHeader } from "@/components/auth/AuthStepHeader";
import { driverCopy } from "@/copy/driver-messages";
import { useSessionStore } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_public/mfa")({
  head: () => ({ meta: [{ title: "Verify identity — Veyvio Driver" }] }),
  component: MfaPage,
});

function MfaPage() {
  const navigate = useNavigate();
  const completeMfa = useSessionStore((s) => s.completeMfa);
  const enableBiometric = useSessionStore((s) => s.enableBiometric);
  const [code, setCode] = useState("");
  const [trusted, setTrusted] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;

    setSubmitting(true);
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    completeMfa();
    if (trusted) enableBiometric();
    navigate({ to: "/company-select" });
  }

  return (
    <AuthPage>
      <AuthStepHeader
        step={AUTH_FLOW_STEPS.mfa}
        totalSteps={AUTH_FLOW_TOTAL_STEPS}
        title={driverCopy.auth.mfaTitle}
        subtitle={driverCopy.auth.mfaSupporting}
      />

      <AuthCard>
        <form onSubmit={handleVerify} className="space-y-5">
          <AuthField
            label="Authenticator code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputClassName="font-mono text-2xl tracking-[0.4em] text-center"
            aria-label="Six digit authenticator code"
          />

          <AuthCheckbox
            id="trusted-device"
            label={driverCopy.auth.mfaTrustedDevice}
            description={driverCopy.auth.mfaTrustedHint}
            checked={trusted}
            onChange={setTrusted}
          />

          <AuthPrimaryButton type="submit" disabled={code.length < 6 || submitting}>
            {submitting ? driverCopy.auth.verifying : driverCopy.auth.verify}
          </AuthPrimaryButton>
        </form>
      </AuthCard>
    </AuthPage>
  );
}
