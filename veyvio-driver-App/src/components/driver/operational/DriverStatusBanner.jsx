import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const variants = {
  success: {
    wrap: "bg-emerald-50 border-emerald-200",
    title: "text-emerald-800",
    body: "text-emerald-700",
    icon: CheckCircle2,
    iconClass: "text-emerald-600",
  },
  warning: {
    wrap: "bg-amber-50 border-amber-200",
    title: "text-amber-900",
    body: "text-amber-800/90",
    icon: AlertTriangle,
    iconClass: "text-amber-600",
  },
  info: {
    wrap: "bg-[#1eaeae]/10 border-[#1eaeae]/25",
    title: "text-[#158888]",
    body: "text-[#158888]",
    icon: Info,
    iconClass: "text-[#1eaeae]",
  },
};

export default function DriverStatusBanner({
  variant = "info",
  title,
  children,
  actionLabel,
  actionTo,
  onAction,
}) {
  const v = variants[variant] ?? variants.info;
  const Icon = v.icon;

  return (
    <div className={`rounded-xl border p-3.5 flex gap-3 ${v.wrap}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${v.iconClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${v.title}`}>{title}</p>
        {children ? <div className={`text-sm mt-1 leading-relaxed ${v.body}`}>{children}</div> : null}
        {actionLabel && actionTo ? (
          <Button asChild size="sm" variant="secondary" className="mt-3">
            <Link to={actionTo}>{actionLabel}</Link>
          </Button>
        ) : null}
        {actionLabel && onAction ? (
          <Button size="sm" variant="secondary" className="mt-3" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
