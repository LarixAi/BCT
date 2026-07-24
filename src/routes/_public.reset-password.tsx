import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { isMockAuth } from "@/platform/auth/auth-config";
import { commandResetPassword } from "@/platform/auth/command-auth-api";
import {
  YardAuthPrimaryButton,
  YardAuthTextField,
  yardAuthLinkClass,
  YardMobileAuthLayout,
} from "@/components/auth/YardMobileAuthLayout";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_public/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Choose new password — Veyvio Yard" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token: initialToken } = Route.useSearch();
  const navigate = useNavigate();
  const mock = isMockAuth();
  const [token, setToken] = useState(initialToken);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = password.length >= 12 && password === confirm && token.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    if (mock) {
      setError("Password reset is not available in demo mode.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await commandResetPassword(token.trim(), password);
      navigate({ to: "/sign-in" });
    } catch (err) {
      setError(err instanceof Error ? err.message : yardCopy.auth.resetPasswordFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YardMobileAuthLayout
      title={yardCopy.auth.resetPasswordTitle}
      subtitle={yardCopy.auth.resetPasswordSubtitle}
      animate
    >
      <form onSubmit={handleSubmit} className="yard-auth-form-stack">
        <YardAuthTextField
          id="reset-token"
          label="Reset code"
          value={token}
          onChange={e => setToken(e.target.value)}
          placeholder="Paste the code from your reset email"
          required
        />

        <YardAuthTextField
          id="new-password"
          type="password"
          autoComplete="new-password"
          label="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="At least 12 characters"
          required
        />

        <YardAuthTextField
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          label="Confirm password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          required
        />

        {password && password.length < 12 ? (
          <p className="text-xs text-[#667085]">Use at least 12 characters.</p>
        ) : null}
        {confirm && password !== confirm ? (
          <p className="text-xs text-vor">Passwords do not match.</p>
        ) : null}

        {error ? <p className="yard-auth-error">{error}</p> : null}

        <YardAuthPrimaryButton type="submit" disabled={!canSubmit || loading} ready={canSubmit && !loading}>
          {loading ? yardCopy.auth.updatingPassword : yardCopy.auth.updatePassword}
        </YardAuthPrimaryButton>

        <Link to="/sign-in" className={`${yardAuthLinkClass} text-sm`}>
          {yardCopy.auth.backToSignIn}
        </Link>
      </form>
    </YardMobileAuthLayout>
  );
}
