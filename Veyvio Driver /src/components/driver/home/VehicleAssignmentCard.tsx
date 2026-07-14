import { Link } from "@tanstack/react-router";
import type { DriverHomeSummary } from "@/types/home";
import { Button } from "@/components/ui/button";
import { HomeCard, HomeCardLabel, HomeCardTitle, HomeDetailRow } from "./HomeCard";

export function VehicleAssignmentCard({ summary }: { summary: DriverHomeSummary }) {
  const vehicle = summary.vehicleAssignment;
  if (!vehicle) return null;

  const blockingDefect = vehicle.defects.find((d) => d.blocksUse);
  const existingDefect = vehicle.defects.find((d) => !d.blocksUse);
  const tone = vehicle.roadworthinessStatus === "vor" || blockingDefect ? "red" : vehicle.checkStatus === "required" ? "amber" : "default";

  return (
    <HomeCard tone={tone}>
      <HomeCardLabel>Today&apos;s vehicle</HomeCardLabel>
      <p className="mt-1 font-mono font-display text-lg font-extrabold tracking-tight">{vehicle.registration}</p>
      <p className="text-sm text-muted">
        {vehicle.make} {vehicle.model}
      </p>
      <p className="text-xs text-muted">{vehicle.vehicleType}</p>

      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-ok">
        Assigned to you ·{" "}
        {vehicle.roadworthinessStatus === "vor"
          ? "Off road"
          : vehicle.roadworthinessStatus === "restricted"
            ? "Restricted use"
            : "Roadworthy"}
      </p>

      <dl className="mt-3 space-y-2">
        {vehicle.fleetNumber && <HomeDetailRow label="Fleet number" value={vehicle.fleetNumber} />}
        <HomeDetailRow label="Mileage" value={vehicle.mileage.toLocaleString()} />
        {vehicle.fuelOrChargeLevel && <HomeDetailRow label="Fuel / charge" value={vehicle.fuelOrChargeLevel} />}
        {vehicle.depotLocation && <HomeDetailRow label="Depot" value={vehicle.depotLocation} />}
        <HomeDetailRow
          label="Vehicle check"
          value={
            vehicle.checkStatus === "required"
              ? "Required before departure"
              : vehicle.checkStatus === "passed"
                ? "Passed"
                : vehicle.checkStatus.replace(/_/g, " ")
          }
        />
        {vehicle.openDefectCount > 0 && (
          <HomeDetailRow label="Open defects" value={vehicle.openDefectCount} />
        )}
      </dl>

      {vehicle.checkStatus === "required" && !blockingDefect && (
        <p className="mt-3 rounded-xs border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
          Vehicle check required before departure
        </p>
      )}

      {blockingDefect && (
        <div className="mt-3 space-y-2 rounded-xs border border-vor/30 bg-vor/10 p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-vor">Vehicle cannot be used</p>
          <p className="text-sm font-medium">{blockingDefect.title}</p>
        </div>
      )}

      {existingDefect && !blockingDefect && (
        <div className="mt-3 rounded-xs border border-border bg-secondary/50 p-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted">
            {vehicle.openDefectCount} existing vehicle defect
          </p>
          <p className="mt-1">{existingDefect.title}</p>
          <p className="text-xs text-muted">Previously recorded on {existingDefect.recordedAt}</p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/checks">View vehicle</Link>
        </Button>
        <Button asChild size="sm" className={vehicle.checkStatus === "required" ? "" : "opacity-80"}>
          <Link to="/checks">Start vehicle check</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/checks/defect" search={{ mode: "duty" }}>Report damage</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/checks/known-issues">View existing damage</Link>
        </Button>
      </div>
    </HomeCard>
  );
}
