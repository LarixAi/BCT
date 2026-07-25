import { Link } from "@tanstack/react-router";
import { Camera, ChevronRight } from "lucide-react";
import { DashboardSurface } from "@/features/home/HomeDashboardPrimitives";
import { HubCallout } from "@/features/hub/HubContentPrimitives";
import { isDemoDataSource } from "@/platform/yard/data-source";
import {
  driverBodyworkReports,
  resolveDriverReportVehicle,
} from "@/domain/vehicle-bodywork/driver-reports";
import { severityLabel } from "@/domain/vehicle-bodywork/fleet-helpers";
import { useYard } from "@/store/yard";

type DriverBodyworkReportsSectionProps = {
  /** When true, show a compact list without outer section chrome (embedded in fleet page). */
  embedded?: boolean;
};

export function DriverBodyworkReportsSection({ embedded = false }: DriverBodyworkReportsSectionProps) {
  const vehicles = useYard(s => s.vehicles);
  const observations = useYard(s => s.damageObservations);
  const dataSource = useYard(s => s.dataSource);
  const hydrated = useYard(s => s.hydrated);

  const reports = driverBodyworkReports(observations);
  const demo = isDemoDataSource(dataSource);

  const content = (
    <>
      {hydrated && demo ? (
        <HubCallout tone="info">
          Demo depot — sample driver walkaround reports from this device. Live photos appear here after
          Driver reports sync through your depot hub (same sync as the rest of Yard — no separate sign-in).
        </HubCallout>
      ) : null}

      {!hydrated ? (
        <p className="text-sm text-[#667085]">Loading driver bodywork from depot sync…</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#e4e7ec] px-4 py-8 text-center">
          <Camera className="mx-auto size-8 text-[#98a2b3]" aria-hidden />
          <p className="mt-3 text-sm font-medium text-ink">No open driver bodywork reports</p>
          <p className="mt-1 text-sm text-[#667085]">
            When a driver marks bodywork damage during a walkaround, it appears here after Command sync —
            no separate sign-in needed on this screen.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#eaecf0]">
          {reports.map(report => {
            const vehicle = resolveDriverReportVehicle(report, vehicles);
            const photo = report.photoDataUrl;
            return (
              <li key={report.id}>
                <Link
                  to="/inspections/damage-review"
                  className="flex flex-col gap-3 py-3 transition-colors hover:bg-[#fcfcfd] sm:flex-row sm:items-start"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold tabular-nums text-ink">
                        {vehicle?.reg ?? "Vehicle"}
                      </span>
                      {report.severity ? (
                        <span className="rounded-full border border-[#e4e7ec] bg-[#f9fafb] px-2 py-0.5 text-[10px] font-semibold text-[#667085]">
                          {severityLabel(report.severity)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-xs text-[#667085]">
                      {report.reportedBy}
                      {report.zoneId ? ` · ${report.zoneId.replace(/-/g, " ")}` : ""}
                      {report.damageType ? ` · ${report.damageType.replace(/_/g, " ")}` : ""}
                    </p>
                    {report.description ? (
                      <p className="mt-1 text-sm text-ink">{report.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-[#98a2b3]">
                      {new Date(report.observedAt).toLocaleString("en-GB")}
                    </p>
                  </div>
                  {photo ? (
                    <img
                      src={photo}
                      alt={`Bodywork on ${vehicle?.reg ?? "vehicle"}`}
                      className="h-24 w-full shrink-0 rounded-lg object-cover sm:h-20 sm:w-28"
                    />
                  ) : (
                    <span className="text-xs text-[#98a2b3] sm:pt-1">Photo in damage review</span>
                  )}
                  <ChevronRight className="hidden size-4 shrink-0 text-[#98a2b3] sm:block" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return <div className="space-y-3">{content}</div>;
  }

  return (
    <DashboardSurface>
      <h2 className="mb-1 text-lg font-semibold text-ink">Driver bodywork reports</h2>
      <p className="mb-4 text-sm text-[#667085]">Photos and damage from Driver vehicle checks — synced with your depot.</p>
      {content}
    </DashboardSurface>
  );
}
