import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bus,
  ClipboardCheck,
  FileBadge,
  GraduationCap,
  HeartPulse,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { loadDriverReadinessSnapshot } from "@/services/driver-readiness.service";
import { OperationalPage, InfoRow, DriverSectionTitle } from "./DriverOperationalPageParts";

const ICONS = {
  licence: FileBadge,
  account: ShieldCheck,
  duty: BadgeCheck,
  medical: HeartPulse,
  training: GraduationCap,
  working_time: Timer,
  walkaround: ClipboardCheck,
  equipment: Bus,
};

export default function DriverReadiness({ driver }) {
  const { session, bootstrap, homeSummary, refresh } = useDriverSupabaseAuth();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await loadDriverReadinessSnapshot({
        driver,
        session,
        bootstrap,
        homeSummary,
      });
      setSnapshot(next);
    } catch (err) {
      setError(err?.message || "Readiness could not be loaded from Command.");
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [driver, session, bootstrap, homeSummary]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const overallTone =
    snapshot?.overallBand === "ready"
      ? "border-emerald-200 bg-emerald-50"
      : snapshot?.overallBand === "blocked"
        ? "border-red-200 bg-red-50"
        : "border-amber-200 bg-amber-50";

  const overallIconTone =
    snapshot?.overallBand === "ready"
      ? "bg-emerald-100 text-emerald-700"
      : snapshot?.overallBand === "blocked"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-800";

  const overallTitleTone =
    snapshot?.overallBand === "ready"
      ? "text-emerald-900"
      : snapshot?.overallBand === "blocked"
        ? "text-red-900"
        : "text-amber-950";

  const overallDetailTone =
    snapshot?.overallBand === "ready"
      ? "text-emerald-800"
      : snapshot?.overallBand === "blocked"
        ? "text-red-800"
        : "text-amber-900";

  return (
    <OperationalPage title="Driver readiness" subtitle="Live eligibility from Command for today’s duty.">
      <CommandBackendNotice
        status={snapshot?.synced ? "ready" : "partial"}
        title={snapshot?.synced ? "Synced with Command" : "Connecting to Command"}
        description={
          snapshot?.asOfLabel
            ? `Updated ${snapshot.asOfLabel}. Licence, medical, training, duties and walkarounds reflect Command records.`
            : "Vehicle checks, documents, duty sign-on, training and ops messages sync to Command."
        }
      />

      {loading && !snapshot ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading readiness from Command…</p>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          <Button
            type="button"
            className={`mt-3 h-10 ${op.secondaryBtn}`}
            onClick={() => {
              void refresh?.();
              void reload();
            }}
          >
            Try again
          </Button>
        </div>
      ) : null}

      {snapshot ? (
        <div className={`mt-4 rounded-2xl border p-4 ${overallTone}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-xl p-2.5 ${overallIconTone}`}>
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className={`font-semibold ${overallTitleTone}`}>{snapshot.overallTitle}</p>
              <p className={`mt-1 text-sm ${overallDetailTone}`}>{snapshot.overallDetail}</p>
            </div>
          </div>
        </div>
      ) : null}

      <DriverSectionTitle>Readiness checks</DriverSectionTitle>
      <div className={op.listCard}>
        {(snapshot?.checks ?? []).map((item) => (
          <InfoRow
            key={item.id}
            icon={ICONS[item.id] || ShieldCheck}
            label={item.label}
            detail={item.detail}
            status={item.status}
            to={item.to}
          />
        ))}
      </div>

      <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <p className="text-sm leading-relaxed text-amber-900">
          Admin release decisions use Command account status, published duties, training completion, and today’s vehicle
          checks. A new expiry or open safety defect can block release.
        </p>
      </div>
    </OperationalPage>
  );
}
