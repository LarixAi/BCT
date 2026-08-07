import type { VerifiedExecutiveSession } from "./veyvio-session";

export type VerifiedJwtDecision =
  | {
      allowed: true;
      code: "allowed";
      message: string;
      claims: {
        subject: string;
        sessionId: string;
        expiresAt: number;
        assuranceLevel: "aal1" | "aal2" | null;
      };
    }
  | {
      allowed: false;
      code: string;
      message: string;
    };

export function assessCentrallyVerifiedJwt(
  token: string,
  options: {
    expectedIssuer: string;
    expectedUserId: string;
    nowSeconds?: number;
  },
): VerifiedJwtDecision;

export function safeRequestId(value: unknown, fallback?: string): string;

export function assessExecutiveSessionStatus(
  status: {
    id?: string;
    authStrength?: string;
    assuranceLevel?: string;
    createdAt?: string;
    lastUsedAt?: string;
    expiresAt?: string;
    idleMinutes?: number;
    absoluteHours?: number;
    concurrentSessionLimit?: number;
    stepUpFresh?: boolean;
    stepUpMinutes?: number;
  },
  options?: {
    nowMs?: number;
    requireRecentStepUp?: boolean;
  },
): {
  allowed: boolean;
  code: string;
  message: string;
};

export function executiveProjection(session: VerifiedExecutiveSession): {
  identity: {
    displayName: string;
    role: string;
    companyName: string;
  };
  dataMode: "demonstration";
};

export function privateNoStoreHeaders(
  requestId?: string,
): Record<string, string>;
