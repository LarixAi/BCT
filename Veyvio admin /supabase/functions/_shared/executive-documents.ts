/**
 * Phase 8 — Executive private documents, signed downloads and restricted exports.
 *
 * Authoritative write path: command-api (service role) → storage + file_objects +
 * executive_document_*. Frontend never receives storage secrets or permanent URLs.
 */
import {
  canonicalExecutiveRoles,
  type ExecutiveCanonicalRole,
} from './executive-authorisation.ts'
import { HttpError } from './http.ts'
import {
  buildTenantStoragePath,
  createTenantSignedUrl,
} from './signed-storage.ts'
import { admin, type RequestContext } from './supabase.ts'
import { recordSecurityEvent, validateExecutiveUserSession } from './tenant-auth.ts'

export const EXECUTIVE_DOCUMENTS_BUCKET = 'executive-documents'
export const EXECUTIVE_DOWNLOAD_TTL_SECONDS = 90
export const EXECUTIVE_MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export const EXECUTIVE_DOC_CLASSIFICATIONS = [
  'executive_internal',
  'executive_restricted',
  'executive_highly_restricted',
] as const

export type ExecutiveDocClassification = (typeof EXECUTIVE_DOC_CLASSIFICATIONS)[number]

export const EXECUTIVE_DOC_ENTITY_TYPES = [
  'executive_policy',
  'executive_company_record',
  'executive_board_pack',
  'executive_export',
  'executive_other',
] as const

export type ExecutiveDocEntityType = (typeof EXECUTIVE_DOC_ENTITY_TYPES)[number]

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'text/plain',
  'text/csv',
  'application/json',
])

const READ_ROLES: Record<ExecutiveDocClassification, ReadonlySet<ExecutiveCanonicalRole>> = {
  executive_internal: new Set([
    'chief_executive',
    'company_administrator',
    'director',
    'board_member',
    'board_reader',
    'auditor',
  ]),
  executive_restricted: new Set([
    'chief_executive',
    'director',
    'board_member',
    'auditor',
  ]),
  executive_highly_restricted: new Set([
    'chief_executive',
    'director',
    'board_member',
  ]),
}

const WRITE_ROLES = new Set<ExecutiveCanonicalRole>([
  'chief_executive',
  'company_administrator',
  'director',
])

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CORRELATION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

function safeCorrelationId(value: string | null): string {
  return value && CORRELATION_PATTERN.test(value) ? value : crypto.randomUUID()
}

function isClassification(value: string): value is ExecutiveDocClassification {
  return (EXECUTIVE_DOC_CLASSIFICATIONS as readonly string[]).includes(value)
}

function isEntityType(value: string): value is ExecutiveDocEntityType {
  return (EXECUTIVE_DOC_ENTITY_TYPES as readonly string[]).includes(value)
}

function mapFileObjectClassification(
  classification: ExecutiveDocClassification,
): 'general' | 'commercial' | 'safeguarding' {
  if (classification === 'executive_highly_restricted') return 'safeguarding'
  if (classification === 'executive_restricted') return 'commercial'
  return 'general'
}

function assertRoleAccess(
  roleKeys: readonly string[],
  allowed: ReadonlySet<ExecutiveCanonicalRole>,
  message: string,
  code: string,
) {
  const roles = canonicalExecutiveRoles(roleKeys)
  if (!roles.some((role) => allowed.has(role))) {
    throw new HttpError(403, message, code)
  }
}

async function requireExecutiveSession(
  context: RequestContext,
  request: Request,
  requireFreshStepUp: boolean,
) {
  const sessionId = request.headers.get('x-veyvio-session-id') ?? ''
  if (!UUID_PATTERN.test(sessionId)) {
    throw new HttpError(
      403,
      'Confirm your Executive session with multi-factor authentication',
      'executive_step_up_required',
    )
  }
  const session = await validateExecutiveUserSession({
    sessionId,
    userId: context.user.id,
    companyId: context.companyId,
    membershipId: context.membershipId,
  })
  if (requireFreshStepUp && !session.stepUpFresh) {
    throw new HttpError(
      403,
      'Sign in with multi-factor authentication again to continue',
      'executive_step_up_required',
    )
  }
  return session
}

