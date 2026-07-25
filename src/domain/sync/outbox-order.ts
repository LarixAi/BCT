import type { OutboxMutation } from "@/types/sync";

/** Lower runs first — inspection.start must reach Command before media/complete. */
const UPLOAD_PRIORITY: Partial<Record<OutboxMutation["type"], number>> = {
  "inspection.start": 10,
  "inspection.media": 20,
  "damage.report": 20,
  "task.create": 25,
  "inspection.complete": 30,
  "inspection.approve": 40,
  "damage.review": 40,
  "repair.request": 50,
  "repair.start": 60,
  "repair.complete": 70,
  "repair.verify": 80,
  "vehicle.mark_vor": 90,
};

export function sortOutboxForUpload(mutations: OutboxMutation[]): OutboxMutation[] {
  return [...mutations].sort((a, b) => {
    const pa = UPLOAD_PRIORITY[a.type] ?? 100;
    const pb = UPLOAD_PRIORITY[b.type] ?? 100;
    if (pa !== pb) return pa - pb;
    return a.createdAt.localeCompare(b.createdAt);
  });
}
