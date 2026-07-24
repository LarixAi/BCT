import { drivers } from "@/data/fixtures";
import type { BootstrapDataSource } from "@/data/mocks/bootstrap";
import { isDemoDataSource } from "@/platform/yard/data-source";

/** Fixture driver names are only valid in demo/mock mode — never mix into live Command data. */
export function resolveDemoDriverName(
  driverId: string | undefined,
  dataSource?: BootstrapDataSource | null,
): string | undefined {
  if (!driverId || !isDemoDataSource(dataSource)) return undefined;
  return drivers.find(d => d.id === driverId)?.name;
}
