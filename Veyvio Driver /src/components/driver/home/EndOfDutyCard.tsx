import type { DriverHomeSummary } from "@/types/home";
import { HomeCard, HomeCardLabel, HomeCardTitle } from "./HomeCard";
import { Button } from "@/components/ui/button";

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

export function EndOfDutyCard() {
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
      <Button className="mt-4 h-12 w-full bg-ok font-bold uppercase tracking-widest text-white hover:bg-ok/90">
        Begin end-of-duty checks
      </Button>
    </HomeCard>
  );
}

export function BlockedCard({ summary }: { summary: DriverHomeSummary }) {
  return (
    <HomeCard tone="red">
      <HomeCardLabel>Safety / compliance</HomeCardLabel>
      <HomeCardTitle>Work blocked</HomeCardTitle>
      <p className="mt-2 text-sm">
        {summary.blockReason ?? "You cannot continue until the issue below is resolved."}
      </p>
      <Button variant="outline" className="mt-4 h-11 w-full border-vor text-vor">
        Contact operations
      </Button>
    </HomeCard>
  );
}
