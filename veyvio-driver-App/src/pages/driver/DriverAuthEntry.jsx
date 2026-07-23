import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import DriverMobileAuthLayout, {
  DriverAuthIdentifierField,
  DriverAuthOrDivider,
  DriverAuthPrimaryButton,
  DriverAuthTextField,
  DriverAuthTrustLine,
  driverAuthLinkClass,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import {
  clearRateLimitStorage,
  formatAuthError,
  isRateLimitError,
  readRateLimitUntil,
  rememberRateLimitUntil,
} from "@/lib/auth-errors";
import BiometricLoginButton from "@/features/auth/biometrics/BiometricLoginButton";

const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function looksLikeEmail(value) {
  return value.includes("@") || /[a-zA-Z]/.test(value);
}

/** Command Driver accounts are invite-only — email + password against command-api. */
export default function DriverAuthEntry({ onLogin, onBiometricLogin }) {
  const [step, setStep] = useState("identifier");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldownUntil, setCooldownUntil] = useState(() => readRateLimitUntil());
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const submitLock = useRef(false);

  const handleBiometricAvailability = useCallback((available) => {
    setBiometricAvailable(Boolean(available));
  }, []);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = window.setInterval(() => {
      const remaining = readRateLimitUntil();
      setCooldownUntil(remaining);
      if (remaining <= Date.now()) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  const trimmed = identifier.trim().toLowerCase();
  const isEmail = looksLikeEmail(trimmed) && trimmed.includes("@") && trimmed.includes(".");
  const cooldownActive = cooldownUntil > Date.now();
  const cooldownSeconds = cooldownActive ? Math.ceil((cooldownUntil - Date.now()) / 1000) : 0;
  const canSignIn = Boolean(isEmail && password && !cooldownActive);

  async function handleIdentifierContinue(e) {
    e.preventDefault();
    if (!isEmail) {
      setError("Enter the email address from your driver invitation.");
      return;
    }
    setStep("email-password");
    setError("");
  }

  async function handleEmailSignIn(e) {
    e.preventDefault();
    if (submitLock.current || cooldownActive) return;

    if (!canSignIn) {
      setError("Enter your password.");
      return;
    }

    submitLock.current = true;
    setLoading(true);
    setError("");

    const result = await onLogin(trimmed, password);

    if (!result.ok) {
      const message = formatAuthError(result.message);
      if (isRateLimitError(result.message ?? message)) {
        const until = Date.now() + RATE_LIMIT_COOLDOWN_MS;
        rememberRateLimitUntil(until);
        setCooldownUntil(until);
      }
      setError(message);
      setLoading(false);
      submitLock.current = false;
      return;
    }

    clearRateLimitStorage();
    setLoading(false);
    submitLock.current = false;
    // Do not navigate here — DriverApp switches trees from session `screen`
    // (onboarding / app / …). Navigating while AuthRoutes is still mounted
    // used to trap drivers on a loader or bounce them back to /auth.
  }

  const biometricBlock =
    onBiometricLogin ? (
      <BiometricLoginButton
        onLogin={onBiometricLogin}
        disabled={loading}
        primary
        onAvailabilityChange={handleBiometricAvailability}
      />
    ) : null;

  if (step === "email-password") {
    return (
      <DriverMobileAuthLayout
        title="Enter your password"
        subtitle={`Signing in as ${trimmed}`}
        animate
        footer={
          <>
            Accounts are created by your operator.{" "}
            <span className="text-muted-foreground">Ask transport if you need access.</span>
          </>
        }
      >
        <form onSubmit={(e) => void handleEmailSignIn(e)} className="driver-auth-form-stack">
          {biometricBlock}
          {biometricAvailable ? <DriverAuthOrDivider /> : null}

          <input
            type="email"
            value={trimmed}
            readOnly
            tabIndex={-1}
            aria-label="Email"
            className="driver-auth-field opacity-80"
          />

          <DriverAuthTextField
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            hideLabel
            required
          />

          <div className="flex justify-end">
            <Link to="/auth/forgot-password" className={`text-sm ${driverAuthLinkClass}`}>
              Forgot password?
            </Link>
          </div>

          {error && !cooldownActive ? <p className="text-sm text-destructive">{error}</p> : null}

          {cooldownActive ? (
            <div className="driver-auth-card p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Sign-in temporarily paused</p>
              <p className="mt-1">
                Too many attempts. Try again in{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatCountdown(cooldownSeconds)}
                </span>
                .
              </p>
            </div>
          ) : null}

          <DriverAuthPrimaryButton
            type="submit"
            disabled={!canSignIn || loading}
            ready={canSignIn && !loading && !cooldownActive}
          >
            {loading
              ? "Signing in…"
              : cooldownActive
                ? `Try again in ${formatCountdown(cooldownSeconds)}`
                : "Sign in"}
          </DriverAuthPrimaryButton>

          <button
            type="button"
            className={`text-sm ${driverAuthLinkClass}`}
            onClick={() => {
              setStep("identifier");
              setPassword("");
              setError("");
            }}
          >
            Use a different email
          </button>
        </form>
      </DriverMobileAuthLayout>
    );
  }

  return (
    <DriverMobileAuthLayout
      title="Sign in to Veyvio Driver"
      subtitle={
        biometricAvailable
          ? "Welcome back — continue with fingerprint, or use the email from your invitation."
          : "Use the email from your operator invitation."
      }
      showPlatformHint
      animate
      footer={<>Trusted by licensed fleet drivers across the UK.</>}
    >
      <form onSubmit={(e) => void handleIdentifierContinue(e)} className="driver-auth-form-stack">
        {biometricBlock}
        {biometricAvailable ? <DriverAuthOrDivider /> : null}

        <DriverAuthIdentifierField
          id="identifier"
          value={identifier}
          onChange={(e) => {
            setIdentifier(e.target.value);
            setError("");
          }}
          isPhoneMode={false}
          invalid={Boolean(error)}
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DriverAuthPrimaryButton type="submit" disabled={!isEmail} ready={isEmail}>
          Continue with email
        </DriverAuthPrimaryButton>

        <DriverAuthTrustLine>Secure login for your fleet account.</DriverAuthTrustLine>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/auth/forgot-password" className={driverAuthLinkClass}>
            Forgot your password?
          </Link>
        </p>
      </form>
    </DriverMobileAuthLayout>
  );
}
