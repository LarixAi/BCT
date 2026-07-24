import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { op } from "@/lib/driver-operational-theme";
import { prefetchDriverRoute } from "@/lib/prefetch-routes";

export default function DriverActionCard({
  to,
  icon: Icon,
  title,
  subtitle,
  disabled = false,
  badge = null,
  compact = false,
  inList = false,
  onClick,
}) {
  const inner = (
    <div
      className={`flex items-center gap-3 ${compact ? "px-4 py-3.5" : "p-4"} ${
        inList
          ? `border-b border-border last:border-b-0 active:bg-muted/60 ${disabled ? "opacity-45 pointer-events-none" : ""}`
          : disabled
            ? "opacity-45 pointer-events-none"
            : op.cardInteractive
      } ${!inList && !disabled ? op.card : inList ? "bg-card" : ""}`}
    >
      <div className={`${op.iconWrap} relative`}>
        <Icon className={`w-5 h-5 ${op.iconTeal}`} aria-hidden="true" />
        {badge ? (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#8ec63f] text-[10px] font-bold text-white flex items-center justify-center">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-medium text-foreground ${compact ? "text-[15px]" : ""}`}>{title}</p>
        {subtitle ? <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p> : null}
      </div>
      {!disabled ? <ChevronRight className="w-5 h-5 text-muted-foreground/60 shrink-0" aria-hidden="true" /> : null}
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {inner}
      </button>
    );
  }
  if (disabled || !to) return inner;
  return (
    <Link
      to={to}
      onMouseEnter={() => prefetchDriverRoute(to)}
      onFocus={() => prefetchDriverRoute(to)}
      onTouchStart={() => prefetchDriverRoute(to)}
    >
      {inner}
    </Link>
  );
}
