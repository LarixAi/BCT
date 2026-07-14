import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAP_DISPLAY_FILTERS, type MapDisplayFilter } from "@/types/driver-filters";

const PREVIEW: Record<
  MapDisplayFilter,
  { surface: string; road: string; accent: string; water: string }
> = {
  standard: {
    surface: "bg-[#eef2f6]",
    road: "bg-[#d0d5dd]",
    accent: "bg-link",
    water: "bg-driver-sky/40",
  },
  high_contrast: {
    surface: "bg-[#f5f7fa]",
    road: "bg-[#667085]",
    accent: "bg-ok",
    water: "bg-link/35",
  },
  night: {
    surface: "bg-accent",
    road: "bg-[#1a2940]",
    accent: "bg-link",
    water: "bg-[#0f1729]",
  },
};

export function MapThemePicker({
  active,
  onChange,
}: {
  active: MapDisplayFilter;
  onChange: (filter: MapDisplayFilter) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Map colour theme">
      {MAP_DISPLAY_FILTERS.map((theme) => {
        const selected = active === theme.id;
        const preview = PREVIEW[theme.id];

        return (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(theme.id)}
            className={cn(
              "relative overflow-hidden rounded-xl border p-2 text-left transition-colors",
              selected ? "border-link ring-2 ring-link/25" : "border-border bg-card hover:border-link/40",
            )}
          >
            <div className={cn("relative h-14 overflow-hidden rounded-lg border border-black/5", preview.surface)}>
              <div className={cn("absolute bottom-2 left-2 h-1 w-8 rounded-full", preview.water)} />
              <div className={cn("absolute left-3 top-4 h-0.5 w-10 rotate-[25deg] rounded-full", preview.road)} />
              <div className={cn("absolute right-2 top-3 h-1 w-1 rounded-full", preview.accent)} />
              <div className={cn("absolute right-5 top-6 h-0.5 w-6 rotate-[-20deg] rounded-full", preview.road)} />
            </div>
            <p className="mt-2 text-xs font-bold leading-tight">{theme.label}</p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted">{theme.description}</p>
            {selected && (
              <span className="absolute right-2 top-2 grid size-5 place-items-center rounded-full bg-link text-white">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
