import { cn } from "@/lib/utils";
import { MapStatusOverlay } from "./MapStatusOverlay";

export function JourneyMapPlaceholder({
  highlight = "current",
  fullBleed = false,
  className,
}: {
  highlight?: "current" | "diversion" | "off-route";
  fullBleed?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gradient-to-br from-secondary via-background to-secondary",
        !fullBleed && "rounded-md",
        className,
      )}
      aria-hidden
    >
      <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 360 200">
        <path d="M40 160 Q120 40 200 100 T320 60" fill="none" stroke="#2F6BFF" strokeWidth="4" strokeLinecap="round" />
        <circle cx="40" cy="160" r="6" fill="#178C4B" />
        <circle cx="200" cy="100" r="8" fill="#2F6BFF" />
        <circle cx="320" cy="60" r="6" fill="#E4E7EC" />
      </svg>
      <MapStatusOverlay highlight={highlight} />
    </div>
  );
}
