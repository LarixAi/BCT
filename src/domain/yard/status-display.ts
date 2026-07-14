import type { LucideIcon } from "lucide-react";
import {
  CheckCircle2,
  ClipboardCheck,
  LineChart,
  MapPin,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import type { VehicleStatus } from "@/types/yard";

export interface StatusDisplay {
  label: string;
  title?: string;
  icon: LucideIcon;
  tone: string;
}

/** Brand-facing labels for operational vehicle statuses (never colour alone). */
export const STATUS_DISPLAY: Record<VehicleStatus, StatusDisplay> = {
  Available: {
    label: "Ready",
    icon: CheckCircle2,
    tone: "bg-ok/10 text-ok border-ok/20",
  },
  "Awaiting Check": {
    label: "Check due",
    icon: ClipboardCheck,
    tone: "bg-warn/10 text-warn border-warn/30",
  },
  "On Departure Line": {
    label: "Ready for service",
    icon: LineChart,
    tone: "bg-primary/10 text-primary border-primary/20",
  },
  "In Workshop": {
    label: "Awaiting maintenance",
    icon: Wrench,
    tone: "bg-secondary text-muted border-border",
  },
  VOR: {
    label: "VOR",
    title: "Vehicle off road",
    icon: ShieldAlert,
    tone: "bg-vor/10 text-vor border-vor/20",
  },
  "Off-site": {
    label: "Off site",
    icon: MapPin,
    tone: "bg-secondary text-muted border-border",
  },
};

export function statusLabel(status: VehicleStatus): string {
  return STATUS_DISPLAY[status].label;
}
