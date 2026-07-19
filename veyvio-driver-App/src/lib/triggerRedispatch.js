import { invokeFunction } from "@/lib/invokeFunction";

/** Ask the marketplace engine to re-match a searching booking (best-effort). */
export async function triggerRedispatch() {
  try {
    await invokeFunction("marketplaceEngine", {}, { timeoutMs: 8000 });
  } catch {
    // Scheduled engine will pick it up within ~5s
  }
}
