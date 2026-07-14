import { Link } from "@tanstack/react-router";
import type { DriverHomeSummary } from "@/types/home";
import { HomeCard, HomeCardLabel, HomeCardTitle } from "./HomeCard";
import { Button } from "@/components/ui/button";
import { operationsTelHref } from "@/platform/ops-contacts";

const CHECKLIST = [
  "Return vehicle or confirm parking location",
  "Record final mileage",
  "Record fuel or battery level",
  "Complete vehicle walkaround",
  "Confirm no passengers remain onboard",
  "Check for lost property",
  "Report new damage",
  "Return keys or equipment",
  "Complete incident/debrief requirements",
];

export function EndOfDutyCard({ dutyId }: { dutyId?: string }) {
  return (
    <HomeCard tone="green">
      <HomeCardLabel>End of duty</HomeCardLabel>
      <HomeCardTitle>Ready to finish duty</HomeCardTitle>
      <p className="mt-2 text-sm text-muted">Before ending duty:</p>
      <ul className="mt-2 space-y-1 text-sm">
        {CHECKLIST.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="text-muted">·</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {dutyId ? (
        <Button asChild className="mt-4 h-12 w-full bg-ok font-bold uppercase tracking-widest text-white hover:bg-ok/90">
          <Link to="/duties/$dutyId/journey/end" params={{ dutyId }}>
            Begin end-of-duty checks
          </Link>
        </Button>
      ) : (
        <Button
          className="mt-4 h-12 w-full bg-ok font-bold uppercase tracking-widest text-white opacity-60"
          disabled
        >
          Begin end-of-duty checks
        </Button>
      )}
      {!dutyId ? (
        <p className="mt-2 text-xs text-muted">No active duty to close.</p>
      ) : null}
    </HomeCard>
  );
}

export function BlockedCard({ summary }: { summary: DriverHomeSummary }) {
  const opsHref = operationsTelHref();
  const dutyId = summary.duty.dutyId;

  return (
    <HomeCard tone="red">
      <HomeCardLabel>Safety / compliance</HomeCardLabel>
      <HomeCardTitle>Work blocked</HomeCardTitle>
      <p className="mt-2 text-sm">
        {summary.blockReason ?? "You cannot continue until the issue below is resolved."}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {dutyId ? (
          <Button asChild variant="outline" className="h-11 w-full border-vor text-vor">
            <Link to="/duties/$dutyId" params={{ dutyId }}>
              View blocked-duty details
            </Link>
          </Button>
        ) : null}
        {opsHref ? (
          <Button asChild className="h-11 w-full">
            <a href={opsHref}>Contact Operations</a>
          </Button>
        ) : (
          <Button asChild className="h-11 w-full">
            <Link to="/more/support">Contact Operations</Link>
          </Button>
        )}
      </div>
    </HomeCard>
  );
}
