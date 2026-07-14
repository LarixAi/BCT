import type { Company, Depot } from "@/types/tenancy";

export const MOCK_COMPANIES: Company[] = [
  { id: "co_northwest", name: "Northwest Passenger Transport", status: "active" },
  { id: "co_metro", name: "Metro Regional Coaches", status: "active" },
];

export const MOCK_DEPOTS: Depot[] = [
  {
    id: "dep_b3",
    companyId: "co_northwest",
    name: "Riverside Depot",
    code: "B3",
    address: "Manchester Rd, Bolton BL3 2QG",
  },
  {
    id: "dep_a1",
    companyId: "co_northwest",
    name: "Atherton",
    code: "A1",
    address: "Leigh Rd, Atherton M46 0AQ",
  },
];

export const DEFAULT_DRIVER_ROLE = "driver";

export function depotsForCompany(companyId: string): Depot[] {
  return MOCK_DEPOTS.filter((d) => d.companyId === companyId);
}
