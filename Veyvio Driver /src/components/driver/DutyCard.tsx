import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { DutySummary } from "@/types/duty";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatTime } from "@/lib/utils";

const statusVariant: Record<string, "default" | "primary" | "ok" | "warn"> = {
  published: "default",
  delivered: "primary",
  acknowledged: "ok",
  ready: "ok",
  in_progress: "primary",
  completed: "default",
  declined: "warn",
};

export function DutyCard({ duty }: { duty: DutySummary }) {
  return (
    <Link to="/trips" search={{ demo: "normal", dutyId: duty.id }}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
          <div>
            <CardTitle>{duty.reference}</CardTitle>
            <p className="text-sm text-muted-foreground">{duty.routeName}</p>
          </div>
          <Badge variant={statusVariant[duty.lifecycleStatus] ?? "default"}>
            {duty.lifecycleStatus.replace(/_/g, " ")}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            {formatDate(duty.dutyDate)} · {formatTime(duty.startTime)} – {formatTime(duty.endTime)}
          </p>
          <p className="text-muted-foreground">{duty.reportingLocation}</p>
          {duty.vehicle && (
            <p className="font-mono text-xs">
              {duty.vehicle.registrationNumber} · {duty.vehicle.fleetNumber}
            </p>
          )}
          <div className="flex items-center justify-between pt-1 text-link">
            <span className="text-xs font-semibold uppercase tracking-wide">
              {duty.passengerCount} passengers{duty.escortRequired ? " · Escort" : ""}
            </span>
            <ChevronRight className="size-4" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
