/**
 * Driver trusted-device helpers — security metadata only (no biometric templates).
 */
import { apiError, json, readJson } from './http.ts'
import { admin, authenticate } from './supabase.ts'

type Row = Record<string, unknown>

const ALLOWED_SECURITY_EVENTS = new Set([
  'driver.biometric_enabled',
  'driver.biometric_disabled',
  'driver.biometric_unlock_succeeded',
  'driver.biometric_unlock_failed',
  'driver.biometric_fallback_used',
  'driver.biometric_credential_invalidated',
  'driver.device_revoked',
  'driver.password_reauthentication_required',
])

export function mapDriverDeviceRow(row: Row) {
  return {
    id: String(row.id),
    label: String(row.label ?? 'Driver phone'),
    platform: String(row.platform ?? 'unknown'),
    appVersion: row.app_version ? String(row.app_version) : null,
    operatingSystem: row.operating_system ? String(row.operating_system) : null,
    registeredAt: String(row.registered_at ?? row.created_at),
    lastSeenAt: String(row.last_seen_at ?? row.updated_at ?? row.registered_at),
    trusted: String(row.security_status) === 'trusted',
    biometricUnlock: Boolean(row.biometric_unlock),
    biometricMethod: row.biometric_method ? String(row.biometric_method) : null,
    biometricEnabledAt: row.biometric_enabled_at ? String(row.biometric_enabled_at) : null,
    lastBiometricUnlockAt: row.last_biometric_unlock_at ? String(row.last_biometric_unlock_at) : null,
    pushNotificationsEnabled: Boolean(row.push_notifications_enabled),
    locationAccess: String(row.location_access ?? 'unknown') as
      | 'while_on_duty'
      | 'always'
      | 'denied'
      | 'unknown',
    securityStatus: String(row.security_status ?? 'trusted') as 'trusted' | 'untrusted' | 'revoked',
    requirePasswordNextLogin: Boolean(row.require_password_next_login),
  }
}

async function resolveDriverApp(context: { companyId: string; user: { id: string } }) {
  const { data: appAccount, error } = await admin
    .from('driver_app_accounts')
    .select('id, driver_id, company_id, account_status')
    .eq('company_id', context.companyId)
    .eq('user_id', context.user.id)
    .maybeSingle()
  if (error) return { error: apiError(500, error.message) }
  if (!appAccount?.driver_id) {
    return { error: apiError(403, 'No driver account is linked to this login.', 'not_driver') }
  }
  return { appAccount }
}

async function auditDriverDevice(
  companyId: string,
  actorId: string,
  action: string,
  driverId: string,
  before: Row | null,
  after: Row | null,
  reason?: string | null,
  opts?: { sourceApp?: string; deviceId?: string | null },
) {
  await admin.from('audit_events').insert({
    company_id: companyId,
    actor_type: 'user',
    actor_id: actorId,
    action,
    entity_type: 'driver',
    entity_id: driverId,
    source_app: opts?.sourceApp ?? 'COMMAND',
    device_id: opts?.deviceId ?? null,
    before_snapshot: before,
    after_snapshot: after,
    reason: reason ?? null,
  })
}

