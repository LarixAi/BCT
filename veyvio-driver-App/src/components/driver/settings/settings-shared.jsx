import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { op } from "@/lib/driver-operational-theme";

export function SettingsLinkRow({ to, icon: Icon, label, description }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 py-4 border-b border-border last:border-b-0 active:bg-muted/60 px-4 bg-card"
    >
      <div className={op.iconWrap}>
        <Icon className={`w-5 h-5 ${op.iconTeal}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        {description ? <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p> : null}
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
    </Link>
  );
}

export function SettingsContactRow({ href, icon: Icon, label, value }) {
  return (
    <a href={href} className={`flex items-center gap-3 p-4 ${op.cardInteractive}`}>
      <div className={op.iconWrap}>
        <Icon className={`w-4 h-4 ${op.iconTeal}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="text-[15px] font-semibold text-foreground truncate">{value}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" />
    </a>
  );
}

export function SettingsTabChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 inline-flex items-center min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-medium transition-colors",
        active ? op.tabActive : `${op.card} border-border text-muted-foreground active:bg-muted/50`,
      )}
    >
      {label}
    </button>
  );
}

export function SettingsToggle({ checked, onChange, "aria-label": ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors",
        checked ? op.toggleOn : "bg-muted",
      )}
    >
      <span
        className={cn(
          "inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform mt-0.5",
          checked ? "translate-x-5" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function SettingsDetailRows({ rows }) {
  return (
    <div className={`${op.listCard} divide-y divide-border`}>
      {rows.map((row) => (
        <div key={row.label} className="px-4 py-3.5 bg-card">
          <p className="text-xs font-medium text-muted-foreground">{row.label}</p>
          <p className={`text-sm font-medium mt-0.5 text-foreground ${row.mono ? "font-mono" : ""}`}>
            {row.value || "—"}
          </p>
        </div>
      ))}
    </div>
  );
}

export function SettingsField({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
