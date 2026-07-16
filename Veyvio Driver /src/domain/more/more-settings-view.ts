import type { DriverMorePayload, MoreMenuSection } from "@/types/more";
import {
  approvalStatusLabel,
  driverTypeLabel,
  formatSyncTime,
} from "@/domain/more/more-helpers";
import { isOnline } from "@/platform/device/connectivity";

export interface MoreQuickAction {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone?: "warn" | "ok" | "";
}

export interface MoreHubView {
  displayName: string;
  subtitle: string;
  companyLine: string;
  initials: string;
  quickActions: MoreQuickAction[];
  sections: MoreMenuSection[];
  versionLabel: string;
}

export interface AccountLinkItem {
  label: string;
  description: string;
  href: string;
  status?: string;
  warning?: boolean;
}

export interface AccountGroup {
  id: string;
  items: AccountLinkItem[];
}

export interface AccountPageView {
  displayName: string;
  driverIdLabel: string;
  initials: string;
  groups: AccountGroup[];
  note: string;
}

/**
 * Uber-inspired More hub — profile entry, three quick actions, short menus.
 * Compliance moves into Account; App settings is one destination.
 */
export function buildMoreHubView(input: {
  more: DriverMorePayload;
  declarationAttentionCount: number;
  appVersion?: string;
}): MoreHubView {
  const { more } = input;
  const docCount = more.complianceAlerts.length;
  const declCount = input.declarationAttentionCount;
  const online = isOnline() && more.syncStatus.online;
  const pending = more.syncStatus.pendingUploads;

  const syncDetail =
    online && pending === 0
      ? "Up to date"
      : pending > 0
        ? `${pending} pending`
        : "Offline · downloaded data available";

  const docsDetail =
    docCount > 0
      ? `${docCount} need${docCount === 1 ? "s" : ""} attention`
      : "All current";

  const approvalLine =
    more.identity.approvalStatus === "approved"
      ? `Approved ${driverTypeLabel(more.identity.driverType).toLowerCase()}`
      : approvalStatusLabel(more.identity.approvalStatus);

  return {
    displayName: more.identity.displayName || more.identity.legalName,
    subtitle: approvalLine,
    companyLine: more.identity.companyName,
    initials: more.identity.initials,
    quickActions: [
      {
        id: "documents",
        label: "Documents",
        detail: docsDetail,
        href: "/more/documents",
        tone: docCount > 0 ? "warn" : "ok",
      },
      {
        id: "sync",
        label: "Sync",
        detail: syncDetail,
        href: "/more/offline-sync",
        tone: online && pending === 0 ? "ok" : "warn",
      },
      {
        id: "support",
        label: "Support",
        detail: "Contact Operations",
        href: "/more/support",
      },
    ],
    sections: [
      {
        id: "driver",
        title: "Driver",
        items: [
          {
            label: "Account",
            description: "Profile, company, documents and security",
            href: "/more/account",
          },
          {
            label: "Driver declarations",
            description: "Medical, fitness and policy declarations",
            href: "/more/declarations",
            badge: declCount || undefined,
          },
          {
            label: "Training",
            description: "Qualifications and refresher courses",
            href: "/more/training",
          },
        ],
      },
      {
        id: "app",
        title: "App",
        items: [
          {
            label: "App settings",
            description: "Notifications, accessibility and driving mode",
            href: "/more/settings",
          },
          {
            label: "Offline data and sync",
            description: "Downloaded duties and pending changes",
            href: "/more/offline-sync",
            badge: pending > 0 ? `${pending} pending` : online ? "Synced" : "Offline",
          },
        ],
      },
      {
        id: "help",
        title: "Help",
        items: [
          {
            label: "Contact Operations",
            description: "Duty, passenger, route and vehicle support",
            href: "/more/support",
          },
          {
            label: "Help centre",
            description: "Driver guides and troubleshooting",
            href: "/more/support",
          },
          {
            label: "Privacy and legal",
            description: "Policies, terms and app information",
            href: "/more/legal",
          },
        ],
      },
    ],
    versionLabel: `Veyvio Driver · ${input.appVersion ?? "0.1.0"}`,
  };
}

