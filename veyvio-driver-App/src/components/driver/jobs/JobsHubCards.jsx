import { ChevronRight, MapPin, Clock, Car } from "lucide-react";
import { Link } from "react-router-dom";

const statusStyles = {
  in_progress: "bg-[#1eaeae]/10 text-[#158888] border-[#1eaeae]/25",
  assigned: "bg-gray-100 text-gray-700 border-gray-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

function StatusPill({ status }) {
  const key = status?.replace(/-/g, "_") ?? "assigned";
  const cls = statusStyles[key] ?? statusStyles.assigned;
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${cls}`}>
      {status?.replace(/_/g, " ") ?? "assigned"}
    </span>
  );
}

export function JobsHubSectionHeader({ title, count, to }) {
  const inner = (
    <div className="flex items-center justify-between py-1">
      <h2 className="text-lg font-black text-black">{title}</h2>
      <div className="flex items-center gap-1 text-gray-500">
        {count != null ? <span className="text-xs font-semibold">{count}</span> : null}
        {to ? <ChevronRight className="w-5 h-5" /> : null}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block active:opacity-70">
        {inner}
      </Link>
    );
  }

  return inner;
}

export function JobHubCard({
  job,
  variant = "default",
  onPress,
  action,
}) {
  const isCurrent = variant === "current";
  const Wrapper = onPress ? "button" : Link;
  const wrapperProps = onPress
    ? { type: "button", onClick: onPress }
    : { to: `/job/${job.id}` };

  return (
    <div
      className={`rounded-2xl border overflow-hidden max-w-full min-w-0 ${
        isCurrent ? "border-[#1eaeae]/30 bg-[#1eaeae]/5 shadow-sm" : "border-gray-200 bg-white"
      }`}
    >
      <Wrapper
        {...wrapperProps}
        className="w-full text-left p-4 active:opacity-80 block"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-black text-sm leading-snug">{job.routeName}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {job.startTime}
              </span>
              {job.vehicleRegistration ? (
                <span className="inline-flex items-center gap-1">
                  <Car className="w-3.5 h-3.5" />
                  {job.vehicleRegistration}
                </span>
              ) : null}
            </div>
            <div className="mt-2 flex items-start gap-1.5 text-xs text-gray-600 min-w-0">
              <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span className="line-clamp-2 break-words min-w-0">
                {job.pickupLabel}
                {job.dropoffLabel ? ` → ${job.dropoffLabel}` : ""}
              </span>
            </div>
            {job.phvStatusHint ? (
              <p className="mt-2 text-[11px] font-medium text-[#1eaeae] line-clamp-2 break-words">
                {job.phvStatusHint}
              </p>
            ) : null}
            <div className="mt-2">
              <StatusPill status={job.status} />
              {job.needsAccept ? (
                <span className="ml-2 text-[10px] font-semibold text-amber-700">Awaiting your accept</span>
              ) : null}
            </div>
          </div>
          {!action ? <ChevronRight className="w-5 h-5 text-gray-400 shrink-0 mt-1" /> : null}
        </div>
      </Wrapper>
      {action ? <div className="px-4 pb-4 pt-0">{action}</div> : null}
    </div>
  );
}

export function OfferHubCard({ offer, onAccept, busy }) {
  return (
    <div className="rounded-2xl border border-orange-200 bg-orange-50/40 overflow-hidden">
      <div className="p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">Available job</p>
        <p className="font-bold text-black text-sm mt-1 leading-snug">{offer.routeName}</p>
        {offer.jobNumber ? <p className="text-xs text-gray-500 mt-0.5">{offer.jobNumber}</p> : null}
        <p className="text-xs text-gray-600 mt-2">
          {offer.serviceDate} · {offer.startTime}
          {offer.passengerCount != null ? ` · ${offer.passengerCount} pax` : ""}
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAccept?.(offer)}
          className="mt-3 w-full h-11 rounded-xl bg-black text-white text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          {busy ? "Accepting…" : "Accept job"}
        </button>
      </div>
    </div>
  );
}
