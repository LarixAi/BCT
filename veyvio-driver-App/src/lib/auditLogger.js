import { base44 } from "@/api/base44Client";

/**
 * Central audit logging utility.
 * Call this whenever a significant action occurs.
 */
export async function logAuditEvent({
  action,
  entityType,
  entityId,
  actorId,
  actorName,
  actorRole,
  description,
  oldValues,
  newValues,
  severity = "info",
}) {
  try {
    await base44.entities.AuditLog.create({
      action,
      entity_type: entityType,
      entity_id: entityId || "",
      actor_id: actorId || "",
      actor_name: actorName || "System",
      actor_role: actorRole || "system",
      description,
      old_values: oldValues ? JSON.stringify(oldValues) : "",
      new_values: newValues ? JSON.stringify(newValues) : "",
      severity,
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

/**
 * Log a booking event in the BookingEvent timeline.
 */
export async function logBookingEvent({
  bookingId,
  eventType,
  actorId,
  actorName,
  actorRole,
  description,
  metadata,
}) {
  try {
    await base44.entities.BookingEvent.create({
      booking_id: bookingId,
      event_type: eventType,
      actor_id: actorId || "",
      actor_name: actorName || "System",
      actor_role: actorRole || "system",
      description,
      metadata: metadata ? JSON.stringify(metadata) : "",
    });
  } catch (e) {
    console.error("Booking event log failed:", e);
  }
}