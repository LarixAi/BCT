import { getSupabaseClient } from "@/lib/supabase/client";
import { getDriverAssignedVehicle } from "@/services/vehicle-check.service";
import { logDriverAudit } from "@/services/audit.service";
import { notifyDispatcher } from "@/services/notifications.service";

const CATEGORIES = [
  { value: "bag_luggage", label: "Bag / luggage" },
  { value: "clothing", label: "Clothing" },
  { value: "phone_electronics", label: "Phone / electronics" },
  { value: "wallet_cards", label: "Wallet / cards" },
  { value: "keys", label: "Keys" },
  { value: "medication", label: "Medication" },
  { value: "documents", label: "Documents" },
  { value: "child_item", label: "Child item" },
  { value: "food_drink", label: "Food / drink" },
  { value: "toy_book", label: "Toy / book" },
  { value: "other", label: "Other" },
];

const FOUND_LOCATIONS = [
  { value: "seat", label: "Seat" },
  { value: "aisle", label: "Aisle" },
  { value: "boot", label: "Boot" },
  { value: "luggage_area", label: "Luggage area" },
  { value: "under_seat", label: "Under seat" },
  { value: "driver_area", label: "Driver area" },
  { value: "other", label: "Other" },
];

export { CATEGORIES as LOST_ITEM_CATEGORIES, FOUND_LOCATIONS as LOST_ITEM_FOUND_LOCATIONS };

function localKey(driverId) {
  return `veyvio.lost-property.v1.${driverId || "driver"}`;
}

