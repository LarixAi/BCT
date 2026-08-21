"use client";

import { FormEvent, useEffect, useState } from "react";

type Membership = {
  companyId: string;
  tenantName: string;
  role: string;
};

type AuthResult = {
  ok?: boolean;
  state?:
    | "authenticated"
    | "mfa_required"
    | "company_required"
    | "mfa_enrollment_required"
    | "mfa_enrollment_setup"
    | "mfa_enrollment_complete";
  message?: string;
  returnTo?: string;
  memberships?: Membership[];
  secret?: string;
  otpauthUri?: string;
  recoveryCodes?: string[];
};

export default function LoginForm({
  returnTo,
  switchAccountPath,
}: {
  outerDisplayName?: string;
  outerEmail?: string;
  returnTo: string;
  switchAccountPath: string;
}) {
  const [step, setStep] = useState<
    "credentials" | "mfa" | "company" | "enroll" | "recovery"
  >("credentials");
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedMfaCompany, setSelectedMfaCompany] = useState("");
  const [enrollmentSecret, setEnrollmentSecret] = useState("");
  const [enrollmentUri, setEnrollmentUri] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  async function callAuth(path: string, body: Record<string, unknown>) {
    const response = await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, returnTo }),
    });
    const result = (await response.json().catch(() => ({}))) as AuthResult;
    if (!response.ok) {
      throw new Error(
        result.message ??
          (response.status === 503
            ? "Executive identity service is not configured on this server."
            : "The secure sign-in could not be completed."),
      );
    }
    return result;
  }

  async function handleResult(result: AuthResult) {
    if (result.state === "authenticated") {
      window.location.assign(result.returnTo ?? returnTo);
      return;
    }
    if (result.state === "mfa_required") {
      const nextMemberships = result.memberships ?? [];
      setMemberships(nextMemberships);
      setSelectedMfaCompany(
        nextMemberships.length === 1 ? nextMemberships[0].companyId : "",
      );
      setStep("mfa");
      return;
    }
    if (result.state === "company_required") {
      setMemberships(result.memberships ?? []);
      setStep("company");
      return;
    }
    if (result.state === "mfa_enrollment_required") {
      await handleResult(await callAuth("/api/auth/enroll", {}));
      return;
    }
    if (result.state === "mfa_enrollment_setup") {
      if (!result.secret || !result.otpauthUri) {
        throw new Error("Authenticator setup details could not be loaded.");
      }
      setEnrollmentSecret(result.secret);
      setEnrollmentUri(result.otpauthUri);
      setStep("enroll");
      return;
    }
    if (result.state === "mfa_enrollment_complete") {
      if (!result.recoveryCodes?.length) {
        throw new Error("Recovery codes could not be issued.");
      }
      setRecoveryCodes(result.recoveryCodes);
      setStep("recovery");
      return;
    }
    throw new Error("The identity service returned an incomplete response.");
  }

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;

    // Read from the DOM so browser autofill works even when React state
    // did not receive change events.
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");

    setBusy(true);
    setError("");
    try {
      if (!email || password.length < 8) {
        throw new Error("Enter a valid Veyvio email address and password.");
      }
      await handleResult(await callAuth("/api/auth/login", { email, password }));
      form.reset();
    } catch (submitError) {
      const passwordInput = form.elements.namedItem("password");
      if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The secure sign-in could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get("code") ?? "")
      .replace(/[^A-Fa-f0-9]/gu, "")
      .toUpperCase();
    const companyId = String(data.get("companyId") ?? selectedMfaCompany).trim();

    setBusy(true);
    setError("");
    try {
      if (code.length < 6) {
        throw new Error("Enter your authenticator or recovery code.");
      }
      await handleResult(
        await callAuth("/api/auth/verify", {
          code,
          companyId: companyId || undefined,
        }),
      );
    } catch (submitError) {
      const codeInput = form.elements.namedItem("code");
      if (codeInput instanceof HTMLInputElement) codeInput.value = "";
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The verification code could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const code = String(data.get("code") ?? "").replace(/\D/gu, "");

    setBusy(true);
    setError("");
    try {
      if (code.length !== 6) {
        throw new Error("Enter the 6-digit authenticator code.");
      }
      await handleResult(await callAuth("/api/auth/enroll", { code }));
    } catch (submitError) {
      const codeInput = form.elements.namedItem("code");
      if (codeInput instanceof HTMLInputElement) codeInput.value = "";
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The authenticator code could not be confirmed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function selectCompany(companyId: string) {
    setBusy(true);
    setError("");
    try {
      await handleResult(
        await callAuth("/api/auth/select-company", { companyId }),
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The company could not be selected.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page" data-auth-ready={ready ? "1" : "0"}>
      <section className="auth-brand-panel" aria-label="Veyvio Executive">
        <div className="auth-brand-lockup">
          <div className="brand-mark" aria-hidden>V</div>
          <div><strong>Veyvio</strong><span>Executive</span></div>
        </div>
        <div className="auth-brand-copy">
          <span className="section-kicker">Protected company leadership</span>
          <h1>Confirm your company authority.</h1>
          <p>Sign in with your Veyvio Executive account. Company membership and MFA are checked on the server before any leadership data opens.</p>
          <ul className="auth-trust-list">
            <li>Invitation-only Executive accounts</li>
            <li>Company membership checked on the server</li>
            <li>No access tokens stored in browser JavaScript</li>
          </ul>
        </div>
        <div className="auth-brand-footer">Veyvio company security boundary</div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <span className="section-kicker">Veyvio company verification</span>
          <h2>
            {step === "credentials"
              ? "Confirm your Executive account"
              : step === "mfa"
                ? "Enter your verification code"
                : step === "company"
                  ? "Choose your company"
                  : step === "enroll"
                    ? "Protect your Executive account"
                    : "Save your recovery codes"}
          </h2>
          <p>
            {step === "credentials"
              ? "Use the Veyvio account created or invited by your company owner."
              : step === "mfa"
                ? "Use your authenticator app, or enter one unused recovery code."
                : step === "company"
                  ? "Only companies where this account has an active Executive grant will open."
                  : step === "enroll"
                    ? "Executive access requires a second factor. Add this account to an authenticator app before continuing."
                    : "These one-time codes are your safe way back in if your authenticator is unavailable."}
          </p>

          {step === "credentials" ? (
            <form
              className="auth-form"
              method="post"
              action="/login"
              onSubmit={submitCredentials}
              noValidate
            >
              <label className="auth-field">
                <span>Veyvio account email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  minLength={8}
                />
              </label>
              {error ? <p className="auth-error" role="alert">{error}</p> : null}
              <button
                className="auth-submit"
                type="submit"
                disabled={busy || !ready}
              >
                {busy ? "Checking secure access…" : "Continue securely"}
              </button>
            </form>
          ) : null}

          {step === "mfa" ? (
            <form
              className="auth-form"
              method="post"
              action="/login"
              onSubmit={submitMfa}
              noValidate
            >
              {memberships.length > 1 ? (
                <label className="auth-field">
                  <span>Company</span>
                  <select
                    name="companyId"
                    value={selectedMfaCompany}
                    onChange={(event) => setSelectedMfaCompany(event.target.value)}
                    required
                  >
                    <option value="">Select company</option>
                    {memberships.map((membership) => (
                      <option key={membership.companyId} value={membership.companyId}>
                        {membership.tenantName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <input type="hidden" name="companyId" value={selectedMfaCompany} />
              )}
              <label className="auth-field">
                <span>Authenticator or recovery code</span>
                <input
                  type="text"
                  name="code"
                  autoComplete="one-time-code"
                  maxLength={8}
                  required
                />
              </label>
              {error ? <p className="auth-error" role="alert">{error}</p> : null}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
            </form>
          ) : null}

          {step === "company" ? (
            <div className="company-choice-list">
              {memberships.map((membership) => (
                <button
                  key={membership.companyId}
                  className="company-choice"
                  type="button"
                  disabled={busy}
                  onClick={() => selectCompany(membership.companyId)}
                >
                  <span>
                    <strong>{membership.tenantName}</strong>
                    <small>{membership.role.replaceAll("_", " ")}</small>
                  </span>
                  <span aria-hidden>→</span>
                </button>
              ))}
              {error ? <p className="auth-error" role="alert">{error}</p> : null}
            </div>
          ) : null}

          {step === "enroll" ? (
            <form
              className="auth-form"
              method="post"
              action="/login"
              onSubmit={submitEnrollment}
              noValidate
            >
              <div className="auth-setup-panel">
                <strong>1. Add Veyvio Executive</strong>
                <p>
                  Open your authenticator app and add an account using this
                  setup key.
                </p>
                <code className="auth-setup-secret">{enrollmentSecret}</code>
                <a className="auth-setup-secret-link auth-secondary-link" href={enrollmentUri}>
                  Open in a compatible authenticator
                </a>
              </div>
              <label className="auth-field">
                <span>2. Enter the 6-digit code</span>
                <input
                  type="text"
                  name="code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </label>
              {error ? <p className="auth-error" role="alert">{error}</p> : null}
              <button className="auth-submit" type="submit" disabled={busy}>
                {busy ? "Confirming protection…" : "Enable MFA"}
              </button>
            </form>
          ) : null}

          {step === "recovery" ? (
            <div className="auth-recovery-panel">
              <p className="auth-warning">
                Store these somewhere private. They are shown once, and each
                code works only one time.
              </p>
              <ul className="auth-recovery-codes" aria-label="Recovery codes">
                {recoveryCodes.map((recoveryCode) => (
                  <li key={recoveryCode}>
                    <code>{recoveryCode}</code>
                  </li>
                ))}
              </ul>
              <button
                className="auth-submit"
                type="button"
                onClick={() => window.location.reload()}
              >
                I have saved these codes
              </button>
            </div>
          ) : null}

          {step !== "enroll" && step !== "recovery" ? (
            <>
              <p className="auth-account-rule">
                <strong>No public Executive signup.</strong> The first company
                owner establishes the company. Every later Executive account
                must be invited by an authorised Executive administrator.
              </p>
              <a className="auth-secondary-link" href={switchAccountPath}>
                Use a different workspace account
              </a>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
