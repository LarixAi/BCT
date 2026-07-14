import type {
  Bay,
  Defect,
  Driver,
  Movement,
  Trip,
  Vehicle,
  VorCase,
  YardCheckResult,
} from "@/types/yard";

// Depot: North Bolton (B3). Shift 04:00–14:00. User J. Miller.

export const DEPOT = { code: "B3", name: "North Bolton" } as const;
export const SHIFT = { window: "04:00 — 14:00", user: "J. Miller" } as const;

export const bays: Bay[] = [
  ...(["A01","A02","A03","A04","A05","A06","A07","A08"].map(id => ({ id, zone: "Parking" as const }))),
  ...(["B01","B02","B03","B04","B05","B06"].map(id => ({ id, zone: "Parking" as const }))),
  { id: "W01", zone: "Wash" },
  { id: "W02", zone: "Wash" },
  { id: "F01", zone: "Fuel" },
  { id: "F02", zone: "Fuel" },
  { id: "I01", zone: "Inspection" },
  { id: "I02", zone: "Inspection" },
  { id: "S01", zone: "Workshop" },
  { id: "S02", zone: "Workshop" },
  { id: "S03", zone: "Workshop" },
  { id: "D01", zone: "Departure Line" },
  { id: "D02", zone: "Departure Line" },
  { id: "D03", zone: "Departure Line" },
  { id: "D04", zone: "Departure Line" },
  { id: "D05", zone: "Departure Line" },
  { id: "D06", zone: "Departure Line" },
  { id: "OFF", zone: "Off-site" },
];

export const drivers: Driver[] = [
  { id: "d1", name: "Thompson, R.", compliant: true },
  { id: "d2", name: "Davies, M.", compliant: true },
  { id: "d3", name: "Ahmed, S.", compliant: true },
  { id: "d4", name: "Nguyen, T.", compliant: true },
  { id: "d5", name: "O'Connor, P.", compliant: true },
  { id: "d6", name: "Patel, K.", compliant: true },
  { id: "d7", name: "Kowalski, J.", compliant: false },
  { id: "d8", name: "Bello, A.", compliant: true },
];

export const vehicles: Vehicle[] = [
  { id: "v1",  reg: "SK23 FGH", type: "Coach",     bayId: "A01", status: "Available",       fuelPct: 82, lastCheckAt: "2026-07-11T04:12:00Z", lastCheckPassed: true },
  { id: "v2",  reg: "WP19 KLD", type: "Minibus",   bayId: "S01", status: "VOR",             fuelPct: 44, lastCheckAt: "2026-07-10T05:02:00Z", lastCheckPassed: false, notes: "Brake pressure low" },
  { id: "v3",  reg: "MX72 BVK", type: "WAV",       bayId: "D01", status: "On Departure Line", fuelPct: 91, lastCheckAt: "2026-07-11T04:20:00Z", lastCheckPassed: true },
  { id: "v4",  reg: "LG21 YPT", type: "Minibus",   bayId: "D02", status: "On Departure Line", fuelPct: 12, lastCheckAt: "2026-07-11T04:31:00Z", lastCheckPassed: true },
  { id: "v5",  reg: "BT69 PLX", type: "Coach",     bayId: "D03", status: "On Departure Line", fuelPct: 78, lastCheckAt: "2026-07-11T04:44:00Z", lastCheckPassed: true },
  { id: "v6",  reg: "RX70 FLS", type: "Coach",     bayId: "S02", status: "VOR",             fuelPct: 60, notes: "Awaiting parts — brake line" },
  { id: "v7",  reg: "YN22 ZTM", type: "Low-floor", bayId: "W01", status: "Awaiting Check",  fuelPct: 55 },
  { id: "v8",  reg: "BU19 HJK", type: "Minibus",   bayId: "A02", status: "Available",       fuelPct: 74, lastCheckAt: "2026-07-11T04:02:00Z", lastCheckPassed: true },
  { id: "v9",  reg: "FH24 NLM", type: "Coach",     bayId: "A03", status: "Available",       fuelPct: 66 },
  { id: "v10", reg: "GJ21 QRS", type: "WAV",       bayId: "A04", status: "Available",       fuelPct: 88 },
  { id: "v11", reg: "PL20 XCV", type: "Minibus",   bayId: "A05", status: "Awaiting Check",  fuelPct: 42 },
  { id: "v12", reg: "MN18 BNM", type: "Coach",     bayId: "B01", status: "Available",       fuelPct: 71 },
  { id: "v13", reg: "OK22 QAZ", type: "Low-floor", bayId: "B02", status: "Available",       fuelPct: 90 },
  { id: "v14", reg: "TG19 WSX", type: "Minibus",   bayId: "B03", status: "Awaiting Check",  fuelPct: 38 },
  { id: "v15", reg: "HD23 RFV", type: "WAV",       bayId: "F01", status: "Awaiting Check",  fuelPct: 22 },
  { id: "v16", reg: "AB70 CDE", type: "Minibus",   bayId: "I01", status: "Awaiting Check",  fuelPct: 51 },
  { id: "v17", reg: "SH68 MVY", type: "Coach",     bayId: "A06", status: "Available",       fuelPct: 63 },
  { id: "v18", reg: "KO21 LMN", type: "WAV",       bayId: "A07", status: "Available",       fuelPct: 77 },
  { id: "v19", reg: "PR22 UVW", type: "Low-floor", bayId: "A08", status: "Available",       fuelPct: 84 },
  { id: "v20", reg: "FT24 GHJ", type: "Minibus",   bayId: "B04", status: "Available",       fuelPct: 69 },
  { id: "v21", reg: "DE23 ZXC", type: "Coach",     bayId: "S03", status: "In Workshop",     fuelPct: 30, notes: "Scheduled 30k service" },
  { id: "v22", reg: "OP20 IUY", type: "Low-floor", bayId: "OFF", status: "Off-site",        fuelPct: 55 },
];

