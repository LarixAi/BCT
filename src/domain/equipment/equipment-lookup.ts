import type { AssignedItem, VehicleEquipment } from "@/types/equipment";
import { parseEquipmentQrPayload } from "@/domain/equipment/equipment-qr";
import { normalizeScanInput } from "@/domain/scan/normalize-scan-input";

export interface LocatedAssignedItem {
  vehicleId: string;
  vehicleReg: string;
  item: AssignedItem;
}

export interface ScannableEquipmentRow {
  vehicleId: string;
  vehicleReg: string;
  bayId: string;
  item: AssignedItem;
  scanValue: string;
}

function matchesAsset(item: AssignedItem, assetId: string): boolean {
  const needle = assetId.trim().toLowerCase();
  return (
    item.id.toLowerCase() === needle ||
    (item.qrCode?.toLowerCase() ?? "") === needle
  );
}

export function findAssignedEquipmentAsset(
  equipment: Record<string, VehicleEquipment>,
  vehicles: { id: string; reg: string }[],
  query: string,
): LocatedAssignedItem | null {
  const normalized = normalizeScanInput(query);
  const parsed = parseEquipmentQrPayload(normalized);
  const assetId = parsed ?? normalized;
  if (!assetId) return null;

  for (const vehicle of vehicles) {
    const eq = equipment[vehicle.id];
    if (!eq?.assigned) continue;
    const item = eq.assigned.find(a => matchesAsset(a, assetId));
    if (item) {
      return { vehicleId: vehicle.id, vehicleReg: vehicle.reg, item };
    }
  }
  return null;
}

export function listScannableEquipment(
  equipment: Record<string, VehicleEquipment>,
  vehicles: { id: string; reg: string; bayId: string }[],
  query = "",
): ScannableEquipmentRow[] {
  const needle = query.trim().toLowerCase();
  const rows: ScannableEquipmentRow[] = [];

  for (const vehicle of vehicles) {
    const eq = equipment[vehicle.id];
    if (!eq?.assigned?.length) continue;
    for (const item of eq.assigned) {
      const scanValue = item.qrCode ?? item.id;
      const haystack = `${item.label} ${scanValue} ${item.id} ${vehicle.reg} ${vehicle.bayId}`.toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      rows.push({
        vehicleId: vehicle.id,
        vehicleReg: vehicle.reg,
        bayId: vehicle.bayId,
        item,
        scanValue,
      });
    }
  }

  return rows.slice(0, 12);
}
