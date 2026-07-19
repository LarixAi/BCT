import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import DriverMobileAuthLayout, {
  DriverAuthPrimaryButton,
  DriverAuthTextField,
  driverAuthLinkClass,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import { requestDriverPasswordReset } from "@/services/auth.service";

export default function DriverForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await requestDriverPasswordReset(email);
    setLoading(false);

    if (!result.ok) {
      setError(result.message ?? "Could not send reset email.");
      return;
    }

    navigate(`/auth/check-email?flow=reset&email=${encodeURIComponent(email.trim())}`, { replace: true });
  }

  return (
    <DriverMobileAuthLayout
      title="Find my account"
      subtitle="Enter the email on your driver account and we'll send a secure reset link."
      animate
    >
      <button
        type="button"
        onClick={() => navigate(DRIVER_AUTH_PATH)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#4A7583] transition-colors hover:text-[#0B0E14]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back
      </button>

      <form onSubmit={(e) => void handleSubmit(e)} className="driver-auth-form-stack">
        <DriverAuthTextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DriverAuthPrimaryButton type="submit" disabled={loading} ready={!loading}>
          {loading ? "Sending…" : "Send reset link"}
        </DriverAuthPrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Remember your password?{" "}
        <Link to={DRIVER_AUTH_PATH} className={driverAuthLinkClass}>
          Sign in
        </Link>
      </p>
    </DriverMobileAuthLayout>
  );
}
