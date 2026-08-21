import { mkdir, appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import type { LeadRecord } from "./demo-handler";
import type { LeadStore } from "./demo-leads-store";

/**
 * Local/dev file append store under `.data/demo-leads.jsonl`.
 * Node-only — never import from the Cloudflare Worker entry.
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
