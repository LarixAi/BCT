import type { LeadRecord } from "./demo-handler";

export type LeadPersistResult = {
  persisted: true;
  reference: string;
};

export type LeadStore = {
  save(lead: LeadRecord): Promise<LeadPersistResult>;
  list?(): Promise<LeadRecord[]>;
};

/** In-memory store for unit tests / non-prod Worker fallback. */
export function createMemoryLeadStore(seed: LeadRecord[] = []): LeadStore {
  const rows = [...seed];
  return {
    async save(lead) {
      rows.push(lead);
      return { persisted: true, reference: lead.reference };
    },
    async list() {
      return [...rows];
    },
  };
}

/** Cloudflare KV binding store (production waiting-list evidence). */
export function createKvLeadStore(kv: {
  put: (key: string, value: string) => Promise<void>;
}): LeadStore {
  return {
    async save(lead) {
      await kv.put(`lead:${lead.reference}`, JSON.stringify(lead));
      await kv.put(`email:${lead.email.toLowerCase()}:${lead.reference}`, lead.reference);
      return { persisted: true, reference: lead.reference };
    },
  };
}
