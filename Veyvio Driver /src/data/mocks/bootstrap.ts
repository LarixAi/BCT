import type { DriverHomeSummary } from "@/types/home";
import type { TripsSchedulePayload } from "@/types/trips";
import type { VehicleChecksHome } from "@/types/vehicle-check";
import { buildMockHomeSummary } from "@/data/mocks/home-summary";
import { buildMockTripsSchedule } from "@/data/mocks/trips-schedule";
import { buildMockVehicleChecksHome } from "@/data/mocks/vehicle-check";
import { buildMockMessagesInbox } from "@/data/mocks/messages-inbox";
import { MOCK_DUTIES } from "@/data/mocks/duties";
import type { MessagesInboxPayload } from "@/types/messages";
import type { DriverMorePayload } from "@/types/more";
import { buildMockDriverMore } from "@/data/mocks/driver-more";

export const BOOTSTRAP_SCHEMA_VERSION = 6;

export function buildBootstrapPayload(
  companyId: string,
  depotId: string,
  driverId: string,
): BootstrapPayload {
  return {
    companyId,
    depotId,
    driverId,
    syncedAt: new Date().toISOString(),
    schemaVersion: BOOTSTRAP_SCHEMA_VERSION,
    duties: MOCK_DUTIES,
    homeSummary: buildMockHomeSummary(),
    tripsSchedule: buildMockTripsSchedule(),
    vehicleChecksHome: buildMockVehicleChecksHome(),
    messagesInbox: buildMockMessagesInbox(),
    driverMore: buildMockDriverMore(),
    messages: [
      {
        id: "msg_1",
        subject: "Route 104 entrance changed",
        body: "Use the rear vehicle entrance at Oakfield School today.",
        read: false,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    documentWarnings: [
      {
        id: "doc_cpc",
        title: "Driver qualification card",
        expiresAt: new Date(Date.now() + 21 * 86400000).toISOString(),
        severity: "warn",
      },
    ],
  };
}

export interface BootstrapPayload {
  companyId: string;
  depotId: string;
  driverId: string;
  syncedAt: string;
  schemaVersion: number;
  duties: typeof MOCK_DUTIES;
  homeSummary: DriverHomeSummary;
  tripsSchedule: TripsSchedulePayload;
  vehicleChecksHome: VehicleChecksHome;
  messagesInbox: MessagesInboxPayload;
  driverMore: DriverMorePayload;
  messages: { id: string; subject: string; body: string; read: boolean; createdAt: string }[];
  documentWarnings: { id: string; title: string; expiresAt: string; severity: "warn" | "critical" }[];
}
