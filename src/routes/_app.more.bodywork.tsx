import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Camera } from "lucide-react";
import { MoreSubpageLayout } from "@/components/yard/more/MoreSubpageLayout";
import { yardPageTitle } from "@/components/brand/brand-copy";
import { useSessionStore } from "@/platform/auth/session-store";

export const Route = createFileRoute("/_app/more/bodywork")({
  head: () => ({ meta: [{ title: yardPageTitle("Driver bodywork") }] }),
  component: YardDriverBodyworkPage,
});

type BodyworkReport = {
  id: string;
  defectRef: string;
  vehicleId: string;
  registrationNumber: string;
  fleetNumber: string | null;
  description: string;
  severity: string;
  status: string;
  zone: string | null;
  damageType: string | null;
  reportedAt: string;
  photoDataUrl: string | null;
};

function commandApiBase() {
  const configured = import.meta.env.VITE_COMMAND_API_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const supabase = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  if (supabase) return `${supabase}/functions/v1/command-api`;
  return null;
}

function YardDriverBodyworkPage() {
  const accessToken = useSessionStore((s) => s.accessToken);
  const [reports, setReports] = useState<BodyworkReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError("");
      const base = commandApiBase();
      if (!base || !accessToken || accessToken.startsWith("mock_")) {
        setReports([]);
        setLoading(false);
        setError(
          "Sign into Command on this device to load live driver bodywork photos. Until then, use Admin → Yard → Bodywork.",
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
        if (!res.ok) throw new Error("Bodywork reports could not be loaded.");
        const hub = (await res.json()) as { bodyworkReports?: BodyworkReport[] };
        setReports(hub.bodyworkReports ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Bodywork reports could not be loaded.");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken]);

  return (
    <MoreSubpageLayout title="Driver bodywork" eyebrow="Photos from Driver vehicle checks">
      {loading ? <p className="text-sm text-muted">Loading bodywork reports…</p> : null}
      {error ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error}</p>
      ) : null}
      {!loading && !error && reports.length === 0 ? (
        <div className="rounded border border-dashed border-border bg-white px-4 py-8 text-center">
          <Camera className="mx-auto size-8 text-muted" />
          <p className="mt-3 text-sm font-medium">No open driver bodywork reports</p>
          <p className="mt-1 text-xs text-muted">
            When a driver marks bodywork damage and uploads a photo, it shows here for yard review.
          </p>
        </div>
      ) : null}
      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded border border-border bg-white p-3">
            <p className="font-bold tabular-nums tracking-wide">{report.registrationNumber}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
              {report.defectRef}
              {report.zone ? ` · ${report.zone}` : ""}
              {report.damageType ? ` · ${report.damageType.replace(/_/g, " ")}` : ""}
            </p>
            <p className="mt-2 text-sm">{report.description}</p>
            {report.photoDataUrl ? (
              <img
                src={report.photoDataUrl}
                alt={`Bodywork on ${report.registrationNumber}`}
                className="mt-3 max-h-48 w-full rounded object-cover"
              />
            ) : (
              <p className="mt-2 text-xs text-muted">Photo on defect record in Admin.</p>
            )}
          </li>
        ))}
      </ul>
    </MoreSubpageLayout>
  );
}
