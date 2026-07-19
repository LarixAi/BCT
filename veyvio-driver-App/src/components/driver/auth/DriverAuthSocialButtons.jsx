import { useState } from "react";
import {
  AppleMark,
  DriverAuthOrDivider,
  DriverAuthSecondaryButton,
  GoogleMark,
} from "@/components/driver/auth/DriverMobileAuthLayout";
import { signInDriverWithApple, signInDriverWithGoogle } from "@/services/auth.service";

/**
 * Google + Apple auth buttons for sign-in and sign-up screens.
 * @param {{ mode?: "sign-in" | "sign-up"; disabled?: boolean; onError?: (message: string) => void; animate?: boolean }} props
 */
export default function DriverAuthSocialButtons({
  mode = "sign-in",
  disabled = false,
  onError,
  animate = false,
}) {
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const busy = googleLoading || appleLoading || disabled;
  const verb = mode === "sign-up" ? "Sign up" : "Continue";

  async function handleGoogle() {
    setGoogleLoading(true);
    onError?.("");
    const result = await signInDriverWithGoogle();
    setGoogleLoading(false);
    if (!result.ok) {
      onError?.(result.message ?? "Google sign-in is not available.");
    }
  }

  async function handleApple() {
    setAppleLoading(true);
    onError?.("");
    const result = await signInDriverWithApple();
    setAppleLoading(false);
    if (!result.ok) {
      onError?.(result.message ?? "Apple sign-in is not available.");
    }
  }

  return (
    <div className={animate ? "driver-auth-anim-5" : undefined}>
      <DriverAuthOrDivider />
      <div className="driver-auth-social-stack">
        <DriverAuthSecondaryButton icon={GoogleMark} onClick={() => void handleGoogle()} disabled={busy}>
          {googleLoading ? "Opening Google…" : `${verb} with Google`}
        </DriverAuthSecondaryButton>
        <DriverAuthSecondaryButton icon={AppleMark} onClick={() => void handleApple()} disabled={busy}>
          {appleLoading ? "Opening Apple…" : `${verb} with Apple`}
        </DriverAuthSecondaryButton>
      </div>
    </div>
  );
}
