import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { isMockAuth } from "@/platform/auth/auth-config";
import { commandForgotPassword } from "@/platform/auth/command-auth-api";
import {
  YardAuthEmailField,
  YardAuthPrimaryButton,
  yardAuthLinkClass,
  YardMobileAuthLayout,
} from "@/components/auth/YardMobileAuthLayout";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_public/forgot-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === "string" ? search.email : "",
  }),
  head: () => ({ meta: [{ title: "Reset password — Veyvio Yard" }] }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { email: initialEmail } = Route.useSearch();
  const mock = isMockAuth();
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState<string | null>(null);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setDevToken(null);

    if (mock) {
      setError("Password reset is not available in demo mode.");
      return;
    }

    setLoading(true);
    try {
      const result = await commandForgotPassword(email);
      setMessage(result.message || yardCopy.auth.forgotPasswordSent);
      setDevToken(result.devResetToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : yardCopy.auth.resetPasswordFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YardMobileAuthLayout
      title={yardCopy.auth.forgotPasswordTitle}
      subtitle={yardCopy.auth.forgotPasswordSubtitle}
      animate
    >
      <form onSubmit={handleSubmit} className="yard-auth-form-stack">
        <YardAuthEmailField
          id="reset-email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          invalid={Boolean(error)}
        />

        {error ? <p className="yard-auth-error">{error}</p> : null}
        {message ? <p className="text-sm text-[#667085]">{message}</p> : null}

        <YardAuthPrimaryButton type="submit" disabled={loading || !email.trim()} ready={!loading && Boolean(email.trim())}>
          {loading ? yardCopy.auth.sendingReset : yardCopy.auth.sendResetLink}
        </YardAuthPrimaryButton>

        {devToken ? (
          <p className="text-sm text-[#9a3412]">
            <Link
              to="/reset-password"
              search={{ token: devToken }}
              className={yardAuthLinkClass}
            >
              {yardCopy.auth.forgotPasswordDevLink}
            </Link>
          </p>
        ) : null}

        <Link to="/sign-in" className={`${yardAuthLinkClass} text-sm`}>
          {yardCopy.auth.backToSignIn}
        </Link>
      </form>
    </YardMobileAuthLayout>
  );
}
