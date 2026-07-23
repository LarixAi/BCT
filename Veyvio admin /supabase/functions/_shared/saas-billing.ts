/**
 * SaaS billing (operator → Veyvio licence). Separate from Driver PHV trip payments.
 *
 * Default mode is `placeholder` — no Stripe calls until tenant isolation is CI-proven.
 * Set VEYVIO_SAAS_BILLING_MODE=live plus Stripe secrets only when ready to enable Checkout.
 */
import { admin } from './supabase.ts'
import { HttpError } from './http.ts'

const BILLING_MODE = (Deno.env.get('VEYVIO_SAAS_BILLING_MODE') ?? 'placeholder').trim().toLowerCase()
const STRIPE_SECRET = Deno.env.get('VEYVIO_SAAS_STRIPE_SECRET_KEY') ?? ''
const STRIPE_WEBHOOK_SECRET = Deno.env.get('VEYVIO_SAAS_STRIPE_WEBHOOK_SECRET') ?? ''
const APP_URL = Deno.env.get('VEYVIO_COMMAND_APP_URL') ?? 'http://127.0.0.1:5173'

const PLAN_PRICE_ENV: Record<string, string> = {
  starter: Deno.env.get('VEYVIO_SAAS_PRICE_STARTER') ?? '',
  professional: Deno.env.get('VEYVIO_SAAS_PRICE_PROFESSIONAL') ?? '',
  enterprise: Deno.env.get('VEYVIO_SAAS_PRICE_ENTERPRISE') ?? '',
}

export function saasBillingConfigured() {
  return BILLING_MODE === 'live' && Boolean(STRIPE_SECRET)
}

export function saasBillingPlaceholder() {
  return {
    placeholder: true as const,
    configured: false,
    checkoutUrl: null as string | null,
    sessionId: null as string | null,
    message:
      'SaaS billing is a placeholder. Set plan and tenant status manually until Checkout is enabled.',
  }
}

export async function createSaasCheckoutSession(input: {
  companyId: string
  planCode: string
  customerEmail: string
  successPath?: string
  cancelPath?: string
}) {
  if (BILLING_MODE !== 'live' || !STRIPE_SECRET) {
    return saasBillingPlaceholder()
  }
  const priceId = PLAN_PRICE_ENV[input.planCode]
  if (!priceId) {
    throw new HttpError(400, `No Stripe price configured for plan ${input.planCode}`, 'saas_price_missing')
  }

  const { data: subscription } = await admin
    .from('company_subscriptions')
    .select('provider_customer_ref')
    .eq('company_id', input.companyId)
    .maybeSingle()

  const params = new URLSearchParams()
  params.set('mode', 'subscription')
  params.set('success_url', `${APP_URL}${input.successPath ?? '/platform/companies?billing=success'}`)
  params.set('cancel_url', `${APP_URL}${input.cancelPath ?? '/platform/companies?billing=cancelled'}`)
  params.set('client_reference_id', input.companyId)
  params.set('customer_email', input.customerEmail)
  params.set('line_items[0][price]', priceId)
  params.set('line_items[0][quantity]', '1')
  params.set('metadata[company_id]', input.companyId)
  params.set('metadata[plan_code]', input.planCode)
  params.set('subscription_data[metadata][company_id]', input.companyId)
  params.set('subscription_data[metadata][plan_code]', input.planCode)
  if (subscription?.provider_customer_ref) {
    params.set('customer', String(subscription.provider_customer_ref))
    params.delete('customer_email')
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  })
  const body = await res.json()
  if (!res.ok) {
    throw new HttpError(502, body?.error?.message ?? 'Stripe Checkout failed', 'stripe_error')
  }
  return { checkoutUrl: body.url as string, sessionId: body.id as string }
}

