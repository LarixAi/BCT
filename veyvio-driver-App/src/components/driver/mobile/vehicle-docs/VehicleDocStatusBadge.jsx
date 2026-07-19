const BADGE_STYLES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  muted: "bg-gray-100 text-gray-700 ring-gray-500/10",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
};

export default function VehicleDocStatusBadge({ status, className = "" }) {
  if (!status?.label) return null;
  const style = BADGE_STYLES[status.tone] || BADGE_STYLES.muted;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style} ${className}`}
    >
      {status.label}
    </span>
  );
}

const HERO_STYLES = {
  green: "bg-emerald-50 border-emerald-100",
  muted: "bg-gray-50 border-gray-200",
  amber: "bg-amber-50 border-amber-100",
  red: "bg-red-50 border-red-100",
};

const HERO_TEXT = {
  green: "text-emerald-800",
  muted: "text-gray-800",
  amber: "text-amber-900",
  red: "text-red-800",
};

export function VehicleDocStatusHero({ status, title, subtitle }) {
  const heroStyle = HERO_STYLES[status?.tone] || HERO_STYLES.muted;
  const textStyle = HERO_TEXT[status?.tone] || HERO_TEXT.muted;

  return (
    <div className={`rounded-2xl border p-4 ${heroStyle}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Status</p>
          <p className={`text-lg font-bold leading-snug ${textStyle}`}>{status?.label}</p>
          {subtitle ? <p className="text-sm text-gray-600 mt-1 leading-relaxed">{subtitle}</p> : null}
        </div>
        <VehicleDocStatusBadge status={status} />
      </div>
      {title ? (
        <p className="text-sm text-gray-600 mt-3 pt-3 border-t border-black/5 leading-snug">{title}</p>
      ) : null}
    </div>
  );
}
