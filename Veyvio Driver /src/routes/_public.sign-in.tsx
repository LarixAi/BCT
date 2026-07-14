import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { AuthCard, AuthPage, AuthPrimaryButton } from "@/components/auth/AuthLayout";
import { AuthCheckbox, AuthField } from "@/components/auth/AuthField";
import { AuthStepHeader } from "@/components/auth/AuthStepHeader";
import { ConnectionStatusBadge } from "@/components/auth/ConnectionStatusBadge";
import { AUTH_FLOW_STEPS, AUTH_FLOW_TOTAL_STEPS } from "@/components/auth/auth-flow";
import { driverCopy } from "@/copy/driver-messages";
import { useSessionStore } from "@/platform/auth/session-store";
import { isDevAuthBypassEnabled } from "@/platform/dev/dev-guards";

const DEV_BYPASS = isDevAuthBypassEnabled();
const DEV_EMAIL = "a.morgan@northwest-transport.co.uk";

export const Route = createFileRoute("/_public/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — Veyvio Driver" }] }),
  component: SignInPage,
});

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function SignInPage() {
  const navigate = useNavigate();
  const signIn = useSessionStore((s) => s.signIn);
  const [email, setEmail] = useState(DEV_BYPASS ? DEV_EMAIL : "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotHint, setShowForgotHint] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError(driverCopy.auth.invalidEmail);
      return;
    }

    setLoading(true);
    try {
      await signIn({ email: email.trim(), password, rememberDevice: remember });
      navigate({ to: "/mfa" });
    } catch {
      setError(driverCopy.auth.signInFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPage>
      <AuthStepHeader
        step={AUTH_FLOW_STEPS.signIn}
        totalSteps={AUTH_FLOW_TOTAL_STEPS}
        title={driverCopy.auth.signInTitle}
        subtitle={driverCopy.auth.signInSupporting}
      />

      <ConnectionStatusBadge />

      <AuthCard>
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <AuthField
            label="Work email"
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={driverCopy.auth.emailPlaceholder}
            error={error === driverCopy.auth.invalidEmail ? error : undefined}
          />

          <div className="space-y-2">
            <AuthField
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={driverCopy.auth.passwordPlaceholder}
              error={error && error !== driverCopy.auth.invalidEmail ? error : undefined}
            />
            <button
              type="button"
              onClick={() => setShowForgotHint((value) => !value)}
              className="text-xs font-bold text-link"
            >
              {driverCopy.auth.forgotPassword}
            </button>
            {showForgotHint && (
              <p className="rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs leading-relaxed text-muted">
                {driverCopy.auth.forgotPasswordHint}
              </p>
            )}
          </div>

          <AuthCheckbox
            id="remember-device"
            label={driverCopy.auth.rememberDevice}
            description={driverCopy.auth.rememberDeviceHint}
            checked={remember}
            onChange={setRemember}
          />

          <AuthPrimaryButton type="submit" disabled={loading || !email.trim() || !password}>
            {loading ? driverCopy.auth.signingIn : driverCopy.buttons.signIn}
          </AuthPrimaryButton>
        </form>
      </AuthCard>

      <p className="mt-6 text-center text-sm leading-relaxed text-muted">
        {driverCopy.auth.needHelp} {driverCopy.auth.forgotPasswordHint}
      </p>
    </AuthPage>
  );
}
