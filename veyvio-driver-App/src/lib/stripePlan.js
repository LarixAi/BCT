/**
 * Stripe Payment Integration — Pre-Plan & Architecture
 *
 * This file documents the intended Stripe integration design for the PHV platform.
 * It provides the data structures, flow helpers, and integration points.
 *
 * INTEGRATION PHASES:
 * ──────────────────────────────────────────────────────────────────────────────
 * Phase 1 (Current):   Manual cash/account + "Card" as intent marker on bookings
 * Phase 2 (Next):      Stripe PaymentIntent creation on booking confirm (card only)
 * Phase 3 (Future):    Stripe Connect for driver payouts and platform fee splits
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * STRIPE WEBHOOK EVENTS TO HANDLE:
 *   payment_intent.created       → set booking.payment_status = "pending"
 *   payment_intent.amount_capturable_updated → set payment_status = "authorised"
 *   payment_intent.succeeded     → set payment_status = "captured"
 *   payment_intent.payment_failed → set payment_status = "failed", alert dispatcher
 *   charge.refunded              → set payment_status = "refunded", log refund event
 *
 * BOOKING <-> STRIPE MAPPING:
 *   booking.id           → Stripe metadata.booking_id
 *   booking.fare_estimate → Stripe amount (pence) for PaymentIntent
 *   booking.final_fare   → Stripe capture amount (updated post-trip)
 *   booking.customer_phone → Stripe customer metadata
 *
 * PAYMENT FLOW (Card):
 *   1. Customer selects "Card" payment on booking screen
 *   2. Backend creates Stripe PaymentIntent with capture_method: "manual"
 *      → amount: Math.round(fare_estimate * 100)  // pence
 *      → currency: "gbp"
 *      → metadata: { booking_id, booking_reference, customer_name }
 *   3. Frontend collects card details via Stripe Elements (CardElement)
 *   4. On booking confirm → stripe.confirmCardPayment(clientSecret)
 *   5. Webhook: payment_intent.amount_capturable_updated → booking.payment_status = "authorised"
 *   6. Driver completes trip → final_fare confirmed
 *   7. Backend calls stripe.paymentIntents.capture(piId, { amount_to_capture: final_fare_pence })
 *   8. Webhook: payment_intent.succeeded → booking.payment_status = "captured"
 *
 * REFUND FLOW:
 *   1. Admin initiates refund from Booking Ledger
 *   2. Backend calls stripe.refunds.create({ payment_intent: pi_id, amount: refund_pence })
 *   3. Webhook: charge.refunded → booking.payment_status = "refunded"
 *   4. BookingEvent "refund_issued" logged with amount
 */

// ── Payment status state machine ─────────────────────────────────────────────
export const PAYMENT_STATUS_FLOW = {
  pending:    { label: "Awaiting Payment",  color: "text-amber-600",   bg: "bg-amber-50"   },
  authorised: { label: "Pre-authorised",    color: "text-blue-600",    bg: "bg-blue-50"    },
  captured:   { label: "Payment Captured",  color: "text-emerald-600", bg: "bg-emerald-50" },
  failed:     { label: "Payment Failed",    color: "text-red-600",     bg: "bg-red-50"     },
  refunded:   { label: "Refunded",          color: "text-purple-600",  bg: "bg-purple-50"  },
};

// ── Fare → Stripe amount (pence) ──────────────────────────────────────────────
export function fareToStripePence(fareGBP) {
  return Math.round(Number(fareGBP) * 100);
}

// ── Payment method display helpers ────────────────────────────────────────────
export const PAYMENT_METHOD_LABELS = {
  card:    { label: "Card",    icon: "💳", stripeEnabled: true,  note: "Stripe PaymentIntent" },
  cash:    { label: "Cash",    icon: "💵", stripeEnabled: false, note: "Manual collection by driver" },
  account: { label: "Account", icon: "🏢", stripeEnabled: false, note: "Invoiced to account" },
};

// ── Stripe Connect — Driver Payout Plan ───────────────────────────────────────
// Future: each driver onboarded as Stripe Connect Express account
// Platform fee: configurable % of final_fare
// Driver receives: final_fare - platform_fee
export const STRIPE_CONNECT_PLAN = {
  platformFeePercent: 15, // 15% operator commission
  payoutSchedule: "weekly", // Friday payouts
  currency: "gbp",
};

/**
 * getPaymentStatusDisplay(status)
 * Returns label, color, bg for a given payment_status value.
 */
export function getPaymentStatusDisplay(status) {
  return PAYMENT_STATUS_FLOW[status] || { label: status, color: "text-gray-600", bg: "bg-gray-50" };
}