import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import DriverMobileAuthLayout, {
  DriverAuthPrimaryButton,
  driverAuthLinkClass,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import { DriverAuthSteps, DriverAuthTip } from "@/components/driver/auth/DriverAuthNotice";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import { requestDriverPasswordReset, resendSignupVerification } from "@/services/auth.service";

const FLOW_COPY = {
  signup: {
    title: "Verify your email",
    subtitle: "Your account is set up but not active yet. Confirm your email before you can sign in.",
    sentTo: (email) => (
      <>
        We sent a confirmation email to <strong className="font-medium text-foreground">{email}</strong>. Open it and tap
        the link to activate your account.
      </>
    ),
    steps: (email) => [
      `Check the inbox for ${email} (and spam or junk).`,
      'Open the email titled "Confirm your signup" and tap the confirmation link.',
      "Return to this app and sign in with your email and password.",
    ],
    tip: "Links expire after 24 hours. If you do not see the email within a few minutes, tap Resend below.",
    resendLabel: "Resend verification email",
    resend: resendSignupVerification,
    primaryCta: "Back to sign in",
    primaryTo: DRIVER_AUTH_PATH,
    retryTo: "/auth/sign-up",
    retryLabel: "Sign up again",
  },
  reset: {
    title: "Check your email",
    subtitle: "If an account exists for that address, we have sent password reset instructions.",
    sentTo: (email) => (
      <>
        Look for an email sent to <strong className="font-medium text-foreground">{email}</strong> with a link to choose
        a new password.
      </>
    ),
    steps: () => [
      "Open the reset email on this phone.",
      "Tap the link — it should open this app on the reset password screen.",
      "Enter your new password twice, then sign in.",
    ],
    tip: "Did not get it? Wait a few minutes, check spam, or tap Resend reset link.",
    resendLabel: "Resend reset link",
    resend: requestDriverPasswordReset,
    primaryCta: "Back to sign in",
    primaryTo: DRIVER_AUTH_PATH,
    retryTo: "/auth/forgot-password",
    retryLabel: "Try another address",
  },
};

export default function DriverCheckEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const flow = searchParams.get("flow") === "reset" ? "reset" : "signup";
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";
  const emailFromState = location.state?.email?.trim() ?? "";
  const email = emailFromQuery || emailFromState;

  const copy = FLOW_COPY[flow];
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");

  const steps = useMemo(() => copy.steps(email || "your email"), [copy, email]);

  if (!email) {
    return (
      <DriverMobileAuthLayout
        title="Email address required"
        subtitle="Open this page from sign up or forgot password so we know which inbox to check."
        footer={
          <Link to={DRIVER_AUTH_PATH} className={driverAuthLinkClass}>
            Back to sign in
          </Link>
        }
      />
    );
  }

  async function handleResend() {
    setResendBusy(true);
    setResendMessage("");
    setResendError("");
    const result = await copy.resend(email);
    setResendBusy(false);
    if (!result.ok) {
      setResendError(result.message ?? "Could not resend email.");
      return;
    }
    setResendMessage(result.message ?? "Email sent. Check your inbox.");
  }

  return (
    <DriverMobileAuthLayout
      title={copy.title}
      subtitle={copy.subtitle}
      animate
      footer={
        <>
          Wrong email?{" "}
          <Link to={copy.retryTo} className={driverAuthLinkClass}>
            {copy.retryLabel}
          </Link>
        </>
      }
    >
      <div className="driver-auth-card mb-6 p-4 text-sm leading-relaxed text-muted-foreground">
        {copy.sentTo(email)}
      </div>

      <DriverAuthSteps steps={steps} />
      <DriverAuthTip>{copy.tip}</DriverAuthTip>

      {resendError ? <p className="mt-4 text-sm text-destructive">{resendError}</p> : null}
      {resendMessage ? <p className="mt-4 text-sm text-emerald-600">{resendMessage}</p> : null}

      <div className="mt-6 space-y-3">
        <button
          type="button"
          className="driver-auth-outline disabled:opacity-50"
          disabled={resendBusy}
          onClick={() => void handleResend()}
        >
          {resendBusy ? "Sending…" : copy.resendLabel}
        </button>
        <DriverAuthPrimaryButton type="button" onClick={() => navigate(copy.primaryTo, { replace: true })}>
          {copy.primaryCta}
        </DriverAuthPrimaryButton>
      </div>
    </DriverMobileAuthLayout>
  );
}
