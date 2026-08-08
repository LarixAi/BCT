import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import type { LeadRecord } from "./demo-handler";

export type LeadPersistResult = {
  persisted: true;
  reference: string;
};

export type LeadStore = {
  save(lead: LeadRecord): Promise<LeadPersistResult>;
  list?(): Promise<LeadRecord[]>;
};

/** In-memory store for unit tests. */
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

/**
 * Local/dev file append store under `.data/demo-leads.jsonl`.
 * Authoritative for Vite middleware until Cloudflare D1 is bound.
 */
export function createFileLeadStore(rootDir = process.cwd()): LeadStore {
  const filePath = path.join(rootDir, ".data", "demo-leads.jsonl");
  return {
    async save(lead) {
      await mkdir(path.dirname(filePath), { recursive: true });
      await appendFile(filePath, `${JSON.stringify(lead)}\n`, "utf8");
      return { persisted: true, reference: lead.reference };
    },
    async list() {
      try {
        const raw = await readFile(filePath, "utf8");
        return raw
          .split("\n")
          .filter(Boolean)
          .map(line => JSON.parse(line) as LeadRecord);
      } catch {
        return [];
      }
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
