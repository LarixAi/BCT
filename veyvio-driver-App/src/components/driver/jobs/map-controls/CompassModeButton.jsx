import { Navigation } from "lucide-react";
import { NAV_CAMERA_MODES } from "@/lib/navigation/navigationCamera";
import MapControlButton from "@/components/driver/jobs/map-controls/MapControlButton";

export default function CompassModeButton({ mode, heading = 0, onPress }) {
  const isNorthUp = mode === NAV_CAMERA_MODES.NORTH_UP;
  const isFollowHeading = mode === NAV_CAMERA_MODES.FOLLOW_HEADING;
  const rotateDeg = isNorthUp ? 0 : heading ?? 0;

  return (
    <MapControlButton onClick={onPress} ariaLabel={isNorthUp ? "Switch to heading up" : "Switch to north up"}>
      <span
        className="flex items-center justify-center"
        style={{ transform: `rotate(${rotateDeg}deg)`, transition: "transform 0.35s ease" }}
      >
        <Navigation
          className={`w-[22px] h-[22px] ${isFollowHeading ? "text-[#e5003c]" : "text-[#111]"}`}
          strokeWidth={2.4}
          fill={isFollowHeading ? "currentColor" : "none"}
        />
      </span>
    </MapControlButton>
  );
}