export const trips: Trip[] = [
  { id: "t1", code: "R420", service: "St. Jude's",     departAt: "06:15", vehicleId: "v3", driverId: "d1", ready: true,  blockers: [] },
  { id: "t2", code: "R115", service: "Airport X",      departAt: "06:20", vehicleId: "v4", driverId: undefined, ready: false, blockers: ["No driver","Fuel low"] },
  { id: "t3", code: "R088", service: "North Circular", departAt: "06:25", vehicleId: "v5", driverId: "d2", ready: true,  blockers: [] },
  { id: "t4", code: "R512", service: "Meadow SEND",    departAt: "07:10", vehicleId: undefined, driverId: "d3", ready: false, blockers: ["Not on departure line"] },
  { id: "t5", code: "R204", service: "Adult Day Care", departAt: "07:30", vehicleId: undefined, driverId: "d5", ready: false, blockers: ["Not on departure line"] },
  { id: "t6", code: "R331", service: "Bolton Boys HS", departAt: "07:45", vehicleId: undefined, driverId: undefined,  ready: false, blockers: ["Not on departure line","No driver"] },
];

export const defects: Defect[] = [
  { id: "df1", vehicleId: "v2", category: "Brakes", severity: "Safety-critical", notes: "Brake pressure warning on start-up.", raisedAt: "2026-07-10T05:04:00Z", raisedBy: "J. Miller", resolved: false, vorCaseId: "vor1" },
  { id: "df2", vehicleId: "v6", category: "Brakes", severity: "Safety-critical", notes: "Air leak on rear brake line.", raisedAt: "2026-07-09T13:11:00Z", raisedBy: "S. Ahmed", resolved: false, vorCaseId: "vor2" },
  { id: "df3", vehicleId: "v11", category: "Lights", severity: "Minor", notes: "Nearside indicator intermittent.", raisedAt: "2026-07-11T03:44:00Z", raisedBy: "J. Miller", resolved: false },
  { id: "df4", vehicleId: "v15", category: "Tyres", severity: "Major", notes: "Offside front tyre near tread limit.", raisedAt: "2026-07-11T03:58:00Z", raisedBy: "J. Miller", resolved: false },
];

export const vorCases: VorCase[] = [
  {
    id: "vor1", vehicleId: "v2", defectId: "df1", lifecycle: "Confirmed",
    reason: "Brake pressure low", openedAt: "2026-07-10T05:06:00Z",
    history: [
      { at: "2026-07-10T05:06:00Z", by: "J. Miller", from: null, to: "Potential" },
      { at: "2026-07-10T05:24:00Z", by: "T. Manager", from: "Potential", to: "Awaiting Triage" },
      { at: "2026-07-10T06:02:00Z", by: "M. Fitter", from: "Awaiting Triage", to: "Confirmed", note: "Confirmed low pressure at master cylinder." },
    ],
  },
  {
    id: "vor2", vehicleId: "v6", defectId: "df2", lifecycle: "Awaiting Recovery",
    reason: "Air leak on rear brake line", openedAt: "2026-07-09T13:14:00Z",
    history: [
      { at: "2026-07-09T13:14:00Z", by: "S. Ahmed", from: null, to: "Potential" },
      { at: "2026-07-09T13:40:00Z", by: "T. Manager", from: "Potential", to: "Awaiting Triage" },
      { at: "2026-07-09T14:22:00Z", by: "M. Fitter", from: "Awaiting Triage", to: "Confirmed" },
      { at: "2026-07-09T15:00:00Z", by: "T. Manager", from: "Confirmed", to: "Awaiting Recovery", note: "Parts ordered." },
    ],
  },
];

export const movements: Movement[] = [
  { id: "m1", vehicleId: "v3", fromBayId: "A09", toBayId: "D01", reason: "Move to departure line", at: "2026-07-11T05:12:00Z", by: "J. Miller" },
  { id: "m2", vehicleId: "v4", fromBayId: "F01", toBayId: "D02", reason: "Move to departure line", at: "2026-07-11T05:18:00Z", by: "J. Miller" },
  { id: "m3", vehicleId: "v5", fromBayId: "W01", toBayId: "D03", reason: "Move to departure line", at: "2026-07-11T05:24:00Z", by: "J. Miller" },
  { id: "m4", vehicleId: "v15", fromBayId: "A10", toBayId: "F01", reason: "Move to fuel", at: "2026-07-11T04:40:00Z", by: "J. Miller" },
  { id: "m5", vehicleId: "v2", fromBayId: "A11", toBayId: "S01", reason: "Move to workshop", at: "2026-07-10T05:30:00Z", by: "T. Manager" },
];

export const yardChecks: YardCheckResult[] = [];
