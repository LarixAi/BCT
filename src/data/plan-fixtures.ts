import type { OperationalDayPlan } from "@/types/plan";

/** Tomorrow's published operational day plan for North Bolton (demo). */
export function buildDemoOperationalPlan(
  companyId: string,
  depotId: string,
  operationalDate = nextOperationalDate(),
): OperationalDayPlan {
  return {
    id: `plan_${depotId}_${operationalDate.replace(/-/g, "")}_v1`,
    companyId,
    depotId,
    operationalDate,
    version: 1,
    status: "published",
    publishedAt: new Date().toISOString(),
    publishedBy: "Dispatch · Admin",
    notes: "School morning peak — stage WAV and SEND first.",
    duties: [
      {
        dutyId: "duty_r420",
        reference: "R420",
        startTime: "06:15",
        routeName: "St. Jude's",
        driverId: "d1",
        driverName: "Thompson, R.",
        vehicleId: "v3",
        vehicleReg: "MX72 BVK",
      },
      {
        dutyId: "duty_r115",
        reference: "R115",
        startTime: "06:20",
        routeName: "Airport X",
        vehicleId: "v4",
        vehicleReg: "LG21 YPT",
      },
      {
        dutyId: "duty_r088",
        reference: "R088",
        startTime: "06:25",
        routeName: "North Circular",
        driverId: "d2",
        driverName: "Davies, M.",
        vehicleId: "v5",
        vehicleReg: "BT69 PLX",
      },
      {
        dutyId: "duty_r512",
        reference: "R512",
        startTime: "07:10",
        routeName: "Meadow SEND",
        driverId: "d3",
        driverName: "Ahmed, S.",
        vehicleId: "v1",
        vehicleReg: "SK23 FGH",
      },
      {
        dutyId: "duty_r204",
        reference: "R204",
        startTime: "07:30",
        routeName: "Adult Day Care",
        driverId: "d5",
        driverName: "O'Connor, P.",
        vehicleId: "v8",
        vehicleReg: "BU19 HJK",
      },
    ],
    staging: [
      {
        sequence: 1,
        vehicleId: "v3",
        vehicleReg: "MX72 BVK",
        dutyId: "duty_r420",
        tripCode: "R420",
        departAt: "06:15",
        targetBayId: "D01",
        instructions: "WAV first — confirm ramp and harness kit",
      },
      {
        sequence: 2,
        vehicleId: "v4",
        vehicleReg: "LG21 YPT",
        dutyId: "duty_r115",
        tripCode: "R115",
        departAt: "06:20",
        targetBayId: "D02",
        instructions: "Fuel before stage — currently low",
      },
      {
        sequence: 3,
        vehicleId: "v5",
        vehicleReg: "BT69 PLX",
        dutyId: "duty_r088",
        tripCode: "R088",
        departAt: "06:25",
        targetBayId: "D03",
      },
      {
        sequence: 4,
        vehicleId: "v1",
        vehicleReg: "SK23 FGH",
        dutyId: "duty_r512",
        tripCode: "R512",
        departAt: "07:10",
        targetBayId: "D04",
        instructions: "SEND — check booster seats",
      },
      {
        sequence: 5,
        vehicleId: "v8",
        vehicleReg: "BU19 HJK",
        dutyId: "duty_r204",
        tripCode: "R204",
        departAt: "07:30",
        targetBayId: "D05",
      },
    ],
  };
}

function nextOperationalDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
