import { useEffect, useState } from "react";
import { FileCheck2, ShieldCheck } from "lucide-react";
import { OperationalPage, InfoRow, DriverSectionTitle } from "./DriverOperationalPageParts";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { documentStatusUi } from "@/lib/vehicle-readiness";
import { loadAssignedVehicleReadiness } from "@/services/vehicle-readiness.service";

const DOC_ICONS = {
  mot: FileCheck2,
  insurance: ShieldCheck,
  tax: FileCheck2,
  tachograph: FileCheck2,
};

export default function DriverVehicleDocuments({ driver }) {
  const { session, bootstrap: sessionBootstrap } = useDriverSupabaseAuth();
  const [readiness, setReadiness] = useState(sessionBootstrap?.assignedVehicleReadiness ?? null);
  const [loading, setLoading] = useState(() => !sessionBootstrap?.assignedVehicleReadiness);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const depotId = session?.activeDepotId ?? session?.depots?.[0]?.id ?? null;
      const result = await loadAssignedVehicleReadiness({
        bootstrap: sessionBootstrap,
        depotId,
      });
      if (cancelled) return;
      if (result.ok) {
        setReadiness(result.readiness);
        setMessage("");
      } else {
        setMessage(result.message ?? "Vehicle documents could not be loaded.");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.id, session?.activeDepotId, sessionBootstrap]);

  const documents = readiness?.documents ?? [];
  const reg = readiness?.registrationNumber;

  if (loading) {
    return (
      <OperationalPage title="Vehicle documents" subtitle="Loading from Command…" backTo="/vehicle">
        <DriverPageLoader label="Loading documents…" />
      </OperationalPage>
    );
  }

  return (
    <OperationalPage
      title="Vehicle documents"
      subtitle={
        reg
          ? `Compliance records for ${reg} from Command.`
          : "Read-only documents held against your assigned vehicle."
      }
      backTo="/vehicle"
    >
      {message ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {message}
        </div>
      ) : null}

      <DriverSectionTitle>Current documents</DriverSectionTitle>
      <div className={op.listCard}>
        {documents.length ? (
          documents.map((doc) => {
            const Icon = DOC_ICONS[doc.id] ?? FileCheck2;
            const status = documentStatusUi(doc.status);
            return (
              <InfoRow
                key={doc.id}
                icon={Icon}
                label={doc.label}
                detail={doc.detail ?? "Not on record in Command"}
                status={{ label: status.label, tone: status.tone }}
              />
            );
          })
        ) : (
          <InfoRow
            icon={FileCheck2}
            label="No compliance dates on record"
            detail="MOT, insurance and tax dates are not recorded in Command for this vehicle yet."
            status={{ label: "Pending", tone: "neutral" }}
          />
        )}
      </div>

      {readiness?.blockingReasons?.length ? (
        <>
          <DriverSectionTitle>Dispatch blockers</DriverSectionTitle>
          <div className={`${op.card} space-y-2 p-4 text-sm text-red-950`}>
            {readiness.blockingReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </>
      ) : null}
    </OperationalPage>
  );
}
