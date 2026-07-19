import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import DriverMobileAuthLayout, { DriverAuthPrimaryButton } from "@/components/driver/auth/DriverMobileAuthLayout";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { DRIVER_AUTH_PATH } from "@/lib/driverAuthConfig";
import { sendDriverPhoneOtp, verifyDriverPhoneOtp } from "@/services/auth.service";
import { getDriverSessionContext } from "@/services/session.service";

const OTP_LENGTH = 6;

function maskPhone(e164) {
  if (!e164 || e164.length < 8) return e164;
  return `${e164.slice(0, 4)} ••• ••${e164.slice(-2)}`;
}

export default function DriverPhoneVerify({ onVerified }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get("phone")?.trim() ?? "";
  const [digits, setDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!phone) navigate(DRIVER_AUTH_PATH, { replace: true });
  }, [phone, navigate]);

  const code = digits.join("");
  const canVerify = code.length === OTP_LENGTH;

  async function handleVerify(e) {
    e.preventDefault();
    if (!canVerify) return;

    setLoading(true);
    setError("");
    const result = await verifyDriverPhoneOtp(phone, code);
    if (!result.ok) {
      setLoading(false);
      setError(result.message ?? "Invalid code. Try again.");
      return;
    }

    await onVerified?.();
    const sessionCtx = await getDriverSessionContext();
    setLoading(false);

    if (sessionCtx?.routeTarget === "login" || !sessionCtx?.driver) {
      setError("No driver profile is linked to this account. Ask your transport manager to invite you.");
      return;
    }

    navigate("/", { replace: true });
  }

  async function handleResend() {
    setResendBusy(true);
    setResendMessage("");
    setError("");
    const result = await sendDriverPhoneOtp(phone);
    setResendBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Could not resend code.");
      return;
    }
    setResendMessage("New code sent.");
  }

  function handleDigitChange(index, value) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError("");
    if (char && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
  }

  if (!phone) return <DriverPageLoader label="Loading…" />;

  return (
    <DriverMobileAuthLayout
      title="Enter verification code"
      subtitle={`We sent a ${OTP_LENGTH}-digit code to ${maskPhone(phone)}.`}
      footer={
        <>
          Did not receive it?{" "}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-2"
            onClick={() => void handleResend()}
            disabled={resendBusy}
          >
            {resendBusy ? "Sending…" : "Resend code"}
          </button>
        </>
      }
    >
      <form onSubmit={(e) => void handleVerify(e)} className="space-y-5">
        <div className="flex justify-between gap-2" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="h-14 w-full max-w-[3rem] rounded-xl border border-border bg-card text-center text-xl font-semibold text-foreground shadow-sm transition-colors focus:border-[#5B8C9B] focus:outline-none focus:ring-2 focus:ring-[#5B8C9B]/20"
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {resendMessage ? <p className="text-sm text-muted-foreground">{resendMessage}</p> : null}

        <DriverAuthPrimaryButton type="submit" disabled={!canVerify || loading}>
          {loading ? "Verifying…" : "Continue"}
        </DriverAuthPrimaryButton>
      </form>

      <Link to={DRIVER_AUTH_PATH} className="mt-6 inline-block text-sm font-medium text-[#4A7583] hover:text-[#0B0E14]">
        Use a different number
      </Link>
    </DriverMobileAuthLayout>
  );
}
