import { useState } from "react";
import { commandSelectTenant } from "@/lib/command-api";
import { applyCommandTokens, completeDriverSignIn } from "@/services/session.service";
import { getSupabaseClient } from "@/lib/supabase/client";
import DriverMobileAuthLayout, { DriverAuthPrimaryButton } from "@/components/driver/auth/DriverMobileAuthLayout";

const PENDING_MEMBERSHIPS_KEY = "driver_pending_memberships";
const PENDING_TOKENS_KEY = "driver_pending_auth_tokens";

export function savePendingCompanySelection({ memberships, accessToken, refreshToken }) {
  sessionStorage.setItem(PENDING_MEMBERSHIPS_KEY, JSON.stringify(memberships ?? []));
  sessionStorage.setItem(PENDING_TOKENS_KEY, JSON.stringify({ accessToken, refreshToken }));
}

export function loadPendingCompanySelection() {
  try {
    const memberships = JSON.parse(sessionStorage.getItem(PENDING_MEMBERSHIPS_KEY) ?? "[]");
    const tokens = JSON.parse(sessionStorage.getItem(PENDING_TOKENS_KEY) ?? "{}");
    return { memberships, ...tokens };
  } catch {
    return { memberships: [], accessToken: null, refreshToken: null };
  }
}

export function clearPendingCompanySelection() {
  sessionStorage.removeItem(PENDING_MEMBERSHIPS_KEY);
  sessionStorage.removeItem(PENDING_TOKENS_KEY);
}

export default function DriverAuthSelectCompany({ onComplete }) {
  const pending = loadPendingCompanySelection();
  const [memberships] = useState(() => pending.memberships ?? []);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  async function handleSelect(membership) {
    const companyId = membership.companyId ?? membership.tenantId;
    if (!companyId || !pending.accessToken || !pending.refreshToken) {
      setError("Session expired. Sign in again.");
      return;
    }
    setError("");
    setLoading(companyId);
    try {
      const selected = await commandSelectTenant(
        pending.accessToken,
        pending.refreshToken,
        companyId,
      );
      if (!selected.ok || !selected.accessToken) {
        setError(selected.message ?? "Could not select this company.");
        return;
      }
      const supabase = getSupabaseClient();
      const applied = await applyCommandTokens(
        supabase,
        selected.accessToken,
        selected.refreshToken ?? pending.refreshToken,
      );
      if (!applied.ok) {
        setError(applied.message ?? "Could not apply company session.");
        return;
      }
      clearPendingCompanySelection();
      const result = await completeDriverSignIn();
      if (!result.ok) {
        setError(result.message ?? "This account is not registered as a driver for that company.");
        return;
      }
      onComplete?.(result.context);
    } finally {
      setLoading(null);
    }
  }

  return (
    <DriverMobileAuthLayout title="Select company" subtitle="Choose which operator you are driving for today.">
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-2">
        {memberships.map((m) => {
          const id = m.companyId ?? m.tenantId;
          const name = m.companyName ?? m.tenantName ?? "Company";
          return (
            <li key={id}>
              <DriverAuthPrimaryButton
                type="button"
                disabled={loading != null}
                onClick={() => void handleSelect(m)}
              >
                {loading === id ? "Selecting…" : name}
              </DriverAuthPrimaryButton>
            </li>
          );
        })}
      </ul>
    </DriverMobileAuthLayout>
  );
}
