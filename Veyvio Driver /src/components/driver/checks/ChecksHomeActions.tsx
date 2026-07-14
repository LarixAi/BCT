import type { VehicleChecksHome } from "@/types/vehicle-check";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function ChecksHomeActions({
  home,
  onStartCheck,
  onContinueCheck,
}: {
  home: VehicleChecksHome;
  onStartCheck?: () => void;
  onContinueCheck?: () => void;
}) {
  const isBlocked =
    home.vehicle.gateStatus === "vehicle_held" || home.vehicle.gateStatus === "vor";
  const isStart =
    home.vehicle.gateStatus === "awaiting_check" &&
    home.primaryActionLabel.toLowerCase().includes("start");
  const isContinue =
    home.vehicle.gateStatus === "check_in_progress" &&
    home.primaryActionLabel.toLowerCase().includes("continue");

  return (
    <div className="space-y-3">
      {!isBlocked ? (
        isStart && onStartCheck ? (
          <Button
            className="h-14 w-full font-bold uppercase tracking-widest"
            size="lg"
            onClick={onStartCheck}
          >
            {home.primaryActionLabel}
          </Button>
        ) : isContinue && onContinueCheck ? (
          <Button
            className="h-14 w-full font-bold uppercase tracking-widest"
            size="lg"
            onClick={onContinueCheck}
          >
            {home.primaryActionLabel}
          </Button>
        ) : (
          <Button asChild className="h-14 w-full font-bold uppercase tracking-widest" size="lg">
            <Link to={home.primaryActionHref}>{home.primaryActionLabel}</Link>
          </Button>
        )
      ) : (
        <Button asChild variant="destructive" className="h-14 w-full font-bold uppercase tracking-widest" size="lg">
          <Link to={home.primaryActionHref}>{home.primaryActionLabel}</Link>
        </Button>
      )}

      {home.reportDefectAlwaysAvailable && (
        <Button asChild variant="outline" className="h-11 w-full">
          <Link to="/checks/defect" search={{ mode: "duty" }}>
            Report a defect during duty
          </Link>
        </Button>
      )}

      <Button asChild variant="ghost" className="h-10 w-full text-muted">
        <Link to="/checks/history">View previous checks</Link>
      </Button>
    </div>
  );
}
