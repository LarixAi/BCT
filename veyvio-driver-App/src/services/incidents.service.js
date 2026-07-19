import { getSupabaseClient } from "@/lib/supabase/client";
import { logDriverAudit } from "@/services/audit.service";
import { notifyDispatcher } from "@/services/notifications.service";
import { getDriverAssignedVehicle } from "@/services/vehicle-check.service";
import {
  buildIntakeSnapshot,
  buildNarrativeFromIntake,
  buildTitleFromIntake,
  derivePrimaryIncidentType,
} from "@/lib/psvIncidentIntake";

async function getAuthenticatedUserId(supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export function canReportIncident() {
  return true;
}

export async function listDriverIncidents(driverId) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("incidents")
    .select("id, title, incident_type, severity, status, reported_at, created_at, location_description")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function uploadIncidentPhoto(supabase, organisationId, incidentId, file, userId) {
  const buffer = await file.arrayBuffer();
  const safeName = String(file.name ?? "photo.jpg").replace(/[^a-zA-Z0-9._-]/g, "_") || "photo.jpg";
  const storagePath = `org/${organisationId}/incidents/${incidentId}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from("incident-evidence").upload(storagePath, buffer, {
    upsert: false,
    contentType: file.type || "image/jpeg",
  });
  if (uploadError) throw new Error(uploadError.message);

  const { error: evidenceError } = await supabase.from("incident_evidence").insert({
    incident_id: incidentId,
    evidence_type: "photo",
    file_name: safeName,
    file_path: storagePath,
    uploaded_by: userId,
    notes: null,
    restricted: false,
  });
  if (evidenceError) throw new Error(evidenceError.message);

  return storagePath;
}

async function resolveIncidentContext(supabase, driver) {
  const assigned = await getDriverAssignedVehicle(driver);
  let depotId = driver.homeDepotId ?? null;
  let vehicleId = assigned.vehicleId ?? null;
  const jobId = assigned.jobId ?? null;

  if (vehicleId) {
    const { data: vehicleRow } = await supabase
      .from("vehicles")
      .select("current_depot_id")
      .eq("id", vehicleId)
      .maybeSingle();
    if (vehicleRow?.current_depot_id) depotId = vehicleRow.current_depot_id;
  }

  return { depotId, vehicleId, jobId };
}

function buildLocationDescription(intake) {
  const parts = [intake.conditions.location?.trim(), intake.conditions.stopNumber?.trim(), intake.conditions.postcode?.trim()].filter(Boolean);
  return parts.join(", ") || null;
}

function buildConditionsSummary(intake) {
  const bits = [
    intake.conditions.weather?.trim(),
    intake.conditions.roadConditions?.trim() ? `Road: ${intake.conditions.roadConditions.trim()}` : null,
    intake.conditions.trafficConditions?.trim() ? `Traffic: ${intake.conditions.trafficConditions.trim()}` : null,
    intake.conditions.speedMph?.trim() ? `~${intake.conditions.speedMph.trim()} mph` : null,
  ].filter(Boolean);
  return bits.join("; ");
}

function occurredAtIso(intake) {
  const raw = intake.conditions.occurredAt?.trim();
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export async function reportDriverIncident(driver, { form, photos = [], sosContext }) {
  const supabase = getSupabaseClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!form?.incidentTypes?.selected?.length) {
    return { ok: false, message: "Select at least one incident type." };
  }

  const intake = buildIntakeSnapshot(form, { sosContext, photoCount: photos.length });
  const title = buildTitleFromIntake(intake);
  const narrative = buildNarrativeFromIntake(intake);
  const conditionsNote = buildConditionsSummary(intake);
  const description = conditionsNote ? `${conditionsNote}\n\n${narrative}` : narrative;

  if (!description.trim()) {
    return { ok: false, message: "Describe the sequence of events before submitting." };
  }

  const incidentType = derivePrimaryIncidentType(intake.incidentTypes.selected);
  const severity = intake.severity ?? "moderate";
  const now = new Date().toISOString();
  const riskMap = { critical: "critical", serious: "high", moderate: "medium", minor: "low", near_miss: "low" };
  const riskLevel = riskMap[severity] ?? "medium";
  const { depotId, vehicleId, jobId } = await resolveIncidentContext(supabase, driver);

  const passengerCount = intake.passengers.countOnboard ? Number(intake.passengers.countOnboard) : null;
  const passengerInvolved = passengerCount != null && passengerCount > 0;
  const injuryInvolved =
    Boolean(intake.passengers.injuredCount && Number(intake.passengers.injuredCount) > 0) ||
    Boolean(intake.damageInjury.passengerInjuries?.trim()) ||
    Boolean(intake.damageInjury.driverInjuries?.trim());
  const vehicleDamage = Boolean(intake.damageInjury.vehicleDamageLocation?.trim() || intake.damageInjury.vehicleDamageSeverity?.trim());
  const emergencyServicesInvolved =
    intake.emergencyResponse.ambulanceCalled || intake.emergencyResponse.policeAttended;
  const safeguardingConcern =
    intake.incidentTypes.selected.includes("security") || intake.passengers.vulnerableInvolved;

  const emergencyResponseJson = {
    policeCalled: intake.emergencyResponse.policeAttended,
    policeReference: intake.witnesses.policeDetails?.trim() || null,
    ambulanceCalled: intake.emergencyResponse.ambulanceCalled,
    fireServiceCalled: false,
    emergencyNotes: intake.emergencyResponse.notes?.trim() || null,
    roadBlocked: false,
    passengersMovedToSafety: false,
    controlRoomContacted: intake.emergencyResponse.supervisorAttended,
    schoolCouncilContacted: false,
    parentGuardianCommunicationStatus: null,
  };

  const { data: incident, error } = await supabase
    .from("incidents")
    .insert({
      organisation_id: driver.organisationId,
      depot_id: depotId,
      driver_id: driver.id,
      vehicle_id: vehicleId,
      job_id: jobId,
      title,
      description,
      summary: description,
      incident_type: incidentType,
      severity,
      risk_level: riskLevel,
      status: "submitted_by_driver",
      reported_from_app: "driver",
      reported_at: now,
      occurred_at: occurredAtIso(intake),
      location_description: buildLocationDescription(intake),
      location_lat: intake.conditions.lat ?? null,
      location_lng: intake.conditions.lng ?? null,
      reported_by: userId,
      created_by: userId,
      driver_intake_json: intake,
      passenger_involved: passengerInvolved,
      injury_involved: injuryInvolved,
      emergency_services_involved: emergencyServicesInvolved,
      safeguarding_concern: safeguardingConcern,
      vehicle_damage: vehicleDamage,
      passenger_count: passengerCount != null && !Number.isNaN(passengerCount) ? passengerCount : null,
      child_or_vulnerable_person_involved: Boolean(intake.passengers.vulnerableInvolved),
      vehicle_vor_required: Boolean(intake.emergencyResponse.vehicleOutOfService),
      journey_continued: intake.emergencyResponse.replacementBusSent ? false : null,
      replacement_required: intake.emergencyResponse.replacementBusSent,
      emergency_response_json: emergencyResponseJson,
      psv112_status: "not_assessed",
      riddor_status: "not_assessed",
    })
    .select("id")
    .single();

  if (error || !incident) {
    return { ok: false, message: error?.message ?? "Failed to submit incident." };
  }

  await supabase.from("incident_timeline_events").insert({
    incident_id: incident.id,
    event_type: "submitted_by_driver",
    title: "PSV incident report submitted by driver",
    description: title,
    created_by: userId,
    metadata_json: { source: "driver_mobile", formVersion: intake.formVersion, severity },
  });

  const photoErrors = [];
  for (const photo of photos) {
    try {
      await uploadIncidentPhoto(supabase, driver.organisationId, incident.id, photo, userId);
    } catch (e) {
      photoErrors.push(e instanceof Error ? e.message : "Photo upload failed");
    }
  }

  await logDriverAudit({
    organisation_id: driver.organisationId,
    depot_id: depotId,
    entity_table: "incidents",
    entity_id: incident.id,
    action: "driver_incident_reported",
    reason: title,
    metadata: {
      incident_type: incidentType,
      severity,
      form_version: intake.formVersion,
      photo_count: photos.length,
    },
  });

  await notifyDispatcher({
    organisationId: driver.organisationId,
    depotId,
    notificationType: "incident_follow_up",
    entityType: "incidents",
    entityId: incident.id,
    title: "Driver PSV incident report",
    message: `${driver.fullName} reported: ${title}`,
    severity: severity === "critical" || severity === "serious" ? "critical" : "warning",
  });

  return {
    ok: true,
    incidentId: incident.id,
    photoWarnings: photoErrors.length > 0 ? photoErrors : undefined,
  };
}
