export type ExecutiveAccessInput = {
  userId?: string | null;
  companyId?: string | null;
  membershipId?: string | null;
  applications?: unknown[];
};

export type ExecutiveAccessDecision = {
  allowed: boolean;
  code: "allowed" | "immutable_identity_required" | "executive_access_required";
  message: string;
};

export function safeRelativeReturnPath(value: string): string;
export function safeAppReturnPath(value: string): string;
export function assessExecutiveAccess(
  input: ExecutiveAccessInput,
): ExecutiveAccessDecision;
export function signPayload(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string>;
export function verifySignedPayload(
  value: string,
  secret: string,
): Promise<Record<string, unknown> | null>;
