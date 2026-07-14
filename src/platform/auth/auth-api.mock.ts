import type { SignInCredentials } from "@/types/auth";
import type { Company, Depot } from "@/types/tenancy";
import { MOCK_COMPANIES, MOCK_DEPOTS } from "@/data/mocks/tenancy";

export async function mockSignIn(credentials: SignInCredentials) {
  await delay(300);
  if (!credentials.email.includes("@")) throw new Error("Invalid email");
  return {
    accessToken: `mock_at_${Date.now()}`,
    refreshToken: `mock_rt_${Date.now()}`,
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
  };
}

export async function mockFetchCompanies(): Promise<Company[]> {
  await delay(150);
  return MOCK_COMPANIES;
}

export async function mockFetchDepots(companyId: string): Promise<Depot[]> {
  await delay(150);
  return MOCK_DEPOTS.filter(d => d.companyId === companyId);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
