import { Accessibility, Dog, Eye, Heart, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PassengerProfile } from "@/types/passenger";
import { mobilityCategoryLabel } from "@/domain/passenger/passenger-profiles";
import { cn } from "@/lib/utils";

export function mobilityIcon(category: PassengerProfile["mobilityCategory"]): LucideIcon {
  switch (category) {
    case "wheelchair_user":
      return Accessibility;
    case "visual_impairment":
      return Eye;
    case "learning_disability":
      return Users;
    case "hidden_disability":
      return Heart;
    default:
      return Users;
  }
}

export function PassengerProfileCard({
  profile,
  compact = false,
  className,
}: {
  profile: PassengerProfile;
  compact?: boolean;
  className?: string;
}) {
  const Icon = profile.assistanceAnimal ? Dog : mobilityIcon(profile.mobilityCategory);

  if (compact) {
    return (
      <div className={cn("rounded-xl border border-border bg-card p-3", className)}>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-link/10">
            <Icon className="size-5 text-link" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{profile.preferredName ?? profile.displayName}</p>
            <p className="text-sm text-muted">{profile.journeySummary}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className={cn("space-y-4 rounded-xl border border-border bg-card p-4", className)}>
      <header className="flex items-start gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-link/10">
          <Icon className="size-6 text-link" aria-hidden />
        </div>
        <div>
          <h2 className="font-display text-lg font-extrabold">{profile.displayName}</h2>
          <p className="text-sm text-muted">{mobilityCategoryLabel(profile.mobilityCategory)}</p>
          <p className="mt-1 text-sm">{profile.journeySummary}</p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {profile.wheelchairUser && (
          <span className="rounded-full bg-link/15 px-2 py-0.5 text-xs font-bold text-link">Wheelchair</span>
        )}
        {profile.assistanceAnimal && (
          <span className="rounded-full bg-link/15 px-2 py-0.5 text-xs font-bold text-link">Assistance dog</span>
        )}
        {profile.vulnerabilityFlag && (
          <span className="rounded-full bg-warn/15 px-2 py-0.5 text-xs font-bold text-warn">Vulnerable passenger</span>
        )}
        {profile.safeguardingNotes && (
          <span className="inline-flex items-center gap-1 rounded-full bg-vor/15 px-2 py-0.5 text-xs font-bold text-vor">
            <Shield className="size-3" aria-hidden />
            Safeguarding
          </span>
        )}
      </div>

      {profile.assistanceAnimalNotes && (
        <p className="rounded-xs border border-border bg-secondary/30 px-3 py-2 text-sm">{profile.assistanceAnimalNotes}</p>
      )}

      {profile.accessibilityNeeds.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">What you need to do</h3>
          <ul className="space-y-2">
            {profile.accessibilityNeeds.map((need) => (
              <li key={need.id} className="rounded-xs border border-border px-3 py-2 text-sm">
                <p className="font-semibold">{need.label}</p>
                <p className="mt-1 text-muted">{need.driverAction}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.communicationNotes.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Communication</h3>
          <ul className="list-inside list-disc text-sm text-muted">
            {profile.communicationNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {profile.boardingAssistance.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Boarding</h3>
          <ul className="list-inside list-disc text-sm text-muted">
            {profile.boardingAssistance.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      {profile.handoverRequirements && (
        <section className="space-y-1">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted">Handover</h3>
          <p className="text-sm font-medium">{profile.handoverRequirements}</p>
        </section>
      )}

      {profile.safeguardingNotes && (
        <p className="rounded-xs border border-vor/30 bg-vor/10 px-3 py-2 text-sm text-vor">{profile.safeguardingNotes}</p>
      )}
    </article>
  );
}
