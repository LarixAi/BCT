import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DriverMobileAuthLayout, { DriverAuthPrimaryButton } from "@/components/driver/auth/DriverMobileAuthLayout";
import { DriverAuthNotice } from "@/components/driver/auth/DriverAuthNotice";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import { driverRecoverAuthSessionFromCurrentLocation } from "@/lib/driverAuthDeepLink";
import { getSupabaseClient } from "@/lib/supabase/client";
import { linkDriverAccountIfNeeded } from "@/services/link-driver.service";
import { getDriverSessionContext } from "@/services/session.service";

export default function DriverAuthVerify({ onVerified }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      await driverRecoverAuthSessionFromCurrentLocation();

      const supabase = getSupabaseClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      if (!session) {
        setStatus("missing");
        setMessage("The verification link may have expired or already been used.");
        return;
      }

      await linkDriverAccountIfNeeded();
      await onVerified?.();
      const ctx = await getDriverSessionContext();

      if (ctx?.routeTarget === "login") {
        setStatus("missing");
        setMessage("The verification link may have expired or already been used.");
        return;
      }

      if (!ctx?.driver) {
        setStatus("error");
        setMessage(
          "Your email is verified, but no driver profile is linked yet. Ask your transport manager to invite you with this same email address.",
        );
        return;
      }

      setStatus("ok");
      setMessage("Your account is ready. Opening the app…");
      window.setTimeout(() => {
        if (!cancelled) navigate("/", { replace: true });
      }, 1200);
    }

    const timer = window.setTimeout(() => {
      void verify();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [navigate, onVerified]);

  if (status === "verifying") {
    return <DriverPageLoader label="Completing sign-in…" />;
  }

  if (status === "ok") {
    return (
      <DriverMobileAuthLayout title="Email verified" subtitle={message}>
        <DriverAuthNotice variant="success" title="You are all set">
          {message}
        </DriverAuthNotice>
      </DriverMobileAuthLayout>
    );
  }

  return (
    <DriverMobileAuthLayout
      title={status === "missing" ? "Could not verify email" : "Sign-in could not be completed"}
      subtitle={message}
    >
      {status !== "ok" ? (
        <DriverAuthPrimaryButton type="button" onClick={() => navigate(DRIVER_AUTH_PATH, { replace: true })}>
          Back to sign in
        </DriverAuthPrimaryButton>
      ) : null}
      {status === "error" || status === "missing" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Need help?{" "}
          <Link to={DRIVER_AUTH_PATH} className="font-medium text-[#4A7583] hover:text-[#0B0E14]">
            Try a different sign-in method
          </Link>
          {status === "missing" ? (
            <>
              {" "}
              or{" "}
              <Link to="/auth/check-email?flow=signup" className="font-medium text-[#4A7583] hover:text-[#0B0E14]">
                resend verification email
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </DriverMobileAuthLayout>
  );
}
