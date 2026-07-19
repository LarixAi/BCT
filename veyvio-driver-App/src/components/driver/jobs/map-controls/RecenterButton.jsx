import { LocateFixed } from "lucide-react";
import MapControlButton from "@/components/driver/jobs/map-controls/MapControlButton";

export default function RecenterButton({ onPress }) {
  return (
    <MapControlButton onClick={onPress} ariaLabel="Recenter on driver">
      <LocateFixed className="w-[22px] h-[22px] text-[#111]" strokeWidth={2.2} />
    </MapControlButton>
  );
}