export async function upsertDriverDevice(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverApp(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const deviceKey = String(input.deviceKey ?? '').trim()
  if (!deviceKey || deviceKey.length > 128) {
    return apiError(400, 'deviceKey is required')
  }

  const now = new Date().toISOString()
  const driverId = String(appAccount.driver_id)
  const companyId = String(appAccount.company_id)

  const { data: existing } = await admin
    .from('driver_app_devices')
    .select('*')
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .eq('device_key', deviceKey)
    .maybeSingle()

  if (existing && String(existing.security_status) === 'revoked') {
    return apiError(
      403,
      'This device was revoked by your operator. Sign in with your password on a trusted device.',
      'device_revoked',
    )
  }

  const biometricUnlock = Boolean(input.biometricUnlock)
  const patch: Row = {
    app_account_id: appAccount.id,
    label: String(input.label ?? existing?.label ?? 'Driver phone').slice(0, 80),
    platform: input.platform ? String(input.platform).slice(0, 40) : existing?.platform ?? null,
    operating_system: input.operatingSystem
      ? String(input.operatingSystem).slice(0, 80)
      : existing?.operating_system ?? null,
    app_version: input.appVersion ? String(input.appVersion).slice(0, 40) : existing?.app_version ?? null,
    biometric_unlock: biometricUnlock,
    biometric_method: input.biometricMethod
      ? String(input.biometricMethod).slice(0, 60)
      : existing?.biometric_method ?? null,
    push_notifications_enabled:
      input.pushNotificationsEnabled != null
        ? Boolean(input.pushNotificationsEnabled)
        : Boolean(existing?.push_notifications_enabled ?? false),
    location_access: String(input.locationAccess ?? existing?.location_access ?? 'unknown'),
    last_seen_at: now,
    updated_at: now,
    require_password_next_login: false,
  }

  if (biometricUnlock) {
    patch.biometric_enabled_at = existing?.biometric_enabled_at ?? now
  } else if (input.biometricUnlock === false) {
    patch.biometric_enabled_at = null
    patch.last_biometric_unlock_at = existing?.last_biometric_unlock_at ?? null
  }

  if (input.lastBiometricUnlockAt) {
    patch.last_biometric_unlock_at = String(input.lastBiometricUnlockAt)
  }

  let row: Row | null = existing
  if (existing) {
    const { data, error } = await admin
      .from('driver_app_devices')
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single()
    if (error) return apiError(500, error.message)
    row = data
  } else {
    const { data, error } = await admin
      .from('driver_app_devices')
      .insert({
        company_id: companyId,
        driver_id: driverId,
        device_key: deviceKey,
        security_status: 'trusted',
        registered_at: now,
        ...patch,
      })
      .select('*')
      .single()
    if (error) return apiError(500, error.message)
    row = data
  }

  const { count } = await admin
    .from('driver_app_devices')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('driver_id', driverId)
    .neq('security_status', 'revoked')

  await admin
    .from('driver_app_accounts')
    .update({
      registered_device_count: count ?? 0,
      operating_system: patch.operating_system,
      app_version: patch.app_version,
      last_app_sync_at: now,
      updated_at: now,
    })
    .eq('id', appAccount.id)

  return json({ ok: true, device: mapDriverDeviceRow(row as Row) })
}

export async function getDriverDeviceStatus(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverApp(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const url = new URL(request.url)
  const deviceKey = String(url.searchParams.get('deviceKey') ?? '').trim()
  if (!deviceKey) return apiError(400, 'deviceKey is required')

  const { data, error } = await admin
    .from('driver_app_devices')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', appAccount.driver_id)
    .eq('device_key', deviceKey)
    .maybeSingle()
  if (error) return apiError(500, error.message)

  if (!data) {
    return json({
      ok: true,
      registered: false,
      securityStatus: 'untrusted',
      biometricUnlock: false,
      requirePasswordNextLogin: false,
      device: null,
    })
  }

  const mapped = mapDriverDeviceRow(data)
  return json({
    ok: true,
    registered: true,
    securityStatus: mapped.securityStatus,
    biometricUnlock: mapped.biometricUnlock,
    requirePasswordNextLogin: mapped.requirePasswordNextLogin,
    device: mapped,
  })
}

export async function postDriverSecurityEvent(request: Request) {
  const context = await authenticate(request)
  const resolved = await resolveDriverApp(context)
  if ('error' in resolved && resolved.error) return resolved.error
  const appAccount = resolved.appAccount!

  const input = await readJson<Row>(request)
  const action = String(input.action ?? '').trim()
  if (!ALLOWED_SECURITY_EVENTS.has(action)) {
    return apiError(400, 'Unsupported security event')
  }

  // Never accept biometric template fields from the client.
  const metadata = (input.metadata && typeof input.metadata === 'object'
    ? (input.metadata as Row)
    : {}) as Row
  for (const key of Object.keys(metadata)) {
    if (/fingerprint|face.?scan|template|biometric.?data|password|refresh.?token|access.?token/i.test(key)) {
      delete metadata[key]
    }
  }

  const deviceKey = input.deviceKey ? String(input.deviceKey).trim() : null
  let deviceRow: Row | null = null
  if (deviceKey) {
    const { data } = await admin
      .from('driver_app_devices')
      .select('id, security_status, biometric_unlock, last_biometric_unlock_at')
      .eq('company_id', context.companyId)
      .eq('driver_id', appAccount.driver_id)
      .eq('device_key', deviceKey)
      .maybeSingle()
    deviceRow = data

    if (action === 'driver.biometric_unlock_succeeded' && data && String(data.security_status) !== 'revoked') {
      const now = new Date().toISOString()
      await admin
        .from('driver_app_devices')
        .update({ last_biometric_unlock_at: now, last_seen_at: now, updated_at: now })
        .eq('id', data.id)
    }
  }

  await auditDriverDevice(
    context.companyId,
    context.user.id,
    action,
    String(appAccount.driver_id),
    null,
    {
      ...metadata,
      biometricMethod: input.biometricMethod ? String(input.biometricMethod).slice(0, 60) : null,
      deviceLabel: input.deviceLabel ? String(input.deviceLabel).slice(0, 80) : null,
      securityStatus: deviceRow ? String(deviceRow.security_status) : null,
    },
    input.reason ? String(input.reason).slice(0, 500) : null,
    { sourceApp: 'DRIVER', deviceId: deviceRow ? String(deviceRow.id) : deviceKey },
  )

  return json({ ok: true })
}

export async function revokeDriverDevice(
  request: Request,
  driverId: string,
  deviceId: string,
) {
  const context = await authenticate(request)
  const input = await readJson<Row>(request).catch(() => ({} as Row))
  const reason = String(input.reason ?? '').trim()
  if (!reason) return apiError(400, 'A reason is required to revoke a device.')

  const { data: device, error } = await admin
    .from('driver_app_devices')
    .select('*')
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .eq('id', deviceId)
    .maybeSingle()
  if (error) return apiError(500, error.message)
  if (!device) return apiError(404, 'Device not found')

  const now = new Date().toISOString()
  const { error: updateError } = await admin
    .from('driver_app_devices')
    .update({
      security_status: 'revoked',
      biometric_unlock: false,
      require_password_next_login: true,
      revoked_at: now,
      revoked_by: context.user.id,
      revoke_reason: reason,
      updated_at: now,
    })
    .eq('id', deviceId)
  if (updateError) return apiError(500, updateError.message)

  const { count } = await admin
    .from('driver_app_devices')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)
    .neq('security_status', 'revoked')

  await admin
    .from('driver_app_accounts')
    .update({
      registered_device_count: count ?? 0,
      active_session_count: 0,
      updated_at: now,
      updated_by: context.user.id,
    })
    .eq('company_id', context.companyId)
    .eq('driver_id', driverId)

  await auditDriverDevice(
    context.companyId,
    context.user.id,
    'driver.device_revoked',
    driverId,
    {
      deviceLabel: device.label,
      securityStatus: device.security_status,
      biometricUnlock: device.biometric_unlock,
    },
    {
      deviceLabel: device.label,
      securityStatus: 'revoked',
      biometricUnlock: false,
      requirePasswordNextLogin: true,
    },
    reason,
    { sourceApp: 'COMMAND', deviceId: String(device.id) },
  )

  await auditDriverDevice(
    context.companyId,
    context.user.id,
    'driver.password_reauthentication_required',
    driverId,
    null,
    { deviceId: String(device.id), deviceLabel: device.label },
    'Device revoked — password required at next login',
    { sourceApp: 'COMMAND', deviceId: String(device.id) },
  )

  return { ok: true as const, companyId: context.companyId, driverId }
}
