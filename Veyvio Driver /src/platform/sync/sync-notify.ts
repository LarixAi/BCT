import { toast } from "sonner";
import { driverCopy } from "@/copy/driver-messages";

export function notifyAfterEnqueue(): void {
  // Reserved for future toast when offline enqueue happens
}

export function notifyConnectionRestored(): void {
  toast.success("Connection restored — syncing changes");
}

export function notifySyncComplete(): void {
  toast.success("All changes synced");
}

export function notifySyncFailed(message?: string): void {
  toast.error(message ?? driverCopy.sync.syncFailed);
}
