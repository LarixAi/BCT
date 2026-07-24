import type { Company, Depot } from "@/types/tenancy";
import type { YardRole } from "@/types/permissions";

export const MOCK_COMPANIES: Company[] = [
  { id: "co_bct", name: "Brent Community Transport", status: "active" },
  { id: "co_northwest", name: "Northwest Passenger Transport", status: "active" },
  { id: "co_metro", name: "Metro Regional Coaches", status: "active" },
];

export const MOCK_DEPOTS: Depot[] = [
  {
    id: "dep_bct_main",
    companyId: "co_bct",
    name: "BCT Main Depot",
    code: "BCT-MAIN",
    address: "Wembley, London",
    timezone: "Europe/London",
    vehiclesOnSite: 22,
    vehiclesVor: 2,
    openDefects: 1,
    outstandingChecks: 2,
    activeAlerts: 0,
  },
  {
    id: "dep_b3",
    companyId: "co_northwest",
    name: "North Bolton",
    code: "B3",
    address: "Manchester Rd, Bolton BL3 2QG",
    timezone: "Europe/London",
    vehiclesOnSite: 18,
    vehiclesVor: 2,
    openDefects: 4,
    outstandingChecks: 3,
    activeAlerts: 1,
  },
  {
    id: "dep_a1",
    companyId: "co_northwest",
    name: "Atherton",
    code: "A1",
    address: "Leigh Rd, Atherton M46 0AQ",
    timezone: "Europe/London",
    vehiclesOnSite: 12,
    vehiclesVor: 1,
    openDefects: 2,
    outstandingChecks: 1,
    activeAlerts: 0,
  },
  {
    id: "dep_m2",
    companyId: "co_metro",
    name: "Manchester Central",
    code: "M2",
    address: "Store St, Manchester M1 2WD",
    timezone: "Europe/London",
    vehiclesOnSite: 24,
    vehiclesVor: 3,
    openDefects: 6,
    outstandingChecks: 5,
    activeAlerts: 2,
  },
];

export const DEFAULT_MOCK_ROLE: YardRole = "yard_manager";

export function depotsForCompany(companyId: string): Depot[] {
  return MOCK_DEPOTS.filter(d => d.companyId === companyId);
}
