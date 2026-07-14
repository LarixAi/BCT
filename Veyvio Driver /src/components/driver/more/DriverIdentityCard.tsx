import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import {
  approvalStatusIcon,
  approvalStatusLabel,
  driverTypeLabel,
} from "@/domain/more/more-helpers";
import type { DriverIdentity } from "@/types/more";
import { HomeCard } from "@/components/driver/home/HomeCard";
import { cn } from "@/lib/utils";

export function DriverIdentityCard({ identity }: { identity: DriverIdentity }) {
  const StatusIcon = approvalStatusIcon(identity.approvalStatus);
  const isApproved = identity.approvalStatus === "approved";

  return (
    <HomeCard tone="navy">
      <div className="flex items-start gap-3">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-white">
          {identity.initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-extrabold tracking-tight">{identity.legalName}</h2>
          <p
            className={cn(
              "mt-1 flex items-center gap-1.5 text-sm font-medium",
              isApproved ? "text-ok" : "text-warn",
            )}
          >
            <StatusIcon className="size-4 shrink-0" aria-hidden />
            {approvalStatusLabel(identity.approvalStatus)}
          </p>
          <p className="mt-2 font-mono text-xs text-muted">Driver ID: {identity.id}</p>
          <p className="text-sm text-muted">{identity.depotName}</p>
          <p className="text-xs text-muted">{driverTypeLabel(identity.driverType)}</p>
        </div>
        <Link
          to="/more/profile"
          className="flex shrink-0 items-center gap-0.5 text-xs font-semibold text-link"
        >
          View profile
          <ChevronRight className="size-3" />
        </Link>
      </div>
    </HomeCard>
  );
}
