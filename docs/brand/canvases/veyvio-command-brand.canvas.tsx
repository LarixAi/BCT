import type { CSSProperties, ReactNode } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CollapsibleSection,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Select,
  Spacer,
  Stack,
  Table,
  Text,
  TodoListCard,
  mergeStyle,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

type UiPreset = "compact" | "comfortable" | "spacious" | "custom";

type UiSettings = {
  preset: UiPreset;
  textScale: number;
  spacingScale: number;
  sidebarScale: number;
};

const UI_PRESETS: Record<Exclude<UiPreset, "custom">, Pick<UiSettings, "textScale" | "spacingScale" | "sidebarScale">> = {
  compact: { textScale: 82, spacingScale: 78, sidebarScale: 88 },
  comfortable: { textScale: 92, spacingScale: 88, sidebarScale: 94 },
  spacious: { textScale: 100, spacingScale: 100, sidebarScale: 100 },
};

const DEFAULT_UI_SETTINGS: UiSettings = { preset: "comfortable", ...UI_PRESETS.comfortable };

type UiScale = {
  font: (base: number) => number;
  space: (base: number) => number;
  sidebarWidth: (collapsed: boolean, compact?: boolean) => number;
  shellMinHeight: (compact?: boolean) => number;
  topBarHeight: (compact?: boolean) => number;
  radius: number;
};

function buildUi(settings: UiSettings, compact?: boolean): UiScale {
  const t = settings.textScale / 100;
  const s = settings.spacingScale / 100;
  const sb = settings.sidebarScale / 100;
  const c = compact ? 0.85 : 1;
  return {
    font: (base) => Math.max(7, Math.round(base * t * c)),
    space: (base) => Math.max(2, Math.round(base * s * c)),
    sidebarWidth: (collapsed, isCompact) => {
      if (collapsed) return Math.round(82 * sb * c);
      if (isCompact) return Math.round(176 * sb * c);
      return Math.round(236 * sb);
    },
    shellMinHeight: (isCompact) => Math.round((isCompact ? 380 : 700) * s),
    topBarHeight: (isCompact) => Math.round((isCompact ? 40 : 58) * s),
    radius: Math.max(3, Math.round(4 * s)),
  };
}

const TEXT_SCALE_OPTIONS = [
  { value: "75", label: "Text · Small (75%)" },
  { value: "82", label: "Text · Compact (82%)" },
  { value: "90", label: "Text · Medium (90%)" },
  { value: "100", label: "Text · Default (100%)" },
];

const SPACING_SCALE_OPTIONS = [
  { value: "72", label: "Boxes & gaps · Tight (72%)" },
  { value: "78", label: "Boxes & gaps · Compact (78%)" },
  { value: "88", label: "Boxes & gaps · Medium (88%)" },
  { value: "100", label: "Boxes & gaps · Default (100%)" },
];

const SIDEBAR_SCALE_OPTIONS = [
  { value: "82", label: "Sidebar · Narrow (82%)" },
  { value: "88", label: "Sidebar · Compact (88%)" },
  { value: "94", label: "Sidebar · Medium (94%)" },
  { value: "100", label: "Sidebar · Default (100%)" },
];

const PRESET_OPTIONS = [
  { value: "compact", label: "Compact (recommended)" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
  { value: "custom", label: "Custom" },
];

const BRAND = {
  midnight: "#0B1526",
  commandBlue: "#2F6BFF",
  commandBlueDark: "#1F4ED8",
  commandBlueSoft: "#EFF6FF",
  pageBg: "#F2F5F9",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  ink: "#101828",
  inkSoft: "#344054",
  muted: "#667085",
  border: "#DCE2EA",
  borderStrong: "#C7D0DD",
  ok: "#178C4B",
  warn: "#D97706",
  critical: "#D92D20",
  vor: "#B42318",
  stale: "#7A5AF8",
} as const;

function DisplaySettingsPanel({
  settings,
  onChange,
}: {
  settings: UiSettings;
  onChange: (next: UiSettings) => void;
}) {
  const applyPreset = (preset: UiPreset) => {
    if (preset === "custom") {
      onChange({ ...settings, preset });
      return;
    }
    onChange({ preset, ...UI_PRESETS[preset] });
  };

  return (
    <Card>
      <CardHeader trailing={<Pill active>Display</Pill>}>UI density settings</CardHeader>
      <CardBody>
        <Text tone="tertiary" size="small" style={{ marginBottom: 12 }}>
          Adjust text size, box padding, and sidebar width. Settings are saved with this canvas.
        </Text>
        <Grid columns={2} gap={16}>
          <Stack gap={10}>
            <Text weight="semibold" size="small">Preset</Text>
            <Select
              value={settings.preset}
              onChange={(v) => applyPreset(v as UiPreset)}
              options={PRESET_OPTIONS}
            />
            <Text weight="semibold" size="small">Text size</Text>
            <Select
              value={String(settings.textScale)}
              onChange={(v) => onChange({ ...settings, preset: "custom", textScale: Number(v) })}
              options={TEXT_SCALE_OPTIONS}
            />
          </Stack>
          <Stack gap={10}>
            <Text weight="semibold" size="small">Box padding & gaps</Text>
            <Select
              value={String(settings.spacingScale)}
              onChange={(v) => onChange({ ...settings, preset: "custom", spacingScale: Number(v) })}
              options={SPACING_SCALE_OPTIONS}
            />
            <Text weight="semibold" size="small">Sidebar width</Text>
            <Select
              value={String(settings.sidebarScale)}
              onChange={(v) => onChange({ ...settings, preset: "custom", sidebarScale: Number(v) })}
              options={SIDEBAR_SCALE_OPTIONS}
            />
          </Stack>
        </Grid>
        <Divider style={{ margin: "14px 0" }} />
        <Row gap={12} align="center" wrap>
          <Text tone="tertiary" size="small">
            Current: text {settings.textScale}% · spacing {settings.spacingScale}% · sidebar {settings.sidebarScale}%
          </Text>
          <Spacer />
          <SegmentedControl
            label="Quick preset"
            value={settings.preset === "custom" ? "" : settings.preset}
            options={[
              { value: "compact", label: "Compact" },
              { value: "comfortable", label: "Comfortable" },
              { value: "spacious", label: "Spacious" },
            ]}
            onChange={(v) => applyPreset(v as UiPreset)}
          />
          <Button variant="secondary" onClick={() => onChange({ ...DEFAULT_UI_SETTINGS })}>
            Reset defaults
          </Button>
        </Row>
      </CardBody>
    </Card>
  );
}

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <Text tone="tertiary" size="small" style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </Text>
      <div
        role="group"
        aria-label={label}
        style={{
          display: "inline-flex",
          padding: 3,
          gap: 3,
          borderRadius: 6,
          border: `1px solid ${BRAND.border}`,
          background: BRAND.pageBg,
        }}
      >
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              style={{
                border: "none",
                cursor: "pointer",
                padding: "6px 14px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.01em",
                color: active ? "#FFFFFF" : BRAND.muted,
                background: active ? BRAND.midnight : "transparent",
                transition: "background 0.12s ease, color 0.12s ease",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NAV_GROUPS: Array<{ title: string; items: string[] }> = [
  { title: "Command", items: ["Overview", "Live Operations", "Exceptions", "Notifications"] },
  { title: "Operations", items: ["Bookings", "Dispatch", "Runs", "Trips", "Schedule", "Recurring Transport"] },
  { title: "People and Fleet", items: ["Drivers", "Staff", "Vehicles", "Depots", "Yard Operations", "Maintenance"] },
  { title: "Safety and Compliance", items: ["Vehicle Checks", "Defects", "Inspections", "Incidents", "Compliance Rules"] },
  { title: "Customers and Commercial", items: ["Customers", "Passengers", "Schools", "Contracts", "Pricing"] },
  { title: "Communication", items: ["Messages", "Announcements", "Templates"] },
  { title: "Intelligence", items: ["Reports", "Performance", "Audit Log"] },
  { title: "Administration", items: ["Company Settings", "Users and Roles", "Integrations"] },
];

const ALL_PAGES = NAV_GROUPS.flatMap((g) => g.items.map((label) => ({ label, group: g.title })));

type WorkflowPage = {
  id: string;
  label: string;
  group: string;
  parent: string;
  path: string;
  routeType: "Access" | "Sub-page" | "Detail" | "Workflow";
  title: string;
  breadcrumb: string;
  action?: string;
};

const WORKFLOW_PAGES: WorkflowPage[] = [
  { id: "select-company", label: "Select company", group: "Access and context", parent: "Overview", path: "select-company", routeType: "Access", title: "Choose your operation", breadcrumb: "Access / Select company" },
  { id: "booking-new", label: "New booking", group: "Booking workflows", parent: "Bookings", path: "bookings/new", routeType: "Workflow", title: "Create booking", breadcrumb: "Operations / Bookings / New" },
  { id: "booking-urgent", label: "Urgent booking", group: "Booking workflows", parent: "Bookings", path: "bookings/new/urgent", routeType: "Workflow", title: "Create urgent booking", breadcrumb: "Operations / Bookings / Urgent" },
  { id: "booking-edit", label: "Edit booking", group: "Booking workflows", parent: "Bookings", path: "bookings/:bookingId/edit", routeType: "Workflow", title: "Edit booking B-1042", breadcrumb: "Operations / Bookings / B-1042 / Edit" },
  { id: "booking-detail", label: "Booking detail", group: "Booking workflows", parent: "Bookings", path: "bookings/:bookingId", routeType: "Detail", title: "Booking B-1042", breadcrumb: "Operations / Bookings / B-1042", action: "Edit booking" },
  { id: "operational-trip-detail", label: "Live trip execution", group: "Operational records", parent: "Live Operations", path: "live-operations/trips/:tripId", routeType: "Detail", title: "Live trip T-0184", breadcrumb: "Command / Live Operations / T-0184", action: "Reassign" },
  { id: "run-detail", label: "Run detail", group: "Operational records", parent: "Runs", path: "runs/:runId", routeType: "Detail", title: "Run AM-104", breadcrumb: "Operations / Runs / AM-104", action: "Manage assignment" },
  { id: "trip-detail", label: "Trip detail", group: "Operational records", parent: "Trips", path: "trips/:tripId", routeType: "Detail", title: "Trip T-0191", breadcrumb: "Operations / Trips / T-0191", action: "Assign trip" },
  { id: "driver-new", label: "Add driver", group: "People records", parent: "Drivers", path: "drivers/new", routeType: "Workflow", title: "Add driver", breadcrumb: "People and Fleet / Drivers / New" },
  { id: "driver-edit", label: "Edit driver", group: "People records", parent: "Drivers", path: "drivers/:driverId/edit", routeType: "Workflow", title: "Edit Larone Mitchell", breadcrumb: "People and Fleet / Drivers / Larone Mitchell" },
  { id: "driver-detail", label: "Driver detail", group: "People records", parent: "Drivers", path: "drivers/:driverId", routeType: "Detail", title: "Larone Mitchell", breadcrumb: "People and Fleet / Drivers / Larone Mitchell", action: "Edit driver" },
  { id: "staff-new", label: "Add staff member", group: "People records", parent: "Staff", path: "staff/new", routeType: "Workflow", title: "Add staff member", breadcrumb: "People and Fleet / Staff / New" },
  { id: "staff-detail", label: "Staff detail", group: "People records", parent: "Staff", path: "staff/:staffId", routeType: "Detail", title: "Sarah Mitchell", breadcrumb: "People and Fleet / Staff / Sarah Mitchell", action: "Edit profile" },
  { id: "vor-board", label: "VOR board", group: "Fleet control", parent: "Vehicles", path: "vehicles/vor", routeType: "Sub-page", title: "Vehicles off road", breadcrumb: "People and Fleet / Vehicles / VOR board", action: "Review release queue" },
  { id: "fleet-compliance", label: "Fleet compliance", group: "Fleet control", parent: "Vehicles", path: "vehicles/compliance", routeType: "Sub-page", title: "Fleet compliance", breadcrumb: "People and Fleet / Vehicles / Compliance" },
  { id: "fleet-intelligence", label: "Fleet intelligence", group: "Fleet control", parent: "Vehicles", path: "vehicles/intelligence", routeType: "Sub-page", title: "Fleet intelligence", breadcrumb: "People and Fleet / Vehicles / Intelligence" },
  { id: "vehicle-new", label: "Add vehicle", group: "Vehicle records", parent: "Vehicles", path: "vehicles/new", routeType: "Workflow", title: "Add vehicle", breadcrumb: "People and Fleet / Vehicles / New" },
  { id: "vehicle-onboarding", label: "Vehicle onboarding", group: "Vehicle records", parent: "Vehicles", path: "vehicles/:vehicleId/onboarding", routeType: "Workflow", title: "Onboard LK23 ABC", breadcrumb: "People and Fleet / Vehicles / LK23 ABC / Onboarding" },
  { id: "vehicle-edit", label: "Edit vehicle", group: "Vehicle records", parent: "Vehicles", path: "vehicles/:vehicleId/edit", routeType: "Workflow", title: "Edit LK23 ABC", breadcrumb: "People and Fleet / Vehicles / LK23 ABC / Edit" },
  { id: "vehicle-detail", label: "Vehicle detail", group: "Vehicle records", parent: "Vehicles", path: "vehicles/:vehicleId", routeType: "Detail", title: "LK23 ABC", breadcrumb: "People and Fleet / Vehicles / LK23 ABC", action: "Record action" },
  { id: "check-detail", label: "Vehicle check detail", group: "Safety investigations", parent: "Vehicle Checks", path: "vehicle-checks/:checkId", routeType: "Detail", title: "Vehicle check CHK-882", breadcrumb: "Safety and Compliance / Vehicle Checks / CHK-882" },
  { id: "defect-detail", label: "Defect detail", group: "Safety investigations", parent: "Defects", path: "defects/:defectId", routeType: "Detail", title: "Rear nearside light", breadcrumb: "Safety and Compliance / Defects / DEF-441", action: "Update defect" },
  { id: "incident-settings", label: "Incident settings", group: "Safety investigations", parent: "Incidents", path: "incidents/settings", routeType: "Sub-page", title: "Incident settings", breadcrumb: "Safety and Compliance / Incidents / Settings" },
  { id: "incident-detail", label: "Incident detail", group: "Safety investigations", parent: "Incidents", path: "incidents/:incidentId", routeType: "Detail", title: "Incident INC-034", breadcrumb: "Safety and Compliance / Incidents / INC-034", action: "Add update" },
];

type RoadmapPage = WorkflowPage & {
  phase: "P0 — Operational closure" | "P1 — Evidence and compliance" | "P2 — Platform control";
  screen: "board" | "detail" | "settings" | "utility";
};

const ROADMAP_PAGES: RoadmapPage[] = [
  { id: "duties-roadmap", label: "Duties", group: "Operational closure", parent: "Schedule", path: "duties", routeType: "Sub-page", phase: "P0 — Operational closure", screen: "board", title: "Driver duties", breadcrumb: "Operations / Duties", action: "Create duty" },
  { id: "duty-detail-roadmap", label: "Duty detail", group: "Operational closure", parent: "Schedule", path: "duties/:dutyId", routeType: "Detail", phase: "P0 — Operational closure", screen: "detail", title: "Duty DUT-104", breadcrumb: "Operations / Duties / DUT-104", action: "Update duty" },
  { id: "availability-roadmap", label: "Resource availability", group: "Operational closure", parent: "Dispatch", path: "availability", routeType: "Sub-page", phase: "P0 — Operational closure", screen: "board", title: "Resource availability", breadcrumb: "Operations / Availability" },
  { id: "cancellations-roadmap", label: "Cancellations", group: "Operational closure", parent: "Bookings", path: "cancellations", routeType: "Sub-page", phase: "P0 — Operational closure", screen: "board", title: "Cancellations", breadcrumb: "Operations / Cancellations", action: "Record cancellation" },
  { id: "handover-roadmap", label: "Handover board", group: "Operational closure", parent: "Live Operations", path: "handover", routeType: "Sub-page", phase: "P0 — Operational closure", screen: "board", title: "Shift handover", breadcrumb: "Operations / Handover", action: "Add handover item" },
  { id: "staff-edit-roadmap", label: "Edit staff member", group: "Operational closure", parent: "Staff", path: "staff/:staffId/edit", routeType: "Workflow", phase: "P0 — Operational closure", screen: "detail", title: "Edit Sarah Mitchell", breadcrumb: "People and Fleet / Staff / Sarah Mitchell / Edit", action: "Save changes" },
  { id: "work-orders-roadmap", label: "Maintenance work orders", group: "Evidence and compliance", parent: "Maintenance", path: "maintenance/work-orders", routeType: "Sub-page", phase: "P1 — Evidence and compliance", screen: "board", title: "Maintenance work orders", breadcrumb: "People and Fleet / Maintenance / Work Orders", action: "New work order" },
  { id: "work-order-detail-roadmap", label: "Work order detail", group: "Evidence and compliance", parent: "Maintenance", path: "maintenance/work-orders/:workOrderId", routeType: "Detail", phase: "P1 — Evidence and compliance", screen: "detail", title: "Work order WO-441", breadcrumb: "People and Fleet / Maintenance / WO-441", action: "Update work order" },
  { id: "compliance-dashboard-roadmap", label: "Compliance dashboard", group: "Evidence and compliance", parent: "Compliance Rules", path: "compliance", routeType: "Sub-page", phase: "P1 — Evidence and compliance", screen: "board", title: "Compliance dashboard", breadcrumb: "Safety and Compliance / Dashboard" },
  { id: "compliance-expiries-roadmap", label: "Compliance expiries", group: "Evidence and compliance", parent: "Compliance Rules", path: "compliance/expiries", routeType: "Sub-page", phase: "P1 — Evidence and compliance", screen: "board", title: "Document expiry", breadcrumb: "Safety and Compliance / Expiries", action: "Assign owners" },
  { id: "safeguarding-roadmap", label: "Safeguarding", group: "Evidence and compliance", parent: "Incidents", path: "safeguarding", routeType: "Sub-page", phase: "P1 — Evidence and compliance", screen: "board", title: "Safeguarding", breadcrumb: "Safety and Compliance / Safeguarding", action: "Record concern" },
  { id: "risk-assessments-roadmap", label: "Risk assessments", group: "Evidence and compliance", parent: "Inspections", path: "risk-assessments", routeType: "Sub-page", phase: "P1 — Evidence and compliance", screen: "board", title: "Risk assessments", breadcrumb: "Safety and Compliance / Risk Assessments", action: "New assessment" },
  { id: "inspection-detail-roadmap", label: "Inspection detail", group: "Evidence and compliance", parent: "Inspections", path: "inspections/:inspectionId", routeType: "Detail", phase: "P1 — Evidence and compliance", screen: "detail", title: "Inspection INS-204", breadcrumb: "Safety and Compliance / Inspections / INS-204", action: "Add finding" },
  { id: "corrective-actions-roadmap", label: "Corrective actions", group: "Evidence and compliance", parent: "Incidents", path: "corrective-actions", routeType: "Sub-page", phase: "P1 — Evidence and compliance", screen: "board", title: "Corrective actions", breadcrumb: "Safety and Compliance / Corrective Actions", action: "New action" },
  { id: "passenger-detail-roadmap", label: "Passenger detail", group: "Evidence and compliance", parent: "Passengers", path: "passengers/:passengerId", routeType: "Detail", phase: "P1 — Evidence and compliance", screen: "detail", title: "Amira Khan", breadcrumb: "Customers and Commercial / Passengers / Amira Khan", action: "Edit passenger" },
  { id: "customer-detail-roadmap", label: "Customer detail", group: "Evidence and compliance", parent: "Customers", path: "customers/:customerId", routeType: "Detail", phase: "P1 — Evidence and compliance", screen: "detail", title: "Brent Supported Travel", breadcrumb: "Customers and Commercial / Customers / Brent Supported Travel", action: "Edit customer" },
  { id: "school-detail-roadmap", label: "School detail", group: "Evidence and compliance", parent: "Schools", path: "schools/:schoolId", routeType: "Detail", phase: "P1 — Evidence and compliance", screen: "detail", title: "Brookfield Academy", breadcrumb: "Customers and Commercial / Schools / Brookfield Academy", action: "Edit organisation" },
  { id: "contract-detail-roadmap", label: "Contract detail", group: "Evidence and compliance", parent: "Contracts", path: "contracts/:contractId", routeType: "Detail", phase: "P1 — Evidence and compliance", screen: "detail", title: "Contract CTR-2026-014", breadcrumb: "Customers and Commercial / Contracts / CTR-2026-014", action: "Manage contract" },
  { id: "conversation-detail-roadmap", label: "Conversation detail", group: "Evidence and compliance", parent: "Messages", path: "messages/:conversationId", routeType: "Detail", phase: "P1 — Evidence and compliance", screen: "detail", title: "Run AM-104 delay", breadcrumb: "Communication / Messages / AM-104 Delay", action: "Reply" },
  { id: "delivery-log-roadmap", label: "Communication delivery", group: "Evidence and compliance", parent: "Messages", path: "communication/delivery", routeType: "Sub-page", phase: "P1 — Evidence and compliance", screen: "board", title: "Communication delivery", breadcrumb: "Communication / Delivery Log", action: "Export evidence" },
  { id: "roles-roadmap", label: "Roles and permissions", group: "Platform control", parent: "Users and Roles", path: "settings/roles", routeType: "Sub-page", phase: "P2 — Platform control", screen: "settings", title: "Roles and permissions", breadcrumb: "Administration / Roles" },
  { id: "invitations-roadmap", label: "User invitations", group: "Platform control", parent: "Users and Roles", path: "settings/invitations", routeType: "Sub-page", phase: "P2 — Platform control", screen: "settings", title: "User invitations", breadcrumb: "Administration / Invitations", action: "Invite user" },
  { id: "security-roadmap", label: "Security settings", group: "Platform control", parent: "Company Settings", path: "settings/security", routeType: "Sub-page", phase: "P2 — Platform control", screen: "settings", title: "Security settings", breadcrumb: "Administration / Security" },
  { id: "notification-settings-roadmap", label: "Notification settings", group: "Platform control", parent: "Company Settings", path: "settings/notifications", routeType: "Sub-page", phase: "P2 — Platform control", screen: "settings", title: "Notification settings", breadcrumb: "Administration / Notifications" },
  { id: "global-search-roadmap", label: "Global search", group: "Platform control", parent: "Overview", path: "search", routeType: "Sub-page", phase: "P2 — Platform control", screen: "utility", title: "Search Veyvio Command", breadcrumb: "Command / Search" },
  { id: "profile-roadmap", label: "My profile", group: "Platform control", parent: "Overview", path: "profile", routeType: "Sub-page", phase: "P2 — Platform control", screen: "utility", title: "My profile", breadcrumb: "Account / Profile", action: "Save profile" },
  { id: "imports-roadmap", label: "Import centre", group: "Platform control", parent: "Company Settings", path: "imports", routeType: "Sub-page", phase: "P2 — Platform control", screen: "utility", title: "Import centre", breadcrumb: "Administration / Imports", action: "New import" },
  { id: "exports-roadmap", label: "Export centre", group: "Platform control", parent: "Reports", path: "exports", routeType: "Sub-page", phase: "P2 — Platform control", screen: "utility", title: "Export centre", breadcrumb: "Intelligence / Exports", action: "Create export" },
];

const SYSTEM_PAGES = [
  { id: "access-denied-state", label: "Access denied", path: "access-denied", title: "You do not have access to this area", body: "Your current role does not include the permission needed for this page.", action: "Return to overview", detail: "Ask a company administrator if your operational responsibilities have changed." },
  { id: "session-expired-state", label: "Session expired", path: "session-expired", title: "Your session has expired", body: "Sign in again to continue. Your unsaved workflow context has been preserved.", action: "Sign in again", detail: "You will return to the record you were working on after authentication." },
  { id: "company-unavailable-state", label: "Company unavailable", path: "company-unavailable", title: "Ridgeway Transport is unavailable", body: "This company is currently inactive or cannot be selected.", action: "Choose another company", detail: "No operational data has been changed. Contact Veyvio Support if this is unexpected." },
  { id: "not-found-state", label: "Not found", path: "not-found", title: "This record cannot be found", body: "It may have been archived, removed or may not be available in your company.", action: "Return to overview", detail: "For security, Veyvio does not confirm whether records outside your company exist." },
];

const WORKFLOW_GROUPS = Array.from(new Set(WORKFLOW_PAGES.map((page) => page.group)));
const CURRENT_ROUTE_COUNT = ALL_PAGES.length + WORKFLOW_PAGES.length + 1;

/** Exception/attention counts shown on sidebar items — operational meaning first. */
const NAV_BADGES: Partial<Record<string, number>> = {
  Exceptions: 7,
  Notifications: 4,
  Dispatch: 3,
  "Vehicle Checks": 2,
  Defects: 4,
  Bookings: 1,
};

const GROUP_RAIL_LABEL: Record<string, string> = {
  Command: "Command",
  Operations: "Ops",
  "People and Fleet": "Fleet",
  "Safety and Compliance": "Safety",
  "Customers and Commercial": "Clients",
  Communication: "Comms",
  Intelligence: "Insights",
  Administration: "Admin",
};

function pageId(label: string): string {
  return label.toLowerCase().replace(/\s+/g, "-");
}

const BUILD_PHASES = [
  { id: "p1", content: "Phase 1 — Auth, company/depot context, permissions, shell, search, notifications, audit", status: "pending" as const },
  { id: "p2", content: "Phase 2 — Overview, Bookings, Runs, Trips, Dispatch, Live Ops, Exception queue", status: "pending" as const },
  { id: "p3", content: "Phase 3 — Drivers, Staff, Vehicles, VOR workflow, Yard integration", status: "pending" as const },
  { id: "p4", content: "Phase 4 — Checks, Defects, Incidents, Documents, Compliance rules", status: "pending" as const },
  { id: "p5", content: "Phase 5 — Messages, Customers, Contracts, Pricing, Finance", status: "pending" as const },
  { id: "p6", content: "Phase 6 — Reports, Exports, Platform admin, Integrations", status: "pending" as const },
];

function CommandWordmark({ scale = 1 }: { scale?: number }) {
  return (
    <div style={{ textAlign: "center", color: "#FFFFFF", transform: `scale(${scale})`, transformOrigin: "center" }}>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1 }}>VEYVIO</div>
      <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, letterSpacing: "0.38em", color: BRAND.commandBlue }}>COMMAND</div>
    </div>
  );
}

