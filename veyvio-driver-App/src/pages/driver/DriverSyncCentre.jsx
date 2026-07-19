import { useEffect, useState } from "react";
import { OperationalPage, InfoRow, DriverSectionTitle } from "./DriverOperationalPageParts";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { refreshCommandBootstrap } from "@/services/command-driver-ops.service";
import { formatUkDateTime } from "@/lib/uk-locale";

const CAPABILITIES = [
  { label: "Sign-in / driver session", status: "Live" },
  { label: "Bootstrap home + duties", status: "Live" },
  { label: "Acknowledge duty", status: "Live" },
  { label: "Report defect → Admin", status: "Live" },
  { label: "Report incident → Admin", status: "Live" },
  { label: "Vehicle check submit", status: "Missing" },
  { label: "Documents self-serve", status: "Missing" },
  { label: "Messages / chat", status: "Partial" },
  { label: "Working time / sign-on", status: "Missing" },
  { label: "Live location pings", status: "Missing" },
];

export default function DriverSyncCentre() {
  const { session } = useDriverSupabaseAuth();
  const [bootstrap, setBootstrap] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const result = await refreshCommandBootstrap(depotId);
      if (!result.ok) {
        setError(result.message ?? "Sync failed");
        setLoading(false);
        return;
      }
      setBootstrap(result.bootstrap);
      setError("");
      setLoading(false);
    })();
  }, [session?.activeDepotId, session?.depots]);

  const serverTime = bootstrap?.serverTime;
  const dutyCount = bootstrap?.duties?.length ?? 0;

  return (
    <OperationalPage title="Offline & sync" subtitle="Command bootstrap status for this device.">
      <CommandBackendNotice
        status="partial"
        title="Command connection status"
        description="Live items reach Admin today. Missing items still need Command APIs before Admin can rely on them."
      />
      <DriverSectionTitle>Overview</DriverSectionTitle>
      <div className={op.listCard}>
        <InfoRow label={`Connection · ${error ? "Error" : "Online"}`} to="/contact" />
        <InfoRow
          label={`Last successful sync · ${loading ? "…" : serverTime ? formatUkDateTime(serverTime) : "Not yet"}`}
          to="/"
        />
        <InfoRow label={`Published duties cached · ${dutyCount}`} to="/jobs" />
        <InfoRow label="Pending offline queue · 0" to="/contact" />
      </div>

      <DriverSectionTitle>Admin readiness</DriverSectionTitle>
      <div className={op.listCard}>
        {CAPABILITIES.map((item) => (
          <InfoRow
            key={item.label}
            label={`${item.label} · ${item.status}`}
            to={item.status === "Live" ? "/jobs" : "/help"}
          />
        ))}
      </div>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
    </OperationalPage>
  );
}
