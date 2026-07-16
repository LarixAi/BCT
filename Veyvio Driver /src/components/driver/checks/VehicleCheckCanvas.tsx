import { cn } from "@/lib/utils";
import type { CheckZoneId, CheckZoneTone } from "@/domain/vehicle-check/checks-workspace-view";

const ZONE_LAYOUT: Record<CheckZoneId, string> = {
  front: "left-[2%] top-[30%] h-[42%] w-[22%]",
  side: "left-[24%] top-[24%] h-[48%] w-[55%]",
  rear: "right-[1%] top-[28%] h-[45%] w-[21%]",
  wheels: "bottom-[7%] left-[22%] h-[24%] w-[60%]",
};

const ZONE_LABEL: Record<CheckZoneId, string> = {
  front: "Front & lights",
  side: "Bodywork & doors",
  rear: "Rear & exits",
  wheels: "Tyres & wheels",
};

export function VehicleCheckCanvas({
  zones,
  onZoneSelect,
}: {
  zones: Record<CheckZoneId, CheckZoneTone>;
  onZoneSelect?: (zone: CheckZoneId) => void;
}) {
  return (
    <div className="absolute left-5 right-5 top-[105px] flex h-[430px] items-center justify-center">
      <div className="relative w-full max-w-[380px]">
        <svg
          className="h-auto w-full drop-shadow-[0_18px_18px_rgba(16,24,40,0.18)]"
          viewBox="0 0 760 330"
          aria-label="Side view of assigned vehicle"
        >
          <defs>
            <linearGradient id="checksBodyGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#f8fafc" />
              <stop offset="0.55" stopColor="#ffffff" />
              <stop offset="1" stopColor="#e5e7eb" />
            </linearGradient>
          </defs>
          <path
            d="M82 229V122c0-33 24-61 57-68l319-13c58-2 111 28 139 78l45 82c8 14 12 30 12 46v9H82v-27Z"
            fill="url(#checksBodyGrad)"
            stroke="#98A2B3"
            strokeWidth="5"
          />
          <path
            d="M168 78h260v94H141v-57c0-20 10-31 27-37Z"
            fill="#CFE1F4"
            stroke="#98A2B3"
            strokeWidth="4"
          />
          <path
            d="M446 77h95c24 14 42 34 56 59l20 36H446V77Z"
            fill="#CFE1F4"
            stroke="#98A2B3"
            strokeWidth="4"
          />
          <path d="M447 79v151M115 173h522M249 79v94M348 79v94" stroke="#98A2B3" strokeWidth="4" />
          <rect x="520" y="184" width="73" height="50" rx="5" fill="#F2F4F7" stroke="#98A2B3" strokeWidth="3" />
          <rect x="104" y="205" width="45" height="20" rx="5" fill="#D0D5DD" />
          <rect x="617" y="199" width="27" height="17" rx="4" fill="#D0D5DD" />
          <circle cx="211" cy="260" r="50" fill="#1F2937" />
          <circle cx="211" cy="260" r="25" fill="#D0D5DD" />
          <circle cx="551" cy="260" r="50" fill="#1F2937" />
          <circle cx="551" cy="260" r="25" fill="#D0D5DD" />
          <path d="M93 239h56M627 239h26" stroke="#667085" strokeWidth="5" />
        </svg>

        {(Object.keys(ZONE_LAYOUT) as CheckZoneId[]).map((zone) => {
          const tone = zones[zone];
          return (
            <button
              key={zone}
              type="button"
              onClick={() => onZoneSelect?.(zone)}
              className={cn(
                "absolute cursor-pointer rounded-[18px] border-[3px] border-transparent bg-white/[0.02] transition duration-150",
                ZONE_LAYOUT[zone],
                tone === "active" &&
                  "border-link bg-[rgba(47,107,255,0.11)] shadow-[0_0_0_6px_rgba(47,107,255,0.10)]",
                tone === "done" && "border-ok bg-[rgba(23,140,75,0.08)]",
                tone === "defect" && "border-vor bg-[rgba(217,45,32,0.08)]",
              )}
              aria-label={`${ZONE_LABEL[zone]} inspection zone`}
            >
              <span
                className={cn(
                  "absolute bottom-[-32px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-2.5 py-1.5 text-[11px] font-extrabold text-muted shadow-[0_8px_20px_rgba(16,24,40,0.13)]",
                  tone === "active" && "text-link",
                  tone === "done" && "text-ok",
                  tone === "defect" && "text-vor",
                )}
              >
                {ZONE_LABEL[zone]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
