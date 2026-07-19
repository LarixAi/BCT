import RouteOverviewButton from "@/components/driver/jobs/map-controls/RouteOverviewButton";
import CompassModeButton from "@/components/driver/jobs/map-controls/CompassModeButton";
import RecenterButton from "@/components/driver/jobs/map-controls/RecenterButton";
import { NAV_CAMERA_MODES } from "@/lib/navigation/navigationCamera";

export default function MapNavigationControls({
  cameraMode,
  driverHeading = 0,
  onShowEntireRoute,
  onToggleCompass,
  onRecenter,
  bottomStyle = { bottom: "6rem" },
}) {
  return (
    <div
      className="absolute right-3 z-[2] flex flex-col gap-2 pointer-events-auto items-center"
      style={bottomStyle}
    >
      <RouteOverviewButton
        onPress={onShowEntireRoute}
        active={cameraMode === NAV_CAMERA_MODES.ROUTE_OVERVIEW}
      />
      <CompassModeButton mode={cameraMode} heading={driverHeading} onPress={onToggleCompass} />
      <RecenterButton onPress={onRecenter} />
    </div>
  );
}
