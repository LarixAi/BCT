import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  GitMerge,
  Loader2,
  Navigation,
  RefreshCw,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { getManeuverIcon } from "@/utils/navigationUtils";

const ICONS = {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Undo2,
  RefreshCw,
  GitMerge,
  TrendingUp,
};

function ManeuverIcon({ maneuver }) {
  const name = getManeuverIcon(maneuver);
  const Icon = ICONS[name] ?? Navigation;
  return (
    <div className="w-9 h-9 rounded-full bg-[#3A3A3A] flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-white/90" strokeWidth={2.25} />
    </div>
  );
}

/**
 * Black turn-by-turn card — stacks on the original white bottom sheet.
 */
export default function DriverNavInstructionCard({
  instruction,
  nextLabel,
  maneuver,
  loading,
  error,
}) {
  const displayInstruction = loading
    ? "Calculating route…"
    : error
      ? "Route unavailable"
      : instruction || "Continue on route";

  return (
    <div className="px-4 pb-0 relative z-[11]">
      <div className="rounded-2xl bg-[#262626] text-white px-3.5 py-2.5 flex items-center gap-3 min-h-[52px]">
        <div className="shrink-0 flex items-center justify-center w-9">
          <ManeuverIcon maneuver={maneuver} />
        </div>

        <div className="min-w-0 flex-1 flex items-center">
          <p className="text-[15px] font-medium leading-[1.35] text-white line-clamp-2">
            {displayInstruction}
          </p>
        </div>

        {nextLabel && !error && !loading ? (
          <div className="flex items-center gap-2.5 shrink-0 pl-0.5">
            <div className="w-px h-9 bg-white/15 shrink-0" aria-hidden />
            <p className="text-[13px] font-normal text-white/45 w-[76px] leading-tight">
              {nextLabel}
            </p>
          </div>
        ) : null}

        {loading ? <Loader2 className="w-4 h-4 animate-spin text-white/50 shrink-0" /> : null}
      </div>
    </div>
  );
}
