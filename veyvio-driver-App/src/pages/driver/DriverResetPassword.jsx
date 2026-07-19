import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DriverMobileAuthLayout, {
  DriverAuthPrimaryButton,
  DriverAuthTextField,
  driverAuthLinkClass,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import { driverRecoverAuthSessionFromCurrentLocation } from "@/lib/driverAuthDeepLink";
import { getSupabaseClient } from "@/lib/supabase/client";
import { updateDriverPassword } from "@/services/auth.service";

export default function DriverResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      await driverRecoverAuthSessionFromCurrentLocation();
      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!cancelled) {
        setHasSession(Boolean(session));
        setChecking(false);
      }
    }

    void checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await updateDriverPassword(password);
    setLoading(false);

    if (!result.ok) {
      setError(result.message ?? "Could not update password.");
      return;
    }

    navigate(DRIVER_AUTH_PATH, { replace: true });
  }

  if (checking) {
    return (
      <DriverMobileAuthLayout title="Reset password" subtitle="Please wait…">
        <p className="sr-only">Loading</p>
      </DriverMobileAuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <DriverMobileAuthLayout
        title="Reset link expired"
        subtitle="Open the password reset link from your email again, or request a new one."
        footer={
          <>
            <Link to="/auth/forgot-password" className={driverAuthLinkClass}>
              Request new link
            </Link>
            {" · "}
            <Link to={DRIVER_AUTH_PATH} className={driverAuthLinkClass}>
              Sign in
            </Link>
          </>
        }
      />
    );
  }

  return (
    <DriverMobileAuthLayout
      title="Choose a new password"
      subtitle="Use at least 6 characters. You'll sign in with this password next."
      animate
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="driver-auth-form-stack">
        <DriverAuthTextField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <DriverAuthTextField
          id="confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DriverAuthPrimaryButton type="submit" disabled={loading} ready={!loading}>
          {loading ? "Updating…" : "Update password"}
        </DriverAuthPrimaryButton>
      </form>
    </DriverMobileAuthLayout>
  );
}