export function sanitizeExecutiveFilename(filename: string): string {
  const base = String(filename ?? '')
    .split(/[/\\]/)
    .pop()
    ?.trim() ?? ''
  const cleaned = base.replace(/[^\w.\- ()[\]]+/g, '_').replace(/^\.+/, '')
  if (!cleaned || cleaned.length > 180) {
    throw new HttpError(400, 'A valid filename is required', 'invalid_filename')
  }
  return cleaned
}

export function detectExecutiveMime(
  bytes: Uint8Array,
  claimedMime: string | null,
  filename: string,
): string {
  const claimed = String(claimedMime ?? '').trim().toLowerCase()
  const lowerName = filename.toLowerCase()

  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png'
  }

  // Textual types — reject NUL bytes; trust extension + claimed type narrowly.
  const hasNul = bytes.some((b) => b === 0)
  if (!hasNul) {
    if (lowerName.endsWith('.json') || claimed === 'application/json') return 'application/json'
    if (lowerName.endsWith('.csv') || claimed === 'text/csv') return 'text/csv'
    if (lowerName.endsWith('.txt') || claimed === 'text/plain') return 'text/plain'
  }

  throw new HttpError(
    400,
    'File content does not match an allowed Executive document type',
    'invalid_file_content',
  )
}

export function validateExecutiveUploadBytes(input: {
  bytes: Uint8Array
  claimedMime: string | null
  filename: string
}): { mimeType: string; filename: string; size: number } {
  const filename = sanitizeExecutiveFilename(input.filename)
  if (!input.bytes.length) {
    throw new HttpError(400, 'Empty files are not accepted', 'empty_file')
  }
  if (input.bytes.length > EXECUTIVE_MAX_UPLOAD_BYTES) {
    throw new HttpError(413, 'File exceeds the 10 MB Executive limit', 'file_too_large')
  }
  const mimeType = detectExecutiveMime(input.bytes, input.claimedMime, filename)
  if (!ALLOWED_MIME.has(mimeType)) {
    throw new HttpError(400, 'This file type is not allowed', 'invalid_mime_type')
  }
  if (input.claimedMime) {
    const claimed = String(input.claimedMime).trim().toLowerCase()
    if (claimed && claimed !== mimeType && !(claimed === 'image/jpg' && mimeType === 'image/jpeg')) {
      throw new HttpError(
        400,
        'Declared file type does not match file contents',
        'mime_mismatch',
      )
    }
  }
  return { mimeType, filename, size: input.bytes.length }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function recordAccessEvent(input: {
  companyId: string
  documentFileId?: string | null
  exportJobId?: string | null
  eventType: 'preview' | 'download' | 'export' | 'replace' | 'delete' | 'upload'
  actorUserId: string
  actorMembershipId?: string | null
  actorSessionId?: string | null
  classification?: string | null
  purpose?: string | null
  reason?: string | null
  correlationId?: string | null
  metadata?: Record<string, unknown>
}) {
  const { error } = await admin.from('executive_document_access_events').insert({
    company_id: input.companyId,
    document_file_id: input.documentFileId ?? null,
    export_job_id: input.exportJobId ?? null,
    event_type: input.eventType,
    actor_user_id: input.actorUserId,
    actor_membership_id: input.actorMembershipId ?? null,
    actor_session_id: input.actorSessionId ?? null,
    classification: input.classification ?? null,
    purpose: input.purpose ?? null,
    reason: input.reason ?? null,
    request_correlation_id: input.correlationId ?? null,
    metadata: input.metadata ?? {},
  })
  if (error) {
    console.error('executive_document_access_events insert failed', error)
  }
}

async function companyHasActiveLegalHold(input: {
  companyId: string
  retentionCategory: string
  entityType?: string | null
  entityId?: string | null
}): Promise<boolean> {
  const { data, error } = await admin
    .from('executive_legal_holds')
    .select('id, retention_category, entity_type, entity_id')
    .eq('company_id', input.companyId)
    .eq('status', 'active')
    .limit(50)
  if (error) throw new Error(error.message)
  for (const hold of data ?? []) {
    const category = hold.retention_category ? String(hold.retention_category) : null
    if (category && category !== input.retentionCategory) continue
    const entityType = hold.entity_type ? String(hold.entity_type) : null
    if (entityType && entityType !== input.entityType) continue
    const entityId = hold.entity_id ? String(hold.entity_id) : null
    if (entityId && entityId !== input.entityId) continue
    return true
  }
  return false
}

/**
 * Structural malware gate (fail-closed for highly restricted until clean).
 * Real antivirus SaaS is intentionally residual — see Phase 8 evidence.
 */
export async function applyExecutiveDocumentScan(input: {
  fileObjectId: string
  companyId: string
  classification: ExecutiveDocClassification
  structuralOk: boolean
}): Promise<'pending' | 'clean' | 'infected' | 'failed'> {
  if (!input.structuralOk) {
    await admin
      .from('file_objects')
      .update({ virus_scan_status: 'infected' })
      .eq('id', input.fileObjectId)
      .eq('company_id', input.companyId)
    return 'infected'
  }
  if (input.classification === 'executive_highly_restricted') {
    // Fail-closed until an operator/test marks clean (or a real scanner lands).
    return 'pending'
  }
  await admin
    .from('file_objects')
    .update({ virus_scan_status: 'clean' })
    .eq('id', input.fileObjectId)
    .eq('company_id', input.companyId)
  return 'clean'
}

export async function markExecutiveDocumentScanClean(input: {
  context: RequestContext
  request: Request
  documentFileId: string
}) {
  const session = await requireExecutiveSession(input.context, input.request, true)
  assertRoleAccess(
    input.context.roleKeys,
    WRITE_ROLES,
    'Only Executive leaders can clear a malware hold',
    'permission_denied',
  )
  const { data: doc } = await admin
    .from('executive_document_files')
    .select('id, file_object_id, classification')
    .eq('id', input.documentFileId)
    .eq('company_id', input.context.companyId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!doc) {
    throw new HttpError(404, 'Document not found', 'executive_document_not_found')
  }
  await admin
    .from('file_objects')
    .update({ virus_scan_status: 'clean' })
    .eq('id', doc.file_object_id)
    .eq('company_id', input.context.companyId)
  await recordAccessEvent({
    companyId: input.context.companyId,
    documentFileId: doc.id,
    eventType: 'replace',
    actorUserId: input.context.user.id,
    actorMembershipId: input.context.membershipId,
    actorSessionId: session.id,
    classification: String(doc.classification),
    purpose: 'malware_hold_cleared',
    reason: 'Structural scan cleared by authorised Executive leader',
    correlationId: safeCorrelationId(input.request.headers.get('x-veyvio-request-id')),
    metadata: { scanEngine: 'manual_clear', residual: 'no_realtime_av_saas' },
  })
  return { id: doc.id, virusScanStatus: 'clean' }
}

function stampWatermarkText(input: {
  body: string
  companyId: string
  userId: string
  purpose: string
  correlationId: string
}): string {
  const stamp = [
    '--- VEYVIO EXECUTIVE WATERMARK ---',
    `company=${input.companyId}`,
    `actor=${input.userId}`,
    `purpose=${input.purpose}`,
    `correlation=${input.correlationId}`,
    `issued_at=${new Date().toISOString()}`,
    '--- END WATERMARK ---',
    '',
    input.body,
  ].join('\n')
  return stamp
}

async function persistExecutiveDocumentBytes(input: {
  context: RequestContext
  sessionId: string
  correlationId: string
  bytes: Uint8Array
  filename: string
  claimedMime: string | null
  entityType: ExecutiveDocEntityType
  entityId?: string | null
  classification: ExecutiveDocClassification
  purpose?: string | null
  watermarkRequired?: boolean
  retentionCategory?: string | null
  forceScanClean?: boolean
  accessEventType?: 'upload' | 'export'
  exportJobId?: string | null
}) {
  let bytes = input.bytes
  let validated = validateExecutiveUploadBytes({
    bytes,
    claimedMime: input.claimedMime,
    filename: input.filename,
  })
  const purpose = String(input.purpose ?? '').trim() || null
  const retentionCategory =
    String(input.retentionCategory ?? 'executive_documents').trim() || 'executive_documents'
  const watermarkRequired =
    Boolean(input.watermarkRequired) ||
    input.classification === 'executive_highly_restricted'

  if (
    watermarkRequired &&
    (validated.mimeType === 'text/plain' ||
      validated.mimeType === 'text/csv' ||
      validated.mimeType === 'application/json')
  ) {
    const stamped = stampWatermarkText({
      body: new TextDecoder().decode(bytes),
      companyId: input.context.companyId,
      userId: input.context.user.id,
      purpose: purpose ?? 'executive_document',
      correlationId: input.correlationId,
    })
    bytes = new TextEncoder().encode(stamped)
    validated = validateExecutiveUploadBytes({
      bytes,
      claimedMime: validated.mimeType,
      filename: validated.filename,
    })
  }

  const storageKey = buildTenantStoragePath(
    input.context.companyId,
    'executive',
    input.entityType,
    `${crypto.randomUUID()}-${validated.filename}`,
  )

  const { error: uploadError } = await admin.storage
    .from(EXECUTIVE_DOCUMENTS_BUCKET)
    .upload(storageKey, bytes, {
      contentType: validated.mimeType,
      upsert: false,
    })
  if (uploadError) {
    throw new HttpError(400, uploadError.message, 'storage_error')
  }

  const checksum = await sha256Hex(bytes)
  const now = new Date().toISOString()
  const { data: fileRow, error: fileError } = await admin
    .from('file_objects')
    .insert({
      company_id: input.context.companyId,
      storage_key: storageKey,
      original_filename: validated.filename,
      mime_type: validated.mimeType,
      size: validated.size,
      checksum,
      uploaded_by: input.context.user.id,
      classification: mapFileObjectClassification(input.classification),
      virus_scan_status: 'pending',
      source_app: 'COMMAND',
      created_by: input.context.user.id,
      updated_by: input.context.user.id,
      updated_at: now,
    })
    .select('id')
    .single()
  if (fileError || !fileRow) {
    await admin.storage.from(EXECUTIVE_DOCUMENTS_BUCKET).remove([storageKey])
    throw new HttpError(
      500,
      fileError?.message ?? 'file_objects insert failed',
      'file_metadata_failed',
    )
  }

  let scanStatus = await applyExecutiveDocumentScan({
    fileObjectId: String(fileRow.id),
    companyId: input.context.companyId,
    classification: input.classification,
    structuralOk: true,
  })
  if (input.forceScanClean && scanStatus === 'pending') {
    await admin
      .from('file_objects')
      .update({ virus_scan_status: 'clean' })
      .eq('id', fileRow.id)
      .eq('company_id', input.context.companyId)
    scanStatus = 'clean'
  }

  const onHold = await companyHasActiveLegalHold({
    companyId: input.context.companyId,
    retentionCategory,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
  })

  const { data: docRow, error: docError } = await admin
    .from('executive_document_files')
    .insert({
      company_id: input.context.companyId,
      file_object_id: fileRow.id,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      classification: input.classification,
      retention_category: retentionCategory,
      legal_hold: onHold,
      watermark_required: watermarkRequired,
      purpose,
      created_by: input.context.user.id,
    })
    .select('id, classification, watermark_required, legal_hold, created_at')
    .single()
  if (docError || !docRow) {
    throw new HttpError(
      500,
      docError?.message ?? 'document metadata failed',
      'document_metadata_failed',
    )
  }

  await recordAccessEvent({
    companyId: input.context.companyId,
    documentFileId: docRow.id,
    exportJobId: input.exportJobId ?? null,
    eventType: input.accessEventType ?? 'upload',
    actorUserId: input.context.user.id,
    actorMembershipId: input.context.membershipId,
    actorSessionId: input.sessionId,
    classification: input.classification,
    purpose,
    correlationId: input.correlationId,
    metadata: {
      mimeType: validated.mimeType,
      size: validated.size,
      virusScanStatus: scanStatus,
      storageBucket: EXECUTIVE_DOCUMENTS_BUCKET,
    },
  })

  return {
    id: String(docRow.id),
    classification: docRow.classification,
    watermarkRequired: Boolean(docRow.watermark_required),
    legalHold: Boolean(docRow.legal_hold),
    virusScanStatus: scanStatus,
    createdAt: docRow.created_at,
  }
}

export async function uploadExecutiveDocument(
  context: RequestContext,
  request: Request,
  input: {
    bytes: Uint8Array
    filename: string
    claimedMime: string | null
    entityType: string
    entityId?: string | null
    classification?: string | null
    purpose?: string | null
    watermarkRequired?: boolean
    retentionCategory?: string | null
  },
) {
  const session = await requireExecutiveSession(context, request, true)
  assertRoleAccess(
    context.roleKeys,
    WRITE_ROLES,
    'You do not have permission to upload Executive documents',
    'permission_denied',
  )

  if (!isEntityType(input.entityType)) {
    throw new HttpError(400, 'Unknown Executive document entity type', 'invalid_entity_type')
  }
  const classificationRaw = String(input.classification ?? 'executive_restricted')
  if (!isClassification(classificationRaw)) {
    throw new HttpError(400, 'Unknown classification', 'invalid_classification')
  }

  return persistExecutiveDocumentBytes({
    context,
    sessionId: session.id,
    correlationId: safeCorrelationId(request.headers.get('x-veyvio-request-id')),
    bytes: input.bytes,
    filename: input.filename,
    claimedMime: input.claimedMime,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    classification: classificationRaw,
    purpose: input.purpose,
    watermarkRequired: input.watermarkRequired,
    retentionCategory: input.retentionCategory,
  })
}

export async function listExecutiveDocuments(
  context: RequestContext,
  request: Request,
) {
  await requireExecutiveSession(context, request, false)
  const roles = canonicalExecutiveRoles(context.roleKeys)
  if (!roles.length) {
    throw new HttpError(403, 'Executive role required', 'executive_role_required')
  }

  const { data, error } = await admin
    .from('executive_document_files')
    .select(
      'id, entity_type, entity_id, classification, retention_category, legal_hold, watermark_required, purpose, created_at, file_object_id, file_objects(original_filename, mime_type, size, virus_scan_status)',
    )
    .eq('company_id', context.companyId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)

  const visible = (data ?? []).filter((row) => {
    const classification = String(row.classification)
    if (!isClassification(classification)) return false
    return roles.some((role) => READ_ROLES[classification].has(role))
  })

  return {
    documents: visible.map((row) => {
      const file = Array.isArray(row.file_objects)
        ? row.file_objects[0]
        : row.file_objects
      return {
        id: row.id,
        entityType: row.entity_type,
        entityId: row.entity_id,
        classification: row.classification,
        retentionCategory: row.retention_category,
        legalHold: row.legal_hold,
        watermarkRequired: row.watermark_required,
        purpose: row.purpose,
        createdAt: row.created_at,
        filename: file?.original_filename ?? null,
        mimeType: file?.mime_type ?? null,
        size: file?.size ?? null,
        virusScanStatus: file?.virus_scan_status ?? null,
      }
    }),
  }
}

export async function createExecutiveDocumentDownloadUrl(
  context: RequestContext,
  request: Request,
  documentFileId: string,
  input: { purpose?: string; reason?: string },
) {
  const session = await requireExecutiveSession(context, request, true)
  if (!UUID_PATTERN.test(documentFileId)) {
    throw new HttpError(404, 'Document not found', 'executive_document_not_found')
  }

  const purpose = String(input.purpose ?? '').trim()
  const reason = String(input.reason ?? '').trim()
  if (purpose.length < 3 || purpose.length > 200) {
    throw new HttpError(400, 'A download purpose is required', 'download_purpose_required')
  }

  const { data: doc, error } = await admin
    .from('executive_document_files')
    .select(
      'id, classification, watermark_required, legal_hold, purpose, file_object_id, file_objects(storage_key, mime_type, virus_scan_status, original_filename)',
    )
    .eq('id', documentFileId)
    .eq('company_id', context.companyId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error || !doc) {
    throw new HttpError(404, 'Document not found', 'executive_document_not_found')
  }

  const classification = String(doc.classification)
  if (!isClassification(classification)) {
    throw new HttpError(403, 'Document classification is invalid', 'invalid_classification')
  }
  assertRoleAccess(
    context.roleKeys,
    READ_ROLES[classification],
    'You do not have permission to download this classification',
    'classification_forbidden',
  )

  if (classification === 'executive_highly_restricted' && reason.length < 10) {
    throw new HttpError(
      400,
      'A reason of at least 10 characters is required for highly restricted downloads',
      'download_reason_required',
    )
  }

  const file = Array.isArray(doc.file_objects) ? doc.file_objects[0] : doc.file_objects
  if (!file?.storage_key) {
    throw new HttpError(404, 'Document file is missing', 'executive_document_not_found')
  }
  if (String(file.virus_scan_status) !== 'clean') {
    throw new HttpError(
      403,
      'This document is held until malware scanning completes',
      'malware_scan_pending',
    )
  }

  const correlationId = safeCorrelationId(request.headers.get('x-veyvio-request-id'))
  const signed = await createTenantSignedUrl({
    bucket: EXECUTIVE_DOCUMENTS_BUCKET,
    storageKey: String(file.storage_key),
    companyId: context.companyId,
    expiresInSeconds: EXECUTIVE_DOWNLOAD_TTL_SECONDS,
  })

  await recordAccessEvent({
    companyId: context.companyId,
    documentFileId: doc.id,
    eventType: 'download',
    actorUserId: context.user.id,
    actorMembershipId: context.membershipId,
    actorSessionId: session.id,
    classification,
    purpose,
    reason: reason || null,
    correlationId,
    metadata: {
      expiresInSeconds: signed.expiresInSeconds,
      watermarkRequired: doc.watermark_required,
      filename: file.original_filename,
    },
  })
  await recordSecurityEvent({
    companyId: context.companyId,
    actorUserId: context.user.id,
    eventType: 'executive.document_downloaded',
    message: 'Executive document download URL issued',
    severity: 'attention',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    metadata: {
      documentFileId: doc.id,
      classification,
      purpose,
      correlationId,
    },
  })

  return {
    documentId: doc.id,
    signedUrl: signed.signedUrl,
    expiresInSeconds: signed.expiresInSeconds,
    watermarkRequired: Boolean(doc.watermark_required),
    filename: file.original_filename,
    mimeType: file.mime_type,
  }
}

export async function softDeleteExecutiveDocument(
  context: RequestContext,
  request: Request,
  documentFileId: string,
  input: { reason?: string },
) {
  const session = await requireExecutiveSession(context, request, true)
  assertRoleAccess(
    context.roleKeys,
    WRITE_ROLES,
    'You do not have permission to delete Executive documents',
    'permission_denied',
  )
  const reason = String(input.reason ?? '').trim()
  if (reason.length < 10) {
    throw new HttpError(400, 'A deletion reason is required', 'delete_reason_required')
  }

  const { data: doc } = await admin
    .from('executive_document_files')
    .select('id, classification, legal_hold, retention_category, entity_type, entity_id')
    .eq('id', documentFileId)
    .eq('company_id', context.companyId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!doc) {
    throw new HttpError(404, 'Document not found', 'executive_document_not_found')
  }
  if (doc.legal_hold) {
    throw new HttpError(
      409,
      'This document is under legal hold and cannot be deleted',
      'legal_hold_active',
    )
  }
  const held = await companyHasActiveLegalHold({
    companyId: context.companyId,
    retentionCategory: String(doc.retention_category),
    entityType: String(doc.entity_type),
    entityId: doc.entity_id ? String(doc.entity_id) : null,
  })
  if (held) {
    throw new HttpError(
      409,
      'An active legal hold blocks deletion of this retention category',
      'legal_hold_active',
    )
  }

  const now = new Date().toISOString()
  const { error } = await admin
    .from('executive_document_files')
    .update({ deleted_at: now, deleted_by: context.user.id, updated_at: now })
    .eq('id', doc.id)
    .eq('company_id', context.companyId)
  if (error) throw new Error(error.message)

  await recordAccessEvent({
    companyId: context.companyId,
    documentFileId: doc.id,
    eventType: 'delete',
    actorUserId: context.user.id,
    actorMembershipId: context.membershipId,
    actorSessionId: session.id,
    classification: String(doc.classification),
    reason,
    correlationId: safeCorrelationId(request.headers.get('x-veyvio-request-id')),
    metadata: { softDelete: true, purge: false },
  })

  return { id: doc.id, deletedAt: now, purgeScheduled: false }
}

export async function placeExecutiveLegalHold(
  context: RequestContext,
  request: Request,
  input: {
    title: string
    reason: string
    retentionCategory?: string | null
    entityType?: string | null
    entityId?: string | null
  },
) {
  const session = await requireExecutiveSession(context, request, true)
  assertRoleAccess(
    context.roleKeys,
    WRITE_ROLES,
    'You do not have permission to place legal holds',
    'permission_denied',
  )
  const title = String(input.title ?? '').trim()
  const reason = String(input.reason ?? '').trim()
  if (title.length < 3 || reason.length < 10) {
    throw new HttpError(400, 'Title and reason are required for a legal hold', 'invalid_legal_hold')
  }

  const { data, error } = await admin
    .from('executive_legal_holds')
    .insert({
      company_id: context.companyId,
      title,
      reason,
      retention_category: input.retentionCategory ?? null,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      placed_by: context.user.id,
      status: 'active',
    })
    .select('id, title, status, placed_at')
    .single()
  if (error || !data) {
    throw new HttpError(500, error?.message ?? 'Legal hold failed', 'legal_hold_failed')
  }

  if (input.retentionCategory) {
    await admin
      .from('executive_document_files')
      .update({ legal_hold: true, updated_at: new Date().toISOString() })
      .eq('company_id', context.companyId)
      .eq('retention_category', input.retentionCategory)
      .is('deleted_at', null)
  }

  await recordAccessEvent({
    companyId: context.companyId,
    eventType: 'replace',
    actorUserId: context.user.id,
    actorMembershipId: context.membershipId,
    actorSessionId: session.id,
    purpose: 'legal_hold',
    reason,
    correlationId: safeCorrelationId(request.headers.get('x-veyvio-request-id')),
    metadata: { legalHoldId: data.id, title },
  })

  return data
}

export async function retentionDryRun(
  context: RequestContext,
  request: Request,
) {
  await requireExecutiveSession(context, request, false)
  assertRoleAccess(
    context.roleKeys,
    WRITE_ROLES,
    'You do not have permission to run retention reviews',
    'permission_denied',
  )

  const [{ data: policies }, { data: docs }] = await Promise.all([
    admin
      .from('data_retention_policies')
      .select('category, retention_days')
      .eq('company_id', context.companyId)
      .like('category', 'executive_%'),
    admin
      .from('executive_document_files')
      .select('id, retention_category, legal_hold, created_at, deleted_at')
      .eq('company_id', context.companyId)
      .is('deleted_at', null)
      .limit(500),
  ])

  const daysByCategory = new Map(
    (policies ?? []).map((row) => [String(row.category), Number(row.retention_days)]),
  )
  const now = Date.now()
  const candidates = (docs ?? []).filter((doc) => {
    if (doc.legal_hold) return false
    const days = daysByCategory.get(String(doc.retention_category))
    if (!days || !Number.isFinite(days)) return false
    const created = Date.parse(String(doc.created_at))
    if (!Number.isFinite(created)) return false
    return now - created > days * 86_400_000
  })

  return {
    dryRun: true,
    purgeEnabled: false,
    candidateCount: candidates.length,
    candidates: candidates.slice(0, 50).map((doc) => ({
      id: doc.id,
      retentionCategory: doc.retention_category,
      createdAt: doc.created_at,
    })),
    note: 'Destructive retention purge is not automated; legal holds always block deletion.',
  }
}

/**
 * Fulfil an authorised restricted_export job into a private Executive artefact.
 * Requires fresh step-up + explicit reason (SEC-0810).
 */
export async function fulfilAuthorisedExecutiveExport(
  context: RequestContext,
  request: Request,
  exportJobId: string,
  input: { reason?: string; purpose?: string },
) {
  const session = await requireExecutiveSession(context, request, true)
  assertRoleAccess(
    context.roleKeys,
    READ_ROLES.executive_restricted,
    'You do not have permission to fulfil restricted exports',
    'permission_denied',
  )
  if (!UUID_PATTERN.test(exportJobId)) {
    throw new HttpError(404, 'Export job not found', 'export_job_not_found')
  }

  const reason = String(input.reason ?? '').trim()
  const purpose = String(input.purpose ?? 'board_restricted_export').trim()
  if (reason.length < 10) {
    throw new HttpError(
      400,
      'An explicit reason of at least 10 characters is required for bulk export',
      'export_reason_required',
    )
  }

  const { data: job, error } = await admin
    .from('data_export_jobs')
    .select('*')
    .eq('id', exportJobId)
    .eq('company_id', context.companyId)
    .maybeSingle()
  if (error || !job) {
    throw new HttpError(404, 'Export job not found', 'export_job_not_found')
  }
  if (String(job.status) !== 'authorised') {
    throw new HttpError(
      409,
      'Only board-authorised Executive exports can be fulfilled',
      'export_not_authorised',
    )
  }
  if (job.executive_document_file_id) {
    throw new HttpError(409, 'This export has already been fulfilled', 'export_already_fulfilled')
  }

  const classification: ExecutiveDocClassification =
    String(job.classification ?? 'executive_restricted') === 'executive_highly_restricted'
      ? 'executive_highly_restricted'
      : 'executive_restricted'

  const correlationId = safeCorrelationId(request.headers.get('x-veyvio-request-id'))
  const bytes = new TextEncoder().encode(
    JSON.stringify(
      {
        exportJobId: job.id,
        exportType: job.export_type,
        companyId: context.companyId,
        authorisedAt: job.started_at,
        sensitiveActionRequestId: job.sensitive_action_request_id,
        note: 'Restricted export artefact. Full company dump delivery remains residual.',
      },
      null,
      2,
    ),
  )

  const uploaded = await persistExecutiveDocumentBytes({
    context,
    sessionId: session.id,
    correlationId,
    bytes,
    filename: `executive-export-${job.id}.json`,
    claimedMime: 'application/json',
    entityType: 'executive_export',
    entityId: String(job.id),
    classification,
    purpose,
    watermarkRequired: true,
    retentionCategory: 'executive_exports',
    forceScanClean: true,
    accessEventType: 'export',
    exportJobId: String(job.id),
  })

  const now = new Date().toISOString()
  await admin
    .from('data_export_jobs')
    .update({
      status: 'completed',
      completed_at: now,
      reason,
      purpose,
      watermark_required: true,
      classification,
      executive_document_file_id: uploaded.id,
    })
    .eq('id', job.id)
    .eq('company_id', context.companyId)

  await recordSecurityEvent({
    companyId: context.companyId,
    actorUserId: context.user.id,
    eventType: 'executive.export_fulfilled',
    message: 'Restricted Executive export fulfilled',
    severity: 'critical',
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
    metadata: {
      exportJobId: job.id,
      documentFileId: uploaded.id,
      classification,
      purpose,
      correlationId,
    },
  })

  const download = await createExecutiveDocumentDownloadUrl(
    context,
    request,
    uploaded.id,
    { purpose, reason },
  )

  return {
    exportJobId: job.id,
    status: 'completed',
    documentId: uploaded.id,
    download,
  }
}

/** Block Command settings/data-export from bypassing Executive two-person control. */
export function assertCommandExportAllowed(exportType: string | undefined) {
  const type = String(exportType ?? 'company_full').trim().toLowerCase()
  if (
    type.startsWith('executive') ||
    type.includes('restricted') ||
    type.includes('board')
  ) {
    throw new HttpError(
      403,
      'Restricted Executive exports require the sensitive-action workflow',
      'executive_export_requires_sensitive_action',
    )
  }
}
