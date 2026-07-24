import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { isMockAuth } from "@/platform/auth/auth-config";
import { mapCommandRoleToYardRole } from "@/platform/auth/command-auth-api";
import {
  YardAuthEmailField,
  YardAuthPrimaryButton,
  YardAuthTextField,
  YardAuthTrustLine,
  yardAuthLinkClass,
  YardMobileAuthLayout,
} from "@/components/auth/YardMobileAuthLayout";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_public/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — Veyvio Yard" }] }),
  component: SignInPage,
});

function looksLikeEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") && trimmed.includes(".") && /[a-zA-Z]/.test(trimmed);
}

function mapSignInError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("incorrect") || msg.includes("invalid_credentials")) {
      return yardCopy.auth.invalidCredentialsHint;
    }
    return err.message;
  }
  return yardCopy.auth.signInFailed;
}

function SignInPage() {
  const navigate = useNavigate();
  const signIn = useSessionStore(s => s.signIn);
  const selectCompany = useTenancyStore(s => s.selectCompany);
  const mock = isMockAuth();
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState(mock ? "j.miller@northwest-transport.co.uk" : "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedEmail = email.trim().toLowerCase();
  const emailValid = looksLikeEmail(trimmedEmail);
  const canSignIn = Boolean(emailValid && password);

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      setError("Enter the work email from your yard invitation.");
      return;
    }
    setError(null);
    setStep("password");
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!canSignIn) {
      setError("Enter your password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await signIn({ email: trimmedEmail, password, rememberDevice: remember });
      if (result.next === "mfa") {
        navigate({ to: "/mfa" });
      } else if (result.next === "company-select") {
        navigate({ to: "/company-select" });
      } else {
        if (result.activeTenant) {
          selectCompany(
            { id: result.activeTenant.id, name: result.activeTenant.name, status: "active" },
            mapCommandRoleToYardRole(result.activeTenant.role),
          );
        }
        navigate({ to: "/depot-select" });
      }
    } catch (err) {
      setError(mapSignInError(err));
    } finally {
      setLoading(false);
    }
  }

  if (step === "password") {
    return (
      <YardMobileAuthLayout
        title="Enter your password"
        subtitle={`Signing in as ${trimmedEmail}`}
        animate
        footer={
          <>
            Accounts are created by your operator.{" "}
            <span className="text-[#9ca3af]">Ask transport if you need access.</span>
          </>
        }
      >
        <form onSubmit={handleSignIn} className="yard-auth-form-stack">
          <YardAuthTextField
            id="email-readonly"
            value={trimmedEmail}
            onChange={() => {}}
            readOnly
            hideLabel
            className="opacity-80"
          />

          <YardAuthTextField
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setError(null);
            }}
            hideLabel
            required
          />

          <label className="yard-auth-checkbox">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            Remember this device
          </label>

          {error ? <p className="yard-auth-error">{error}</p> : null}

          <YardAuthPrimaryButton
            type="submit"
            disabled={!canSignIn || loading}
            ready={canSignIn && !loading}
          >
            {loading ? yardCopy.auth.signingIn : yardCopy.buttons.signIn}
          </YardAuthPrimaryButton>

          <Link
            to="/forgot-password"
            search={{ email: trimmedEmail }}
            className={`${yardAuthLinkClass} text-sm`}
          >
            {yardCopy.auth.forgotPasswordLink}
          </Link>

          <button
            type="button"
            className="yard-auth-link text-sm"
            onClick={() => {
              setStep("email");
              setPassword("");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      </YardMobileAuthLayout>
    );
  }

  return (
    <YardMobileAuthLayout
      title="Sign in to Veyvio Yard"
      subtitle="Use the work email from your operator invitation."
      showPlatformHint
      animate
      footer={yardCopy.auth.signInSupporting}
    >
      <form onSubmit={handleEmailContinue} className="yard-auth-form-stack">
        <YardAuthEmailField
          id="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            setError(null);
          }}
          invalid={Boolean(error)}
        />

        {error ? <p className="yard-auth-error">{error}</p> : null}

        <YardAuthPrimaryButton type="submit" disabled={!emailValid} ready={emailValid}>
          Continue with email
        </YardAuthPrimaryButton>

        <YardAuthTrustLine>Secure login for authorised depot teams.</YardAuthTrustLine>
      </form>
    </YardMobileAuthLayout>
  );
}
