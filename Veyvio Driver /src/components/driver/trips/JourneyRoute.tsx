import type { ReactNode } from "react";

export function JourneyRoute({
  origin,
  destination,
  compact = false,
}: {
  origin: string;
  destination: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "space-y-1 text-sm" : "space-y-2 rounded-lg border border-border bg-background/60 p-3"}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Start</p>
        <p className="font-medium leading-snug">{origin}</p>
      </div>
      <p className="text-muted" aria-hidden>
        ↓
      </p>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted">End</p>
        <p className="font-medium leading-snug">{destination}</p>
      </div>
    </div>
  );
}

export function AssignmentMetadataRow({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

export function VehicleRow({ registration }: { registration?: string }) {
  if (!registration) return null;
  return <p className="font-mono text-xs text-muted">Vehicle: {registration}</p>;
}

export function buildMetadataSummary(meta: {
  passengerCount?: number;
  stopCount?: number;
  pickupCount?: number;
  dropoffCount?: number;
  wheelchairRequired?: boolean;
  childPassenger?: boolean;
  escortRequired?: boolean;
  passengersCollected?: number;
}): string {
  const parts: string[] = [];

  if (meta.passengersCollected != null && meta.passengerCount != null) {
    parts.push(`${meta.passengersCollected} of ${meta.passengerCount} passengers collected`);
  } else if (meta.passengerCount != null) {
    parts.push(`${meta.passengerCount} passenger${meta.passengerCount === 1 ? "" : "s"}`);
  }

  if (meta.pickupCount != null && meta.dropoffCount != null) {
    parts.push(`${meta.pickupCount} pickups · ${meta.dropoffCount} drop-off locations`);
  } else if (meta.stopCount != null) {
    parts.push(`${meta.stopCount} stops`);
  }

  const access: string[] = [];
  if (meta.wheelchairRequired) access.push("Wheelchair required");
  if (meta.childPassenger) access.push("Child passenger");
  if (meta.escortRequired) access.push("Escort required");
  if (access.length) parts.push(access.join(" · "));

  return parts.join(" · ");
}
