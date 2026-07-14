import type { DriverFocusAuditEvent } from "@/types/driver-focus";

export interface DriverFocusAuditEntry {
  event: DriverFocusAuditEvent;
  at: string;
  detail?: string;
}

const MAX_AUDIT_ENTRIES = 100;

class DriverFocusAuditAdapter {
  private entries: DriverFocusAuditEntry[] = [];

  record(event: DriverFocusAuditEvent, detail?: string): void {
    this.entries.unshift({
      event,
      at: new Date().toISOString(),
      detail,
    });
    if (this.entries.length > MAX_AUDIT_ENTRIES) {
      this.entries.length = MAX_AUDIT_ENTRIES;
    }
  }

  list(): DriverFocusAuditEntry[] {
    return [...this.entries];
  }

  clear(): void {
    this.entries = [];
  }
}

export const driverFocusAudit = new DriverFocusAuditAdapter();
