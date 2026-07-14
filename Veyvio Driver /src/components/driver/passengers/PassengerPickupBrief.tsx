import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { buildPickupChecklist } from "@/domain/passenger/passenger-pickup";
import { listProfilesForDuty } from "@/domain/passenger/passenger-profiles";
import type { PassengerProfile } from "@/types/passenger";
import { PassengerProfileCard } from "@/components/driver/passengers/PassengerProfileCard";

export function PassengerPickupBrief({
  dutyId,
  profile,
  showChecklist = true,
}: {
  dutyId: string;
  profile: PassengerProfile;
  showChecklist?: boolean;
}) {
  const checklist = buildPickupChecklist(profile);

  return (
    <section className="space-y-3 rounded-xl border border-link/25 bg-link/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-link">Passenger at this stop</p>
          <p className="mt-1 font-semibold">{profile.preferredName ?? profile.displayName}</p>
          <p className="text-sm text-muted">{profile.journeySummary}</p>
        </div>
        <Link
          to="/duties/$dutyId/passengers/$passengerId"
          params={{ dutyId, passengerId: profile.id }}
          className="inline-flex items-center gap-1 text-xs font-bold text-link"
        >
          Full profile
          <ChevronRight className="size-3" aria-hidden />
        </Link>
      </div>

      {showChecklist && checklist.length > 0 && (
        <ul className="space-y-2 border-t border-link/15 pt-3">
          {checklist.map((item) => (
            <li key={item.id} className="text-sm">
              <p className="font-medium">{item.label}</p>
              {item.detail && <p className="text-xs text-muted">{item.detail}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PassengerManifestHomeCard({
  dutyId,
  passengerIds,
}: {
  dutyId: string;
  passengerIds: string[];
}) {
  const profiles = listProfilesForDuty(passengerIds);

  if (profiles.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted">
          Passenger needs on this journey
        </h2>
        <Link to="/duties/$dutyId/passengers" params={{ dutyId }} className="text-xs font-bold text-link">
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {profiles.slice(0, 4).map((profile) => (
          <Link
            key={profile.id}
            to="/duties/$dutyId/passengers/$passengerId"
            params={{ dutyId, passengerId: profile.id }}
          >
            <PassengerProfileCard profile={profile} compact className="hover:bg-secondary/40" />
          </Link>
        ))}
      </div>
    </section>
  );
}
