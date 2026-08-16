import { useState } from "react";
import { commandSelectTenant } from "@/lib/command-api";
import { applyCommandTokens, completeDriverSignIn } from "@/services/session.service";
import { getSupabaseClient } from "@/lib/supabase/client";
import DriverMobileAuthLayout, { DriverAuthPrimaryButton } from "@/components/driver/auth/DriverMobileAuthLayout";

const PENDING_MEMBERSHIPS_KEY = "driver_pending_memberships";

/**
 * Wave 3E-2: pending access/refresh for company pick stay in process memory only.
 * Memberships (non-secret) may remain in sessionStorage for UI restore.
 */
let pendingTokensMemory = { accessToken: null, refreshToken: null };

export function savePendingCompanySelection({ memberships, accessToken, refreshToken }) {
  sessionStorage.setItem(PENDING_MEMBERSHIPS_KEY, JSON.stringify(memberships ?? []));
  pendingTokensMemory = {
    accessToken: accessToken ?? null,
    refreshToken: refreshToken ?? null,
  };
  // Purge any pre-3E-2 credential leftovers from sessionStorage.
  try {
    sessionStorage.removeItem("driver_pending_auth_tokens");
  } catch {
    // ignore
  }
}

export function loadPendingCompanySelection() {
  try {
    const memberships = JSON.parse(sessionStorage.getItem(PENDING_MEMBERSHIPS_KEY) ?? "[]");
    return {
      memberships,
      accessToken: pendingTokensMemory.accessToken,
      refreshToken: pendingTokensMemory.refreshToken,
    };
  } catch {
    return {
      memberships: [],
      accessToken: pendingTokensMemory.accessToken,
      refreshToken: pendingTokensMemory.refreshToken,
    };
  }
}

export function clearPendingCompanySelection() {
  sessionStorage.removeItem(PENDING_MEMBERSHIPS_KEY);
  try {
    sessionStorage.removeItem("driver_pending_auth_tokens");
  } catch {
    // ignore
  }
  pendingTokensMemory = { accessToken: null, refreshToken: null };
}

export default function DriverAuthSelectCompany({ onComplete }) {
  const pending = loadPendingCompanySelection();
  const [memberships] = useState(() => pending.memberships ?? []);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState("");

  async function handleSelect(membership) {
    const companyId = membership.companyId ?? membership.tenantId;
    const latest = loadPendingCompanySelection();
    if (!companyId || !latest.accessToken || !latest.refreshToken) {
      setError("Session expired. Sign in again.");
      return;
    }
    setError("");
    setLoading(companyId);
    try {
      const selected = await commandSelectTenant(
        latest.accessToken,
        latest.refreshToken,
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
        selected.refreshToken ?? latest.refreshToken,
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
