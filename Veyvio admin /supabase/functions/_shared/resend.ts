/** Thin Resend client for Command transactional mail (driver invites, etc.). */

export type ResendSendResult = {
  id: string | null
  delivered: boolean
}

export function getInviteFromAddress(): string {
  return (
    Deno.env.get('INVITE_FROM_EMAIL')?.trim() ||
    Deno.env.get('DEMO_FROM_EMAIL')?.trim() ||
    'Veyvio <info@veyvio.co.uk>'
  )
}

export async function sendResendEmail(input: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<ResendSendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY')?.trim()
  if (!apiKey) {
    throw new Error(
      'RESEND_API_KEY is not configured on command-api. Set the Supabase secret to send invitation emails.',
    )
  }

  const from = getInviteFromAddress()
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
    }),
  })

  const bodyText = await response.text()
  let parsed: { id?: string; message?: string } = {}
  try {
    parsed = JSON.parse(bodyText) as { id?: string; message?: string }
  } catch {
    parsed = {}
  }

  if (!response.ok) {
    throw new Error(parsed.message || bodyText || `Resend HTTP ${response.status}`)
  }

  return { id: parsed.id ?? null, delivered: true }
}