async function applySubscriptionUpdate(input: {
  companyId: string
  planCode?: string
  status: string
  customerId?: string | null
  subscriptionId?: string | null
  currentPeriodEnd?: number | null
}) {
  const { applySubscriptionLifecycle } = await import('./subscription-lifecycle.ts')
  const periodEnd = input.currentPeriodEnd
    ? new Date(input.currentPeriodEnd * 1000).toISOString()
    : null

  await applySubscriptionLifecycle({
    companyId: input.companyId,
    status: input.status,
    planCode: input.planCode ?? 'professional',
    providerCustomerRef: input.customerId ?? null,
    stripeSubscriptionId: input.subscriptionId ?? null,
    currentPeriodEnd: periodEnd,
    source: 'stripe_webhook',
    eventType: 'subscription.stripe_update',
  })
}

function parseStripeSignatureHeader(header: string) {
  const parts = Object.fromEntries(
    header.split(',').map((part) => {
      const [k, v] = part.split('=')
      return [k?.trim() ?? '', v?.trim() ?? '']
    }),
  )
  return { timestamp: parts.t ?? '', signature: parts.v1 ?? '' }
}

async function verifyStripeWebhookSignature(rawBody: string, signatureHeader: string) {
  const { timestamp, signature } = parseStripeSignatureHeader(signatureHeader)
  if (!timestamp || !signature) {
    throw new HttpError(400, 'Invalid Stripe-Signature header', 'stripe_signature_invalid')
  }
  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    throw new HttpError(400, 'Stripe webhook timestamp outside tolerance', 'stripe_signature_stale')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STRIPE_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestamp}.${rawBody}`),
  )
  const expected = Array.from(new Uint8Array(signed))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  if (expected.length !== signature.length) {
    throw new HttpError(400, 'Stripe signature mismatch', 'stripe_signature_mismatch')
  }
  let mismatch = 0
  for (let i = 0; i < expected.length; i += 1) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  if (mismatch !== 0) {
    throw new HttpError(400, 'Stripe signature mismatch', 'stripe_signature_mismatch')
  }
}

/** Stripe webhook for SaaS subscriptions only (not PHV). */
export async function handleSaasStripeWebhook(rawBody: string, signature: string | null) {
  if (BILLING_MODE !== 'live' || !STRIPE_SECRET) {
    return {
      ok: true,
      placeholder: true,
      message: 'SaaS billing webhook is a placeholder — no subscription updates applied.',
    }
  }
  if (STRIPE_WEBHOOK_SECRET) {
    if (!signature) {
      throw new HttpError(400, 'Missing Stripe-Signature', 'stripe_signature_missing')
    }
    await verifyStripeWebhookSignature(rawBody, signature)
  }

  const event = JSON.parse(rawBody) as {
    type: string
    data: { object: Record<string, unknown> }
  }
  const obj = event.data?.object ?? {}
  const meta = (obj.metadata ?? {}) as Record<string, string>
  const companyId = meta.company_id ?? String(obj.client_reference_id ?? '')
  if (!companyId) return { ok: true, ignored: true }

  if (event.type === 'checkout.session.completed') {
    await applySubscriptionUpdate({
      companyId,
      planCode: meta.plan_code,
      status: 'active',
      customerId: obj.customer ? String(obj.customer) : null,
      subscriptionId: obj.subscription ? String(obj.subscription) : null,
    })
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    await applySubscriptionUpdate({
      companyId,
      planCode: meta.plan_code,
      status: String(obj.status ?? 'active'),
      customerId: obj.customer ? String(obj.customer) : null,
      subscriptionId: obj.id ? String(obj.id) : null,
      currentPeriodEnd: typeof obj.current_period_end === 'number' ? obj.current_period_end : null,
    })
  }

  if (event.type === 'customer.subscription.deleted') {
    await applySubscriptionUpdate({
      companyId,
      planCode: meta.plan_code,
      status: 'canceled',
      customerId: obj.customer ? String(obj.customer) : null,
      subscriptionId: obj.id ? String(obj.id) : null,
    })
  }

  return { ok: true }
}
