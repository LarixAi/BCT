import type { ComplianceSeverity, DocumentStatus, DriverApprovalStatus, DriverType } from "@/types/more";
import { CheckCircle2, Clock, FileWarning, ShieldAlert, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function approvalStatusLabel(status: DriverApprovalStatus): string {
  const labels: Record<DriverApprovalStatus, string> = {
    approved: "Approved driver",
    approval_pending: "Approval pending",
    documents_required: "Documents required",
    temporarily_restricted: "Temporarily restricted",
    suspended: "Suspended",
    inactive: "Account inactive",
  };
  return labels[status];
}

export function approvalStatusIcon(status: DriverApprovalStatus): LucideIcon {
  switch (status) {
    case "approved":
      return CheckCircle2;
    case "approval_pending":
    case "documents_required":
      return FileWarning;
    case "temporarily_restricted":
      return ShieldAlert;
    case "suspended":
    case "inactive":
      return UserX;
    default:
      return Clock;
  }
}

export function driverTypeLabel(type: DriverType): string {
  const labels: Record<DriverType, string> = {
    psv_driver: "PSV driver",
    phv_driver: "PHV driver",
    school_transport: "School transport driver",
    escort: "Escort",
    passenger_assistant: "Passenger assistant",
  };
  return labels[type];
}

export function documentStatusLabel(status: DocumentStatus): string {
  const labels: Partial<Record<DocumentStatus, string>> = {
    missing: "Evidence required",
    draft: "Incomplete",
    uploaded: "Uploaded",
    uploading: "Uploading",
    pending_review: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
    expiring_soon: "Expiring soon",
    expired: "Expired",
    replaced: "Replaced",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

export function documentSideStatusLabel(status: import("@/types/more").DocumentSideStatus): string {
  const labels = {
    missing: "Required",
    uploading: "Uploading",
    pending_review: "Submitted",
    approved: "On file",
    rejected: "Rejected",
  } as const;
  return labels[status];
}

export function complianceSeverityTone(severity: ComplianceSeverity): "amber" | "red" | "teal" {
  switch (severity) {
    case "critical":
      return "red";
    case "warning":
      return "amber";
    default:
      return "teal";
  }
}

export function formatSyncTime(iso?: string): string {
  if (!iso) return "Never";
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today, ${time}`;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function buildMoreMenuSections(
  documentAttentionCount: number,
  declarationAttentionCount = 0,
): import("@/types/more").MoreMenuSection[] {
  return [
    {
      id: "account",
      title: "Account",
      items: [
        { label: "Personal information", href: "/more/profile" },
        { label: "Emergency contact", href: "/more/emergency-contact" },
        { label: "Company and depot", href: "/more/company" },
      ],
    },
    {
      id: "compliance",
      title: "Driver & compliance",
      items: [
        { label: "Licences and documents", href: "/more/documents", badge: documentAttentionCount || undefined },
        { label: "Training and qualifications", href: "/more/training" },
        { label: "Driver declarations", href: "/more/declarations", badge: declarationAttentionCount || undefined },
      ],
    },
    {
      id: "settings",
      title: "App settings",
      items: [
        { label: "Notifications", href: "/more/notifications" },
        { label: "Security and biometrics", href: "/more/security" },
        { label: "Accessibility", href: "/more/accessibility" },
        { label: "Driver Focus Mode", href: "/more/focus-mode" },
        { label: "Offline data and sync", href: "/more/offline-sync" },
      ],
    },
    {
      id: "support",
      title: "Help and support",
      items: [
        { label: "Contact operations", href: "/more/support" },
        { label: "Help centre", href: "/more/support" },
        { label: "Report an app problem", href: "/more/report-problem" },
      ],
    },
    {
      id: "legal",
      title: "",
      items: [
        { label: "Privacy and legal", href: "/more/legal" },
        { label: "About Veyvio", href: "/more/about" },
      ],
    },
  ];
}
