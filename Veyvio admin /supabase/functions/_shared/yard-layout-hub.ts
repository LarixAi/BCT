/** Live Yard Map hub helpers for command-api (Deno). */

type Row = Record<string, unknown>;

export const BCT_DEPOT_CODE = "BCT-MAIN";

/** Embedded BCT layout v1 — matches shared/veyvio-yard/bct-main-depot.ts */
export const BCT_LAYOUT_SNAPSHOT = {
  layoutId: "bct-main-depot-v1",
  depotCode: BCT_DEPOT_CODE,
  name: "Main Depot Parking Map",
  canvasWidth: 1000,
  canvasHeight: 700,
  yardMapEnabled: true,
  gates: [
    { id: "gate-entrance-top", name: "Entrance", kind: "ENTRANCE", geometry: { x: 880, y: 12, width: 100, height: 24 } },
    { id: "gate-main", name: "Entrance & Exit", kind: "GATE", geometry: { x: 420, y: 668, width: 160, height: 24 } },
  ],
  zones: [] as Row[],
  bays: Array.from({ length: 26 }, (_, i) => {
    const n = i + 1;
    return {
      id: `BAY-${String(n).padStart(2, "0")}`,
      bayNumber: n,
      displayName: `Bay ${n}`,
      zoneId: "zone-parking-main",
      geometry: { x: 0, y: 0, width: 56, height: 100 },
      parkingDirection: "north",
      isLifo: n === 10 || n === 15,
      isReserved: n === 10 || n === 15,
      operationalStatus: "available",
      capacity: 1,
    };
  }),
};

function isMissingRelation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  return String(error.code) === "42P01" || msg.includes("does not exist") || msg.includes("yard_layout");
}

export async function loadYardLayoutForDepot(
  admin: { from: (table: string) => Row },
  companyId: string,
  depotId: string,
  depotCode?: string | null,
) {
  const code = String(depotCode ?? "").toUpperCase();

  const { data: depot, error: depotError } = await admin
    .from("depots")
    .select("id, code, yard_map_enabled")
    .eq("company_id", companyId)
    .eq("id", depotId)
    .maybeSingle();

  if (depotError && !isMissingRelation(depotError)) {
    console.warn("loadYardLayoutForDepot depot", depotError.message);
  }

  const resolvedCode = String((depot as Row | null)?.code ?? code ?? "").toUpperCase();
  const yardMapEnabled = (depot as Row | null)?.yard_map_enabled !== false;

  const { data: layout, error: layoutError } = await admin
    .from("yard_layouts")
    .select("id, name, canvas_width, canvas_height, active_version_id")
    .eq("company_id", companyId)
    .eq("depot_id", depotId)
    .eq("status", "published")
    .maybeSingle();

  if (!layoutError && layout) {
    const layoutId = String((layout as Row).id);
    const [{ data: bays }, { data: zones }] = await Promise.all([
      admin
        .from("parking_bays")
        .select(
          "id, label, bay_number, display_name, position_x, position_y, width, height, rotation, parking_direction, capacity, operational_status, is_lifo, is_reserved, depot_zone_id",
        )
        .eq("company_id", companyId)
        .eq("layout_id", layoutId)
        .eq("status", "active")
        .order("bay_number"),
      admin
        .from("depot_zones")
        .select("id, name, type, polygon_coordinates, colour_key, vehicle_access, pedestrian_access, parking_allowed")
        .eq("company_id", companyId)
        .eq("layout_id", layoutId)
        .eq("status", "active"),
    ]);

    return {
      yardMapEnabled,
      layout: {
        layoutId,
        depotCode: resolvedCode,
        name: String((layout as Row).name ?? "Yard map"),
        canvasWidth: Number((layout as Row).canvas_width ?? 1000),
        canvasHeight: Number((layout as Row).canvas_height ?? 700),
        yardMapEnabled,
        zones: (zones ?? []).map((z: Row) => ({
          id: String(z.id),
          name: String(z.name ?? "Zone"),
          kind: String(z.type ?? "PARKING"),
          colourKey: String(z.colour_key ?? "#94A3B8"),
          polygon: (z.polygon_coordinates as [number, number][]) ?? [],
          vehicleAccess: Boolean(z.vehicle_access),
          pedestrianAccess: Boolean(z.pedestrian_access),
          parkingAllowed: Boolean(z.parking_allowed),
        })),
        bays: (bays ?? []).map((b: Row) => ({
          id: String(b.id),
          bayNumber: Number(b.bay_number ?? 0),
          displayName: String(b.display_name ?? b.label ?? "Bay"),
          zoneId: String(b.depot_zone_id ?? "zone"),
          geometry: {
            x: Number(b.position_x ?? 0),
            y: Number(b.position_y ?? 0),
            width: Number(b.width ?? 64),
            height: Number(b.height ?? 120),
            rotation: Number(b.rotation ?? 0),
          },
          parkingDirection: String(b.parking_direction ?? "north"),
          isLifo: Boolean(b.is_lifo),
          isReserved: Boolean(b.is_reserved),
          operationalStatus: String(b.operational_status ?? "available"),
          capacity: Number(b.capacity ?? 1),
        })),
        gates: [],
      },
    };
  }

  if (layoutError && !isMissingRelation(layoutError)) {
    console.warn("loadYardLayoutForDepot layout", layoutError.message);
  }

  return { yardMapEnabled: true, layout: null };
}

