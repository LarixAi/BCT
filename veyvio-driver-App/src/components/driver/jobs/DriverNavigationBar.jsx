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
  Volume2,
  VolumeX,
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

function ManeuverBadge({ maneuver }) {
  const name = getManeuverIcon(maneuver);
  const Icon = ICONS[name] ?? Navigation;
  return (
    <div className="w-12 h-12 rounded-full bg-[#2874EA] flex items-center justify-center shrink-0">
      <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
    </div>
  );
}

function ManeuverBadgeCompact({ maneuver }) {
  const name = getManeuverIcon(maneuver);
  const Icon = ICONS[name] ?? Navigation;
  return (
    <div className="w-10 h-10 rounded-full bg-[#2874EA] flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
    </div>
  );
}

export default function DriverNavigationBar({
  instruction,
  maneuver,
  distance,
  duration,
  destination,
  loading,
  error,
  hasArrived,
  routeSource,
  embedded = false,
  compact = false,
  active = true,
  voiceEnabled = true,
  onVoiceToggle,
}) {
  const destinationLabel = destination?.label ?? "destination";

  const displayInstruction = loading
    ? "Calculating route…"
    : error
      ? "Route unavailable — use Google Maps or Waze below"
      : instruction || `Continue to ${destinationLabel}`;

  const metaLine = error
    ? "In-app route failed — external navigation still available"
    : hasArrived
      ? `You have arrived · ${destinationLabel}`
      : [distance, duration, destinationLabel ? `to ${destinationLabel}` : ""]
          .filter(Boolean)
          .join(" · ");

  const showMeta = !compact || error || hasArrived;
  const showAttribution = !compact && !error;

  if (!active) return null;

  const Badge = compact ? ManeuverBadgeCompact : ManeuverBadge;

  return (
    <div
      className={
        embedded
          ? compact
            ? "px-3 py-2 flex items-center gap-2.5"
            : "px-3 py-3 flex items-center gap-3"
          : "pointer-events-auto mx-3 rounded-2xl bg-[#111] text-white shadow-xl px-4 py-3.5 flex items-center gap-3"
      }
    >
      <Badge maneuver={maneuver} />
      <div className="min-w-0 flex-1 text-white">
        <p
          className={
            compact
              ? "text-[13px] font-bold leading-snug line-clamp-1"
              : "text-sm font-black leading-snug line-clamp-2"
          }
        >
          {displayInstruction}
        </p>
        {showMeta ? (
          <p className="text-xs font-semibold text-gray-400 mt-0.5 truncate">{metaLine}</p>
        ) : null}
        {showAttribution && routeSource === "osrm" ? (
          <p className="text-[10px] text-gray-500 mt-0.5">Free OSRM routing — no live traffic</p>
        ) : showAttribution && routeSource === "google" ? (
          <p className="text-[10px] text-gray-500 mt-0.5">Google Essentials — street names, monthly quota</p>
        ) : null}
      </div>
      {loading ? <Loader2 className="w-5 h-5 animate-spin text-gray-400 shrink-0" /> : null}
      {onVoiceToggle ? (
        <button
          type="button"
          aria-label={voiceEnabled ? "Mute navigation voice" : "Unmute navigation voice"}
          aria-pressed={voiceEnabled}
          onClick={onVoiceToggle}
          className={
            compact
              ? "w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0 active:bg-white/20"
              : "w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 active:bg-white/20"
          }
        >
          {voiceEnabled ? (
            <Volume2 className={compact ? "w-4 h-4 text-white" : "w-5 h-5 text-white"} />
          ) : (
            <VolumeX className={compact ? "w-4 h-4 text-gray-400" : "w-5 h-5 text-gray-400"} />
          )}
        </button>
      ) : null}
    </div>
  );
}
