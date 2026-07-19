import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DriverMobileAuthLayout, {
  DriverAuthPrimaryButton,
  DriverAuthTextField,
  driverAuthLinkClass,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import DriverAuthSocialButtons from "@/components/driver/auth/DriverAuthSocialButtons";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { signUpDriver } from "@/services/auth.service";

export default function DriverSignUp() {
  const navigate = useNavigate();
  const { refresh } = useDriverSupabaseAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signUpDriver({ email, password, fullName });
    setLoading(false);

    if (!result.ok) {
      setError(result.message ?? "Sign up failed.");
      return;
    }

    if (result.needsEmailConfirmation) {
      navigate(`/auth/check-email?flow=signup&email=${encodeURIComponent(result.email)}`, { replace: true });
      return;
    }

    await refresh();
    navigate("/", { replace: true });
  }

  return (
    <DriverMobileAuthLayout
      title="Create your driver account"
      subtitle="Use the email address your fleet operator invited you with."
      animate
      altMethods={<DriverAuthSocialButtons mode="sign-up" disabled={loading} onError={setError} animate />}
      footer={
        <>
          Already have an account?{" "}
          <Link to={DRIVER_AUTH_PATH} className={driverAuthLinkClass}>
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="driver-auth-form-stack">
        <DriverAuthTextField
          id="fullName"
          autoComplete="name"
          placeholder="Full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          hideLabel
          required
        />
        <DriverAuthTextField
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hideLabel
          required
        />
        <DriverAuthTextField
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Password (at least 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hideLabel
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DriverAuthPrimaryButton type="submit" disabled={loading} ready={!loading}>
          {loading ? "Creating account…" : "Create account"}
        </DriverAuthPrimaryButton>
      </form>
    </DriverMobileAuthLayout>
  );
}
