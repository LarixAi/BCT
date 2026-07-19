import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import CommandBackendNotice from "@/components/driver/operational/CommandBackendNotice";
import {
  OperationalPage,
  StatusPill,
} from "@/pages/driver/DriverOperationalPageParts";
import { op } from "@/lib/driver-operational-theme";
import { formatUkDateTime } from "@/lib/uk-locale";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { confirmDriverHandover, listDriverFoundItems } from "@/services/lost-property.service";

function formatStatus(status) {
  return String(status || "").replace(/_/g, " ");
}

function statusTone(status, handedOver) {
  if (handedOver || status === "handed_to_depot") return "good";
  if (status === "awaiting_handover" || status === "reported") return "warning";
  return "neutral";
}

export default function DriverMyFoundItems({ driver }) {
  const { bootstrap } = useDriverSupabaseAuth();
  const [items, setItems] = useState([]);
  const [source, setSource] = useState("empty");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState(null);

  const duty = bootstrap?.duties?.[0];
  const vehicleReg =
    duty?.vehicle?.registrationNumber ||
    duty?.vehicle?.registration ||
    driver?.assignedVehicleRegistration ||
    null;

  const reload = async () => {
    setLoading(true);
    const result = await listDriverFoundItems(driver);
    setItems(result.items ?? []);
    setSource(result.source || "empty");
    setLoading(false);
  };

  useEffect(() => {
    void reload();
  }, [driver?.id]);

  const confirmHandover = async (itemId) => {
    setBusyId(itemId);
    setMessage("");
    const result = await confirmDriverHandover(driver, itemId);
    setBusyId(null);
    setMessage(result.message ?? (result.ok ? "Handover confirmed." : "Could not confirm handover."));
    if (result.ok) void reload();
  };

  return (
    <OperationalPage
      title="Lost property"
      subtitle="Report found items and confirm depot handover."
      backTo="/more"
    >
      <CommandBackendNotice
        status={source === "local" || source === "empty" ? "partial" : "ready"}
        title={
          source === "local" || source === "empty"
            ? "Saved for depot handover"
            : "Reports sync when available"
        }
        description={
          source === "local" || source === "empty"
            ? "Command Admin does not have a lost-property queue yet. Keep items safe, hand them to Yard/depot, and confirm handover here."
            : "Your reports are stored for this operator. Hand items to depot and confirm when done."
        }
      />

      {vehicleReg || duty?.reference ? (
        <div className={`mt-4 p-4 ${op.card}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Current duty
          </p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            {vehicleReg || "Vehicle on duty"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {[duty?.reference || duty?.routeName, duty?.reportingLocation].filter(Boolean).join(" · ") ||
              "Link reports to today’s duty when you can"}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">My found items</p>
        <Button asChild size="sm" className={`h-10 rounded-full px-4 ${op.primaryBtn}`}>
          <Link to="/lost-property/report">
            <PackagePlus className="mr-1.5 h-4 w-4" />
            Report
          </Link>
        </Button>
      </div>

      {message ? (
        <p className="mt-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground">
          {message}
        </p>
      ) : null}

      <div className="mt-3 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className={`p-6 text-center ${op.card}`}>
            <p className="font-semibold text-foreground">No found items yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              If a passenger leaves something on the vehicle, report it here before you move on.
            </p>
            <Button asChild className={`mt-4 h-12 w-full ${op.primaryBtn}`}>
              <Link to="/lost-property/report">Report found item</Link>
            </Button>
          </div>
        ) : (
          items.map((item) => (
            <article key={item.id} className={`p-4 ${op.card}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{item.reference}</p>
                  <p className="mt-0.5 text-[15px] font-semibold capitalize text-foreground">
                    {formatStatus(item.category)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
                <StatusPill status={statusTone(item.status, item.driver_handover_confirmed)}>
                  {item.driver_handover_confirmed ? "Handed in" : formatStatus(item.status)}
                </StatusPill>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Found {formatUkDateTime(item.found_at)}
                {item.vehicle_registration ? ` · ${item.vehicle_registration}` : ""}
                {item.source === "local" ? " · On this device" : ""}
              </p>
              {!item.driver_handover_confirmed &&
              ["reported", "awaiting_handover"].includes(item.status) ? (
                <Button
                  className={`mt-3 h-11 w-full ${op.primaryBtn}`}
                  disabled={busyId === item.id}
                  onClick={() => confirmHandover(item.id)}
                >
                  {busyId === item.id ? "Confirming…" : "I handed this to depot"}
                </Button>
              ) : item.driver_handover_confirmed ? (
                <p className="mt-3 text-xs font-medium text-emerald-700">Handover confirmed</p>
              ) : null}
            </article>
          ))
        )}
      </div>
    </OperationalPage>
  );
}
