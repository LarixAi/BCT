/**
 * Pure Driver write-path company mismatch guard (no I/O).
 */
import { HttpError } from './http.ts'

export function assertRequestCompanyId(bodyCompanyId: unknown, contextCompanyId: string): void {
  const raw = String(bodyCompanyId ?? '').trim()
  if (raw && raw !== contextCompanyId) {
    throw new HttpError(403, 'Company mismatch — sign in to the correct operator', 'company_mismatch')
  }
}
