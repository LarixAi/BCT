import type { Vehicle } from "@/types/yard";

export function kpiCounts(vehicles: Vehicle[]) {
  const c = { available: 0, vor: 0, awaiting: 0, onLine: 0, workshop: 0, offSite: 0 };
  for (const v of vehicles) {
    if (v.status === "Available") c.available++;
    else if (v.status === "VOR") c.vor++;
    else if (v.status === "Awaiting Check") c.awaiting++;
    else if (v.status === "On Departure Line") c.onLine++;
    else if (v.status === "In Workshop") c.workshop++;
    else if (v.status === "Off-site") c.offSite++;
  }
  return c;
}
