import { Route } from "lucide-react";
import MapControlButton from "@/components/driver/jobs/map-controls/MapControlButton";

export default function RouteOverviewButton({ onPress, active = false }) {
  return (
    <MapControlButton
      onClick={onPress}
      ariaLabel="Show entire route"
      className={active ? "ring-2 ring-[#2563EB]/40" : ""}
    >
      <Route className="w-[22px] h-[22px] text-[#111]" strokeWidth={2.2} />
    </MapControlButton>
  );
}
