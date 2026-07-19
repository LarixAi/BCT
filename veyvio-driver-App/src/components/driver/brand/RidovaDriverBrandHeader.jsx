import { RidovaDriverLogo } from "@/components/driver/brand/RidovaDriverLogo";
import { cn } from "@/lib/utils";

export default function RidovaDriverBrandHeader({
  className = "",
  centered = false,
  compact = false,
  tone = "light",
  showLogo = true,
  showSubtitle = true,
}) {
  const dark = tone === "dark";

  if (centered) {
    return (
      <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
        {showLogo ? <RidovaDriverLogo size={compact ? "md" : "lg"} /> : null}
        {showSubtitle ? (
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ridova-teal)]">Driver</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {showLogo ? <RidovaDriverLogo size={compact ? "sm" : "md"} /> : null}
      <div className="min-w-0 flex flex-col leading-tight">
        <span
          className={cn(
            "truncate font-semibold tracking-tight",
            compact ? "text-sm" : "text-base",
            dark ? "text-white" : "text-[var(--ridova-navy)]",
          )}
        >
          Veyvio
        </span>
        {showSubtitle ? (
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--ridova-teal)]">Driver</span>
        ) : null}
      </div>
    </div>
  );
}
