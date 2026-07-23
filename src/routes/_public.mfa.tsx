import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";
import { isMockAuth } from "@/platform/auth/auth-config";
import { mapCommandRoleToYardRole } from "@/platform/auth/command-auth-api";
import {
  YardAuthPrimaryButton,
  YardAuthTextField,
  YardMobileAuthLayout,
} from "@/components/auth/YardMobileAuthLayout";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_public/mfa")({
  head: () => ({ meta: [{ title: "Verify identity — Veyvio Yard" }] }),
  component: MfaPage,
});

function MfaPage() {
  const navigate = useNavigate();
  const completeMfa = useSessionStore(s => s.completeMfa);
  const enableBiometric = useSessionStore(s => s.enableBiometric);
  const selectCompany = useTenancyStore(s => s.selectCompany);
  const devMfaCode = useSessionStore(s => s.devMfaCode);
  const [code, setCode] = useState("");
  const [trusted, setTrusted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    setError(null);
    setLoading(true);
    try {
      const result = await completeMfa(code);
      if (trusted) enableBiometric();
      if (result.next === "company-select") {
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
      setError(err instanceof Error ? err.message : yardCopy.auth.mfaFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <YardMobileAuthLayout
      title="Verify identity"
      subtitle="Enter the 6-digit code from your authenticator app."
      animate
    >
      <form onSubmit={handleVerify} className="yard-auth-form-stack">
        {devMfaCode && !isMockAuth() ? (
          <div className="yard-auth-card p-3 text-xs text-[#4b5563]">
            Dev MFA code:{" "}
            <span className="font-mono font-bold tracking-widest text-[#0b0e14]">{devMfaCode}</span>
          </div>
        ) : null}

        <YardAuthTextField
          id="mfa"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ""))}
          hideLabel
          label="Authenticator code"
          className="font-mono text-lg tracking-widest"
        />

        <label className="yard-auth-checkbox">
          <input type="checkbox" checked={trusted} onChange={e => setTrusted(e.target.checked)} />
          Remember trusted device
        </label>

        {error ? <p className="yard-auth-error">{error}</p> : null}

        <YardAuthPrimaryButton
          type="submit"
          disabled={code.length < 6 || loading}
          ready={code.length >= 6 && !loading}
        >
          {loading ? yardCopy.auth.verifying : "Verify"}
        </YardAuthPrimaryButton>
      </form>
    </YardMobileAuthLayout>
  );
}