function BrowserFrame({ children, url = "command.veyvio.app" }: { children: ReactNode; url?: string }) {
  const theme = useHostTheme();
  return (
    <div style={{ width: "100%", minWidth: 0, borderRadius: 16, border: "7px solid #111318", overflow: "hidden", background: theme.bg.elevated, display: "flex", flexDirection: "column" }}>
      <div style={{ height: 30, padding: "0 10px", display: "flex", alignItems: "center", gap: 8, background: "#111318", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Row gap={5}>
          <div style={{ width: 7, height: 7, borderRadius: 4, background: theme.category.red }} />
          <div style={{ width: 7, height: 7, borderRadius: 4, background: theme.category.yellow }} />
          <div style={{ width: 7, height: 7, borderRadius: 4, background: theme.category.green }} />
        </Row>
        <div style={{ flex: 1, maxWidth: 420, margin: "0 auto", padding: "3px 10px", borderRadius: 4, fontSize: 9, color: "rgba(255,255,255,0.55)", background: "rgba(255,255,255,0.07)", textAlign: "center" }}>{url}</div>
      </div>
      {children}
    </div>
  );
}

type PillTone = "ready" | "attention" | "critical" | "info" | "neutral" | "vor";

function StatusPill({ label, tone, ui }: { label: string; tone: PillTone; ui?: UiScale }) {
  const colors: Record<PillTone, { bg: string; fg: string; border: string }> = {
    ready: { bg: "rgba(23,140,75,0.12)", fg: BRAND.ok, border: "rgba(23,140,75,0.3)" },
    attention: { bg: "rgba(217,119,6,0.12)", fg: BRAND.warn, border: "rgba(217,119,6,0.3)" },
    critical: { bg: "rgba(217,45,32,0.12)", fg: BRAND.critical, border: "rgba(217,45,32,0.3)" },
    info: { bg: BRAND.commandBlueSoft, fg: BRAND.commandBlue, border: "rgba(47,107,255,0.25)" },
    neutral: { bg: BRAND.pageBg, fg: BRAND.muted, border: BRAND.border },
    vor: { bg: "rgba(180,35,24,0.12)", fg: BRAND.vor, border: "rgba(180,35,24,0.3)" },
  };
  const c = colors[tone];
  const fz = ui ? ui.font(9) : 9;
  const padY = ui ? ui.space(2) : 2;
  const padX = ui ? ui.space(7) : 7;
  return (
    <span style={{ display: "inline-block", padding: `${padY}px ${padX}px`, borderRadius: ui?.radius ?? 4, fontSize: fz, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: c.fg, background: c.bg, border: `1px solid ${c.border}` }}>{label}</span>
  );
}

function RegPlate({ reg, ui }: { reg: string; ui?: UiScale }) {
  return (
    <span style={{ display: "inline-block", padding: `${ui ? ui.space(2) : 2}px ${ui ? ui.space(8) : 8}px`, borderRadius: ui?.radius ?? 4, fontSize: ui ? ui.font(11) : 11, fontWeight: 800, letterSpacing: "0.06em", fontVariantNumeric: "tabular-nums", color: BRAND.ink, background: "#FFFB00", border: `1px solid ${BRAND.ink}` }}>{reg}</span>
  );
}

function box(extra?: CSSProperties, ui?: UiScale): CSSProperties {
  return mergeStyle({ border: `1px solid ${BRAND.border}`, borderRadius: ui?.radius ?? 4, background: "#FFFFFF" }, extra);
}

function FilterChips({ filters, active = 0, ui }: { filters: string[]; active?: number; ui?: UiScale }) {
  const fz = ui ? ui.font(10) : 10;
  const padY = ui ? ui.space(5) : 5;
  const padX = ui ? ui.space(10) : 10;
  return (
    <Row gap={ui ? ui.space(6) : 6} wrap style={{ marginBottom: ui ? ui.space(10) : 10 }}>
      {filters.map((f, i) => (
        <div key={f} style={{ padding: `${padY}px ${padX}px`, borderRadius: ui?.radius ?? 4, fontSize: fz, fontWeight: i === active ? 700 : 500, background: i === active ? BRAND.midnight : "#FFFFFF", color: i === active ? "#FFFFFF" : BRAND.muted, border: `1px solid ${i === active ? BRAND.midnight : BRAND.border}` }}>{f}</div>
      ))}
    </Row>
  );
}

function PrimaryAction({ label, ui }: { label: string; ui?: UiScale }) {
  return (
    <div style={{ padding: `${ui ? ui.space(5) : 5}px ${ui ? ui.space(10) : 10}px`, background: BRAND.midnight, color: "#FFFFFF", fontSize: ui ? ui.font(10) : 10, fontWeight: 700, borderRadius: ui?.radius ?? 4 }}>{label}</div>
  );
}

function SimpleTable({ headers, rows, ui }: { headers: string[]; rows: ReactNode[][]; ui?: UiScale }) {
  const fz = ui ? ui.font(10) : 10;
  const cellPad = ui ? ui.space(10) : 10;
  return (
    <div style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: (ui?.radius ?? 4) + 2, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: fz }}>
        <thead>
          <tr style={{ background: BRAND.surfaceMuted, color: BRAND.muted, textAlign: "left", borderBottom: `1px solid ${BRAND.borderStrong}` }}>
            {headers.map((h) => (
              <th key={h} style={{ padding: `${cellPad}px ${ui ? ui.space(11) : 11}px`, fontWeight: 700, fontSize: fz - 1, letterSpacing: "0.03em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderTop: ri === 0 ? undefined : `1px solid ${BRAND.border}`, background: ri % 2 === 0 ? BRAND.surface : BRAND.surfaceMuted }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: `${cellPad}px ${ui ? ui.space(11) : 11}px`, fontWeight: ci === 0 ? 700 : 400, color: ci === 0 ? BRAND.ink : BRAND.inkSoft, fontVariantNumeric: "tabular-nums", verticalAlign: "middle" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ padding: `${ui ? ui.space(7) : 7}px ${ui ? ui.space(11) : 11}px`, display: "flex", justifyContent: "space-between", borderTop: `1px solid ${BRAND.border}`, color: BRAND.muted, background: BRAND.surface, fontSize: fz - 1 }}>
        <span>{rows.length} records shown</span>
        <span>Updated just now</span>
      </div>
    </div>
  );
}

function MetricTile({ label, value, detail, tone = "neutral", ui }: { label: string; value: string; detail: string; tone?: "neutral" | "ready" | "attention" | "critical" | "info"; ui: UiScale }) {
  const accent = tone === "critical" ? BRAND.critical : tone === "attention" ? BRAND.warn : tone === "ready" ? BRAND.ok : tone === "info" ? BRAND.commandBlue : BRAND.borderStrong;
  return (
    <div style={{ padding: ui.space(10), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderTop: `3px solid ${accent}`, borderRadius: ui.radius + 2 }}>
      <div style={{ fontSize: ui.font(8), fontWeight: 700, color: BRAND.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
      <div style={{ marginTop: ui.space(3), fontSize: ui.font(18), lineHeight: 1, fontWeight: 800, color: BRAND.ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ marginTop: ui.space(5), fontSize: ui.font(8), color: BRAND.muted }}>{detail}</div>
    </div>
  );
}

function ListToolbar({ scope, ui }: { scope: string; ui: UiScale }) {
  return (
    <Row gap={ui.space(6)} wrap align="center" style={{ marginBottom: ui.space(9), padding: ui.space(7), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius + 2 }}>
      <div style={{ flex: 1, minWidth: 150, padding: `${ui.space(6)}px ${ui.space(8)}px`, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, color: BRAND.muted, fontSize: ui.font(9) }}>Search {scope.toLowerCase()}…</div>
      <div style={{ padding: `${ui.space(6)}px ${ui.space(8)}px`, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, color: BRAND.inkSoft, fontSize: ui.font(9), fontWeight: 600 }}>Wembley Depot</div>
      <div style={{ padding: `${ui.space(6)}px ${ui.space(8)}px`, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, color: BRAND.inkSoft, fontSize: ui.font(9), fontWeight: 600 }}>Filters</div>
      <div style={{ padding: `${ui.space(6)}px ${ui.space(8)}px`, color: BRAND.commandBlue, fontSize: ui.font(9), fontWeight: 700 }}>Columns</div>
    </Row>
  );
}

function RegisterPage({ scope, filters, headers, rows, ui }: { scope: string; filters?: string[]; headers: string[]; rows: ReactNode[][]; ui: UiScale }) {
  return (
    <>
      <ListToolbar scope={scope} ui={ui} />
      {filters && <FilterChips ui={ui} filters={filters} />}
      <SimpleTable ui={ui} headers={headers} rows={rows} />
    </>
  );
}

function ExceptionCard({ severity, title, detail, owner, action, ui }: { severity: "critical" | "attention" | "info"; title: string; detail: string; owner: string; action: string; ui: UiScale }) {
  const accent = severity === "critical" ? BRAND.critical : severity === "attention" ? BRAND.warn : BRAND.commandBlue;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `${ui.space(4)}px 1fr auto`, background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius + 2, overflow: "hidden" }}>
      <div style={{ background: accent }} />
      <div style={{ padding: ui.space(9) }}>
        <Row gap={ui.space(6)} align="center" wrap><StatusPill label={severity} tone={severity} ui={ui} /><div style={{ fontSize: ui.font(10), fontWeight: 800, color: BRAND.ink }}>{title}</div></Row>
        <div style={{ marginTop: ui.space(4), fontSize: ui.font(9), color: BRAND.muted }}>{detail}</div>
        <div style={{ marginTop: ui.space(4), fontSize: ui.font(8), color: BRAND.inkSoft }}>Owner: {owner}</div>
      </div>
      <div style={{ alignSelf: "center", marginRight: ui.space(9), padding: `${ui.space(5)}px ${ui.space(8)}px`, border: `1px solid ${BRAND.borderStrong}`, borderRadius: ui.radius, fontSize: ui.font(8), fontWeight: 700, color: BRAND.ink }}>{action}</div>
    </div>
  );
}

function OperationalMap({ ui, compact, label = "Live fleet position" }: { ui: UiScale; compact?: boolean; label?: string }) {
  const height = compact ? ui.space(120) : ui.space(250);
  return (
    <div style={{ position: "relative", height, overflow: "hidden", background: "#EEF2F4", border: `1px solid ${BRAND.border}`, borderRadius: ui.radius + 2 }}>
      <svg viewBox="0 0 800 360" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }} aria-label={label}>
        <rect width="800" height="360" fill="#EEF2F4" />
        <path d="M0 76 C170 42 260 120 430 82 S680 34 800 70 M0 250 C180 210 280 290 470 230 S690 190 800 215" fill="none" stroke="#FFFFFF" strokeWidth="18" />
        <path d="M100 0 C120 100 180 160 160 360 M590 0 C560 110 650 170 620 360" fill="none" stroke="#FFFFFF" strokeWidth="14" />
        <path d="M0 178 C180 155 320 190 800 142" fill="none" stroke="#D8E4EA" strokeWidth="4" />
        <path d="M125 305 C250 285 250 220 370 205 S515 120 690 78" fill="none" stroke={BRAND.commandBlue} strokeWidth="5" />
        <path d="M125 305 C185 294 215 272 250 248" fill="none" stroke={BRAND.stale} strokeWidth="4" strokeDasharray="10 8" />
        {[[125,305],[370,205],[510,130],[690,78],[590,260]].map(([x,y], index) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r={index === 2 ? 13 : 9} fill={index === 2 ? BRAND.commandBlue : BRAND.midnight} stroke="#FFFFFF" strokeWidth="4" />
            {index === 2 && <circle cx={x} cy={y} r="22" fill="none" stroke={BRAND.commandBlue} strokeWidth="2" opacity="0.35" />}
          </g>
        ))}
      </svg>
      <div style={{ position: "absolute", top: ui.space(8), left: ui.space(8), padding: `${ui.space(5)}px ${ui.space(8)}px`, background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, fontSize: ui.font(8), fontWeight: 700 }}>{label}</div>
      <div style={{ position: "absolute", top: ui.space(8), right: ui.space(8), display: "flex", gap: ui.space(4) }}>
        {["Map", "Satellite", "Layers"].map((item, index) => <div key={item} style={{ padding: `${ui.space(4)}px ${ui.space(6)}px`, background: index === 0 ? BRAND.midnight : BRAND.surface, color: index === 0 ? "#FFFFFF" : BRAND.inkSoft, border: `1px solid ${index === 0 ? BRAND.midnight : BRAND.border}`, borderRadius: ui.radius, fontSize: ui.font(7), fontWeight: 700 }}>{item}</div>)}
      </div>
      <div style={{ position: "absolute", bottom: ui.space(8), left: ui.space(8), padding: `${ui.space(5)}px ${ui.space(8)}px`, background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, fontSize: ui.font(8), color: BRAND.inkSoft }}>Blue: live route · Purple dashed: stale segment</div>
    </div>
  );
}

function BoardColumn({ title, count, tone, cards, ui }: { title: string; count: number; tone: PillTone; cards: Array<[string, string, string]>; ui: UiScale }) {
  return (
    <div style={{ minWidth: 0, padding: ui.space(7), background: BRAND.surfaceMuted, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius + 2 }}>
      <Row align="center" style={{ marginBottom: ui.space(7) }}><StatusPill label={title} tone={tone} ui={ui} /><Spacer /><div style={{ fontSize: ui.font(9), fontWeight: 800, color: BRAND.muted }}>{count}</div></Row>
      <Stack gap={ui.space(6)}>
        {cards.map(([id, titleText, meta]) => (
          <div key={id} style={{ padding: ui.space(8), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius }}>
            <div style={{ fontSize: ui.font(8), fontWeight: 800, color: BRAND.commandBlue }}>{id}</div>
            <div style={{ marginTop: ui.space(3), fontSize: ui.font(9), fontWeight: 700, color: BRAND.ink }}>{titleText}</div>
            <div style={{ marginTop: ui.space(4), fontSize: ui.font(8), lineHeight: 1.4, color: BRAND.muted }}>{meta}</div>
          </div>
        ))}
      </Stack>
    </div>
  );
}

function NavBadge({ count, compact, ui }: { count: number; compact?: boolean; ui?: UiScale }) {
  const hot = count >= 5;
  const size = ui ? ui.font(compact ? 7 : 9) : compact ? 7 : 9;
  const dim = ui ? ui.font(compact ? 12 : 16) : compact ? 14 : 18;
  return (
    <span
      style={{
        minWidth: dim,
        height: dim,
        padding: "0 5px",
        borderRadius: dim / 2,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size,
        fontWeight: 800,
        fontVariantNumeric: "tabular-nums",
        color: "#FFFFFF",
        background: hot ? BRAND.critical : count > 0 ? BRAND.warn : BRAND.commandBlue,
      }}
    >
      {count}
    </span>
  );
}

function NavGlyph({ kind }: { kind: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const glyphs: Record<string, ReactNode> = {
    Command: <><rect x="3" y="3" width="5" height="5" rx="1" {...common} /><rect x="12" y="3" width="5" height="5" rx="1" {...common} /><rect x="3" y="12" width="5" height="5" rx="1" {...common} /><rect x="12" y="12" width="5" height="5" rx="1" {...common} /></>,
    Operations: <><path d="M4 5h12v12H4z" {...common} /><path d="M7 3h6v4H7zM7 11h6M7 14h4" {...common} /></>,
    "People and Fleet": <><circle cx="10" cy="6" r="3" {...common} /><path d="M4 17c.7-3.2 2.7-5 6-5s5.3 1.8 6 5" {...common} /></>,
    "Safety and Compliance": <><path d="M10 2.5 16 5v4.5c0 4-2.4 6.5-6 8-3.6-1.5-6-4-6-8V5l6-2.5Z" {...common} /><path d="m7.5 10 1.6 1.7 3.5-3.7" {...common} /></>,
    "Customers and Commercial": <><rect x="3" y="6" width="14" height="10" rx="2" {...common} /><path d="M7 6V4h6v2M3 10h14" {...common} /></>,
    Communication: <><path d="M3 4h14v10H8l-4 3v-3H3z" {...common} /><path d="M7 8h6M7 11h4" {...common} /></>,
    Intelligence: <><path d="M4 17V11M10 17V5M16 17V8" {...common} /><path d="M2 17h16" {...common} /></>,
    Administration: <><path d="M4 6h12M4 14h12M7 3v6M13 11v6" {...common} /><circle cx="7" cy="6" r="1.5" {...common} /><circle cx="13" cy="14" r="1.5" {...common} /></>,
  };
  return <div style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center" }}><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden>{glyphs[kind] ?? glyphs.Command}</svg></div>;
}

function CommandSidebar({
  activeItem,
  activePageId,
  compact,
  collapsed,
  onSelect,
  ui,
}: {
  activeItem: string;
  activePageId?: string;
  compact?: boolean;
  collapsed?: boolean;
  onSelect?: (pageId: string) => void;
  ui: UiScale;
}) {
  const activeGroup = NAV_GROUPS.find((g) => g.items.includes(activeItem))?.title ?? "Command";
  const w = ui.sidebarWidth(!!collapsed, compact);

  if (collapsed) {
    return (
      <aside
        style={{
          width: w,
          flexShrink: 0,
          padding: `${ui.space(10)}px ${ui.space(7)}px`,
          background: BRAND.midnight,
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: ui.space(8),
          borderRight: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ width: ui.space(30), height: ui.space(30), borderRadius: ui.radius + 1, display: "grid", placeItems: "center", background: BRAND.commandBlue, color: "#FFFFFF", fontSize: ui.font(13), fontWeight: 900 }}>V</div>
        <div title="Expand navigation" style={{ width: ui.space(28), height: ui.space(24), display: "grid", placeItems: "center", color: "rgba(255,255,255,0.52)", fontSize: ui.font(12) }}>›</div>
        <Divider style={{ width: "100%", borderColor: "rgba(255,255,255,0.1)" }} />
        <Stack gap={ui.space(6)} style={{ alignItems: "center" }}>
          {NAV_GROUPS.map((group) => {
            const isActiveGroup = group.title === activeGroup;
            const groupBadge = group.items.reduce((sum, item) => sum + (NAV_BADGES[item] ?? 0), 0);
            return (
              <div
                key={group.title}
                title={`${group.title}${groupBadge > 0 ? ` · ${groupBadge} items need attention` : ""}`}
                style={{
                  width: ui.space(50),
                  minHeight: ui.space(46),
                  borderRadius: ui.radius + 2,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: ui.space(3),
                  background: isActiveGroup ? BRAND.commandBlueDark : "transparent",
                  border: isActiveGroup ? `1px solid rgba(255,255,255,0.28)` : "1px solid transparent",
                  color: isActiveGroup ? "#FFFFFF" : "rgba(255,255,255,0.62)",
                  position: "relative",
                  cursor: onSelect ? "pointer" : "default",
                }}
              >
                <NavGlyph kind={group.title} />
                <div style={{ fontSize: ui.font(6), fontWeight: isActiveGroup ? 800 : 600, lineHeight: 1, whiteSpace: "nowrap" }}>{GROUP_RAIL_LABEL[group.title]}</div>
                {groupBadge > 0 && (
                  <div style={{ position: "absolute", top: -2, right: -4, minWidth: ui.space(13), height: ui.space(13), padding: "0 3px", borderRadius: ui.space(7), display: "grid", placeItems: "center", background: groupBadge >= 5 ? BRAND.critical : BRAND.warn, border: `2px solid ${BRAND.midnight}`, color: "#FFFFFF", fontSize: ui.font(6), fontWeight: 900 }}>{groupBadge > 9 ? "9+" : groupBadge}</div>
                )}
                {isActiveGroup && <div style={{ position: "absolute", left: -ui.space(8), width: 3, height: ui.space(24), borderRadius: "0 3px 3px 0", background: BRAND.commandBlue }} />}
              </div>
            );
          })}
        </Stack>
        <Spacer />
        <div title="All systems operational" style={{ width: ui.space(28), height: ui.space(28), borderRadius: ui.radius, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.1)", color: BRAND.ok, fontSize: ui.font(10) }}>●</div>
        <div title="S. Mitchell · Operations Manager" style={{ width: ui.space(30), height: ui.space(30), borderRadius: ui.space(15), background: BRAND.commandBlue, display: "grid", placeItems: "center", fontSize: ui.font(9), fontWeight: 800 }}>SM</div>
      </aside>
    );
  }

  return (
    <aside
      style={{
        width: w,
        flexShrink: 0,
        background: BRAND.midnight,
        color: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        minHeight: ui.shellMinHeight(compact),
      }}
    >
      <div style={{ padding: `${ui.space(compact ? 9 : 13)}px ${ui.space(compact ? 8 : 12)}px ${ui.space(compact ? 8 : 11)}px`, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Row gap={ui.space(8)} align="center">
          <div style={{ width: ui.space(28), height: ui.space(28), borderRadius: ui.radius + 1, display: "grid", placeItems: "center", background: BRAND.commandBlue, color: "#FFFFFF", fontSize: ui.font(12), fontWeight: 900 }}>V</div>
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: ui.font(compact ? 11 : 12), fontWeight: 800, letterSpacing: "-0.02em" }}>VEYVIO</div>
            <div style={{ marginTop: 2, fontSize: ui.font(compact ? 7 : 8), fontWeight: 600, letterSpacing: "0.34em", color: BRAND.commandBlue }}>COMMAND</div>
          </div>
          <Spacer />
          <div style={{ color: "rgba(255,255,255,0.45)", fontSize: ui.font(12) }}>‹</div>
        </Row>
        {!compact && (
          <div style={{ marginTop: ui.space(11), padding: ui.space(8), border: "1px solid rgba(255,255,255,0.12)", borderRadius: ui.radius + 1, background: "rgba(255,255,255,0.05)" }}>
            <Row align="center">
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: ui.font(9), fontWeight: 700, color: "#FFFFFF", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Ridgeway School Transport</div>
                <div style={{ marginTop: ui.space(3), fontSize: ui.font(8), color: "rgba(255,255,255,0.58)" }}>Wembley Depot · AM peak</div>
              </div>
              <Spacer />
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: ui.font(9) }}>▾</div>
            </Row>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: `${ui.space(compact ? 6 : 8)}px ${ui.space(compact ? 5 : 6)}px` }}>
        <Stack gap={ui.space(compact ? 6 : 10)}>
          {NAV_GROUPS.map((group) => {
            const isActiveGroup = group.title === activeGroup;
            const expanded = isActiveGroup || group.title === "Command";
            const groupBadge = group.items.reduce((sum, item) => sum + (NAV_BADGES[item] ?? 0), 0);

            return (
              <div key={group.title}>
                <Row gap={ui.space(6)} align="center" style={{ padding: `0 ${ui.space(6)}px`, marginBottom: expanded ? ui.space(4) : 0 }}>
                  <NavGlyph kind={group.title} />
                  <div
                    style={{
                      flex: 1,
                      fontSize: ui.font(compact ? 7 : 8),
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: isActiveGroup ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)",
                    }}
                  >
                    {group.title}
                  </div>
                  {groupBadge > 0 && !expanded && <NavBadge count={groupBadge} compact={compact} ui={ui} />}
                  <div style={{ fontSize: ui.font(8), color: "rgba(255,255,255,0.35)", width: ui.space(10), textAlign: "center" }}>{expanded ? "▾" : "▸"}</div>
                </Row>

                {expanded && (
                  <Stack gap={1}>
                    {group.items.map((item) => {
                      const selected = item === activeItem;
                      const badge = NAV_BADGES[item];
                      const id = pageId(item);
                      return (
                        <div
                          key={item}
                          role={onSelect ? "button" : undefined}
                          onClick={onSelect ? () => onSelect(id) : undefined}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: ui.space(8),
                            padding: `${ui.space(compact ? 4 : 6)}px ${ui.space(compact ? 8 : 9)}px ${ui.space(compact ? 4 : 6)}px ${ui.space(compact ? 8 : 10)}px`,
                            borderRadius: ui.radius + 1,
                            fontSize: ui.font(compact ? 9 : 10),
                            fontWeight: selected ? 700 : 500,
                            color: selected ? "#FFFFFF" : "rgba(255,255,255,0.72)",
                            background: selected ? BRAND.commandBlueDark : "transparent",
                            borderLeft: selected ? `3px solid ${BRAND.commandBlue}` : "3px solid transparent",
                            cursor: onSelect ? "pointer" : "default",
                          }}
                        >
                          <span style={{ width: ui.space(18), height: ui.space(18), borderRadius: ui.radius, display: "grid", placeItems: "center", background: selected ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)", border: `1px solid ${selected ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.08)"}`, flexShrink: 0 }}><NavGlyph kind={group.title} /></span>
                          <span style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}>{item}</span>
                          {badge !== undefined && badge > 0 && <NavBadge count={badge} compact={compact} ui={ui} />}
                        </div>
                      );
                    })}
                  </Stack>
                )}
              </div>
            );
          })}
        </Stack>
      </div>

      {!compact && (
        <div style={{ padding: `${ui.space(8)}px ${ui.space(10)}px`, borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.15)" }}>
          <Row gap={ui.space(6)} align="center" style={{ marginBottom: ui.space(8), paddingBottom: ui.space(8), borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ width: ui.space(7), height: ui.space(7), borderRadius: ui.space(4), background: BRAND.ok }} />
            <div style={{ flex: 1, fontSize: ui.font(8), color: "rgba(255,255,255,0.62)" }}>All systems operational</div>
            <div style={{ fontSize: ui.font(8), color: "rgba(255,255,255,0.42)" }}>Help</div>
          </Row>
          <Row gap={ui.space(8)} align="center">
            <div style={{ width: ui.space(28), height: ui.space(28), borderRadius: ui.space(14), background: BRAND.commandBlue, display: "grid", placeItems: "center", fontSize: ui.font(10), fontWeight: 800, flexShrink: 0 }}>SM</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: ui.font(10), fontWeight: 700, lineHeight: 1.2 }}>S. Mitchell</div>
              <div style={{ fontSize: ui.font(9), color: "rgba(255,255,255,0.5)" }}>Operations Manager</div>
            </div>
            <div style={{ fontSize: ui.font(12), color: "rgba(255,255,255,0.35)", lineHeight: 1 }} title="Collapse sidebar">⇤</div>
          </Row>
        </div>
      )}
    </aside>
  );
}

function CommandTopBar({ compact, ui }: { compact?: boolean; ui: UiScale }) {
  const fz = ui.font(compact ? 8 : 10);
  return (
    <header style={{ minHeight: ui.topBarHeight(compact), padding: `${ui.space(5)}px ${ui.space(12)}px`, display: "flex", alignItems: "center", gap: ui.space(compact ? 5 : 9), background: BRAND.surface, borderBottom: `1px solid ${BRAND.border}`, fontSize: fz, minWidth: 0, overflow: "hidden" }}>
      <div style={mergeStyle(box(undefined, ui), { flex: "1 1 260px", minWidth: compact ? 110 : 180, maxWidth: compact ? 170 : 360, padding: `${ui.space(6)}px ${ui.space(9)}px`, color: BRAND.muted, display: "flex", alignItems: "center", gap: ui.space(6) })}>
        <span style={{ fontSize: ui.font(11), color: BRAND.inkSoft }}>⌕</span>
        <span style={{ flex: 1 }}>Search vehicles, duties, people…</span>
        {!compact && <span style={{ padding: `1px ${ui.space(4)}px`, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, background: BRAND.surfaceMuted, fontSize: ui.font(7), fontWeight: 700 }}>⌘ K</span>}
      </div>
      <Spacer />
      {!compact && <div style={{ padding: `0 ${ui.space(9)}px`, borderRight: `1px solid ${BRAND.border}`, color: BRAND.inkSoft, fontSize: ui.font(8), whiteSpace: "nowrap" }}><strong>Thu 16 Jul</strong><br /><span style={{ color: BRAND.muted }}>AM peak · 06:30–09:30</span></div>}
      <div style={{ display: "flex", alignItems: "center", gap: ui.space(4), padding: `${ui.space(4)}px ${ui.space(7)}px`, background: "rgba(23,140,75,0.08)", border: "1px solid rgba(23,140,75,0.25)", borderRadius: ui.radius, color: BRAND.ok, fontSize: ui.font(8), fontWeight: 700, whiteSpace: "nowrap" }}>
        <span style={{ width: ui.space(6), height: ui.space(6), borderRadius: ui.space(3), background: BRAND.ok }} />
        {compact ? "Live" : "Synced 16s ago"}
      </div>
      <div style={mergeStyle(box(undefined, ui), { position: "relative", minWidth: ui.space(32), height: ui.space(30), padding: `0 ${ui.space(7)}px`, display: "grid", placeItems: "center", fontWeight: 800, color: BRAND.critical, whiteSpace: "nowrap" })}>7 alerts</div>
      <div style={{ display: "flex", alignItems: "center", gap: ui.space(6), paddingLeft: ui.space(2), flexShrink: 0 }}>
        <div style={{ width: ui.space(30), height: ui.space(30), borderRadius: ui.space(15), display: "grid", placeItems: "center", background: BRAND.midnight, color: "#FFFFFF", fontWeight: 800 }}>SM</div>
      </div>
    </header>
  );
}

function CommandShell({
  activeNav,
  activePageId,
  title,
  breadcrumb,
  children,
  compact,
  collapsed,
  action,
  onNavigate,
  ui,
}: {
  activeNav: string;
  activePageId?: string;
  title: string;
  breadcrumb: string;
  children: ReactNode;
  compact?: boolean;
  collapsed?: boolean;
  action?: string;
  onNavigate?: (pageId: string) => void;
  ui: UiScale;
}) {
  return (
    <div style={{ display: "flex", minHeight: ui.shellMinHeight(compact), background: BRAND.pageBg }}>
      <CommandSidebar activeItem={activeNav} activePageId={activePageId} compact={compact} collapsed={collapsed} onSelect={onNavigate} ui={ui} />
      <div style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column" }}>
        <CommandTopBar compact={compact} ui={ui} />
        <main style={{ flex: 1, padding: ui.space(compact ? 9 : 16), overflow: "auto", minWidth: 0 }}>
          <div style={{ fontSize: ui.font(compact ? 7 : 8), color: BRAND.muted, marginBottom: ui.space(5), fontWeight: 600 }}>{breadcrumb}</div>
          <Row align="center" gap={ui.space(8)} wrap style={{ marginBottom: ui.space(compact ? 8 : 14) }}>
            <div>
              <div style={{ fontSize: ui.font(compact ? 12 : 20), fontWeight: 800, color: BRAND.ink, letterSpacing: "-0.025em", lineHeight: 1.2 }}>{title}</div>
              {!compact && <div style={{ marginTop: ui.space(3), fontSize: ui.font(9), color: BRAND.muted }}>Current operational position · Wembley Depot · updated 16 seconds ago</div>}
            </div>
            <Spacer />
            {!compact && <div style={{ padding: `${ui.space(5)}px ${ui.space(8)}px`, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, background: BRAND.surface, color: BRAND.inkSoft, fontSize: ui.font(8), fontWeight: 700 }}>Saved view</div>}
            {action && <PrimaryAction label={action} ui={ui} />}
          </Row>
          {children}
        </main>
      </div>
    </div>
  );
}

function SignInScreen() {
  return (
    <div style={{ minHeight: 380, background: BRAND.midnight, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: 340, textAlign: "center" }}>
        <CommandWordmark scale={0.85} />
        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.72)", lineHeight: 1.5 }}>Operational control centre for transport teams.</div>
        <div style={{ marginTop: 24, padding: 20, borderRadius: 6, background: "#FFFFFF", textAlign: "left" }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: BRAND.ink }}>Sign in to Veyvio Command</div>
          <div style={{ marginTop: 4, fontSize: 11, color: BRAND.muted }}>Separate secure login · company-scoped access</div>
        </div>
      </div>
    </div>
  );
}

function SelectCompanyScreen() {
  const companies = [
    ["Ridgeway School Transport", "Operations Manager", "2 depots · 14 vehicles", true],
    ["Northline Community Travel", "Read-only Auditor", "1 depot · 8 vehicles", false],
  ] as const;
  return (
    <div style={{ minHeight: 400, background: BRAND.pageBg, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px", background: BRAND.midnight, color: "#FFFFFF" }}>
        <div style={{ fontSize: 15, fontWeight: 800 }}>VEYVIO <span style={{ color: BRAND.commandBlue, fontSize: 10, letterSpacing: "0.18em", marginLeft: 6 }}>COMMAND</span></div>
      </div>
      <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 560 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: BRAND.ink }}>Choose your operation</div>
          <div style={{ marginTop: 5, marginBottom: 18, fontSize: 11, color: BRAND.muted }}>Your access, depots and permissions change with the selected company.</div>
          <Stack gap={8}>
            {companies.map(([name, role, meta, recommended]) => (
              <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, border: `1px solid ${recommended ? BRAND.commandBlue : BRAND.border}`, borderRadius: 5, background: recommended ? BRAND.commandBlueSoft : "#FFFFFF" }}>
                <div style={{ width: 34, height: 34, borderRadius: 4, display: "grid", placeItems: "center", background: BRAND.midnight, color: "#FFFFFF", fontSize: 11, fontWeight: 800 }}>{name.split(" ").map((word) => word[0]).slice(0, 2).join("")}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: BRAND.ink }}>{name}</div>
                  <div style={{ marginTop: 2, fontSize: 10, color: BRAND.muted }}>{role} · {meta}</div>
                </div>
                <div style={{ padding: "6px 10px", borderRadius: 4, background: recommended ? BRAND.commandBlue : "#FFFFFF", border: `1px solid ${recommended ? BRAND.commandBlue : BRAND.border}`, color: recommended ? "#FFFFFF" : BRAND.ink, fontSize: 10, fontWeight: 700 }}>Open</div>
              </div>
            ))}
          </Stack>
          <div style={{ marginTop: 14, fontSize: 10, color: BRAND.muted }}>Signed in as sarah.mitchell@ridgeway.example · Sign out</div>
        </div>
      </div>
    </div>
  );
}

function PageContent({ page, compact, ui }: { page: string; compact?: boolean; ui: UiScale }) {
  const fs = ui.font(compact ? 8 : 10);
  const fsLg = ui.font(compact ? 12 : 15);
  const pad = (n: number) => ui.space(n);
  const rad = ui.radius;
  switch (page) {
    case "overview":
      return (
        <>
          <Grid columns={compact ? 3 : 5} gap={pad(6)} style={{ marginBottom: pad(10) }}>
            <MetricTile label="Critical exceptions" value="2" detail="Both require an owner" tone="critical" ui={ui} />
            <MetricTile label="Unassigned work" value="3" detail="First departure in 42 min" tone="attention" ui={ui} />
            <MetricTile label="Vehicles ready" value="12/14" detail="1 VOR · 1 check due" tone="ready" ui={ui} />
            {!compact && <MetricTile label="Live duties" value="9" detail="1 running 8 min late" tone="info" ui={ui} />}
            {!compact && <MetricTile label="Data confidence" value="96%" detail="1 vehicle GPS stale" ui={ui} />}
          </Grid>
          <Grid columns={compact ? 1 : 3} gap={pad(8)} style={{ marginBottom: pad(10) }}>
            <div style={{ gridColumn: compact ? undefined : "span 2" }}>
              <Row align="center" style={{ marginBottom: pad(6) }}><div style={{ fontSize: fs + 1, fontWeight: 800 }}>What needs action now</div><Spacer /><div style={{ fontSize: fs - 1, color: BRAND.commandBlue, fontWeight: 700 }}>Open exception queue</div></Row>
              <Stack gap={pad(6)}>
                <ExceptionCard severity="critical" title="MB-12 cannot enter service" detail="Rear position light defect · AM-108 has no replacement vehicle" owner="Dispatch" action="Resolve" ui={ui} />
                <ExceptionCard severity="critical" title="T-0191 remains unassigned" detail="Wheelchair-accessible vehicle and PA required · departure 07:35" owner="Unassigned" action="Assign" ui={ui} />
                <ExceptionCard severity="attention" title="James Wilson CPC expires in 33 days" detail="No renewal evidence attached · future assignments may be affected" owner="Compliance" action="Review" ui={ui} />
              </Stack>
            </div>
            {!compact && <div style={{ padding: pad(10), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}>
              <div style={{ fontSize: fs + 1, fontWeight: 800, marginBottom: pad(8) }}>Next commitments</div>
              {[
                ["07:20", "AM-104", "Departing", "ready"],
                ["07:35", "T-0191", "Unassigned", "attention"],
                ["08:10", "T-0184", "Expected arrival", "info"],
                ["08:25", "T-0190", "Driver en route", "ready"],
              ].map(([time, id, state, tone], index) => (
                <div key={id} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: pad(6), padding: `${pad(7)}px 0`, borderTop: index === 0 ? undefined : `1px solid ${BRAND.border}`, alignItems: "center" }}>
                  <div style={{ fontSize: fs, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{time}</div>
                  <div><div style={{ fontSize: fs - 1, fontWeight: 700 }}>{id}</div><div style={{ fontSize: fs - 2, color: BRAND.muted }}>{state}</div></div>
                  <StatusPill label={state} tone={tone as PillTone} ui={ui} />
                </div>
              ))}
            </div>
            }
          </Grid>
          {!compact && <Grid columns={3} gap={pad(8)}><div style={{ gridColumn: "span 2" }}><OperationalMap ui={ui} label="Live duties · 9 active" /></div><div style={{ padding: pad(10), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}><div style={{ fontSize: fs + 1, fontWeight: 800 }}>Operational confidence</div><div style={{ marginTop: pad(8), fontSize: fs - 1, color: BRAND.muted, lineHeight: 1.6 }}>12 of 14 vehicles ready<br />9 of 11 drivers on duty<br />46 of 49 trips covered<br />1 stale GPS source</div><div style={{ marginTop: pad(10) }}><StatusPill label="Attention" tone="attention" ui={ui} /></div></div></Grid>}
        </>
      );
    case "live-operations":
      return (
        <Grid columns={compact ? 2 : 4} gap={pad(7)}>
          <div style={{ padding: pad(7), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}>
            <div style={{ fontSize: fs + 1, fontWeight: 800, marginBottom: pad(6) }}>Active duties</div>
            <div style={{ padding: `${pad(5)}px ${pad(7)}px`, border: `1px solid ${BRAND.border}`, borderRadius: rad, color: BRAND.muted, fontSize: fs - 1, marginBottom: pad(6) }}>Search driver or vehicle…</div>
            <FilterChips ui={ui} filters={["All 9", "Late 1", "No GPS 1"]} />
            <Stack gap={pad(5)}>
              {[
                ["LK23 ABC", "AM-104 · Larone M.", "On time", "ready"],
                ["MB-04", "AM-220 · Emma T.", "8 min late", "attention"],
                ["VX-09", "Shuttle · James W.", "GPS stale", "info"],
              ].map(([reg, meta, state, tone]) => <div key={reg} style={{ padding: pad(7), border: `1px solid ${reg === "MB-04" ? BRAND.commandBlue : BRAND.border}`, background: reg === "MB-04" ? BRAND.commandBlueSoft : BRAND.surfaceMuted, borderRadius: rad }}><Row align="center"><RegPlate reg={reg} ui={ui} /><Spacer /><StatusPill label={state} tone={tone as PillTone} ui={ui} /></Row><div style={{ marginTop: pad(5), fontSize: fs - 1, color: BRAND.inkSoft }}>{meta}</div><div style={{ marginTop: pad(3), fontSize: fs - 2, color: BRAND.muted }}>Location updated {reg === "VX-09" ? "18 min" : "16 sec"} ago</div></div>)}
            </Stack>
          </div>
          <div style={{ gridColumn: compact ? undefined : "span 2" }}><OperationalMap ui={ui} compact={compact} label="Live route adherence" /></div>
          {!compact && <div style={{ padding: pad(9), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}>
            <Row align="center"><RegPlate reg="MB-04" ui={ui} /><Spacer /><StatusPill label="8 min late" tone="attention" ui={ui} /></Row>
            <div style={{ marginTop: pad(8), fontSize: fs + 1, fontWeight: 800 }}>AM-220</div>
            <div style={{ marginTop: pad(3), fontSize: fs - 1, color: BRAND.muted }}>Emma Taylor · School run</div>
            <div style={{ marginTop: pad(9), padding: pad(7), background: "#FFFAEB", border: "1px solid rgba(217,119,6,0.3)", borderRadius: rad, fontSize: fs - 1, lineHeight: 1.5 }}>Expected arrival 08:18. Receiving contact has not yet been informed.</div>
            <div style={{ marginTop: pad(9), fontSize: fs - 1, fontWeight: 700 }}>Journey progress</div>
            {["Pickup confirmed · 07:38", "Delay detected · 07:54", "School arrival · expected 08:18"].map((item, index) => <div key={item} style={{ padding: `${pad(6)}px 0`, borderTop: `1px solid ${BRAND.border}`, fontSize: fs - 1, color: index === 1 ? BRAND.warn : BRAND.inkSoft }}>{item}</div>)}
            <div style={{ marginTop: pad(8) }}><PrimaryAction label="Contact driver" ui={ui} /></div>
          </div>
          }
        </Grid>
      );
    case "exceptions":
      return (
        <>
          <ListToolbar scope="exceptions" ui={ui} />
          <Grid columns={compact ? 1 : 3} gap={pad(8)}>
            <div style={{ gridColumn: compact ? undefined : "span 2" }}><Stack gap={pad(6)}>
              <ExceptionCard severity="critical" title="Vehicle marked VOR" detail="MB-12 · Rear light defect · affects AM-108 and 2 later runs" owner="S. Mitchell · Dispatch" action="Open" ui={ui} />
              <ExceptionCard severity="critical" title="Accessible trip has no eligible assignment" detail="T-0191 · passenger assistant and wheelchair position required" owner="Unassigned · SLA 18 min" action="Assign" ui={ui} />
              <ExceptionCard severity="attention" title="Mandatory check incomplete" detail="James Wilson · VX-09 · departure in 54 minutes" owner="Compliance queue" action="Review" ui={ui} />
              <ExceptionCard severity="info" title="Vehicle location stale" detail="VX-09 last reported from Wembley 18 minutes ago" owner="Fleet control" action="Locate" ui={ui} />
            </Stack></div>
            {!compact && <div style={{ padding: pad(9), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}><div style={{ fontSize: fs + 1, fontWeight: 800 }}>Queue position</div><div style={{ marginTop: pad(8), fontSize: fs - 1, lineHeight: 1.7, color: BRAND.muted }}>2 critical uncontained<br />1 owner missing<br />1 SLA due in 18 min<br />3 assigned and progressing</div><div style={{ marginTop: pad(10), fontSize: fs - 1, fontWeight: 700 }}>Saved views</div>{["My exceptions", "Departures at risk", "Safety critical", "Awaiting evidence"].map((item) => <div key={item} style={{ padding: `${pad(6)}px 0`, borderTop: `1px solid ${BRAND.border}`, fontSize: fs - 1, color: BRAND.inkSoft }}>{item}</div>)}</div>}
          </Grid>
        </>
      );
    case "notifications":
      return (
        <>
          <FilterChips ui={ui} filters={["All", "Unread", "Exceptions", "Comms", "Compliance"]} />
          <Stack gap={4}>
            {[
              ["Exception escalated", "LK23 ABC VOR affects 3 future runs", "06:41", true],
              ["Message delivered", "Route diversion to Larone M.", "06:22", false],
              ["Document expiry", "James Wilson CPC in 3 days", "Yesterday", false],
            ].map(([title, body, time, unread]) => (
              <div key={title as string} style={{ padding: 8, background: unread ? BRAND.commandBlueSoft : "#FFFFFF", border: `1px solid ${BRAND.border}`, borderRadius: 4, fontSize: fs - 1 }}>
                <Row align="center"><div style={{ fontWeight: unread ? 800 : 600 }}>{title}</div><Spacer /><div style={{ color: BRAND.muted }}>{time}</div></Row>
                <div style={{ color: BRAND.muted, marginTop: 2 }}>{body}</div>
              </div>
            ))}
          </Stack>
        </>
      );
    case "bookings":
      return (
        <RegisterPage scope="bookings" ui={ui} filters={["All", "Confirmed", "Pending", "In progress", "Recurring"]} headers={["Ref", "Passenger", "Type", "Status", "Trips"]} rows={[["B-1042", "Rykairo M.", "SEN school", <StatusPill label="Confirmed" tone="ready" ui={ui} />, "5/wk"], ["B-1043", "Community group", "Group", <StatusPill label="Pending" tone="attention" ui={ui} />, "1"]]} />
      );
    case "dispatch":
      return (
        <>
          <ListToolbar scope="dispatch board" ui={ui} />
          <Grid columns={compact ? 2 : 4} gap={pad(7)}>
            <BoardColumn title="Unassigned" count={3} tone="critical" cards={[["T-0191", "Rykairo · Home to school", "07:35 · PA + accessible vehicle required"], ["T-0204", "Hospital discharge", "09:15 · two-person crew"], ["T-0208", "Community group", "10:00 · 12 seats"]]} ui={ui} />
            <BoardColumn title="Assigned" count={6} tone="info" cards={[["AM-104", "Larone M. · LK23 ABC", "3 trips · starts 07:20"], ["AM-220", "Emma T. · MB-04", "2 trips · check clear"]]} ui={ui} />
            {!compact && <BoardColumn title="In progress" count={9} tone="ready" cards={[["AM-108", "James W. · VX-09", "Pickup complete · GPS stale"], ["SCH-014", "Priya K. · LK22 DEF", "En route · on time"]]} ui={ui} />}
            {!compact && <BoardColumn title="Attention" count={2} tone="attention" cards={[["AM-220", "Running 8 min late", "Receiving contact not informed"], ["AM-108", "Vehicle replacement needed", "MB-12 marked VOR"]]} ui={ui} />}
          </Grid>
          <Row gap={pad(6)} wrap style={{ marginTop: pad(9) }}><StatusPill label="Blocker prevents assignment" tone="critical" ui={ui} /><StatusPill label="Warning requires reason" tone="attention" ui={ui} /><StatusPill label="All transitions audited" tone="info" ui={ui} /></Row>
        </>
      );
    case "runs":
      return (
        <RegisterPage scope="runs" ui={ui} filters={["Today", "Tomorrow", "Unassigned", "In progress"]} headers={["Run", "Driver", "Vehicle", "Trips", "Start", "Status"]} rows={[["AM-104", "Larone M.", <RegPlate reg="LK23 ABC" ui={ui} />, "3", "07:20", <StatusPill label="Assigned" tone="ready" ui={ui} />], ["AM-108", "—", "—", "2", "07:35", <StatusPill label="Unassigned" tone="attention" ui={ui} />]]} />
      );
    case "trips":
      return (
        <RegisterPage scope="trips" ui={ui} filters={["Today", "At risk", "Unassigned", "Completed"]} headers={["Trip", "Passenger", "Pickup", "Drop-off", "Run", "Status"]} rows={[["T-0184", "Rykairo M.", "Home 07:35", "School 08:10", "AM-104", <StatusPill label="Assigned" tone="ready" ui={ui} />], ["T-0191", "Passenger B", "Oak Lane", "Hospital", "—", <StatusPill label="Unassigned" tone="attention" ui={ui} />]]} />
      );
    case "schedule":
      return (
        <div style={{ background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2, overflow: "hidden" }}>
          <Row align="center" gap={pad(8)} wrap style={{ padding: pad(9), borderBottom: `1px solid ${BRAND.border}` }}><div style={{ fontSize: fs + 1, fontWeight: 800 }}>16–22 July 2026</div><div style={{ color: BRAND.muted, fontSize: fs - 1 }}>Wembley Depot</div><Spacer /><FilterChips ui={ui} filters={["Day", "Week", "Resources"]} active={1} /></Row>
          <div style={{ display: "grid", gridTemplateColumns: compact ? "48px repeat(3, 1fr)" : "58px repeat(7, 1fr)", minHeight: compact ? pad(180) : pad(300) }}>
            <div style={{ borderRight: `1px solid ${BRAND.border}`, background: BRAND.surfaceMuted }}>{["06:00", "08:00", "10:00", "12:00", "14:00"].map((time) => <div key={time} style={{ height: compact ? pad(32) : pad(52), padding: pad(5), fontSize: fs - 2, color: BRAND.muted, fontVariantNumeric: "tabular-nums" }}>{time}</div>)}</div>
            {(compact ? ["Thu 16", "Fri 17", "Sat 18"] : ["Thu 16", "Fri 17", "Sat 18", "Sun 19", "Mon 20", "Tue 21", "Wed 22"]).map((day, dayIndex) => <div key={day} style={{ position: "relative", borderRight: `1px solid ${BRAND.border}`, background: dayIndex === 0 ? BRAND.commandBlueSoft : BRAND.surface }}><div style={{ padding: pad(6), textAlign: "center", borderBottom: `1px solid ${BRAND.border}`, fontSize: fs - 1, fontWeight: dayIndex === 0 ? 800 : 600 }}>{day}</div>{dayIndex < 5 && <div style={{ position: "absolute", top: pad(38 + dayIndex * 12), left: pad(5), right: pad(5), padding: pad(6), borderLeft: `3px solid ${dayIndex === 2 ? BRAND.warn : BRAND.commandBlue}`, background: dayIndex === 2 ? "#FFFAEB" : BRAND.surfaceMuted, borderRadius: rad, fontSize: fs - 2, lineHeight: 1.35 }}><strong>{["AM-104", "Service MB-12", "Inspection", "PM-220", "Staff training"][dayIndex]}</strong><br />{["Larone · LK23 ABC", "Workshop bay 2", "Fleet compliance", "Emma · VX-09", "Compliance room"][dayIndex]}</div>}</div>)}
          </div>
          <div style={{ padding: pad(7), borderTop: `1px solid ${BRAND.border}`, fontSize: fs - 1, color: BRAND.muted }}>Conflicts are labelled and require confirmation before rescheduling.</div>
        </div>
      );
    case "recurring-transport":
      return (
        <RegisterPage scope="recurring patterns" ui={ui} filters={["Active", "Review due", "Paused"]} headers={["Pattern", "Passenger", "Days", "Contract", "Next trip"]} rows={[["RT-12", "Rykairo M.", "Mon–Fri term", "Ridgeway SEN", "Mon 07:35"], ["RT-08", "Staff shuttle", "Daily", "Internal", "Mon 08:00"]]} />
      );
    case "drivers":
      return (
        <RegisterPage scope="drivers" ui={ui} filters={["All", "On duty", "Compliance risk", "Offline"]} headers={["Driver", "Duty", "Vehicle", "Compliance", "Sync"]} rows={[["Larone M.", "AM-104", <RegPlate reg="LK23 ABC" ui={ui} />, <StatusPill label="Clear" tone="ready" ui={ui} />, "Online"], ["James Wilson", "Shuttle", <RegPlate reg="MB-12" ui={ui} />, <StatusPill label="CPC expiring" tone="attention" ui={ui} />, "Online"]]} />
      );
    case "staff":
      return (
        <RegisterPage scope="staff" ui={ui} filters={["All", "On shift", "Training due", "Access review"]} headers={["Name", "Role", "Depot", "Status"]} rows={[["Sarah M.", "Passenger assistant", "Wembley", <StatusPill label="On shift" tone="ready" ui={ui} />], ["Tom R.", "Dispatcher", "Wembley", <StatusPill label="Active" tone="info" ui={ui} />], ["Priya K.", "Compliance", "All depots", <StatusPill label="Active" tone="info" ui={ui} />]]} />
      );
    case "vehicles":
      return (
        <RegisterPage scope="vehicles" ui={ui} filters={["All", "Available", "In service", "VOR", "At depot"]} headers={["Vehicle", "Type", "Depot", "Status", "Allocation"]} rows={[[<RegPlate reg="LK23 ABC" ui={ui} />, "16-seat accessible", "Wembley", <StatusPill label="In service" tone="ready" ui={ui} />, "AM-104"], [<RegPlate reg="MB-12" ui={ui} />, "Sprinter", "Wembley", <StatusPill label="VOR" tone="vor" ui={ui} />, "—"]]} />
      );
    case "depots":
      return (
        <Grid columns={compact ? 1 : 2} gap={pad(8)}>
          {[["Wembley Depot", "14 vehicles · 9 drivers today", "2 exceptions", "attention"], ["Harrow Hub", "6 vehicles · 4 drivers today", "Ready for service", "ready"]].map(([name, meta, state, tone]) => (
            <div key={name} style={{ padding: pad(12), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}>
              <Row align="center"><div style={{ width: pad(34), height: pad(34), borderRadius: rad, display: "grid", placeItems: "center", background: BRAND.midnight, color: "#FFFFFF", fontSize: fs, fontWeight: 800 }}>{name.slice(0, 1)}</div><div style={{ marginLeft: pad(8) }}><div style={{ fontSize: fs + 1, fontWeight: 800 }}>{name}</div><div style={{ fontSize: fs - 1, color: BRAND.muted, marginTop: 2 }}>{meta}</div></div><Spacer /><StatusPill label={state} tone={tone as PillTone} ui={ui} /></Row>
              <div style={{ marginTop: pad(10), paddingTop: pad(8), borderTop: `1px solid ${BRAND.border}`, display: "flex", gap: pad(14), color: BRAND.inkSoft, fontSize: fs - 1 }}><span>Vehicles</span><span>Staff</span><span>Yard</span><span style={{ marginLeft: "auto", color: BRAND.commandBlue, fontWeight: 700 }}>Open depot</span></div>
            </div>
          ))}
        </Grid>
      );
    case "yard-operations":
      return (
        <><Grid columns={compact ? 3 : 6} gap={pad(6)} style={{ marginBottom: pad(8) }}>{[["In yard", "8", "ready"], ["Awaiting check", "2", "attention"], ["Cleaning", "1", "info"], ["Open tasks", "5", "attention"], ["VOR", "1", "critical"], ["Location issue", "1", "critical"]].map(([l, v, tone]) => <div key={l}><MetricTile label={l} value={v} detail="Wembley" tone={tone as "ready" | "attention" | "critical" | "info"} ui={ui} /></div>)}</Grid><Grid columns={compact ? 1 : 3} gap={pad(8)}><div style={{ gridColumn: compact ? undefined : "span 2" }}><OperationalMap ui={ui} compact={compact} label="Yard movement view" /></div>{!compact && <Stack gap={pad(6)}><ExceptionCard severity="critical" title="MB-12 in release lane" detail="Vehicle remains VOR · movement must be authorised" owner="Yard supervisor" action="Open" ui={ui} /><ExceptionCard severity="attention" title="LK23 ABC due to depart" detail="Final equipment confirmation still outstanding" owner="Yard team" action="Check" ui={ui} /></Stack>}</Grid></>
      );
    case "maintenance":
      return (
        <RegisterPage scope="work orders" ui={ui} filters={["Open", "Due today", "Awaiting parts", "Verification"]} headers={["Work order", "Vehicle", "Type", "Status", "Due"]} rows={[["WO-441", <RegPlate reg="MB-12" ui={ui} />, "Rear light repair", <StatusPill label="In progress" tone="info" ui={ui} />, "Today"], ["WO-438", <RegPlate reg="LK23 ABC" ui={ui} />, "Service", <StatusPill label="Scheduled" tone="neutral" ui={ui} />, "Fri"]]} />
      );
    case "vehicle-checks":
      return (
        <RegisterPage scope="vehicle checks" ui={ui} filters={["Action required", "Live", "Submitted", "Overdue"]} headers={["Vehicle", "Driver", "Submitted", "Result", "Defects"]} rows={[[<RegPlate reg="LK23 ABC" ui={ui} />, "Larone M.", "—", <StatusPill label="Overdue" tone="critical" ui={ui} />, "1 open"], [<RegPlate reg="MB-04" ui={ui} />, "Emma T.", "06:41", <StatusPill label="Defect" tone="attention" ui={ui} />, "Rear light"]]} />
      );
    case "defects":
      return (
        <RegisterPage scope="defects" ui={ui} filters={["Critical", "Awaiting triage", "VOR", "Verification", "Overdue"]} headers={["Defect", "Vehicle", "Severity", "Source", "Status"]} rows={[["Rear nearside light", <RegPlate reg="MB-04" ui={ui} />, <StatusPill label="Safety-critical" tone="critical" ui={ui} />, "Driver report", "Open"], ["Bodywork scratch", <RegPlate reg="LK23 ABC" ui={ui} />, <StatusPill label="Minor" tone="info" ui={ui} />, "Walkaround", "Monitoring"]]} />
      );
    case "inspections":
      return (
        <RegisterPage scope="inspections" ui={ui} filters={["Due", "Completed", "Post-repair"]} headers={["Inspection", "Vehicle", "Type", "Result", "Date"]} rows={[["INS-882", <RegPlate reg="LK23 ABC" ui={ui} />, "Spot audit", <StatusPill label="Passed" tone="ready" ui={ui} />, "10 Jul"], ["INS-879", <RegPlate reg="MB-12" ui={ui} />, "Post-repair", <StatusPill label="Pending" tone="attention" ui={ui} />, "—"]]} />
      );
    case "incidents":
      return (
        <RegisterPage scope="incidents" ui={ui} filters={["Active", "Regulatory", "Actions overdue", "Closed"]} headers={["Ref", "Type", "Driver", "Vehicle", "Status"]} rows={[["INC-034", "Near miss", "Larone M.", <RegPlate reg="LK23 ABC" ui={ui} />, <StatusPill label="Under review" tone="attention" ui={ui} />], ["INC-031", "Passenger concern", "Emma T.", <RegPlate reg="MB-04" ui={ui} />, <StatusPill label="Closed" tone="neutral" ui={ui} />]]} />
      );
    case "compliance-rules":
      return (
        <Stack gap={6}>
          {[
            ["Block assignment when MOT expired", "Blocker", true],
            ["Block when safety-critical defect open", "Blocker", true],
            ["Warn insurance expires within 30 days", "Warning", true],
            ["Require escort for defined passenger categories", "Blocker", true],
          ].map(([rule, level, on]) => (
            <div key={rule as string} style={{ padding: 10, background: "#FFFFFF", border: `1px solid ${BRAND.border}`, borderRadius: 4, fontSize: fs - 1 }}>
              <Row align="center">
                <div style={{ fontWeight: 600 }}>{rule}</div>
                <Spacer />
                <StatusPill label={level as string} tone={level === "Blocker" ? "critical" : "attention"} />
                <div style={{ width: 28, height: 14, borderRadius: 7, background: on ? BRAND.ok : BRAND.border, marginLeft: 8 }} />
              </Row>
            </div>
          ))}
        </Stack>
      );
    case "customers":
      return (
        <RegisterPage scope="customers" ui={ui} filters={["Active", "Balance due", "Contract review"]} headers={["Customer", "Type", "Contracts", "Balance", "Status"]} rows={[["Ridgeway Borough Council", "Local authority", "3", "£0", <StatusPill label="Active" tone="ready" ui={ui} />], ["Oakwood School", "School", "1", "£240 due", <StatusPill label="Active" tone="ready" ui={ui} />]]} />
      );
    case "passengers":
      return (
        <>
          <div style={{ padding: 8, marginBottom: 8, background: BRAND.commandBlueSoft, border: `1px solid rgba(47,107,255,0.2)`, borderRadius: 4, fontSize: fs - 1, color: BRAND.ink }}>Sensitive fields permission-controlled — only shown where necessary.</div>
          <RegisterPage scope="passengers" ui={ui} filters={["Active", "Access requirements", "Escort required"]} headers={["Ref", "Name", "Mobility", "Escort", "Active bookings"]} rows={[["P-0184", "Rykairo M.", "Wheelchair", "PA required", "1"], ["P-0201", "Passenger B", "Standard", "—", "2"]]} />
        </>
      );
    case "schools":
      return (
        <RegisterPage scope="schools and organisations" ui={ui} headers={["Organisation", "Type", "Runs", "Contact", "Contract"]} rows={[["Oakwood Primary", "School", "AM-104, PM-104", "S. Adams", "RCT-12"], ["Ridgeway College", "College", "AM-220", "M. Lee", "RCT-08"]]} />
      );
    case "contracts":
      return (
        <RegisterPage scope="contracts" ui={ui} filters={["Active", "Renewal due", "Draft"]} headers={["Contract", "Customer", "Service", "Rate basis", "Status"]} rows={[["RCT-12", "Oakwood Primary", "SEN transport", "Per trip", <StatusPill label="Active" tone="ready" ui={ui} />], ["RCT-08", "Ridgeway Council", "Community", "Monthly", <StatusPill label="Active" tone="ready" ui={ui} />]]} />
      );
    case "pricing":
      return (
        <RegisterPage scope="rate cards" ui={ui} filters={["Active", "Contract", "One-off"]} headers={["Rate card", "Service type", "Base", "Waiting", "Cancellation"]} rows={[["SEN standard", "SEN school", "£18.50", "£12/hr", "50%"], ["Private hire", "One-off", "£2.40/mi", "£15/hr", "Full"]]} />
      );
    case "messages":
      return (
        <Grid columns={2} gap={8}>
          <Stack gap={4}>
            {[["Larone M.", "Walkaround reminder", true], ["All drivers", "Route diversion", false]].map(([who, preview, unread]) => (
              <div key={who as string} style={{ padding: 8, background: unread ? BRAND.commandBlueSoft : "#FFFFFF", border: `1px solid ${BRAND.border}`, borderRadius: 4, fontSize: fs - 1 }}>
                <div style={{ fontWeight: unread ? 800 : 600 }}>{who}</div>
                <div style={{ color: BRAND.muted }}>{preview}</div>
              </div>
            ))}
          </Stack>
          <div style={{ padding: 10, background: "#FFFFFF", border: `1px solid ${BRAND.border}`, borderRadius: 4, fontSize: fs - 1 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>New instruction</div>
            <div style={{ padding: 8, border: `1px solid ${BRAND.border}`, borderRadius: 4, color: BRAND.muted, minHeight: 50 }}>Requires acknowledgement</div>
          </div>
        </Grid>
      );
    case "announcements":
      return (
        <RegisterPage scope="announcements" ui={ui} filters={["Active", "Awaiting acknowledgement", "Complete"]} headers={["Announcement", "Audience", "Sent", "Ack rate", "Status"]} rows={[["AM peak diversion notice", "Wembley drivers", "06:15", "6/9", <StatusPill label="Active" tone="attention" ui={ui} />], ["CPC renewal reminder", "All drivers", "Yesterday", "12/14", <StatusPill label="Complete" tone="ready" ui={ui} />]]} />
      );
    case "templates":
      return (
        <RegisterPage scope="message templates" ui={ui} headers={["Template", "Type", "Last used", "Action"]} rows={[["Route diversion", "Safety alert", "Today", "Edit"], ["Check reminder", "Driver instruction", "Yesterday", "Edit"], ["Shift offer", "Shift offer", "3 days ago", "Edit"]]} />
      );
    case "reports":
      return (
        <Grid columns={compact ? 2 : 3} gap={pad(8)}>
          {[["Trips completed", "Delivery and cancellation by depot"], ["On-time performance", "Pickup and arrival against commitment"], ["Passenger no-shows", "Reason, route and customer trends"], ["Vehicle utilisation", "Availability and service hours"], ["VOR duration", "Time off road and repair bottlenecks"], ["Contract performance", "Service level evidence by customer"]].map(([titleText, detail]) => (
            <div key={titleText} style={{ padding: pad(11), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}>
              <div style={{ width: pad(28), height: pad(28), borderRadius: rad, background: BRAND.commandBlueSoft, color: BRAND.commandBlue, display: "grid", placeItems: "center", fontSize: fs, fontWeight: 800 }}>↗</div>
              <div style={{ marginTop: pad(8), fontSize: fs + 1, fontWeight: 800 }}>{titleText}</div>
              <div style={{ marginTop: pad(4), fontSize: fs - 1, lineHeight: 1.45, color: BRAND.muted }}>{detail}</div>
              <div style={{ marginTop: pad(8), fontSize: fs - 1, color: BRAND.commandBlue, fontWeight: 700 }}>Open report</div>
            </div>
          ))}
        </Grid>
      );
    case "performance":
      return (
        <>
          <Grid columns={compact ? 2 : 4} gap={pad(7)} style={{ marginBottom: pad(9) }}>
            <MetricTile label="On-time pickup" value="94%" detail="+2.1% vs last week" tone="ready" ui={ui} />
            <MetricTile label="Average delay" value="4.2m" detail="1 trip over 15 min" tone="attention" ui={ui} />
            <MetricTile label="Fleet utilisation" value="78%" detail="12 of 14 available" tone="info" ui={ui} />
            {!compact && <MetricTile label="Exceptions contained" value="86%" detail="6 of 7 within SLA" tone="attention" ui={ui} />}
          </Grid>
          <RegisterPage scope="performance evidence" ui={ui} headers={["Measure", "Today", "7-day", "Target", "Position"]} rows={[["On-time pickup", "94%", "92%", "95%", <StatusPill label="Attention" tone="attention" ui={ui} />], ["Completed trips", "46/49", "318/326", "98%", <StatusPill label="On track" tone="ready" ui={ui} />], ["Average VOR time", "6.4h", "8.1h", "< 8h", <StatusPill label="Improving" tone="ready" ui={ui} />]]} />
        </>
      );
    case "audit-log":
      return (
        <RegisterPage scope="audit events" ui={ui} filters={["Today", "Safety decisions", "Overrides", "Access"]} headers={["Time", "Actor", "Event", "Entity", "Reason"]} rows={[["06:41", "S. Mitchell", "Vehicle marked VOR", "LK23 ABC", "Rear light defect"], ["06:35", "S. Mitchell", "Trip reassigned", "T-0184", "Wheelchair mismatch"]]} />
      );
    case "company-settings":
      return (
        <Stack gap={pad(6)}>
          {[["Company profile", "Legal identity, contact details and operating name"], ["Operating hours", "Shift windows, peak periods and closure dates"], ["Default depot", "Operational context for new users"], ["Notification preferences", "Company-wide safety and service alerts"], ["Branding", "Approved customer-facing identity"]].map(([titleText, detail], index) => (
            <div key={titleText} style={{ padding: pad(10), background: BRAND.surface, border: `1px solid ${index === 1 ? BRAND.commandBlue : BRAND.border}`, borderRadius: rad + 2 }}>
              <Row align="center"><div><div style={{ fontSize: fs, fontWeight: 800 }}>{titleText}</div><div style={{ marginTop: pad(3), fontSize: fs - 1, color: BRAND.muted }}>{detail}</div></div><Spacer /><div style={{ fontSize: fs - 1, color: BRAND.commandBlue, fontWeight: 700 }}>{index === 1 ? "Open" : "Configure"}</div></Row>
              {index === 1 && <Grid columns={3} gap={pad(7)} style={{ marginTop: pad(9), paddingTop: pad(9), borderTop: `1px solid ${BRAND.border}` }}><FieldBlock label="Weekday operation" value="05:30–23:00" ui={ui} /><FieldBlock label="AM peak" value="06:30–09:30" ui={ui} /><FieldBlock label="PM peak" value="14:00–17:30" ui={ui} /></Grid>}
            </div>
          ))}
        </Stack>
      );
    case "users-and-roles":
      return (
        <RegisterPage scope="users and roles" ui={ui} filters={["Active", "Invited", "Access review"]} headers={["User", "Role", "Depots", "Last active", "Status"]} rows={[["S. Mitchell", "Operations Manager", "Wembley", "Now", <StatusPill label="Active" tone="ready" ui={ui} />], ["A. Chen", "Dispatcher", "Wembley, Harrow", "06:38", <StatusPill label="Active" tone="ready" ui={ui} />], ["R. Patel", "Read-only Auditor", "All", "Yesterday", <StatusPill label="Active" tone="ready" ui={ui} />]]} />
      );
    case "integrations":
      return (
        <Grid columns={compact ? 1 : 2} gap={pad(8)}>
          {[
            ["Telematics", "Connected", "ready", "14 vehicles · last event 16s ago"],
            ["Accounting export", "Not configured", "neutral", "No export destination selected"],
            ["SMS gateway", "Connected", "ready", "Delivery rate 99.2% · July"],
            ["Mapping provider", "Connected", "ready", "Map and routing services healthy"],
          ].map(([name, status, tone, detail]) => (
            <div key={name as string} style={{ padding: pad(11), background: BRAND.surface, border: `1px solid ${BRAND.border}`, borderRadius: rad + 2 }}>
              <Row align="center"><div style={{ width: pad(32), height: pad(32), borderRadius: rad, display: "grid", placeItems: "center", background: BRAND.midnight, color: "#FFFFFF", fontSize: fs, fontWeight: 800 }}>{name.slice(0, 1)}</div><div style={{ marginLeft: pad(8) }}><div style={{ fontSize: fs + 1, fontWeight: 800 }}>{name}</div><div style={{ marginTop: 2, fontSize: fs - 1, color: BRAND.muted }}>{detail}</div></div><Spacer /><StatusPill label={status as string} tone={tone as PillTone} ui={ui} /></Row>
              <div style={{ marginTop: pad(9), paddingTop: pad(7), borderTop: `1px solid ${BRAND.border}`, textAlign: "right", fontSize: fs - 1, color: BRAND.commandBlue, fontWeight: 700 }}>Manage integration</div>
            </div>
          ))}
        </Grid>
      );
    default:
      if (ROADMAP_PAGES.some((item) => item.id === page)) return <RoadmapPageContent page={page} compact={compact} ui={ui} />;
      return <WorkflowPageContent page={page} compact={compact} ui={ui} />;
  }
}

function FieldBlock({ label, value, ui, wide }: { label: string; value: string; ui: UiScale; wide?: boolean }) {
  return (
    <div style={{ gridColumn: wide ? "1 / -1" : undefined }}>
      <div style={{ fontSize: ui.font(8), fontWeight: 700, color: BRAND.muted, marginBottom: ui.space(3), textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ minHeight: ui.space(28), padding: `${ui.space(6)}px ${ui.space(8)}px`, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, background: "#FFFFFF", color: value === "Select…" ? BRAND.muted : BRAND.ink, fontSize: ui.font(10) }}>{value}</div>
    </div>
  );
}

function TabStrip({ items, active, ui }: { items: string[]; active: string; ui: UiScale }) {
  return (
    <div style={{ display: "flex", gap: ui.space(3), borderBottom: `1px solid ${BRAND.border}`, marginBottom: ui.space(10), overflowX: "auto" }}>
      {items.map((item) => (
        <div key={item} style={{ padding: `${ui.space(6)}px ${ui.space(8)}px`, borderBottom: item === active ? `2px solid ${BRAND.commandBlue}` : "2px solid transparent", color: item === active ? BRAND.ink : BRAND.muted, fontSize: ui.font(9), fontWeight: item === active ? 700 : 500, whiteSpace: "nowrap" }}>{item}</div>
      ))}
    </div>
  );
}

function StepStrip({ items, active, ui }: { items: string[]; active: number; ui: UiScale }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: ui.space(4), marginBottom: ui.space(10), overflowX: "auto" }}>
      {items.map((item, index) => (
        <div key={item}>
          <Row gap={ui.space(4)} align="center">
            <div style={{ width: ui.space(20), height: ui.space(20), borderRadius: ui.space(10), display: "grid", placeItems: "center", background: index <= active ? BRAND.commandBlue : "#FFFFFF", border: `1px solid ${index <= active ? BRAND.commandBlue : BRAND.border}`, color: index <= active ? "#FFFFFF" : BRAND.muted, fontSize: ui.font(8), fontWeight: 800 }}>{index + 1}</div>
            <div style={{ color: index === active ? BRAND.ink : BRAND.muted, fontSize: ui.font(8), fontWeight: index === active ? 700 : 500, whiteSpace: "nowrap" }}>{item}</div>
            {index < items.length - 1 && <div style={{ width: ui.space(18), height: 1, background: BRAND.border }} />}
          </Row>
        </div>
      ))}
    </div>
  );
}

function InfoBox({ title, body, ui, tone = "neutral" }: { title: string; body: string; ui: UiScale; tone?: "neutral" | "info" | "attention" | "critical" }) {
  const colour = tone === "critical" ? BRAND.critical : tone === "attention" ? BRAND.warn : tone === "info" ? BRAND.commandBlue : BRAND.border;
  const fill = tone === "critical" ? "#FEF3F2" : tone === "attention" ? "#FFFAEB" : tone === "info" ? BRAND.commandBlueSoft : "#FFFFFF";
  return (
    <div style={{ padding: ui.space(9), border: `1px solid ${colour}`, borderLeftWidth: tone === "neutral" ? 1 : 3, borderRadius: ui.radius, background: fill }}>
      <div style={{ fontSize: ui.font(9), fontWeight: 800, color: BRAND.ink }}>{title}</div>
      <div style={{ marginTop: ui.space(3), fontSize: ui.font(9), lineHeight: 1.45, color: BRAND.muted }}>{body}</div>
    </div>
  );
}

function FormActions({ primary, ui }: { primary: string; ui: UiScale }) {
  return (
    <Row gap={ui.space(6)} align="center" style={{ marginTop: ui.space(10), paddingTop: ui.space(8), borderTop: `1px solid ${BRAND.border}` }}>
      <div style={{ fontSize: ui.font(9), color: BRAND.muted }}>Draft saved 18 seconds ago</div>
      <Spacer />
      <div style={{ padding: `${ui.space(6)}px ${ui.space(10)}px`, border: `1px solid ${BRAND.border}`, borderRadius: ui.radius, background: "#FFFFFF", fontSize: ui.font(9), fontWeight: 700 }}>Save draft</div>
      <PrimaryAction label={primary} ui={ui} />
    </Row>
  );
}

function RoadmapPageContent({ page, compact, ui }: { page: string; compact?: boolean; ui: UiScale }) {
  const fs = ui.font(compact ? 8 : 10);
  const panel = { padding: ui.space(10), background: "#FFFFFF", border: `1px solid ${BRAND.border}`, borderRadius: ui.radius };
  const roadmap = ROADMAP_PAGES.find((item) => item.id === page);
  if (!roadmap) return <div style={{ fontSize: fs, color: BRAND.muted }}>Page preview unavailable.</div>;

  const boardData: Record<string, { metrics: Array<[string, string, string, Exclude<PillTone, "vor">]>; headers: string[]; rows: ReactNode[][]; filters: string[]; note: string }> = {
    "duties-roadmap": { metrics: [["On duty", "18", "14 driving · 4 standby", "ready"], ["Starting in 60m", "7", "1 sign-on unconfirmed", "attention"], ["Working-time risk", "2", "Break required before next run", "critical"]], headers: ["Duty", "Driver", "Vehicle", "Working time", "Next commitment", "Status"], rows: [["DUT-104", "Larone Mitchell", "LK23 ABC", "3h 42m", "AM-108 · 08:15", <StatusPill label="On duty" tone="ready" ui={ui} />], ["DUT-109", "Emma Taylor", "MB-12", "4h 18m", "Break due 08:05", <StatusPill label="Action due" tone="attention" ui={ui} />], ["DUT-112", "Unassigned", "—", "—", "Starts 08:30", <StatusPill label="Uncovered" tone="critical" ui={ui} />]], filters: ["All duties", "On duty", "Starting soon", "Action due"], note: "Duty boundaries govern whether Dispatch can legally assign additional work." },
    "availability-roadmap": { metrics: [["Drivers available", "11", "3 with restrictions", "ready"], ["Vehicles ready", "12", "2 unavailable", "attention"], ["Valid combinations", "9", "Driver, vehicle and depot matched", "info"]], headers: ["Resource", "Type", "Depot", "Available", "Restrictions", "Position"], rows: [["Larone Mitchell", "Driver", "Wembley", "Until 14:30", "D1 · wheelchair trained", <StatusPill label="Available" tone="ready" ui={ui} />], ["LK23 ABC", "Vehicle", "Wembley", "Until 12:00", "16 seats · 2 wheelchair", <StatusPill label="Ready" tone="ready" ui={ui} />], ["MB-12", "Vehicle", "Wembley", "Unavailable", "Safety-critical defect", <StatusPill label="VOR" tone="vor" ui={ui} />]], filters: ["All resources", "Drivers", "Vehicles", "Restrictions"], note: "Availability combines duty, qualifications, compliance, capacity, depot and live commitments." },
    "cancellations-roadmap": { metrics: [["Today", "6", "2 late cancellations", "attention"], ["Service affected", "3", "Replacement work required", "critical"], ["Chargeable", "£186", "Pending contract review", "info"]], headers: ["Cancellation", "Booking", "Passenger", "Notice", "Reason", "Outcome"], rows: [["CAN-1042", "B-1042", "Amira Khan", "42 min", "Passenger unavailable", <StatusPill label="Review charge" tone="attention" ui={ui} />], ["CAN-1041", "B-1038", "J. Patel", "1 day", "School closed", <StatusPill label="No charge" tone="ready" ui={ui} />], ["CAN-1039", "B-1027", "M. Jones", "12 min", "Vehicle failure", <StatusPill label="Operator fault" tone="critical" ui={ui} />]], filters: ["Today", "Late notice", "Chargeable", "Operator fault"], note: "Every cancellation keeps actor, reason, notice, financial treatment and passenger impact." },
    "handover-roadmap": { metrics: [["Open items", "8", "3 require named acceptance", "attention"], ["Safety-critical", "1", "Vehicle release unresolved", "critical"], ["Accepted", "12", "Since 06:00", "ready"]], headers: ["Item", "Operational context", "From", "To", "Due", "Acceptance"], rows: [["HND-204", "MB-12 release evidence", "Night control", "Fleet lead", "08:15", <StatusPill label="Unaccepted" tone="critical" ui={ui} />], ["HND-201", "T-0191 PA confirmation", "Early control", "AM dispatcher", "07:45", <StatusPill label="Accepted" tone="ready" ui={ui} />], ["HND-198", "Brookfield closure watch", "Wembley", "All depots", "09:00", <StatusPill label="Monitoring" tone="attention" ui={ui} />]], filters: ["Open", "Needs acceptance", "My depot", "Completed"], note: "A handover is complete only when the receiving owner explicitly accepts it." },
    "work-orders-roadmap": { metrics: [["Open", "9", "3 affecting service", "attention"], ["Overdue", "2", "Owner escalation sent", "critical"], ["Awaiting verification", "3", "Repair evidence received", "info"]], headers: ["Work order", "Vehicle", "Work", "Supplier", "Target", "Status"], rows: [["WO-441", <RegPlate reg="MB-12" ui={ui} />, "Rear light repair", "Northside Fleet", "09:30", <StatusPill label="In progress" tone="attention" ui={ui} />], ["WO-438", <RegPlate reg="LK22 DEF" ui={ui} />, "Brake inspection", "Central Workshop", "Yesterday", <StatusPill label="Overdue" tone="critical" ui={ui} />], ["WO-436", <RegPlate reg="LK23 ABC" ui={ui} />, "Lift service", "Access Mobility", "Evidence received", <StatusPill label="Verify" tone="info" ui={ui} />]], filters: ["Open", "Affecting service", "Overdue", "Verification"], note: "Repair completion does not return a vehicle to service; verification and approval remain separate." },
    "compliance-dashboard-roadmap": { metrics: [["Operationally clear", "91%", "Across people and fleet", "ready"], ["Expiring in 30d", "14", "5 affect future allocation", "attention"], ["Blocked resources", "4", "2 drivers · 2 vehicles", "critical"]], headers: ["Control", "Population", "Clear", "Attention", "Blocked", "Owner"], rows: [["Driver eligibility", "42 drivers", "37", "3", "2", "People team"], ["Vehicle certification", "14 vehicles", "12", "1", "1", "Fleet"], ["Training compliance", "57 people", "51", "5", "1", "Compliance"]], filters: ["All controls", "Blocked", "Expiring", "Evidence missing"], note: "Compliance status must feed Dispatch directly instead of remaining a reporting-only view." },
    "compliance-expiries-roadmap": { metrics: [["Next 7 days", "4", "2 service risks", "critical"], ["Next 30 days", "14", "Owners assigned", "attention"], ["Evidence pending", "6", "Renewal claimed, not verified", "info"]], headers: ["Record", "Person or vehicle", "Expiry", "Service impact", "Owner", "State"], rows: [["Driver CPC", "James Wilson", "19 Aug 2026", "Future runs blocked", "People team", <StatusPill label="Urgent" tone="critical" ui={ui} />], ["MOT", "LK22 DEF", "28 Aug 2026", "Allocation warning", "Fleet", <StatusPill label="Renewal booked" tone="attention" ui={ui} />], ["Insurance", "LK23 ABC", "02 Sep 2026", "None yet", "Fleet", <StatusPill label="Evidence pending" tone="info" ui={ui} />]], filters: ["7 days", "30 days", "Service impact", "Evidence pending"], note: "Warnings begin early enough for owners to prevent avoidable service loss." },
    "safeguarding-roadmap": { metrics: [["Open concerns", "4", "All have named leads", "attention"], ["Immediate controls", "1", "Collection contact restricted", "critical"], ["Reviews due", "2", "Within 24 hours", "info"]], headers: ["Case", "Passenger", "Concern", "Control", "Lead", "Access"], rows: [["SG-028", "A. Khan", "Collection contact", "Approved contacts only", "S. Mitchell", <StatusPill label="Restricted" tone="critical" ui={ui} />], ["SG-025", "Protected record", "Travel anxiety", "Consistent PA assigned", "P. Kumar", <StatusPill label="Monitoring" tone="attention" ui={ui} />]], filters: ["Open", "Immediate controls", "Review due", "My cases"], note: "Sensitive details are permissioned, audited and limited to what transport delivery requires." },
    "risk-assessments-roadmap": { metrics: [["Active", "18", "Across 12 services", "ready"], ["Review due", "5", "2 before next journey", "attention"], ["Control failed", "1", "Corrective action open", "critical"]], headers: ["Assessment", "Scope", "Risk", "Next review", "Owner", "Status"], rows: [["RA-204", "Amira Khan · transport", "Wheelchair boarding", "18 Jul", "Safeguarding lead", <StatusPill label="Controls active" tone="ready" ui={ui} />], ["RA-198", "Brookfield pickup bay", "Vehicle-pedestrian conflict", "Today", "Depot manager", <StatusPill label="Review due" tone="attention" ui={ui} />], ["RA-187", "MB-12 lift use", "Equipment failure", "Blocked", "Fleet", <StatusPill label="Control failed" tone="critical" ui={ui} />]], filters: ["Active", "Review due", "High risk", "Control failed"], note: "Risk controls appear in booking, dispatch and driver context—not only in this register." },
    "corrective-actions-roadmap": { metrics: [["Open", "11", "4 high priority", "attention"], ["Overdue", "3", "Escalated to owners", "critical"], ["Verified this month", "17", "Evidence retained", "ready"]], headers: ["Action", "Source", "Required change", "Owner", "Due", "Verification"], rows: [["CA-311", "INC-034", "Pickup-bay separation", "Depot manager", "Today", <StatusPill label="In progress" tone="attention" ui={ui} />], ["CA-304", "INS-198", "Replace restraint set", "Fleet", "Yesterday", <StatusPill label="Overdue" tone="critical" ui={ui} />], ["CA-298", "DEF-402", "Update repair checklist", "Compliance", "12 Jul", <StatusPill label="Verified" tone="ready" ui={ui} />]], filters: ["Open", "High priority", "Overdue", "Awaiting verification"], note: "Closure requires evidence and independent verification, not only an owner marking work complete." },
    "delivery-log-roadmap": { metrics: [["Sent today", "286", "SMS · email · app", "info"], ["Delivery failures", "7", "3 affect live work", "critical"], ["Acknowledged", "89%", "Operational instructions", "ready"]], headers: ["Message", "Recipient", "Channel", "Sent", "Delivery", "Acknowledgement"], rows: [["MSG-8812", "Larone Mitchell", "Driver app", "07:12", "Delivered 07:12", <StatusPill label="Acknowledged" tone="ready" ui={ui} />], ["MSG-8808", "Passenger contact", "SMS", "07:02", "Failed", <StatusPill label="Action due" tone="critical" ui={ui} />], ["MSG-8799", "Brookfield Academy", "Email", "06:48", "Delivered 06:49", <StatusPill label="Opened" tone="info" ui={ui} />]], filters: ["All", "Failed", "Unacknowledged", "Operational"], note: "The log proves sent, delivered, opened and acknowledged states without treating them as equivalent." },
  };

  const detailData: Record<string, { status: string; tone: PillTone; tabs: string[]; fields: Array<[string, string]>; focus: string; evidence: string }> = {
    "duty-detail-roadmap": { status: "On duty", tone: "ready", tabs: ["Overview", "Runs", "Breaks", "Working time", "Events", "Audit"], fields: [["Driver", "Larone Mitchell"], ["Vehicle", "LK23 ABC"], ["Signed on", "05:58 · Wembley Depot"], ["Planned finish", "14:30"], ["Driving time", "3h 42m of 4h 30m"], ["Next break", "Required by 09:18"]], focus: "Break risk before AM-112", evidence: "Move one trip or schedule a 30-minute break before assigning further work." },
    "staff-edit-roadmap": { status: "Active", tone: "ready", tabs: ["Profile", "Role and access", "Depots", "Employment", "Audit"], fields: [["Full name", "Sarah Mitchell"], ["Role", "Transport manager"], ["Primary depot", "Wembley"], ["Additional depots", "Park Royal"], ["Email", "sarah.mitchell@ridgeway.example"], ["Operational phone", "+44 7700 900 184"]], focus: "Access change is audited", evidence: "Role and depot changes take effect on the next permission evaluation." },
    "work-order-detail-roadmap": { status: "In progress", tone: "attention", tabs: ["Summary", "Work", "Parts", "Evidence", "Costs", "Decisions", "Audit"], fields: [["Vehicle", "MB-12 · VOR"], ["Defect", "DEF-441 · rear light"], ["Supplier", "Northside Fleet"], ["Target", "Today · 09:30"], ["Estimated cost", "£184.00"], ["Assigned engineer", "A. Chen"]], focus: "Vehicle remains off road", evidence: "Repair evidence, post-repair check and independent return-to-service approval are still required." },
    "inspection-detail-roadmap": { status: "Action required", tone: "attention", tabs: ["Summary", "Checklist", "Findings", "Evidence", "Actions", "Audit"], fields: [["Inspection", "INS-204"], ["Scope", "Wembley pickup operation"], ["Inspector", "Priya Kumar"], ["Completed", "16 Jul · 10:42"], ["Findings", "3 · one significant"], ["Linked action", "CA-311"]], focus: "Pedestrian separation is insufficient", evidence: "Temporary cones are in place. Permanent bay markings are due before 19 July." },
    "passenger-detail-roadmap": { status: "Transport active", tone: "ready", tabs: ["Overview", "Needs and risks", "Contacts", "Trips", "Documents", "Consent", "Audit"], fields: [["Passenger", "Amira Khan"], ["Customer", "Brent Supported Travel"], ["Mobility", "Wheelchair user"], ["Vehicle requirement", "Lift · 4-point restraints"], ["Passenger assistant", "Required"], ["Approved contact", "Nadia Khan"]], focus: "Collection control", evidence: "Release only to an approved contact. Safeguarding flag SG-028 applies." },
    "customer-detail-roadmap": { status: "Active", tone: "ready", tabs: ["Overview", "Contacts", "Passengers", "Bookings", "Contracts", "Finance", "Audit"], fields: [["Customer", "Brent Supported Travel"], ["Account owner", "Maya Singh"], ["Active passengers", "42"], ["Open bookings", "18"], ["Primary contract", "CTR-2026-014"], ["Billing cycle", "Monthly"]], focus: "Service review due", evidence: "Quarterly review is scheduled for 24 July. Reliability is 96.4%." },
    "school-detail-roadmap": { status: "Service live", tone: "ready", tabs: ["Overview", "Contacts", "Passengers", "Arrivals", "Access", "Documents", "Audit"], fields: [["Organisation", "Brookfield Academy"], ["Site code", "SCH-018"], ["Transport contact", "Helen Brooks"], ["Morning window", "08:25–08:45"], ["Afternoon window", "15:10–15:30"], ["Pickup zone", "North gate · Bay 3"]], focus: "Site access control", evidence: "North gate roadworks reduce capacity to two vehicles until 22 July." },
    "contract-detail-roadmap": { status: "In force", tone: "ready", tabs: ["Overview", "Service rules", "Rates", "Performance", "Documents", "Changes", "Audit"], fields: [["Contract", "CTR-2026-014"], ["Customer", "Brent Supported Travel"], ["Term", "01 Apr 2026–31 Mar 2027"], ["Journeys", "1,284 year to date"], ["Reliability target", "97.0%"], ["Current performance", "96.4%"]], focus: "Performance below target", evidence: "Three late journeys this month relate to vehicle substitutions. Review at the next contract meeting." },
    "conversation-detail-roadmap": { status: "Response due", tone: "attention", tabs: ["Conversation", "Recipients", "Delivery", "Linked work", "Audit"], fields: [["Subject", "Run AM-104 delay"], ["Linked run", "AM-104"], ["Participants", "Control · driver · school"], ["Started", "07:12"], ["Last update", "07:28"], ["Delivery", "All recipients reached"]], focus: "School needs revised ETA", evidence: "Driver reported an eight-minute delay. Send the confirmed arrival time when GPS confidence stabilises." },
  };

  if (roadmap.screen === "board") {
    const data = boardData[page];
    if (!data) return <InfoBox title={roadmap.title} body="This operational board is defined for the route roadmap." tone="info" ui={ui} />;
    return (
      <>
        <Grid columns={compact ? 2 : 3} gap={ui.space(6)} style={{ marginBottom: ui.space(8) }}>
          {data.metrics.map(([label, value, detail, tone]) => <div key={label}><MetricTile label={label} value={value} detail={detail} tone={tone} ui={ui} /></div>)}
        </Grid>
        <InfoBox title="Operational rule" body={data.note} tone="info" ui={ui} />
        <div style={{ marginTop: ui.space(8) }}><RegisterPage scope={roadmap.label.toLowerCase()} filters={data.filters} headers={data.headers} rows={data.rows} ui={ui} /></div>
      </>
    );
  }

  if (roadmap.screen === "detail") {
    const data = detailData[page];
    if (!data) return <InfoBox title={roadmap.title} body="This governed record keeps changes, permissions and audit evidence together." tone="info" ui={ui} />;
    return (
      <>
        <Row gap={ui.space(6)} align="center" style={{ marginBottom: ui.space(8) }}><StatusPill label={data.status} tone={data.tone} ui={ui} /><div style={{ fontSize: fs, color: BRAND.muted }}>Updated 4 minutes ago · audit enabled</div></Row>
        <TabStrip items={data.tabs} active={data.tabs[0]} ui={ui} />
        <Grid columns={3} gap={ui.space(8)}>
          <div style={{ ...panel, gridColumn: compact ? undefined : "span 2" }}>
            <Grid columns={2} gap={ui.space(8)}>{data.fields.map(([label, value]) => <div key={label}><FieldBlock label={label} value={value} ui={ui} /></div>)}</Grid>
            {page === "staff-edit-roadmap" && <FormActions primary="Save changes" ui={ui} />}
          </div>
          {!compact && <Stack gap={ui.space(7)}><InfoBox title={data.focus} body={data.evidence} tone={data.tone === "critical" ? "critical" : data.tone === "attention" ? "attention" : "info"} ui={ui} /><InfoBox title="Evidence and accountability" body="Access, decisions and changes are retained in the record audit trail." ui={ui} /></Stack>}
        </Grid>
      </>
    );
  }

  if (roadmap.screen === "settings") {
    const settings: Record<string, Array<[string, string, string]>> = {
      "roles-roadmap": [["Transport manager", "24 permissions · all depots", "6 users"], ["Dispatcher", "12 permissions · assigned depots", "14 users"], ["Compliance lead", "18 permissions · sensitive records", "3 users"], ["Read-only auditor", "7 permissions · no changes", "2 users"]],
      "invitations-roadmap": [["Sarah.Jones@example.com", "Dispatcher · Wembley", "Sent 2 hours ago"], ["daniel.lee@example.com", "Fleet manager · all depots", "Expires tomorrow"], ["alex.morgan@example.com", "Read-only auditor", "Expired · resend available"]],
      "security-roadmap": [["Multi-factor authentication", "Required for privileged roles", "Enforced"], ["Session duration", "8 hours · re-authenticate for sensitive changes", "Configured"], ["Suspended account handling", "Sessions revoked immediately", "Enabled"], ["Access review", "Quarterly owner attestation", "Due in 12 days"]],
      "notification-settings-roadmap": [["Safety-critical defects", "In-app · SMS · email", "Immediate"], ["Unassigned departures", "In-app · control-room email", "30 minutes before"], ["Compliance expiry", "Email · task owner", "30, 14 and 7 days"], ["Shift handover", "In-app", "At shift change"]],
    };
    return (
      <Grid columns={3} gap={ui.space(8)}>
        <div style={{ ...panel, gridColumn: compact ? undefined : "span 2" }}>
          <Stack gap={ui.space(6)}>{(settings[page] ?? []).map(([title, detail, state]) => <div key={title} style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr auto", gap: ui.space(8), alignItems: "center", padding: ui.space(8), borderBottom: `1px solid ${BRAND.border}` }}><div style={{ fontSize: fs, fontWeight: 700 }}>{title}</div><div style={{ fontSize: fs - 1, color: BRAND.muted }}>{detail}</div><StatusPill label={state} tone={state.includes("Expired") || state.includes("Due") ? "attention" : "ready"} ui={ui} /></div>)}</Stack>
        </div>
        {!compact && <Stack gap={ui.space(7)}><InfoBox title="Changes are governed" body="Configuration changes are versioned, permission-controlled and written to the audit log." tone="info" ui={ui} /><InfoBox title="Backend enforcement" body="Interface permissions improve usability; API policy remains authoritative." ui={ui} /></Stack>}
      </Grid>
    );
  }

  if (page === "global-search-roadmap") {
    return <><div style={{ ...panel, padding: ui.space(12), marginBottom: ui.space(8) }}><FieldBlock label="Search all operational records" value="LK23" ui={ui} wide /></div><RegisterPage scope="search results" headers={["Type", "Result", "Operational context", "Status"]} rows={[["Vehicle", <RegPlate reg="LK23 ABC" ui={ui} />, "Wembley · AM-104", <StatusPill label="In service" tone="ready" ui={ui} />], ["Defect", "DEF-398", "LK23 ABC · bodywork", <StatusPill label="Monitoring" tone="attention" ui={ui} />], ["Work order", "WO-436", "Lift service · evidence received", <StatusPill label="Verify" tone="info" ui={ui} />]]} ui={ui} /></>;
  }

  const utility: Record<string, { tabs: string[]; fields: Array<[string, string]>; message: string }> = {
    "profile-roadmap": { tabs: ["Profile", "Preferences", "Security", "Sessions"], fields: [["Name", "Sarah Mitchell"], ["Job title", "Transport manager"], ["Email", "sarah.mitchell@ridgeway.example"], ["Phone", "+44 7700 900 184"], ["Default company", "Ridgeway Transport"], ["Default depot", "Wembley"]], message: "Personal preferences never override company safety, audit or permission controls." },
    "imports-roadmap": { tabs: ["Import runs", "Templates", "Validation rules", "History"], fields: [["Latest import", "Passenger updates · IMP-104"], ["Submitted by", "Maya Singh"], ["Rows", "184 total · 178 valid"], ["Validation", "6 rows need correction"], ["Target", "Passengers"], ["Mode", "Review before commit"]], message: "Imports validate tenant, identifiers and permissions before any record is changed." },
    "exports-roadmap": { tabs: ["Export runs", "Schedules", "Approved datasets", "History"], fields: [["Latest export", "July contract activity · EXP-881"], ["Requested by", "Sarah Mitchell"], ["Records", "2,814"], ["Format", "CSV · encrypted"], ["Retention", "Available for 7 days"], ["Status", "Ready to download"]], message: "Sensitive fields require explicit permission and every download is audited." },
  };
  const data = utility[page];
  return <><TabStrip items={data.tabs} active={data.tabs[0]} ui={ui} /><Grid columns={3} gap={ui.space(8)}><div style={{ ...panel, gridColumn: compact ? undefined : "span 2" }}><Grid columns={2} gap={ui.space(8)}>{data.fields.map(([label, value]) => <div key={label}><FieldBlock label={label} value={value} ui={ui} /></div>)}</Grid></div>{!compact && <InfoBox title="Control boundary" body={data.message} tone="info" ui={ui} />}</Grid></>;
}

function WorkflowPageContent({ page, compact, ui }: { page: string; compact?: boolean; ui: UiScale }) {
  const fs = ui.font(compact ? 8 : 10);
  const panel = { padding: ui.space(10), background: "#FFFFFF", border: `1px solid ${BRAND.border}`, borderRadius: ui.radius };
  const bookingForms = ["booking-new", "booking-urgent", "booking-edit"];
  const peopleForms = ["driver-new", "driver-edit", "staff-new"];
  const vehicleForms = ["vehicle-new", "vehicle-edit"];

  if (bookingForms.includes(page)) {
    const urgent = page === "booking-urgent";
    const editing = page === "booking-edit";
    return (
      <>
        <StepStrip items={["Customer", "Passenger", "Journey", "Schedule", "Pricing", "Review"]} active={editing ? 4 : urgent ? 2 : 1} ui={ui} />
        {urgent && <InfoBox title="Departure requested within 90 minutes" body="Availability must be confirmed before this booking can be accepted. Dispatch will be alerted when you continue." tone="attention" ui={ui} />}
        <Grid columns={3} gap={ui.space(8)} style={{ marginTop: ui.space(8) }}>
          <div style={{ ...panel, gridColumn: "span 2" }}>
            <div style={{ fontSize: fs + 1, fontWeight: 800, marginBottom: ui.space(8) }}>{editing ? "Journey and passenger" : urgent ? "Immediate journey" : "Passenger details"}</div>
            <Grid columns={2} gap={ui.space(8)}>
              <FieldBlock label="Customer" value={editing ? "Ridgeway Borough Council" : "Select…"} ui={ui} />
              <FieldBlock label="Passenger" value={editing ? "Rykairo Mitchell" : urgent ? "Amelia Brooks" : "Select or add passenger"} ui={ui} />
              <FieldBlock label="Pickup" value={editing ? "14 Oak Lane, Wembley" : "Enter pickup address"} ui={ui} />
              <FieldBlock label="Drop-off" value={editing ? "Oakwood Primary School" : "Enter destination"} ui={ui} />
              <FieldBlock label="Pickup date and time" value={urgent ? "Today · 09:10" : "Mon 20 Jul · 07:35"} ui={ui} />
              <FieldBlock label="Journey type" value={urgent ? "Urgent one-off" : "Home to school"} ui={ui} />
              <FieldBlock label="Access and safeguarding requirements" value="Wheelchair space · passenger assistant required · handover contact on arrival" ui={ui} wide />
            </Grid>
            <FormActions primary={urgent ? "Check availability" : editing ? "Save changes" : "Continue"} ui={ui} />
          </div>
          <Stack gap={ui.space(7)}>
            <InfoBox title="Operational validation" body="Vehicle accessibility, driver eligibility, travel time and depot coverage are checked before confirmation." tone="info" ui={ui} />
            <InfoBox title="Required evidence" body="Passenger needs and handover instructions must be confirmed by an authorised contact." ui={ui} />
          </Stack>
        </Grid>
      </>
    );
  }

  if (page === "booking-detail") {
    return (
      <>
        <Row gap={ui.space(6)} align="center" style={{ marginBottom: ui.space(8) }}><StatusPill label="Confirmed" tone="ready" ui={ui} /><div style={{ fontSize: fs, color: BRAND.muted }}>Ridgeway Borough Council · SEN school transport · 5 trips/week</div></Row>
        <TabStrip items={["Overview", "Schedule", "Passengers", "Trips", "Messages", "Audit"]} active="Overview" ui={ui} />
        <Grid columns={3} gap={ui.space(8)}>
          <div style={{ ...panel, gridColumn: "span 2" }}>
            <div style={{ fontSize: fs + 1, fontWeight: 800, marginBottom: ui.space(8) }}>Journey commitment</div>
            <Grid columns={2} gap={ui.space(8)}>
              <FieldBlock label="Passenger" value="Rykairo Mitchell" ui={ui} />
              <FieldBlock label="Schedule" value="Monday–Friday · term time" ui={ui} />
              <FieldBlock label="Outbound" value="Home 07:35 → Oakwood 08:10" ui={ui} />
              <FieldBlock label="Return" value="Oakwood 15:10 → Home 15:45" ui={ui} />
            </Grid>
          </div>
          <Stack gap={ui.space(7)}>
            <InfoBox title="Passenger requirements" body="Wheelchair space · PA required · named handover contact." tone="attention" ui={ui} />
            <InfoBox title="Next operational action" body="AM-104 is assigned. Return trip still requires a passenger assistant." tone="info" ui={ui} />
          </Stack>
        </Grid>
      </>
    );
  }

  if (["operational-trip-detail", "run-detail", "trip-detail"].includes(page)) {
    const isRun = page === "run-detail";
    const unassigned = page === "trip-detail";
    return (
      <>
        <Row gap={ui.space(6)} align="center" style={{ marginBottom: ui.space(8) }}>
          <StatusPill label={unassigned ? "Unassigned" : isRun ? "In progress" : "Attention"} tone={unassigned ? "attention" : isRun ? "ready" : "attention"} ui={ui} />
          <div style={{ fontSize: fs, color: BRAND.muted }}>{isRun ? "3 trips · Wembley Depot · 07:20–09:05" : "Rykairo Mitchell · Home to Oakwood Primary"}</div>
        </Row>
        <TabStrip items={isRun ? ["Run plan", "Assignments", "Map", "Events", "Audit"] : ["Operational view", "Passenger", "Journey", "Messages", "Audit"]} active={isRun ? "Run plan" : "Operational view"} ui={ui} />
        <Grid columns={3} gap={ui.space(8)}>
          <div style={{ ...panel, gridColumn: "span 2" }}>
            <div style={{ fontSize: fs + 1, fontWeight: 800, marginBottom: ui.space(8) }}>{isRun ? "Ordered trip plan" : "Live journey position"}</div>
            <SimpleTable ui={ui} headers={isRun ? ["Time", "Trip", "Passenger", "Stop", "State"] : ["Time", "Event", "Source", "Position"]} rows={isRun ? [["07:35", "T-0184", "Rykairo M.", "Oak Lane", "Picked up"], ["08:10", "T-0184", "Rykairo M.", "Oakwood", "Expected"], ["08:25", "T-0190", "Passenger B", "Meadow Road", "Planned"]] : [["07:31", "Vehicle arrived", "GPS", "Oak Lane"], ["07:38", "Pickup confirmed", "Driver", "Passenger aboard"], ["07:54", "Delay detected", "Platform", "+8 min"]]} />
          </div>
          <Stack gap={ui.space(7)}>
            <InfoBox title="Assignment" body={unassigned ? "No eligible driver and vehicle assigned. Two blockers must be resolved." : "Larone Mitchell · LK23 ABC · eligibility clear."} tone={unassigned ? "critical" : "info"} ui={ui} />
            <InfoBox title="Control note" body="Keep the passenger, driver and receiving contact informed when the expected arrival changes." ui={ui} />
          </Stack>
        </Grid>
      </>
    );
  }

  if (peopleForms.includes(page)) {
    const staff = page === "staff-new";
    return (
      <div style={panel}>
        <StepStrip items={["Identity", "Role", "Depots", "Compliance", "Access"]} active={page === "driver-edit" ? 3 : 0} ui={ui} />
        <Grid columns={2} gap={ui.space(8)}>
          <FieldBlock label="Full name" value={page === "driver-edit" ? "Larone Mitchell" : ""} ui={ui} />
          <FieldBlock label={staff ? "Staff role" : "Driver type"} value={staff ? "Passenger assistant" : "Employed driver"} ui={ui} />
          <FieldBlock label="Primary depot" value="Wembley Depot" ui={ui} />
          <FieldBlock label="Contact number" value="07700 900 184" ui={ui} />
          <FieldBlock label="Operational permissions" value={staff ? "Passenger handover · safeguarding notes" : "School transport · accessible vehicles"} ui={ui} wide />
        </Grid>
        <FormActions primary={page === "driver-edit" ? "Save driver" : "Continue to compliance"} ui={ui} />
      </div>
    );
  }

  if (["driver-detail", "staff-detail"].includes(page)) {
    const driver = page === "driver-detail";
    return (
      <>
        <Row gap={ui.space(7)} align="center" style={{ marginBottom: ui.space(8) }}><div style={{ width: ui.space(34), height: ui.space(34), borderRadius: ui.space(17), background: BRAND.midnight, color: "#FFFFFF", display: "grid", placeItems: "center", fontWeight: 800 }}>{driver ? "LM" : "SM"}</div><StatusPill label={driver ? "On duty" : "Active"} tone="ready" ui={ui} /><div style={{ fontSize: fs, color: BRAND.muted }}>{driver ? "Driver · Wembley Depot · duty AM-104" : "Passenger assistant · Wembley Depot"}</div></Row>
        <TabStrip items={driver ? ["Overview", "Duty", "Compliance", "Training", "Documents", "History"] : ["Overview", "Duty", "Training", "Documents", "Access", "History"]} active="Overview" ui={ui} />
        <Grid columns={3} gap={ui.space(8)}>
          <div style={{ ...panel, gridColumn: "span 2" }}><SimpleTable ui={ui} headers={["Requirement", "Status", "Expires", "Owner"]} rows={driver ? [["Driving licence", "Clear", "12 Mar 2028", "Driver"], ["CPC", "Renewal due", "18 Aug 2026", "Compliance"], ["DBS", "Clear", "Reviewed", "HR"]] : [["DBS", "Clear", "Reviewed", "HR"], ["Safeguarding", "Current", "05 Jan 2027", "Training"], ["Passenger handling", "Current", "21 Feb 2027", "Training"]]} /></div>
          <Stack gap={ui.space(7)}><InfoBox title="Operational position" body={driver ? "Eligible for current assignment. CPC renewal is due in 33 days." : "Available today. Assigned to AM-104 and PM-104."} tone="attention" ui={ui} /><InfoBox title="Contact" body="07700 900 184 · contact details visible to authorised operations staff." ui={ui} /></Stack>
        </Grid>
      </>
    );
  }

  if (["vor-board", "fleet-compliance", "fleet-intelligence"].includes(page)) {
    if (page === "vor-board") {
      return (
        <>
          <Grid columns={compact ? 2 : 4} gap={ui.space(6)} style={{ marginBottom: ui.space(8) }}><MetricTile label="VOR now" value="3" detail="2 affect service" tone="critical" ui={ui} /><MetricTile label="In workshop" value="2" detail="1 awaiting parts" tone="attention" ui={ui} />{!compact && <MetricTile label="Awaiting verification" value="1" detail="Evidence complete" tone="info" ui={ui} />}{!compact && <MetricTile label="Ready for decision" value="1" detail="Independent approval due" tone="ready" ui={ui} />}</Grid>
          <Grid columns={compact ? 2 : 4} gap={ui.space(7)}>
            <BoardColumn title="Blocked" count={2} tone="vor" cards={[["MB-12", "Rear light · safety critical", "Since 06:41 · AM-108 uncovered"], ["VX-09", "MOT expired", "Since yesterday · no allocation"]]} ui={ui} />
            <BoardColumn title="In workshop" count={2} tone="attention" cards={[["MB-12", "WO-441 in progress", "Engineer: A. Chen · due 09:30"], ["LK22 DEF", "Brake inspection", "Awaiting parts confirmation"]]} ui={ui} />
            {!compact && <BoardColumn title="Verification" count={1} tone="info" cards={[["LK23 ABC", "Repair evidence received", "Post-repair check due"]]} ui={ui} />}
            {!compact && <BoardColumn title="RTS decision" count={1} tone="ready" cards={[["LK23 ABC", "Ready for independent review", "Approver must differ from recorder"]]} ui={ui} />}
          </Grid>
        </>
      );
    }
    if (page === "fleet-compliance") {
      return <><Grid columns={compact ? 2 : 4} gap={ui.space(6)} style={{ marginBottom: ui.space(8) }}><MetricTile label="Fleet clear" value="86%" detail="12 of 14 vehicles" tone="ready" ui={ui} /><MetricTile label="Expiring in 30d" value="5" detail="Evidence review due" tone="attention" ui={ui} />{!compact && <MetricTile label="Blocked" value="2" detail="Cannot be assigned" tone="critical" ui={ui} />}{!compact && <MetricTile label="Evidence missing" value="3" detail="Owners notified" tone="info" ui={ui} />}</Grid><RegisterPage scope="fleet compliance" ui={ui} filters={["All", "Blocked", "Expiring", "Evidence missing"]} headers={["Vehicle", "MOT", "Insurance", "Service", "Checks", "Position"]} rows={[[<RegPlate reg="LK23 ABC" ui={ui} />, "12 Mar 2027", "Clear", "28 days", "Clear", <StatusPill label="Compliant" tone="ready" ui={ui} />], [<RegPlate reg="MB-12" ui={ui} />, "Clear", "Clear", "Overdue", "Defect", <StatusPill label="Blocked" tone="critical" ui={ui} />]]} /></>;
    }
    return <><Grid columns={3} gap={ui.space(6)} style={{ marginBottom: ui.space(8) }}><MetricTile label="Utilisation" value="78%" detail="Today across all depots" tone="info" ui={ui} /><MetricTile label="Availability" value="91%" detail="+4% over four weeks" tone="ready" ui={ui} /><MetricTile label="Cost per mile" value="£0.84" detail="Within operating target" ui={ui} /></Grid><Grid columns={2} gap={ui.space(8)}><InfoBox title="Availability trend" body="Fleet availability has improved 4% over four weeks. VOR time remains concentrated in two vehicles." tone="info" ui={ui} /><InfoBox title="Actionable finding" body="MB-12 has repeated lighting defects. Review repair history before its next allocation." tone="attention" ui={ui} /></Grid></>;
  }

  if (vehicleForms.includes(page)) {
    return (
      <div style={panel}>
        <StepStrip items={["Identity", "Specification", "Compliance", "Equipment", "Review"]} active={page === "vehicle-edit" ? 3 : 0} ui={ui} />
        <Grid columns={2} gap={ui.space(8)}>
          <FieldBlock label="Registration" value="LK23 ABC" ui={ui} />
          <FieldBlock label="Fleet number" value="WY-014" ui={ui} />
          <FieldBlock label="Vehicle type" value="16-seat accessible minibus" ui={ui} />
          <FieldBlock label="Primary depot" value="Wembley Depot" ui={ui} />
          <FieldBlock label="Accessibility" value="Wheelchair lift · 2 wheelchair positions" ui={ui} wide />
        </Grid>
        <FormActions primary={page === "vehicle-edit" ? "Save vehicle" : "Start onboarding"} ui={ui} />
      </div>
    );
  }

  if (page === "vehicle-onboarding") {
    return (
      <>
        <StepStrip items={["Identity", "Documents", "Baseline check", "Equipment", "Release"]} active={2} ui={ui} />
        <Grid columns={3} gap={ui.space(8)}>
          <div style={{ ...panel, gridColumn: "span 2" }}><div style={{ fontSize: fs + 1, fontWeight: 800, marginBottom: ui.space(8) }}>Baseline vehicle evidence</div><Stack gap={ui.space(6)}><InfoBox title="Exterior condition" body="12 required views · 12 captured · no unresolved difference." tone="info" ui={ui} /><InfoBox title="Safety equipment" body="First aid kit confirmed. Fire extinguisher inspection date is missing." tone="attention" ui={ui} /><InfoBox title="Accessibility equipment" body="Lift function checked · restraints counted · evidence attached." tone="info" ui={ui} /></Stack></div>
          <Stack gap={ui.space(7)}><InfoBox title="Release blocked" body="The vehicle cannot enter service until the fire extinguisher inspection date is recorded." tone="critical" ui={ui} /><InfoBox title="Accountability" body="Baseline recorded by Priya K. · final release requires Fleet Manager approval." ui={ui} /></Stack>
        </Grid>
      </>
    );
  }

  if (page === "vehicle-detail") {
    return (
      <>
        <Row gap={ui.space(6)} align="center" style={{ marginBottom: ui.space(8) }}><RegPlate reg="LK23 ABC" /><StatusPill label="In service" tone="ready" ui={ui} /><div style={{ fontSize: fs, color: BRAND.muted }}>WY-014 · 16-seat accessible · Wembley</div></Row>
        <TabStrip items={["Overview", "Checks", "Defects", "Damage", "Maintenance", "Equipment", "Documents", "History"]} active="Overview" ui={ui} />
        <Grid columns={3} gap={ui.space(8)}><div style={{ ...panel, gridColumn: "span 2" }}><Grid columns={2} gap={ui.space(8)}><FieldBlock label="Current allocation" value="AM-104 · Larone Mitchell" ui={ui} /><FieldBlock label="Live position" value="En route · GPS 16s ago" ui={ui} /><FieldBlock label="Next commitment" value="T-0190 · 08:25" ui={ui} /><FieldBlock label="Readiness" value="Checks clear · equipment confirmed" ui={ui} /></Grid></div><Stack gap={ui.space(7)}><InfoBox title="Open attention" body="Bodywork scratch remains under monitoring. It does not block service." tone="attention" ui={ui} /><InfoBox title="Evidence" body="Latest walkaround and bodywork photographs available." tone="info" ui={ui} /></Stack></Grid>
      </>
    );
  }

  if (["check-detail", "defect-detail", "incident-detail"].includes(page)) {
    const check = page === "check-detail";
    const defect = page === "defect-detail";
    return (
      <>
        <Row gap={ui.space(6)} align="center" style={{ marginBottom: ui.space(8) }}><StatusPill label={check ? "Defect found" : defect ? "Safety-critical" : "Under review"} tone={defect ? "critical" : "attention"} ui={ui} /><div style={{ fontSize: fs, color: BRAND.muted }}>{check ? "LK23 ABC · Larone Mitchell · 06:31" : defect ? "MB-04 · reported by Emma Taylor · 06:41" : "Near miss · Larone Mitchell · LK23 ABC"}</div></Row>
        <TabStrip items={check ? ["Summary", "Responses", "Defects", "Evidence", "Audit"] : defect ? ["Summary", "Evidence", "Work", "Decisions", "Audit"] : ["Summary", "People", "Evidence", "Investigation", "Insurer", "Audit"]} active="Summary" ui={ui} />
        <Grid columns={3} gap={ui.space(8)}>
          <div style={{ ...panel, gridColumn: "span 2" }}>
            <div style={{ fontSize: fs + 1, fontWeight: 800, marginBottom: ui.space(8) }}>{check ? "Check outcome" : defect ? "Defect evidence and control" : "Incident record"}</div>
            <Stack gap={ui.space(6)}>
              <InfoBox title={check ? "Rear nearside light" : defect ? "Vehicle cannot enter service" : "What happened"} body={check ? "Driver selected Failed and attached two photographs. A safety-critical defect was created automatically." : defect ? "Rear nearside position light is not operating. Vehicle marked VOR at 06:44." : "Vehicle braked sharply when another road user entered the pickup bay. No injury reported."} tone={defect ? "critical" : "attention"} ui={ui} />
              <SimpleTable ui={ui} headers={["Time", "Event", "Actor", "Evidence"]} rows={check ? [["06:31", "Check started", "Larone M.", "Device"], ["06:39", "Item failed", "Larone M.", "2 photos"], ["06:41", "Defect created", "Platform", "DEF-441"]] : defect ? [["06:41", "Defect reported", "Emma T.", "2 photos"], ["06:44", "Vehicle marked VOR", "S. Mitchell", "Decision"], ["07:02", "Work assigned", "Maintenance", "WO-441"]] : [["08:12", "Incident reported", "Larone M.", "Statement"], ["08:20", "CCTV requested", "Priya K.", "Request"], ["09:05", "Review assigned", "S. Mitchell", "Owner"]]} />
            </Stack>
          </div>
          <Stack gap={ui.space(7)}><InfoBox title="Next required action" body={check ? "Maintenance must assess DEF-441 before the vehicle is considered for release." : defect ? "Record repair evidence, complete post-repair check, then request independent RTS approval." : "Collect passenger assistant statement and depot CCTV before completing the initial review."} tone="attention" ui={ui} /><InfoBox title="Decision integrity" body="Observation, repair and approval remain separate, named events in the audit record." ui={ui} /></Stack>
        </Grid>
      </>
    );
  }

  if (page === "incident-settings") {
    return (
      <Grid columns={3} gap={ui.space(8)}>
        <div style={{ ...panel, gridColumn: "span 2" }}><Stack gap={ui.space(7)}>{["Incident categories", "Severity and escalation", "Required evidence", "Insurer notifications", "Retention and access"].map((item, index) => <div key={item}><Row align="center" style={{ padding: ui.space(8), borderBottom: index < 4 ? `1px solid ${BRAND.border}` : undefined }}><div><div style={{ fontSize: fs, fontWeight: 700 }}>{item}</div><div style={{ fontSize: fs - 1, color: BRAND.muted, marginTop: 2 }}>Company policy · version controlled</div></div><Spacer /><div style={{ color: BRAND.commandBlue, fontSize: fs - 1, fontWeight: 700 }}>Configure</div></Row></div>)}</Stack></div>
        <Stack gap={ui.space(7)}><InfoBox title="Policy changes are audited" body="New rules apply to future incidents. Existing records keep the policy version used when they were created." tone="info" ui={ui} /><InfoBox title="Access boundary" body="Health, passenger and insurer information is shown only to authorised roles." ui={ui} /></Stack>
      </Grid>
    );
  }

  return <div style={{ fontSize: fs, color: BRAND.muted }}>Workflow preview unavailable.</div>;
}

const PAGE_META: Record<string, { title: string; breadcrumb: string; action?: string }> = {
  overview: { title: "What needs attention before the AM peak?", breadcrumb: "Command / Overview" },
  "live-operations": { title: "Live Operations", breadcrumb: "Command / Live Operations" },
  exceptions: { title: "Exception queue", breadcrumb: "Command / Exceptions", action: "Assign owner" },
  notifications: { title: "Notifications", breadcrumb: "Command / Notifications" },
  bookings: { title: "Bookings", breadcrumb: "Operations / Bookings", action: "New booking" },
  dispatch: { title: "Dispatch workspace", breadcrumb: "Operations / Dispatch", action: "Create run" },
  runs: { title: "Runs", breadcrumb: "Operations / Runs", action: "New run" },
  trips: { title: "Trips", breadcrumb: "Operations / Trips" },
  schedule: { title: "Schedule", breadcrumb: "Operations / Schedule" },
  "recurring-transport": { title: "Recurring transport", breadcrumb: "Operations / Recurring Transport", action: "New pattern" },
  drivers: { title: "Drivers", breadcrumb: "People and Fleet / Drivers", action: "Add driver" },
  staff: { title: "Staff", breadcrumb: "People and Fleet / Staff" },
  vehicles: { title: "Vehicles", breadcrumb: "People and Fleet / Vehicles", action: "Add vehicle" },
  depots: { title: "Depots", breadcrumb: "People and Fleet / Depots" },
  "yard-operations": { title: "Yard operations", breadcrumb: "People and Fleet / Yard Operations" },
  maintenance: { title: "Maintenance", breadcrumb: "People and Fleet / Maintenance", action: "New work order" },
  "vehicle-checks": { title: "Vehicle checks", breadcrumb: "Safety and Compliance / Vehicle Checks" },
  defects: { title: "Defects", breadcrumb: "Safety and Compliance / Defects" },
  inspections: { title: "Inspections", breadcrumb: "Safety and Compliance / Inspections" },
  incidents: { title: "Incidents", breadcrumb: "Safety and Compliance / Incidents", action: "Report incident" },
  "compliance-rules": { title: "Compliance rules", breadcrumb: "Safety and Compliance / Compliance Rules", action: "Add rule" },
  customers: { title: "Customers", breadcrumb: "Customers and Commercial / Customers", action: "Add customer" },
  passengers: { title: "Passengers", breadcrumb: "Customers and Commercial / Passengers" },
  schools: { title: "Schools and organisations", breadcrumb: "Customers and Commercial / Schools" },
  contracts: { title: "Contracts", breadcrumb: "Customers and Commercial / Contracts", action: "New contract" },
  pricing: { title: "Pricing", breadcrumb: "Customers and Commercial / Pricing" },
  messages: { title: "Messages", breadcrumb: "Communication / Messages", action: "New message" },
  announcements: { title: "Announcements", breadcrumb: "Communication / Announcements", action: "Broadcast" },
  templates: { title: "Templates", breadcrumb: "Communication / Templates", action: "New template" },
  reports: { title: "Reports", breadcrumb: "Intelligence / Reports" },
  performance: { title: "Performance", breadcrumb: "Intelligence / Performance" },
  "audit-log": { title: "Audit log", breadcrumb: "Intelligence / Audit Log", action: "Export" },
  "company-settings": { title: "Company settings", breadcrumb: "Administration / Company Settings" },
  "users-and-roles": { title: "Users and roles", breadcrumb: "Administration / Users and Roles", action: "Invite user" },
  integrations: { title: "Integrations", breadcrumb: "Administration / Integrations" },
};

const WORKFLOW_META: Record<string, { title: string; breadcrumb: string; action?: string }> = Object.fromEntries(
  WORKFLOW_PAGES.map((page) => [page.id, { title: page.title, breadcrumb: page.breadcrumb, action: page.action }]),
);

const ROADMAP_META: Record<string, { title: string; breadcrumb: string; action?: string }> = Object.fromEntries(
  ROADMAP_PAGES.map((page) => [page.id, { title: page.title, breadcrumb: page.breadcrumb, action: page.action }]),
);

function SystemStateScreen({ id }: { id: string }) {
  const state = SYSTEM_PAGES.find((page) => page.id === id) ?? SYSTEM_PAGES[3];
  return (
    <div style={{ minHeight: 560, display: "grid", gridTemplateRows: "64px 1fr", background: BRAND.pageBg, color: BRAND.ink }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 22px", background: BRAND.midnight, color: "#FFFFFF" }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>VEYVIO <span style={{ color: BRAND.commandBlue, fontSize: 10, letterSpacing: "0.14em" }}>COMMAND</span></div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: "rgba(255,255,255,0.66)" }}>Ridgeway Transport · Sarah Mitchell</div>
      </div>
      <div style={{ display: "grid", placeItems: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 520, padding: 28, border: `1px solid ${BRAND.border}`, borderRadius: 8, background: "#FFFFFF", textAlign: "center" }}>
          <div style={{ width: 44, height: 44, margin: "0 auto 16px", display: "grid", placeItems: "center", borderRadius: 22, background: BRAND.commandBlueSoft, color: BRAND.commandBlue, fontSize: 18, fontWeight: 900 }}>!</div>
          <div style={{ fontSize: 20, fontWeight: 850 }}>{state.title}</div>
          <div style={{ marginTop: 9, color: BRAND.muted, fontSize: 12, lineHeight: 1.55 }}>{state.body}</div>
          <div style={{ margin: "20px auto 0", width: "fit-content", padding: "9px 14px", borderRadius: 5, background: BRAND.midnight, color: "#FFFFFF", fontSize: 11, fontWeight: 750 }}>{state.action}</div>
          <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${BRAND.border}`, color: BRAND.muted, fontSize: 10, lineHeight: 1.5 }}>{state.detail}</div>
        </div>
      </div>
    </div>
  );
}

function CommandPage({
  pageId: id,
  compact,
  collapsed,
  onNavigate,
  uiSettings,
}: {
  pageId: string;
  compact?: boolean;
  collapsed?: boolean;
  onNavigate?: (pageId: string) => void;
  uiSettings: UiSettings;
}) {
  const ui = buildUi(uiSettings, compact);
  if (id === "select-company") return <SelectCompanyScreen />;
  if (SYSTEM_PAGES.some((page) => page.id === id)) return <SystemStateScreen id={id} />;
  const nestedPage = WORKFLOW_PAGES.find((page) => page.id === id) ?? ROADMAP_PAGES.find((page) => page.id === id);
  const label = nestedPage?.parent ?? ALL_PAGES.find((p) => pageId(p.label) === id)?.label ?? "Overview";
  const meta = PAGE_META[id] ?? WORKFLOW_META[id] ?? ROADMAP_META[id] ?? PAGE_META.overview;
  const activePageId = nestedPage ? pageId(nestedPage.parent) : id;
  return (
    <CommandShell activeNav={label} activePageId={activePageId} title={meta.title} breadcrumb={meta.breadcrumb} compact={compact} collapsed={collapsed} action={compact ? undefined : meta.action} onNavigate={onNavigate} ui={ui}>
      <PageContent page={id} compact={compact} ui={ui} />
    </CommandShell>
  );
}

function PlatformTree() {
  const theme = useHostTheme();
  const lines = [
    "Veyvio Platform",
    "├── Veyvio Command — Admin, dispatch, compliance, reporting",
    "├── Veyvio Driver — Duties, trips, checks, messages",
    "├── Veyvio Yard — Yard ops, inspections, equipment",
    "├── Veyvio Customer — Bookings, tracking, accounts",
    "└── Shared Platform Services — Auth, vehicles, drivers, bookings, dispatch, notifications, audit",
  ];
  return (
    <div style={{ padding: 14, background: theme.fill.tertiary, borderRadius: 6, fontFamily: "monospace", fontSize: 11, lineHeight: 1.7, color: theme.text.secondary }}>
      {lines.map((l) => <div key={l}>{l}</div>)}
    </div>
  );
}

function TokenSwatch({ name, hex, usage }: { name: string; hex: string; usage: string }) {
  const theme = useHostTheme();
  return (
    <Row gap={10} align="center">
      <div style={{ width: 36, height: 36, borderRadius: 4, background: hex, border: `1px solid ${theme.stroke.secondary}`, flexShrink: 0 }} />
      <Stack gap={2}>
        <Text weight="semibold" size="small">{name}</Text>
        <Text tone="tertiary" size="small">{hex} — {usage}</Text>
      </Stack>
    </Row>
  );
}

const PAGE_OPTIONS = [
  ...ALL_PAGES.map((p) => ({ value: pageId(p.label), label: `${p.group} / ${p.label}` })),
  ...WORKFLOW_PAGES.map((p) => ({ value: p.id, label: `${p.group} / ${p.label}` })),
  ...ROADMAP_PAGES.map((p) => ({ value: p.id, label: `Roadmap / ${p.label}` })),
  ...SYSTEM_PAGES.map((p) => ({ value: p.id, label: `System state / ${p.label}` })),
];

const PREVIEW_PATHS: Record<string, string> = Object.fromEntries([...WORKFLOW_PAGES, ...ROADMAP_PAGES, ...SYSTEM_PAGES].map((page) => [page.id, page.path]));

const PRIMARY_PATH_OVERRIDES: Record<string, string> = {
  overview: "",
  "yard-operations": "yard",
  "audit-log": "audit",
  "company-settings": "settings/company",
  "users-and-roles": "settings/users",
  integrations: "settings/integrations",
};

const GROUP_PURPOSE: Record<string, string> = {
  Command: "Live position and exceptions",
  Operations: "Plan, assign and deliver transport",
  "People and Fleet": "Operational people and vehicle records",
  "Safety and Compliance": "Evidence, controls and accountable decisions",
  "Customers and Commercial": "Demand, passenger needs and agreements",
  Communication: "Instructions and acknowledged communication",
  Intelligence: "Performance, reporting and audit",
  Administration: "Company access and connected services",
};

const SYSTEM_ROUTES = SYSTEM_PAGES.map((page) => ({ label: page.label, path: `/${page.path}`, outcome: page.detail }));

const ROUTE_ROADMAP = [
  {
    phase: "P0 — Operational closure",
    outcome: "Make dispatch decisions against legal duties and real resource capacity.",
    routes: ["/duties", "/duties/:dutyId", "/availability", "/cancellations", "/handover", "/staff/:staffId/edit"],
  },
  {
    phase: "P1 — Evidence and compliance",
    outcome: "Close maintenance, passenger-safety and investigation workflows.",
    routes: [
      "/maintenance/work-orders",
      "/maintenance/work-orders/:workOrderId",
      "/compliance",
      "/compliance/expiries",
      "/safeguarding",
      "/risk-assessments",
      "/inspections/:inspectionId",
      "/corrective-actions",
      "/passengers/:passengerId",
      "/customers/:customerId",
      "/schools/:schoolId",
      "/contracts/:contractId",
      "/messages/:conversationId",
      "/communication/delivery",
    ],
  },
  {
    phase: "P2 — Platform control",
    outcome: "Complete administration, self-service and controlled data movement.",
    routes: [
      "/settings/roles",
      "/settings/invitations",
      "/settings/security",
      "/settings/notifications",
      "/search",
      "/profile",
      "/imports",
      "/exports",
    ],
  },
];

const EXISTING_TAB_SURFACES = [
  "Driver compliance, documents, training and performance",
  "Vehicle equipment, damage, checks, defects and maintenance history",
  "Maintenance schedules, downtime and approvals",
  "Yard activity, movements, tasks and handovers",
  "Incident actions, evidence and investigation",
];

function RouteDirectory() {
  const theme = useHostTheme();
  const sections: Array<{ title: string; description: string; rows: Array<{ label: string; path: string; context: string; type: string }> }> = [
    {
      title: "Authentication and workspace access",
      description: "Access routes outside the Command application shell.",
      rows: [
        { label: "Sign in", path: "/login", context: "Authentication", type: "Public" },
        { label: "Select company", path: "/select-company", context: "Tenant context", type: "Authenticated" },
      ],
    },
    ...NAV_GROUPS.map((group) => ({
      title: group.title,
      description: GROUP_PURPOSE[group.title],
      rows: group.items.map((label) => {
        const id = pageId(label);
        const path = PRIMARY_PATH_OVERRIDES[id] ?? id;
        return { label, path: path ? `/${path}` : "/", context: group.title, type: "Primary" };
      }),
    })),
    ...WORKFLOW_GROUPS.filter((group) => group !== "Access and context").map((group) => ({
      title: group,
      description: "Route reached from a primary page or governed workflow.",
      rows: WORKFLOW_PAGES.filter((page) => page.group === group && page.id !== "select-company").map((page) => ({
        label: page.label,
        path: `/${page.path}`,
        context: page.parent,
        type: page.routeType,
      })),
    })),
  ];

  return (
    <Stack gap={14}>
      <Row gap={10} align="center" wrap>
        <div>
          <H2>Admin app route directory</H2>
          <Text tone="tertiary" size="small" style={{ display: "block", marginTop: 4 }}>Canonical current contract: {CURRENT_ROUTE_COUNT} product routes. System states and future routes are tracked separately.</Text>
        </div>
        <Spacer />
        <Pill active>{CURRENT_ROUTE_COUNT} routes</Pill>
      </Row>
      <Card>
        <CardBody>
          <Grid columns={2} gap={22}>
            {sections.map((section) => (
              <div key={section.title}>
                <Row gap={8} align="center">
                  <Text weight="semibold">{section.title}</Text>
                  <Pill>{section.rows.length}</Pill>
                </Row>
                <Text tone="tertiary" size="small" style={{ display: "block", marginTop: 4, marginBottom: 8 }}>{section.description}</Text>
                <div style={{ borderTop: `1px solid ${BRAND.border}` }}>
                  {section.rows.map((row) => (
                    <div key={`${section.title}-${row.path}`} style={{ display: "grid", gridTemplateColumns: "minmax(120px, 1fr) minmax(145px, 1.25fr) minmax(90px, auto)", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${BRAND.border}` }}>
                      <Text weight="semibold" size="small">{row.label}</Text>
                      <Text tone="tertiary" size="small" style={{ fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.path}</Text>
                      <Text tone="tertiary" size="small" style={{ textAlign: "right" }}>{row.type}</Text>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </Grid>
        </CardBody>
      </Card>
      <Card>
        <CardHeader trailing={<Pill active>Domain contract</Pill>}>Booking, Trip, Run and live execution</CardHeader>
        <CardBody>
          <Grid columns={4} gap={12}>
            {[
              ["1 · Booking", "The customer request. Creates one or more planned trips."],
              ["2 · Trip", "One passenger movement with requirements, times and an assigned run."],
              ["3 · Run", "An ordered group of trips assigned to a driver, vehicle and duty."],
              ["4 · Live execution", "The trip in motion: GPS, progress, outcomes, delays and actual evidence."],
            ].map(([title, description]) => (
              <div key={title} style={{ padding: 12, height: "100%", border: `1px solid ${theme.stroke.secondary}`, borderRadius: 6, background: theme.fill.tertiary }}>
                <Text weight="semibold" size="small">{title}</Text>
                <Text tone="tertiary" size="small" style={{ display: "block", marginTop: 6 }}>{description}</Text>
              </div>
            ))}
          </Grid>
          <Text tone="tertiary" size="small" style={{ display: "block", marginTop: 12 }}>
            Planned record: /trips/:tripId · Operational context: /live-operations/trips/:tripId · Each view links to the other.
          </Text>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>Canonical routing rules</CardHeader>
        <CardBody>
          <Grid columns={2} gap={12}>
            {[
              ["Immutable identifiers", "Dynamic routes use :bookingId, :driverId and :vehicleId. Registrations remain searchable display values."],
              ["Reserved fleet paths", "/vehicles/new, /vor, /compliance and /intelligence are static collection routes matched before /vehicles/:vehicleId."],
              ["Yard boundary", "/yard provides Command oversight and intervention; physical yard workflows remain in the standalone Veyvio Yard app."],
              ["One booking engine", "/bookings/new/urgent has distinct rules and warnings but shares the standard booking workflow engine."],
              ["Route metadata", "Every route declares permission, feature, tenant requirement and depot scope; the API independently enforces all access."],
              ["Concealed records", "Cross-tenant and unauthorized record responses must not reveal whether the record exists."],
            ].map(([title, description]) => (
              <div key={title} style={{ padding: 12, border: `1px solid ${theme.stroke.secondary}`, borderRadius: 6, background: theme.fill.tertiary }}>
                <Text weight="semibold" size="small">{title}</Text>
                <Text tone="tertiary" size="small" style={{ display: "block", marginTop: 5 }}>{description}</Text>
              </div>
            ))}
          </Grid>
        </CardBody>
      </Card>
      <Grid columns={2} gap={14}>
        <Card>
          <CardHeader trailing={<Pill>{SYSTEM_ROUTES.length} states</Pill>}>System routes — excluded from product count</CardHeader>
          <CardBody>
            <Stack gap={0}>
              {SYSTEM_ROUTES.map((route) => (
                <div key={route.path} style={{ display: "grid", gridTemplateColumns: "minmax(130px, 0.8fr) minmax(150px, 1fr) minmax(180px, 1.5fr)", gap: 10, padding: "9px 0", borderBottom: `1px solid ${BRAND.border}` }}>
                  <Text weight="semibold" size="small">{route.label}</Text>
                  <Text tone="tertiary" size="small" style={{ fontFamily: "monospace" }}>{route.path}</Text>
                  <Text tone="tertiary" size="small">{route.outcome}</Text>
                </div>
              ))}
            </Stack>
          </CardBody>
        </Card>
        <Card>
          <CardHeader trailing={<Pill>{EXISTING_TAB_SURFACES.length} groups</Pill>}>Already covered inside record pages</CardHeader>
          <CardBody>
            <Text tone="tertiary" size="small">These are not missing routes unless deep linking, independent permissions or analytics require them.</Text>
            <Stack gap={8} style={{ marginTop: 12 }}>
              {EXISTING_TAB_SURFACES.map((surface) => (
                <div key={surface} style={{ paddingBottom: 8, borderBottom: `1px solid ${BRAND.border}` }}>
                  <Text size="small">• {surface}</Text>
                </div>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Grid>
      <Stack gap={10}>
        <Row gap={10} align="center" wrap>
          <div>
            <H3>Prioritized route roadmap</H3>
            <Text tone="tertiary" size="small">Proposed additions are not part of the current {CURRENT_ROUTE_COUNT}-route contract.</Text>
          </div>
          <Spacer />
          <Pill>{ROUTE_ROADMAP.reduce((total, phase) => total + phase.routes.length, 0)} proposed</Pill>
        </Row>
        <Grid columns={3} gap={14}>
          {ROUTE_ROADMAP.map((phase) => (
            <div key={phase.phase}>
              <Card style={{ height: "100%" }}>
                <CardHeader trailing={<Pill>{phase.routes.length}</Pill>}>{phase.phase}</CardHeader>
                <CardBody>
                  <Text tone="tertiary" size="small">{phase.outcome}</Text>
                  <Stack gap={7} style={{ marginTop: 12 }}>
                    {phase.routes.map((route) => (
                      <div key={route}>
                        <Text size="small" style={{ fontFamily: "monospace" }}>{route}</Text>
                      </div>
                    ))}
                  </Stack>
                </CardBody>
              </Card>
            </div>
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
}

function FullPagePreview({
  id,
  label,
  path,
  uiSettings,
}: {
  id: string;
  label: string;
  path: string;
  uiSettings: UiSettings;
}) {
  return (
    <div style={{ contentVisibility: "auto", containIntrinsicSize: "760px" }}>
      <Stack gap={8}>
        <Row gap={10} align="center" wrap>
          <H3>{label}</H3>
          <Spacer />
          <Text tone="tertiary" size="small" style={{ fontFamily: "monospace" }}>command.veyvio.app/{path}</Text>
        </Row>
        <Card>
          <CardBody style={{ padding: 0, overflow: "hidden" }}>
            <BrowserFrame url={`command.veyvio.app/${path}`}>
              <CommandPage pageId={id} uiSettings={uiSettings} />
            </BrowserFrame>
          </CardBody>
        </Card>
      </Stack>
    </div>
  );
}

function LazyCatalogueSection({ id, title, count, description, defaultOpen, children }: { id: string; title: string; count: number; description: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useCanvasState<boolean>(`catalogue-${id}-open-v2`, defaultOpen ?? false);
  return (
    <Card>
      <CardHeader trailing={<Button variant="secondary" onClick={() => setOpen(!open)}>{open ? "Collapse" : `Show ${count} pages`}</Button>}>{title}</CardHeader>
      <CardBody>
        <Row gap={10} align="center" wrap>
          <Text tone="tertiary" size="small">{description}</Text>
          <Spacer />
          <Pill active={open}>{count} pages</Pill>
        </Row>
        {open && <div style={{ marginTop: 22 }}><Stack gap={28}>{children}</Stack></div>}
      </CardBody>
    </Card>
  );
}

function PagePreviewPanel({
  preview,
  onPreviewChange,
  sidebarCollapsed,
  onSidebarChange,
  uiSettings,
}: {
  preview: string;
  onPreviewChange: (pageId: string) => void;
  sidebarCollapsed: boolean;
  onSidebarChange: (collapsed: boolean) => void;
  uiSettings: UiSettings;
}) {
  const selected = WORKFLOW_PAGES.find((page) => page.id === preview) ?? ROADMAP_PAGES.find((page) => page.id === preview);
  const system = SYSTEM_PAGES.find((page) => page.id === preview);
  const primary = ALL_PAGES.find((page) => pageId(page.label) === preview);
  const pageLabel = selected?.label ?? system?.label ?? primary?.label ?? "Overview";
  const pageGroup = selected?.group ?? (system ? "System state" : primary?.group) ?? "Command";
  return (
    <Stack gap={10}>
      <Row gap={10} align="center" wrap>
        <div>
          <H2>Page browser</H2>
          <Text tone="tertiary" size="small" style={{ marginTop: 4 }}>
            One full-size screen at a time. Choose from {CURRENT_ROUTE_COUNT} current routes, {ROADMAP_PAGES.length} proposed pages and {SYSTEM_PAGES.length} system states.
          </Text>
        </div>
        <Spacer />
        <Pill active>Focused view</Pill>
      </Row>
      <Card>
        <CardBody>
          <Row gap={16} wrap align="end">
            <div style={{ flex: 1, minWidth: 280 }}>
              <Text tone="tertiary" size="small" style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 5 }}>
                Screen
              </Text>
              <Select value={preview} onChange={onPreviewChange} options={PAGE_OPTIONS} />
            </div>
            <SegmentedControl
              label="Sidebar"
              value={sidebarCollapsed ? "collapsed" : "expanded"}
              options={[
                { value: "expanded", label: "Expanded" },
                { value: "collapsed", label: "Collapsed" },
              ]}
              onChange={(value) => onSidebarChange(value === "collapsed")}
            />
          </Row>
          <Row gap={8} align="center" wrap style={{ marginTop: 12 }}>
            <Text weight="semibold" size="small">{pageLabel}</Text>
            <Text tone="tertiary" size="small">{pageGroup}</Text>
            <Spacer />
            <Text tone="tertiary" size="small">Use the display controls above if you want larger text or spacing.</Text>
          </Row>
        </CardBody>
      </Card>
      <Card>
        <CardBody style={{ padding: 0, overflow: "hidden" }}>
          <BrowserFrame url={`command.veyvio.app/${PREVIEW_PATHS[preview] ?? (preview === "overview" ? "" : preview)}`}>
            <CommandPage pageId={preview} collapsed={sidebarCollapsed} onNavigate={onPreviewChange} uiSettings={uiSettings} />
          </BrowserFrame>
        </CardBody>
      </Card>
    </Stack>
  );
}

export default function VeyvioCommandBrandCanvas() {
  const [preview, setPreview] = useCanvasState("preview-reference-v3", "live-operations");
  const [sidebarCollapsed, setSidebarCollapsed] = useCanvasState("sidebar-collapsed-v3", false);
  const [uiSettings, setUiSettings] = useCanvasState<UiSettings>("ui-settings-readable-v2", DEFAULT_UI_SETTINGS);
  const previewUi = buildUi(uiSettings, false);

  return (
    <Stack gap={24}>
      <Stack gap={6}>
        <H1>Veyvio Command — web app brand</H1>
        <Text tone="secondary">
          Operational control centre for transport companies — {CURRENT_ROUTE_COUNT} current routes covering navigation, access, forms, record details, operational decisions, and safety investigations.
        </Text>
      </Stack>

      <DisplaySettingsPanel settings={uiSettings} onChange={setUiSettings} />

      <PagePreviewPanel
        preview={preview}
        onPreviewChange={setPreview}
        sidebarCollapsed={sidebarCollapsed}
        onSidebarChange={setSidebarCollapsed}
        uiSettings={uiSettings}
      />

      <Card>
        <CardHeader trailing={<Pill active>{CURRENT_ROUTE_COUNT} routes</Pill>}>Product boundary</CardHeader>
        <CardBody>
          <Grid columns={2} gap={16}>
            <Stack gap={6}>
              <Text weight="semibold">Veyvio Command owns</Text>
              <Text tone="tertiary" size="small">Login, URL, deployment, navigation, permissions, release cycle</Text>
              <Text tone="tertiary" size="small">Operational workflows, company/depot config, audit, notifications, reporting</Text>
            </Stack>
            <Stack gap={6}>
              <Text weight="semibold">Connects via shared APIs to</Text>
              <Text tone="tertiary" size="small">Veyvio Driver · Veyvio Yard · Veyvio Customer</Text>
              <Text tone="tertiary" size="small">Must not depend on their frontends · strict multi-company tenancy</Text>
            </Stack>
          </Grid>
        </CardBody>
      </Card>

      <Stack gap={10}>
        <H2>Platform structure</H2>
        <PlatformTree />
      </Stack>

      <Stack gap={10}>
        <H2>Brand identity</H2>
        <Grid columns={2} gap={16}>
          <Card>
            <CardHeader>Wordmark</CardHeader>
            <CardBody>
              <div style={{ padding: 28, borderRadius: 6, background: BRAND.midnight, display: "flex", justifyContent: "center" }}>
                <CommandWordmark />
              </div>
              <Text tone="tertiary" size="small" style={{ marginTop: 12 }}>VEYVIO · COMMAND in Veyvio Blue — distinct from Driver (sky) and Yard (teal).</Text>
            </CardBody>
          </Card>
          <Card>
            <CardHeader>Layout</CardHeader>
            <CardBody>
              <Text tone="tertiary" size="small" style={{ fontFamily: "monospace", lineHeight: 1.6 }}>
                Top bar: Search | Company | Depot | Date | Alerts | Profile{"\n"}
                Sidebar: grouped navigation (8 sections){"\n"}
                Content: operational headline + one primary action + dense tables/cards
              </Text>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Design tokens</H2>
        <Card>
          <CardBody>
            <Grid columns={2} gap={16}>
              <Stack gap={10}>
                <TokenSwatch name="Veyvio Midnight" hex={BRAND.midnight} usage="Sidebar, sign-in, primary buttons" />
                <TokenSwatch name="Veyvio Blue" hex={BRAND.commandBlue} usage="COMMAND wordmark, active nav, links" />
              </Stack>
              <Stack gap={10}>
                <TokenSwatch name="Ready" hex={BRAND.ok} usage="On time, compliant, live" />
                <TokenSwatch name="Attention / Critical / VOR" hex={BRAND.vor} usage="Exceptions — always labelled" />
              </Stack>
            </Grid>
          </CardBody>
        </Card>
      </Stack>

      <Stack gap={10}>
        <H2>Navigation and top bar</H2>
        <Text tone="tertiary" size="small">
          Persistent operational chrome keeps company, depot, shift, search, sync state, exceptions and user context visible on every Command screen.
        </Text>
        <Stack gap={16}>
          <Card>
            <CardHeader trailing={<Pill active>Expanded</Pill>}>Full sidebar</CardHeader>
            <CardBody style={{ padding: 0, overflow: "hidden" }}>
              <BrowserFrame url="command.veyvio.app/exceptions">
                <CommandPage pageId="exceptions" collapsed={false} onNavigate={setPreview} uiSettings={uiSettings} />
              </BrowserFrame>
            </CardBody>
          </Card>
          <Card>
            <CardHeader trailing={<Pill>Collapsed rail</Pill>}>Narrow mode</CardHeader>
            <CardBody style={{ padding: 0, overflow: "hidden" }}>
              <BrowserFrame url="command.veyvio.app/exceptions">
                <CommandPage pageId="exceptions" collapsed onNavigate={setPreview} uiSettings={uiSettings} />
              </BrowserFrame>
            </CardBody>
          </Card>
        </Stack>
        <Card>
          <CardHeader trailing={<Pill active>Persistent</Pill>}>Operational top bar</CardHeader>
          <CardBody style={{ padding: 0, overflow: "hidden" }}>
            <CommandTopBar ui={previewUi} />
            <div style={{ padding: 14, background: BRAND.pageBg }}>
              <Text tone="tertiary" size="small">Global search · operational date and shift · sync freshness · alerts · signed-in user. Company and depot scope stay in the sidebar selector.</Text>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>Application chrome rules</CardHeader>
          <CardBody>
            <Grid columns={3} gap={16}>
              <Stack gap={6}>
                <Text weight="semibold">Navigation</Text>
                <Text tone="tertiary" size="small">Wordmark + company/depot context at top</Text>
                <Text tone="tertiary" size="small">8 grouped sections · expand active group + Command</Text>
                <Text tone="tertiary" size="small">User profile and collapse control at bottom</Text>
              </Stack>
              <Stack gap={6}>
                <Text weight="semibold">Operational signals</Text>
                <Text tone="tertiary" size="small">Badge counts on Exceptions, Notifications, Dispatch, checks, defects</Text>
                <Text tone="tertiary" size="small">Amber for attention · red for 5+ open items</Text>
                <Text tone="tertiary" size="small">Active item: blue left bar + tinted fill — never colour alone</Text>
              </Stack>
              <Stack gap={6}>
                <Text weight="semibold">Top bar</Text>
                <Text tone="tertiary" size="small">Search resolves vehicles, duties, people and records</Text>
                <Text tone="tertiary" size="small">Date, shift and depot remain visible during decisions</Text>
                <Text tone="tertiary" size="small">Sync freshness is explicit; “Live” is never assumed</Text>
              </Stack>
            </Grid>
          </CardBody>
        </Card>
      </Stack>

      <Stack gap={10}>
        <H2>Sign in</H2>
        <Card>
          <CardBody style={{ padding: 0 }}>
            <BrowserFrame url="command.veyvio.app/login">
              <SignInScreen />
            </BrowserFrame>
          </CardBody>
        </Card>
      </Stack>

      <RouteDirectory />

      <Stack gap={10}>
        <Row gap={10} align="center" wrap>
          <div>
            <H2>Full-page catalogue</H2>
            <Text tone="tertiary" size="small" style={{ marginTop: 4 }}>
              Every route is shown as a complete, readable Command screen. Expand a group to review each page at the same scale as the page browser.
            </Text>
          </div>
          <Spacer />
          <Pill active>{ALL_PAGES.length + WORKFLOW_PAGES.length + ROADMAP_PAGES.length + SYSTEM_PAGES.length} full screens</Pill>
        </Row>
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <LazyCatalogueSection id={pageId(group.title)} title={group.title} count={group.items.length} description={GROUP_PURPOSE[group.title]} defaultOpen={group.title === "Command"}>
              {group.items.map((label) => {
                const id = pageId(label);
                const path = PRIMARY_PATH_OVERRIDES[id] ?? id;
                return <div key={id}><FullPagePreview id={id} label={label} path={path} uiSettings={uiSettings} /></div>;
              })}
            </LazyCatalogueSection>
          </div>
        ))}
        {WORKFLOW_GROUPS.map((group) => {
          const pages = WORKFLOW_PAGES.filter((page) => page.group === group);
          return (
            <div key={group}>
              <LazyCatalogueSection id={pageId(group)} title={group} count={pages.length} description="Full create, edit, detail, onboarding and operational decision screens.">
                {pages.map((page) => (
                  <div key={page.id}><FullPagePreview id={page.id} label={page.label} path={page.path} uiSettings={uiSettings} /></div>
                ))}
              </LazyCatalogueSection>
            </div>
          );
        })}
        <Divider />
        <Row gap={10} align="center" wrap>
          <div>
            <H3>Proposed roadmap pages</H3>
            <Text tone="tertiary" size="small">Complete Command-shell designs for all {ROADMAP_PAGES.length} proposed routes. These remain outside the current {CURRENT_ROUTE_COUNT}-route contract.</Text>
          </div>
          <Spacer />
          <Pill active>{ROADMAP_PAGES.length} new designs</Pill>
        </Row>
        {ROUTE_ROADMAP.map((phase, index) => {
          const pages = ROADMAP_PAGES.filter((page) => page.phase === phase.phase);
          return (
            <div key={`preview-${phase.phase}`}>
              <LazyCatalogueSection id={`roadmap-${index}`} title={phase.phase} count={pages.length} description={phase.outcome} defaultOpen={index === 0}>
                {pages.map((page) => (
                  <div key={page.id}><FullPagePreview id={page.id} label={page.label} path={page.path} uiSettings={uiSettings} /></div>
                ))}
              </LazyCatalogueSection>
            </div>
          );
        })}
        <div>
          <LazyCatalogueSection id="system-states" title="System states" count={SYSTEM_PAGES.length} description="Full-size access, session, tenant and concealed-record outcomes outside the product-page count.">
            {SYSTEM_PAGES.map((page) => (
              <div key={page.id}><FullPagePreview id={page.id} label={page.label} path={page.path} uiSettings={uiSettings} /></div>
            ))}
          </LazyCatalogueSection>
        </div>
      </Stack>

      <Stack gap={10}>
        <H2>Transport terminology</H2>
        <Table
          headers={["Term", "Definition", "Example"]}
          rows={[
            ["Booking", "Commercial or operational transport request", "Rykairo home to school Mon–Fri"],
            ["Trip", "One passenger movement pickup to drop-off", "Home to school, Monday morning"],
            ["Run", "Ordered trips allocated to driver and vehicle", "School Run AM-104"],
            ["Duty", "Driver's complete working period", "Collection, checks, runs, breaks, debrief"],
          ]}
        />
      </Stack>

      <Stack gap={10}>
        <H2>Key modules</H2>
        <Grid columns={2} gap={16}>
          <CollapsibleSection title="Dispatch workspace" defaultOpen>
            <Text tone="tertiary" size="small">Unassigned work · run board · map + exceptions + assignment validation (blocker / override / warning / info).</Text>
          </CollapsibleSection>
          <CollapsibleSection title="Live Operations" defaultOpen={false}>
            <Text tone="tertiary" size="small">Monitors underway work — GPS freshness, route adherence, operational drawer per vehicle.</Text>
          </CollapsibleSection>
          <CollapsibleSection title="Yard integration" defaultOpen={false}>
            <Text tone="tertiary" size="small">Command supervises Yard — defect path: driver report → platform → dispatch + yard → VOR → RTS.</Text>
          </CollapsibleSection>
          <CollapsibleSection title="Compliance rules" defaultOpen={false}>
            <Text tone="tertiary" size="small">Configurable per company · rule results stored at decision time.</Text>
          </CollapsibleSection>
        </Grid>
      </Stack>

      <Stack gap={10}>
        <H2>Roles and build order</H2>
        <TodoListCard todos={BUILD_PHASES} />
        <Text tone="tertiary" size="small">First sequence: Auth → company/depot → shell → permissions → Overview → Exceptions → Bookings → Dispatch + Live Operations</Text>
      </Stack>

      <Card>
        <CardHeader>Command vs Driver vs Yard</CardHeader>
        <CardBody>
          <Table
            headers={["", "Veyvio Command", "Veyvio Driver", "Veyvio Yard"]}
            rows={[
              ["URL", "command.veyvio.app", "Driver mobile app", "Yard mobile/tablet"],
              ["User", "Dispatcher, ops manager", "Driver on shift", "Yard operative"],
              ["Job", "Plan, assign, monitor, escalate", "Execute duty and trips", "Physical yard workflow"],
              ["Accent", "Veyvio Blue · COMMAND", "Driver Sky · DRIVER", "Yard Teal · YARD"],
            ]}
          />
        </CardBody>
      </Card>
    </Stack>
  );
}