export async function loadVehicleLocationsForDepot(
  admin: { from: (table: string) => Row },
  companyId: string,
  depotId: string,
) {
  const { data, error } = await admin
    .from("vehicle_locations")
    .select(
      "vehicle_id, bay_id, confidence, source, reported_at, parking_bays(id, label, bay_number, display_name)",
    )
    .eq("company_id", companyId)
    .eq("depot_id", depotId)
    .eq("active", true);

  if (error) {
    if (!isMissingRelation(error)) console.warn("loadVehicleLocationsForDepot", error.message);
    return new Map<string, Row>();
  }

  const map = new Map<string, Row>();
  for (const row of data ?? []) {
    map.set(String((row as Row).vehicle_id), row as Row);
  }
  return map;
}

export async function upsertVehicleLocation(
  admin: { from: (table: string) => Row },
  input: {
    companyId: string;
    depotId: string;
    vehicleId: string;
    bayId?: string | null;
    bayLabel: string;
    userId?: string | null;
    source: string;
    confidence?: string;
  },
) {
  const now = new Date().toISOString();
  await admin
    .from("vehicle_locations")
    .update({ active: false, updated_at: now })
    .eq("company_id", input.companyId)
    .eq("vehicle_id", input.vehicleId)
    .eq("active", true);

  const { error } = await admin.from("vehicle_locations").insert({
    company_id: input.companyId,
    depot_id: input.depotId,
    vehicle_id: input.vehicleId,
    location_type: "BAY",
    bay_id: input.bayId ?? null,
    free_text_location: input.bayLabel,
    confidence: input.confidence ?? "yard_confirmed",
    source: input.source,
    reported_by: input.userId ?? null,
    reported_at: now,
    active: true,
    created_at: now,
    updated_at: now,
  });

  if (error && !isMissingRelation(error)) {
    console.warn("upsertVehicleLocation", error.message);
  }
}

export async function resolveParkingBayByLabel(
  admin: { from: (table: string) => Row },
  companyId: string,
  depotId: string,
  label: string,
) {
  const normalized = label.trim();
  const { data } = await admin
    .from("parking_bays")
    .select("id, label, bay_number, display_name")
    .eq("company_id", companyId)
    .or(`label.eq.${normalized},display_name.eq.${normalized}`)
    .limit(5);

  const rows = (data ?? []) as Row[];
  const bayNum = normalized.replace(/^bay\s*/i, "");
  const match =
    rows.find((r) => String(r.label) === normalized) ??
    rows.find((r) => String(r.display_name) === normalized) ??
    rows.find((r) => String(r.bay_number) === bayNum);
  return match ?? null;
}
