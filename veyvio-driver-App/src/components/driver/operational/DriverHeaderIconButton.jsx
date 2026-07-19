import { Link } from "react-router-dom";
import { Shield, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const VARIANTS = {
  outline:
    "border border-[var(--ridova-teal)]/40 bg-card text-[var(--ridova-teal)] shadow-sm hover:bg-[var(--ridova-teal)]/5",
  filled:
    "border border-border/60 bg-muted text-foreground shadow-sm hover:bg-muted/80",
};

/** Circular header control — outline (safety) or filled (settings/filters). */
export function DriverHeaderIconButton({
  to,
  onClick,
  icon: Icon,
  label,
  variant = "filled",
  className,
  disabled,
}) {
  const classes = cn(
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-50",
    VARIANTS[variant],
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={label}>
        <Icon className="h-5 w-5" aria-hidden />
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes} aria-label={label} disabled={disabled}>
      <Icon className="h-5 w-5" aria-hidden />
    </button>
  );
}

/** Shield (safety) + sliders (settings) — matches Ridova driver chrome. */
export function DriverHeaderActionButtons({
  className,
  onSafetyClick,
  safetyTo,
  onSettingsClick,
  settingsTo = "/profile/settings",
}) {
  return (
    <div className={cn("flex items-center gap-2 shrink-0", className)}>
      <DriverHeaderIconButton
        icon={Shield}
        label="Safety"
        variant="outline"
        onClick={onSafetyClick}
        to={onSafetyClick ? undefined : safetyTo}
      />
      <DriverHeaderIconButton
        icon={SlidersHorizontal}
        label="Settings"
        variant="filled"
        onClick={onSettingsClick}
        to={onSettingsClick ? undefined : settingsTo}
      />
    </div>
  );
}