function readLocalItems(driverId) {
  try {
    const raw = localStorage.getItem(localKey(driverId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalItems(driverId, items) {
  try {
    localStorage.setItem(localKey(driverId), JSON.stringify(items));
  } catch {
    /* ignore quota */
  }
}

function makeLocalReference() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LP-${stamp}-${suffix}`;
}

function isMissingTableError(error) {
  if (!error) return false;
  const msg = String(error.message || error);
  return (
    error.code === "42P01" ||
    /does not exist/i.test(msg) ||
    /schema cache/i.test(msg) ||
    /permission denied/i.test(msg)
  );
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function inferSensitivity(input) {
  const isMedication = Boolean(input.isMedication) || input.category === "medication";
  const isChildRelated = Boolean(input.isChildRelated) || input.category === "child_item";
  const containsPersonalData =
    Boolean(input.containsPersonalData) ||
    ["wallet_cards", "documents", "phone_electronics"].includes(input.category);

  let sensitivityLevel = "standard";
  if (isMedication || input.isHazardous) sensitivityLevel = "safeguarding";
  else if (containsPersonalData || isChildRelated || input.isHighValue) sensitivityLevel = "sensitive";
  else if (input.isHighValue) sensitivityLevel = "elevated";

  return { isMedication, isChildRelated, containsPersonalData, sensitivityLevel };
}

export async function uploadLostItemPhoto({ driver, vehicleId, itemId, file }) {
  const supabase = getSupabaseClient();
  const buffer = await readFileAsArrayBuffer(file);
  const ext = String(file.name ?? "photo.jpg").split(".").pop() || "jpg";
  const org = driver.organisationId || driver.companyId || "local";
  const path = `${org}/${vehicleId ?? "unknown"}/${driver.id}/${itemId}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("lost-property-photos").upload(path, buffer, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });

  if (error) {
    // Command tenants may not have the bucket yet — keep photo name for the local record.
    if (isMissingTableError(error) || /bucket|not found|policy/i.test(error.message || "")) {
      return { ok: true, path: null, localOnly: true, fileName: file.name };
    }
    return { ok: false, message: error.message };
  }
  return { ok: true, path };
}

export async function listDriverFoundItems(driver) {
  const local = readLocalItems(driver.id);
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("lost_items")
    .select("id, reference, category, description, status, found_at, found_location, driver_handover_confirmed")
    .eq("reported_by_driver_id", driver.id)
    .order("reported_at", { ascending: false })
    .limit(50);

  if (error) {
    return {
      ok: true,
      items: local,
      source: "local",
      message: isMissingTableError(error)
        ? null
        : error.message,
    };
  }

  const remote = data ?? [];
  const remoteIds = new Set(remote.map((r) => r.id));
  const merged = [...remote, ...local.filter((item) => !remoteIds.has(item.id))];
  return { ok: true, items: merged, source: remote.length ? "command_or_legacy" : local.length ? "local" : "empty" };
}

export async function reportFoundItem(driver, input) {
  const description = input.description?.trim();
  if (!description) return { ok: false, message: "Please describe the item." };
  if (!input.category) return { ok: false, message: "Select an item category." };

  const supabase = getSupabaseClient();
  let vehicleId = input.vehicleId ?? null;
  let depotId = input.handoverDepotId ?? null;
  let vehicleReg = input.vehicleRegistration ?? null;
  let dutyRef = input.dutyReference ?? null;

  if (!vehicleId) {
    const assigned = await getDriverAssignedVehicle(driver).catch(() => null);
    vehicleId = assigned?.vehicleId ?? null;
    vehicleReg = vehicleReg || assigned?.registration || null;
  }

  if (vehicleId && !depotId) {
    const { data: vehicleRow } = await supabase
      .from("vehicles")
      .select("current_depot_id")
      .eq("id", vehicleId)
      .maybeSingle();
    depotId = vehicleRow?.current_depot_id ?? null;
  }

  const flags = inferSensitivity(input);
  const foundAt = input.foundAt ?? new Date().toISOString();
  const orgId = driver.organisationId || driver.companyId || null;

  const { data: item, error } = await supabase
    .from("lost_items")
    .insert({
      organisation_id: orgId,
      company_id: orgId,
      depot_id: depotId,
      handover_depot_id: depotId,
      current_depot_id: depotId,
      vehicle_id: vehicleId,
      job_id: input.jobId ?? null,
      school_run_id: input.schoolRunId ?? null,
      route_id: input.routeId ?? null,
      incident_id: input.incidentId ?? null,
      vehicle_check_id: input.vehicleCheckId ?? null,
      reported_by_driver_id: driver.id,
      category: input.category,
      description,
      found_location: input.foundLocation ?? null,
      found_at: foundAt,
      status: "awaiting_handover",
      sensitivity_level: flags.sensitivityLevel,
      is_high_value: Boolean(input.isHighValue),
      contains_personal_data: flags.containsPersonalData,
      is_medication: flags.isMedication,
      is_child_related: flags.isChildRelated,
      is_hazardous: Boolean(input.isHazardous),
      driver_notes: input.notes?.trim() || null,
      photo_path: input.photoPath ?? null,
    })
    .select("id, reference")
    .single();

  if (!error && item) {
    await supabase.from("lost_item_events").insert({
      organisation_id: orgId,
      lost_item_id: item.id,
      event_type: "lost_item_reported",
      event_notes: description.slice(0, 200),
      to_status: "awaiting_handover",
      performed_by_driver_id: driver.id,
      depot_id: depotId,
      metadata: {
        source: "driver_mobile",
        category: input.category,
        found_location: input.foundLocation ?? null,
      },
    });

    await logDriverAudit({
      organisation_id: orgId,
      depot_id: depotId,
      entity_table: "lost_items",
      entity_id: item.id,
      action: "lost_item_reported",
      reason: description.slice(0, 200),
      metadata: {
        source: "driver_mobile",
        reference: item.reference,
        category: input.category,
      },
    }).catch(() => null);

    const severity = flags.isMedication ? "critical" : flags.sensitivityLevel === "sensitive" ? "warning" : "info";

    await notifyDispatcher({
      organisationId: orgId,
      depotId,
      notificationType: flags.isMedication ? "lost_item_sensitive" : "lost_item_reported",
      entityType: "lost_items",
      entityId: item.id,
      title: flags.isMedication ? "Medication found on vehicle" : "Found item reported",
      message: `${item.reference}: ${description.slice(0, 120)}`,
      severity,
      actionUrl: `/lost-property/${item.id}`,
    }).catch(() => null);

    return { ok: true, lostItemId: item.id, reference: item.reference, source: "remote" };
  }

  // Command schema has no lost_items yet — keep an on-device record for handover.
  const localItem = {
    id: `local-${Date.now()}`,
    reference: makeLocalReference(),
    category: input.category,
    description,
    status: "awaiting_handover",
    found_at: foundAt,
    found_location: input.foundLocation ?? null,
    driver_handover_confirmed: false,
    vehicle_registration: vehicleReg,
    duty_reference: dutyRef,
    photo_file_name: input.photoFileName ?? null,
    notes: input.notes?.trim() || null,
    sensitivity_level: flags.sensitivityLevel,
    source: "local",
    reported_at: foundAt,
  };

  const items = [localItem, ...readLocalItems(driver.id)];
  writeLocalItems(driver.id, items);

  return {
    ok: true,
    lostItemId: localItem.id,
    reference: localItem.reference,
    source: "local",
    message:
      "Saved on this device. Hand the item to depot — Yard / Admin lost-property queue is not live on Command yet.",
  };
}

export async function confirmDriverHandover(driver, lostItemId) {
  if (String(lostItemId).startsWith("local-")) {
    const items = readLocalItems(driver.id).map((item) =>
      item.id === lostItemId
        ? {
            ...item,
            driver_handover_confirmed: true,
            driver_handover_confirmed_at: new Date().toISOString(),
            status: "handed_to_depot",
          }
        : item,
    );
    writeLocalItems(driver.id, items);
    return { ok: true, message: "Handover marked on this device." };
  }

  const supabase = getSupabaseClient();

  const { data: existing, error: fetchError } = await supabase
    .from("lost_items")
    .select("id, organisation_id, depot_id, status, reference")
    .eq("id", lostItemId)
    .eq("reported_by_driver_id", driver.id)
    .maybeSingle();

  if (fetchError || !existing) {
    const items = readLocalItems(driver.id);
    if (items.some((item) => item.id === lostItemId)) {
      writeLocalItems(
        driver.id,
        items.map((item) =>
          item.id === lostItemId
            ? {
                ...item,
                driver_handover_confirmed: true,
                driver_handover_confirmed_at: new Date().toISOString(),
                status: "handed_to_depot",
              }
            : item,
        ),
      );
      return { ok: true, message: "Handover marked on this device." };
    }
    return { ok: false, message: "Item not found or not yours to confirm." };
  }

  if (!["reported", "awaiting_handover"].includes(existing.status)) {
    return { ok: false, message: "This item has already been handed in." };
  }

  const { error } = await supabase
    .from("lost_items")
    .update({
      driver_handover_confirmed: true,
      driver_handover_confirmed_at: new Date().toISOString(),
    })
    .eq("id", lostItemId);

  if (error) return { ok: false, message: error.message };

  await supabase.from("lost_item_events").insert({
    organisation_id: existing.organisation_id,
    lost_item_id: lostItemId,
    event_type: "lost_item_handover_confirmed",
    event_notes: "Driver confirmed handover to depot",
    performed_by_driver_id: driver.id,
    depot_id: existing.depot_id,
  });

  await logDriverAudit({
    organisation_id: existing.organisation_id,
    depot_id: existing.depot_id,
    entity_table: "lost_items",
    entity_id: lostItemId,
    action: "lost_item_handover_confirmed",
    metadata: { reference: existing.reference },
  }).catch(() => null);

  return { ok: true, message: "Handover confirmed." };
}