/**
 * Focused Account page — identity + compliance + security. No bottom nav.
 */
export function buildAccountPageView(input: {
  more: DriverMorePayload;
  declarationAttentionCount: number;
}): AccountPageView {
  const { more } = input;
  const docCount = more.complianceAlerts.length;
  const declCount = input.declarationAttentionCount;
  const approval = approvalStatusLabel(more.identity.approvalStatus);
  const depotShort = more.identity.depotName.replace(/ Depot$/, "");

  return {
    displayName: more.identity.legalName,
    driverIdLabel: `Driver ID ${more.identity.id} · ${approval.replace(/^Approved driver$/, "Approved")}`,
    initials: more.identity.initials,
    groups: [
      {
        id: "identity",
        items: [
          {
            label: "Personal information",
            description: "Name, phone, email and emergency contact",
            href: "/more/profile",
          },
          {
            label: "Company and depot",
            description: `${more.identity.companyName} · ${depotShort}`,
            href: "/more/company",
          },
        ],
      },
      {
        id: "compliance",
        items: [
          {
            label: "Licences and documents",
            description: "Driving licence, DBS, CPC and right to work",
            href: "/more/documents",
            status: docCount > 0 ? `${docCount} due` : "Current",
            warning: docCount > 0,
          },
          {
            label: "Training and qualifications",
            description: "Safeguarding, accessibility and CPC",
            href: "/more/training",
            status: "Current",
          },
          {
            label: "Driver declarations",
            description: "Medical, fitness and policy confirmations",
            href: "/more/declarations",
            status: declCount > 0 ? `${declCount} due` : "Current",
            warning: declCount > 0,
          },
        ],
      },
      {
        id: "security",
        items: [
          {
            label: "Security",
            description: "Password, biometrics and active devices",
            href: "/more/security",
            status: "Enabled",
          },
          {
            label: "Privacy and data",
            description: "Permissions, retention and data requests",
            href: "/more/legal",
          },
        ],
      },
    ],
    note:
      "Operational identity and compliance changes may require review by authorised company staff before they become active.",
  };
}

/** @deprecated Prefer buildMoreHubView — kept for any old callers */
export function buildMoreSettingsView(input: {
  more: DriverMorePayload;
  declarationAttentionCount: number;
  focusModeLabel?: string;
  securityLabel?: string;
  notificationsLabel?: string;
  appVersion?: string;
}) {
  const hub = buildMoreHubView(input);
  return {
    statusLabel: "Profile and settings",
    displayName: hub.displayName,
    subtitle: `${driverTypeLabel(input.more.identity.driverType)} · ${input.more.identity.depotName}`,
    initials: hub.initials,
    chips: [] as { id: string; label: string; tone: "" | "ok" | "warn" }[],
    attention: null,
    sections: hub.sections,
    versionLabel: hub.versionLabel,
  };
}

export function buildAppSettingsSections(): MoreMenuSection[] {
  return [
    {
      id: "preferences",
      title: "",
      items: [
        {
          label: "Notifications",
          description: "Operational alerts, reminders, sound and vibration",
          href: "/more/notifications",
        },
        {
          label: "Accessibility",
          description: "Text size, contrast, motion and read aloud",
          href: "/more/accessibility",
        },
        {
          label: "Driving mode",
          description: "Keep screen awake and reduce distractions",
          href: "/more/focus-mode",
        },
        {
          label: "About Veyvio Driver",
          description: "Version, product information and acknowledgements",
          href: "/more/about",
        },
      ],
    },
  ];
}

/** Last-synced hint for sync screens */
export function syncHintFromMore(more: DriverMorePayload): string {
  return `Last synced ${formatSyncTime(more.syncStatus.lastSyncedAt)}`;
}
