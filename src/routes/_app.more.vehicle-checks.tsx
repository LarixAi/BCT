import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { useSessionStore } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_app/more/vehicle-checks")({
  head: () => ({ meta: [{ title: yardPageTitle("Vehicle checks") }] }),
  component: YardVehicleChecksPage,
});

type CheckSection = {
  id: string;
  section: string;
  question: string;
  answer: string;
  notes: string | null;
  photoDataUrl?: string | null;
};

type VehicleCheck = {
  id: string;
  registrationNumber: string;
  driverName: string | null;
  result: string;
  odometer: number | string | null;
  startedAt: string | null;
  submittedAt: string | null;
  odometerPhotoDataUrl: string | null;
  sections: CheckSection[];
};

function commandApiBase() {
  const configured = import.meta.env.VITE_COMMAND_API_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const supabase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (supabase) return `${supabase}/functions/v1/command-api`;
  return null;
}

function YardVehicleChecksPage() {
  const accessToken = useSessionStore((s) => s.accessToken);
  const [checks, setChecks] = useState<VehicleCheck[]>([]);
  const [selected, setSelected] = useState<VehicleCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      const base = commandApiBase();
      if (!base || !accessToken || accessToken.startsWith("mock_")) {
        setChecks([]);
        setLoading(false);
        setError(
          "Sign into Command on this device to load live driver vehicle checks. Until then, use Admin → Yard → Vehicle checks.",
        );
        return;
      }
      try {
        const res = await fetch(`${base}/yard/hub`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error("Vehicle checks could not be loaded.");
        const hub = (await res.json()) as { vehicleChecks?: VehicleCheck[] };
        const rows = hub.vehicleChecks ?? [];
        setChecks(rows);
        setSelected(rows[0] ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Vehicle checks could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  return (
    <MoreSubpageLayout title="Vehicle checks" eyebrow="Driver walkarounds on Command">
      {loading ? <p className="text-sm text-muted">Loading vehicle checks…</p> : null}
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error}</p>
      ) : null}
      {!loading && !error && checks.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-white px-4 py-8 text-center">
          <ClipboardCheck className="mx-auto size-8 text-muted" />
          <p className="mt-3 text-sm font-medium">No driver vehicle checks yet</p>
          <p className="mt-1 text-xs text-muted">
            When a driver submits a walkaround, the full check with odometer photo and answers shows here.
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        {checks.map((check) => (
          <button
            key={check.id}
            type="button"
            onClick={() => setSelected(check)}
            className={`w-full rounded border p-3 text-left ${
              selected?.id === check.id ? "border-primary bg-primary/5" : "border-border bg-white"
            }`}
          >
            <p className="font-bold tabular-nums">{check.registrationNumber}</p>
            <p className="text-xs text-muted">
              {check.driverName ?? "Driver"} · {check.result === "fail" ? "Failed" : "Passed"}
              {check.odometer != null ? ` · Odo ${check.odometer}` : ""}
            </p>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="space-y-3 rounded border border-border bg-white p-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Selected check</p>
          <p className="text-xs text-muted">
            Started {selected.startedAt ? new Date(selected.startedAt).toLocaleString() : "—"}
            <br />
            Submitted {selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : "—"}
          </p>
          {selected.odometerPhotoDataUrl ? (
            <img
              src={selected.odometerPhotoDataUrl}
              alt="Odometer"
              className="max-h-48 w-full rounded object-cover"
            />
          ) : null}
          <ul className="space-y-2">
            {(selected.sections ?? []).map((section) => (
              <li key={section.id} className="rounded border border-border p-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                  {section.section.replace(/_/g, " ")}
                </p>
                <p className="text-sm font-medium">{section.question}</p>
                <p className="text-sm">{section.answer}</p>
                {section.notes ? <p className="text-xs text-amber-900">{section.notes}</p> : null}
                {section.photoDataUrl ? (
                  <img
                    src={section.photoDataUrl}
                    alt={section.question}
                    className="mt-2 max-h-36 w-full rounded object-cover"
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </MoreSubpageLayout>
  );
}
