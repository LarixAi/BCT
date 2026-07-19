import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import {
  checkDriverLicenceEligibilityForJob,
  loadDriverLicenceSummary,
  recordDriverLicenceConsent,
} from "@/services/licence-compliance.service";
import { op } from "@/lib/driver-operational-theme";

export default function DriverLicenceCompliance() {
  const { driver, session } = useDriverSupabaseAuth();
  const [summary, setSummary] = useState(null);
  const [consentMessage, setConsentMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driver?.id) return;
    loadDriverLicenceSummary(driver.id)
      .then(setSummary)
      .finally(() => setLoading(false));
  }, [driver?.id]);

  const giveConsent = async () => {
    if (!driver?.id || !session?.organisationId) return;
    const result = await recordDriverLicenceConsent(driver.id, session.organisationId);
    setConsentMessage(result.message);
  };

  if (loading) {
    return <p className={`p-6 ${op.text}`}>Loading licence status…</p>;
  }

  return (
    <div className={`min-h-dvh ${op.pageBg} ${op.text} p-4 space-y-4`}>
      <h1 className="text-xl font-bold">My licence & compliance</h1>
      <p className={`text-sm ${op.muted}`}>
        Your transport manager verifies licence categories and credentials. You must hold the correct licence for each job type.
      </p>

      <section className={`rounded-xl border ${op.cardBorder} ${op.cardBg} p-4 space-y-2`}>
        <h2 className="font-semibold">Licence status</h2>
        <p className="text-sm capitalize">{summary?.licence?.licence_status ?? "Not recorded yet"}</p>
        {summary?.licence?.licence_number_last4 ? (
          <p className="text-sm font-mono">********{summary.licence.licence_number_last4}</p>
        ) : null}
        <p className={`text-xs ${op.muted}`}>
          Last checked: {summary?.licence?.last_checked_at?.slice(0, 10) ?? "—"} · Next due:{" "}
          {summary?.licence?.next_check_due_at?.slice(0, 10) ?? "—"}
        </p>
      </section>

      <section className={`rounded-xl border ${op.cardBorder} ${op.cardBg} p-4`}>
        <h2 className="font-semibold mb-2">Held categories</h2>
        <div className="flex flex-wrap gap-2">
          {(summary?.categories ?? []).length ? (
            summary.categories.map((c) => (
              <span key={c} className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-900">
                {c}
              </span>
            ))
          ) : (
            <span className={`text-sm ${op.muted}`}>Awaiting verification</span>
          )}
        </div>
      </section>

      <section className={`rounded-xl border ${op.cardBorder} ${op.cardBg} p-4 space-y-3`}>
        <h2 className="font-semibold">Licence check consent</h2>
        <p className={`text-sm ${op.muted}`}>
          I consent to my employer checking my driving licence using DVLA or manual verification for compliance purposes.
        </p>
        <button type="button" onClick={giveConsent} className={`rounded-lg px-4 py-2 text-sm font-bold ${op.primaryBtn}`}>
          I consent to licence check
        </button>
        {consentMessage ? <p className="text-sm">{consentMessage}</p> : null}
      </section>

      <Link to="/documents" className={`text-sm font-bold ${op.tealAccent}`}>
        Upload licence documents →
      </Link>
    </div>
  );
}

export { checkDriverLicenceEligibilityForJob };
