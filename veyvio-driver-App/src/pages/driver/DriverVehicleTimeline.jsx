import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import { OperationalPage, InfoRow, DriverSectionTitle } from "./DriverOperationalPageParts";
import DriverPageLoader from "@/components/driver/operational/DriverPageLoader";
import { useDriverSupabaseAuth } from "@/lib/DriverSupabaseAuthContext";
import { op } from "@/lib/driver-operational-theme";
import { formatTimelineWhen, timelineCategoryLabel } from "@/lib/vehicle-timeline";
import { loadAssignedVehicleTimeline } from "@/services/vehicle-timeline.service";

export default function DriverVehicleTimeline({ driver }) {
  const { session, bootstrap: sessionBootstrap } = useDriverSupabaseAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadAssignedVehicleTimeline({
        bootstrap: sessionBootstrap,
      });
      if (cancelled) return;
      if (result.ok) {
        setEvents(result.events ?? []);
        setMessage("");
      } else {
        setMessage(result.message ?? "Vehicle history could not be loaded.");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.id, sessionBootstrap]);

  const reg = useMemo(() => {
    const dutyVehicle = sessionBootstrap?.duties?.[0]?.vehicle;
    return (
      dutyVehicle?.registrationNumber ||
      dutyVehicle?.registration ||
      sessionBootstrap?.assignedVehicleReadiness?.registrationNumber ||
      null
    );
  }, [sessionBootstrap]);

  if (loading) {
    return (
      <OperationalPage title="Vehicle history" subtitle="Loading from Command…" backTo="/vehicle">
        <DriverPageLoader label="Loading timeline…" />
      </OperationalPage>
    );
  }

  return (
    <OperationalPage
      title="Vehicle history"
      subtitle={reg ? `Checks, defects, yard moves and handbacks for ${reg}.` : "Activity recorded in Command for your vehicle."}
      backTo="/vehicle"
    >
      {message ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {message}
        </div>
      ) : null}

      <DriverSectionTitle>Recent activity</DriverSectionTitle>
      {events.length ? (
        <div className={op.listCard}>
          {events.map((event) => (
            <div
              key={event.id}
              className="border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{event.title}</p>
                  {event.detail ? (
                    <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                  ) : null}
                  {event.actorName ? (
                    <p className="mt-1 text-xs text-muted-foreground">{event.actorName}</p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {timelineCategoryLabel(event.category)}
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {formatTimelineWhen(event.occurredAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={`p-4 ${op.card}`}>
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <History className="h-4 w-4" />
            No activity on record yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Walkarounds, defects, yard returns and handbacks will appear here once recorded in Command.
          </p>
        </div>
      )}
    </OperationalPage>
  );
}
