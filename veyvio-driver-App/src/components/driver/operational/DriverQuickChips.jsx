import { Link } from "react-router-dom";
import { op } from "@/lib/driver-operational-theme";

export default function DriverQuickChips({ items }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
      {items.map((item) => {
        const Icon = item.icon;
        const base =
          "shrink-0 inline-flex items-center gap-2 min-h-[44px] rounded-full border px-4 py-2.5 text-sm font-medium transition-colors";

        if (item.disabled) {
          return (
            <span
              key={item.label}
              className={`${base} ${op.cardMuted} opacity-45 text-muted-foreground border-border`}
              aria-disabled="true"
            >
              {Icon ? <Icon className="w-4 h-4" aria-hidden /> : null}
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.label}
            to={item.to}
            className={`${base} ${op.card} border-border text-foreground active:bg-muted/50`}
          >
            {Icon ? <Icon className="w-4 h-4 text-[#1eaeae]" aria-hidden /> : null}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
