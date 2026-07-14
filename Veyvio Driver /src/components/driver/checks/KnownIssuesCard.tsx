import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { KnownIssueSummary } from "@/types/vehicle-check";
import { HomeCard, HomeCardLabel } from "@/components/driver/home/HomeCard";

export function KnownIssuesCard({ issues }: { issues: KnownIssueSummary }) {
  return (
    <HomeCard>
      <HomeCardLabel>Known issues</HomeCardLabel>
      <div className="mt-2 space-y-1 text-sm">
        <p>
          {issues.cosmeticDamageCount} existing cosmetic damage record
          {issues.cosmeticDamageCount === 1 ? "" : "s"}
        </p>
        <p className={issues.openSafetyDefectCount > 0 ? "font-medium text-vor" : "text-muted"}>
          {issues.openSafetyDefectCount > 0
            ? `${issues.openSafetyDefectCount} open safety defect${issues.openSafetyDefectCount === 1 ? "" : "s"}`
            : "No open safety defects"}
        </p>
      </div>
      <Link
        to="/checks/known-issues"
        className="mt-3 flex items-center justify-between text-sm font-semibold text-link"
      >
        View
        <ChevronRight className="size-4" />
      </Link>
    </HomeCard>
  );
}
