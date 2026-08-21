/**
 * Phase 9 — pure security event catalogue and alert thresholds (no Supabase import).
 */
export const SECURITY_EVENT_CATALOG = {
  'auth.login_succeeded': {
    label: 'Successful login',
    defaultSeverity: 'info',
    category: 'authentication',
  },
  'auth.login_failed': {
    label: 'Failed login',
    defaultSeverity: 'attention',
    category: 'authentication',
  },
  'auth.mfa_challenge_created': {
    label: 'MFA challenge created',
    defaultSeverity: 'info',
    category: 'authentication',
  },
  'auth.mfa_challenge_passed': {
    label: 'MFA challenge passed',
    defaultSeverity: 'info',
    category: 'authentication',
  },
  'auth.mfa_challenge_failed': {
    label: 'MFA challenge failed',
    defaultSeverity: 'attention',
    category: 'authentication',
  },
  'auth.mfa_enabled': {
    label: 'MFA enabled',
    defaultSeverity: 'info',
    category: 'authentication',
  },
  'auth.password_reset_requested': {
    label: 'Password recovery requested',
    defaultSeverity: 'attention',
    category: 'authentication',
  },
  'auth.password_reset_completed': {
    label: 'Password recovery completed',
    defaultSeverity: 'attention',
    category: 'authentication',
  },
  'auth.session_revoked': {
    label: 'Session revoked',
    defaultSeverity: 'attention',
    category: 'authentication',
  },
  'auth.company_selected': {
    label: 'Company selected',
    defaultSeverity: 'info',
    category: 'authentication',
  },
  'auth.concurrent_session_limit': {
    label: 'Concurrent session limit',
    defaultSeverity: 'attention',
    category: 'authentication',
  },
  'access.role_changed': {
    label: 'Role or permission change',
    defaultSeverity: 'attention',
    category: 'authorisation',
  },
  'access.application_grant_changed': {
    label: 'Application access change',
    defaultSeverity: 'attention',
    category: 'authorisation',
  },
  'access.branch_scope_changed': {
    label: 'Branch scope change',
    defaultSeverity: 'attention',
    category: 'authorisation',
  },
  'executive.document_downloaded': {
    label: 'Executive document download',
    defaultSeverity: 'attention',
    category: 'data_access',
  },
  'executive.document_restored': {
    label: 'Executive document restored',
    defaultSeverity: 'attention',
    category: 'data_access',
  },
  'executive.export_fulfilled': {
    label: 'Restricted export fulfilled',
    defaultSeverity: 'critical',
    category: 'data_access',
  },
  'executive.sensitive_action_approved': {
    label: 'Sensitive action approved',
    defaultSeverity: 'attention',
    category: 'approvals',
  },
  'support.access_granted': {
    label: 'Support access granted',
    defaultSeverity: 'attention',
    category: 'support',
  },
  'support.access_revoked': {
    label: 'Support access revoked',
    defaultSeverity: 'info',
    category: 'support',
  },
  'support.access_used': {
    label: 'Support access used',
    defaultSeverity: 'attention',
    category: 'support',
  },
  'security.privilege_escalation_detected': {
    label: 'Privilege escalation pattern',
    defaultSeverity: 'critical',
    category: 'alerting',
  },
  'security.bulk_access_detected': {
    label: 'Bulk access pattern',
    defaultSeverity: 'critical',
    category: 'alerting',
  },
  'integration.api_key_missing': {
    label: 'Integration API key missing',
    defaultSeverity: 'attention',
    category: 'integration',
  },
  'integration.api_key_rejected': {
    label: 'Integration API key rejected',
    defaultSeverity: 'attention',
    category: 'integration',
  },
  'integration.api_key_scope_denied': {
    label: 'Integration API key scope denied',
    defaultSeverity: 'attention',
    category: 'integration',
  },
  'integration.rate_limited': {
    label: 'Integration rate limited',
    defaultSeverity: 'attention',
    category: 'integration',
  },
  'integration.malformed_request': {
    label: 'Integration malformed request',
    defaultSeverity: 'info',
    category: 'integration',
  },
} as const

export type SecurityEventType = keyof typeof SECURITY_EVENT_CATALOG

export const ALERT_THRESHOLDS = {
  repeated_login_failures: {
    code: 'repeated_login_failures',
    title: 'Repeated login failures',
    windowMinutes: 15,
    count: 8,
    severity: 'attention' as const,
    eventTypes: ['auth.login_failed'] as const,
  },
  repeated_mfa_failures: {
    code: 'repeated_mfa_failures',
    title: 'Repeated MFA failures',
    windowMinutes: 15,
    count: 5,
    severity: 'attention' as const,
    eventTypes: ['auth.mfa_challenge_failed'] as const,
  },
  bulk_document_downloads: {
    code: 'bulk_document_downloads',
    title: 'Bulk Executive document downloads',
    windowMinutes: 60,
    count: 20,
    severity: 'critical' as const,
    eventTypes: ['executive.document_downloaded'] as const,
  },
  privilege_escalation_burst: {
    code: 'privilege_escalation_burst',
    title: 'Privilege-change burst',
    windowMinutes: 60,
    count: 3,
    severity: 'critical' as const,
    eventTypes: [
      'access.role_changed',
      'access.application_grant_changed',
      'executive.sensitive_action_approved',
    ] as const,
  },
} as const

export function isKnownSecurityEventType(value: string): value is SecurityEventType {
  return Object.prototype.hasOwnProperty.call(SECURITY_EVENT_CATALOG, value)
}

export function securityTriageMatrix() {
  return {
    severities: [
      {
        severity: 'critical',
        triageOwner: 'Security Owner',
        responseMinutes: 30,
        examples: [
          'privilege escalation burst',
          'bulk restricted downloads',
          'export fulfilment abuse',
        ],
      },
      {
        severity: 'attention',
        triageOwner: 'Security Owner or on-call Technical Owner',
        responseMinutes: 240,
        examples: ['repeated login/MFA failures', 'support grant', 'password recovery'],
      },
      {
        severity: 'info',
        triageOwner: 'Technical Owner (review in business hours)',
        responseMinutes: 1440,
        examples: ['successful login', 'MFA enabled', 'company selected'],
      },
    ],
  }
}
