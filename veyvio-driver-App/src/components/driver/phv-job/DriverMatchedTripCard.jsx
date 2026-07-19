import { AlertTriangle, Car, Clock, MapPin, Navigation, User, Users } from "lucide-react";
import {
  formatMinutesLabel,
  formatPence,
  formatPenceOrPlaceholder,
  resolveCustomerFarePence,
  resolveDriverEarningsPence,
  resolveMatchedTripHeadline,
  resolveMatchedTripSubtitle,
} from "@/lib/matchedTripDisplay";
import { formatUkDateTime } from "@/lib/uk-locale";

function RouteLeg({ label, summary, eta, address, isLast = false }) {
  return (
    <div className="flex gap-3 min-w-0">
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div className="h-3 w-3 rounded-full border-2 border-black bg-white" />
        {!isLast ? <div className="mt-1 w-0.5 flex-1 min-h-[2rem] bg-black/20" /> : null}
      </div>
      <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-black/45">{label}</p>
          {eta ? (
            <p className="text-[11px] font-bold text-[#1eaeae] tabular-nums shrink-0">ETA {eta}</p>
          ) : null}
        </div>
        {summary ? <p className="text-xs font-semibold text-black/70 mt-0.5">{summary}</p> : null}
        <p className="mt-1 text-sm text-black leading-snug break-words">{address}</p>
      </div>
    </div>
  );
}

function DetailChip({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2.5 py-1 text-[11px] font-medium text-black/70 max-w-full">
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

function EtaPill({ icon: Icon, label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 min-w-0 flex-1">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-black/45">
        {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
        <span>{label}</span>
      </div>
      <p className="mt-1 text-sm font-bold text-black tabular-nums">{value}</p>
    </div>
  );
}

function NoteBlock({ title, text }) {
  if (!text?.trim()) return null;
  return (
    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800">{title}</p>
          <p className="mt-1 text-sm text-amber-950 leading-snug break-words">{text}</p>
        </div>
      </div>
    </div>
  );
}

export default function DriverMatchedTripCard({ trip, legs, onStartNavigation, busy = false }) {
  const booking = trip?.booking;
  const headline = resolveMatchedTripHeadline(trip, booking);
  const subtitle = resolveMatchedTripSubtitle(trip, booking);
  const customerFarePence = resolveCustomerFarePence(booking);
  const driverEarningsPence = resolveDriverEarningsPence(booking);
  const earningsLabel = formatPence(driverEarningsPence);
  const customerFareLabel = formatPence(customerFarePence);
  const pickupTime = booking?.scheduledPickupAt ?? trip?.scheduledStartAt;

  const passengerBits = [];
  if (booking?.passengerCount) {
    passengerBits.push(
      `${booking.passengerCount} passenger${booking.passengerCount === 1 ? "" : "s"}`,
    );
  }
  if (booking?.luggageCount) {
    passengerBits.push(`${booking.luggageCount} bag${booking.luggageCount === 1 ? "" : "s"}`);
  }
  if (booking?.childSeatRequired) passengerBits.push("Child seat");
  if (booking?.wheelchairRequired) passengerBits.push("Wheelchair");

  const specialNotes = [booking?.accessibilityNotes, booking?.customerNotes].filter(Boolean).join(" · ");

  const pickupEtaValue =
    legs?.pickup?.eta && legs?.pickup?.summary
      ? `${legs.pickup.eta} · ${legs.pickup.summary}`
      : legs?.pickup?.summary ?? (legs?.pickup?.eta ? `ETA ${legs.pickup.eta}` : null);

  const tripEtaValue =
    legs?.dropoff?.eta && legs?.dropoff?.summary
      ? `${legs.dropoff.eta} · ${legs.dropoff.summary}`
      : legs?.dropoff?.summary ?? (legs?.dropoff?.eta ? `ETA ${legs.dropoff.eta}` : null);

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden">
      <h2 className="text-center text-lg font-bold text-black mb-3 px-1">Matched to trip</h2>

      <div className="rounded-2xl border border-black/15 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.10)] overflow-hidden flex flex-col">
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white shrink-0">
              <User className="h-3.5 w-3.5" aria-hidden />
              Private hire
            </span>
            {booking?.reference ? (
              <span className="text-[11px] font-medium text-black/45 truncate">{booking.reference}</span>
            ) : trip?.jobNumber ? (
              <span className="text-[11px] font-medium text-black/45 truncate">{trip.jobNumber}</span>
            ) : null}
          </div>

          <div className="min-w-0">
            <p className="text-lg font-bold text-black leading-snug break-words">{headline}</p>
            {subtitle ? (
              <p className="mt-1 text-sm text-black/55 leading-snug break-words flex items-start gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                <span>{subtitle}</span>
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-black/45">Your earnings</p>
              <p className="text-[2rem] font-bold leading-none tracking-tight text-black">
                {earningsLabel ?? formatPenceOrPlaceholder(null)}
              </p>
            </div>
            {customerFareLabel && customerFareLabel !== earningsLabel ? (
              <p className="text-xs font-medium text-black/45 pb-1">Total fare {customerFareLabel}</p>
            ) : null}
          </div>

          {pickupEtaValue || tripEtaValue ? (
            <div className="flex gap-2">
              <EtaPill icon={Navigation} label="To pickup" value={pickupEtaValue} />
              <EtaPill icon={Clock} label="Trip" value={tripEtaValue} />
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {pickupTime ? <DetailChip icon={Clock}>{formatUkDateTime(pickupTime)}</DetailChip> : null}
            {passengerBits.length ? (
              <DetailChip icon={Users}>{passengerBits.join(" · ")}</DetailChip>
            ) : null}
            {trip?.vehicleRegistration ? (
              <DetailChip icon={Car}>{trip.vehicleRegistration}</DetailChip>
            ) : null}
            {trip?.jobNumber ? <DetailChip>{trip.jobNumber}</DetailChip> : null}
          </div>

          <div className="border-t border-black/10 pt-4">
            <RouteLeg
              label="Pickup"
              summary={legs?.pickup?.summary}
              eta={legs?.pickup?.eta}
              address={legs?.pickup?.address ?? booking?.pickupAddress ?? "Pickup location"}
            />
            <RouteLeg
              label="Drop-off"
              summary={legs?.dropoff?.summary}
              eta={legs?.dropoff?.eta}
              address={legs?.dropoff?.address ?? booking?.destinationAddress ?? "Destination"}
              isLast
            />
          </div>

          <NoteBlock title="Special requirements" text={specialNotes} />
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={onStartNavigation}
        className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-black text-base font-bold text-white disabled:opacity-60"
      >
        <Navigation className="h-5 w-5" aria-hidden />
        {busy ? "Opening Google Maps…" : "Start navigation to pickup"}
      </button>
      <p className="mt-2 text-center text-[11px] text-black/45 leading-relaxed px-2">
        Opens Google Maps, then returns you to the trip screen for PIN and progress steps.
      </p>
    </div>
  );
}
