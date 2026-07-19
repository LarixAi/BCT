import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { logAuditEvent } from "@/lib/auditLogger";

export async function generateAndSaveInvoice(booking, driver) {
  try {
    let breakdown = null;
    try {
      breakdown = booking.fare_breakdown ? JSON.parse(booking.fare_breakdown) : null;
    } catch {
      /* ignore */
    }
    const invoiceRef = `INV-${booking.booking_reference || booking.id.slice(0, 8)}`;
    const now = new Date();
    const lines = [
      `TRIP RECEIPT — TfL Licensed PHV Operator`,
      `Invoice No: ${invoiceRef}`,
      `Date: ${format(now, "dd MMMM yyyy HH:mm")}`,
      ``,
      `PASSENGER: ${booking.customer_name}`,
      `Phone: ${booking.customer_phone}`,
      ``,
      `JOURNEY`,
      `From: ${booking.pickup_address}`,
      `To:   ${booking.dropoff_address}`,
      ``,
      `DRIVER: ${booking.driver_name}`,
      `PHV Licence: ${booking.driver_phv_licence_number}`,
      `Vehicle: ${booking.vehicle_colour} ${booking.vehicle_make} ${booking.vehicle_model}`,
      `Reg: ${booking.vehicle_registration}`,
      ``,
      `FARE BREAKDOWN`,
      breakdown
        ? [
            `Base fare:        £${Number(breakdown.base_fare || 0).toFixed(2)}`,
            `Distance (${breakdown.est_miles?.toFixed(1) || "?"} mi): £${Number(breakdown.mile_charge || 0).toFixed(2)}`,
            breakdown.minute_charge > 0 ? `Time charge:      £${Number(breakdown.minute_charge).toFixed(2)}` : null,
            breakdown.booking_fee > 0 ? `Booking fee:      £${Number(breakdown.booking_fee).toFixed(2)}` : null,
            breakdown.peak_applied ? `Peak multiplier:  x${breakdown.peak_multiplier}` : null,
            breakdown.discount > 0 ? `Promo discount:  -£${Number(breakdown.discount).toFixed(2)}` : null,
          ]
            .filter(Boolean)
            .join("\n")
        : "Standard fare",
      ``,
      `TOTAL: £${(booking.final_fare || booking.fare_estimate || 0).toFixed(2)}`,
      `Payment: ${booking.payment_method?.toUpperCase() || "CASH"}`,
      ``,
      `TIMESTAMPS`,
      booking.dispatch_time ? `Driver en route:    ${format(new Date(booking.dispatch_time), "HH:mm dd/MM/yyyy")}` : null,
      booking.arrival_time ? `Driver arrived:     ${format(new Date(booking.arrival_time), "HH:mm dd/MM/yyyy")}` : null,
      booking.pickup_time ? `Passenger on board: ${format(new Date(booking.pickup_time), "HH:mm dd/MM/yyyy")}` : null,
      booking.completion_time ? `Trip completed:     ${format(new Date(booking.completion_time), "HH:mm dd/MM/yyyy")}` : null,
      ``,
      `This receipt is automatically generated for tax and TfL compliance purposes.`,
    ]
      .filter((l) => l !== null)
      .join("\n");

    const blob = new Blob([lines], { type: "text/plain" });
    const file = new File([blob], `${invoiceRef}.txt`, { type: "text/plain" });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Booking.update(booking.id, {
      notes: (booking.notes ? booking.notes + "\n" : "") + `Receipt: ${file_url}`,
    });
    await logAuditEvent({
      action: "receipt_generated",
      entityType: "Booking",
      entityId: booking.id,
      actorName: driver.full_name,
      actorRole: "driver",
      description: `Receipt ${invoiceRef} auto-generated on trip completion.`,
      severity: "info",
    });
    await base44.entities.BookingEvent.create({
      booking_id: booking.id,
      event_type: "receipt_sent",
      actor_name: driver.full_name,
      actor_role: "driver",
      description: `Receipt ${invoiceRef} generated and stored.`,
      metadata: JSON.stringify({ file_url, invoice_ref: invoiceRef }),
    });
  } catch (e) {
    console.error("Receipt generation failed:", e);
  }
}
