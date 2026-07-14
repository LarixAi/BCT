import type { BodyZone, CaptureSlot, CaptureTemplateKey } from "@/types/condition";
import type { VehicleType } from "@/types/yard";

const MINIBUS_ZONES: BodyZone[] = [
  { id: "front-bumper", label: "Front bumper", diagramKey: "front-bumper" },
  { id: "bonnet", label: "Bonnet", diagramKey: "bonnet" },
  { id: "windscreen", label: "Windscreen", diagramKey: "windscreen" },
  { id: "ns-front-wing", label: "Nearside front wing", diagramKey: "ns-front" },
  { id: "ns-front-door", label: "Nearside front door", diagramKey: "ns-mid-front" },
  { id: "ns-sliding-door", label: "Nearside sliding door", diagramKey: "ns-mid" },
  { id: "ns-rear-quarter", label: "Nearside rear quarter", diagramKey: "ns-rear" },
  { id: "rear-door", label: "Rear door", diagramKey: "rear" },
  { id: "rear-bumper", label: "Rear bumper", diagramKey: "rear-bumper" },
  { id: "os-rear-quarter", label: "Offside rear quarter", diagramKey: "os-rear" },
  { id: "os-sliding-door", label: "Offside sliding door", diagramKey: "os-mid" },
  { id: "os-front-door", label: "Offside front door", diagramKey: "os-mid-front" },
  { id: "os-front-wing", label: "Offside front wing", diagramKey: "os-front" },
  { id: "roof", label: "Roof", diagramKey: "roof" },
  { id: "ns-mirror", label: "Nearside mirror", diagramKey: "ns-mirror" },
  { id: "os-mirror", label: "Offside mirror", diagramKey: "os-mirror" },
  { id: "ns-sill", label: "Nearside sill", diagramKey: "ns-sill" },
  { id: "os-sill", label: "Offside sill", diagramKey: "os-sill" },
  { id: "wheels-tyres", label: "Wheels & tyres", diagramKey: "wheels" },
  { id: "lights", label: "Exterior lights", diagramKey: "lights" },
  { id: "reg-plates", label: "Registration plates", diagramKey: "plates" },
  { id: "wheelchair-door", label: "Wheelchair access door", diagramKey: "wav-door" },
  { id: "wheelchair-lift", label: "Wheelchair lift / ramp", diagramKey: "wav-lift" },
  { id: "interior", label: "Passenger interior", diagramKey: "interior" },
];

const COACH_ZONES: BodyZone[] = [
  ...MINIBUS_ZONES.filter(z => !z.id.startsWith("wheelchair")),
  { id: "luggage-bay", label: "Luggage bay doors", diagramKey: "luggage" },
];

const WAV_ZONES: BodyZone[] = MINIBUS_ZONES;

const LOW_FLOOR_ZONES: BodyZone[] = MINIBUS_ZONES.filter(z => z.id !== "ns-sliding-door" && z.id !== "os-sliding-door");

const ZONE_BY_TYPE: Record<VehicleType, BodyZone[]> = {
  Minibus: MINIBUS_ZONES,
  Coach: COACH_ZONES,
  WAV: WAV_ZONES,
  "Low-floor": LOW_FLOOR_ZONES,
};

export function getBodyZones(vehicleType: VehicleType): BodyZone[] {
  return ZONE_BY_TYPE[vehicleType] ?? MINIBUS_ZONES;
}

export function getBodyZone(vehicleType: VehicleType, zoneId: string): BodyZone | undefined {
  return getBodyZones(vehicleType).find(z => z.id === zoneId);
}

function exteriorSlots(vehicleType: VehicleType): CaptureSlot[] {
  const base: CaptureSlot[] = [
    { id: "front-full", label: "Front full view", required: true, kind: "exterior" },
    { id: "front-ns-corner", label: "Front nearside corner", zoneId: "ns-front-wing", required: true, kind: "exterior" },
    { id: "ns-front", label: "Nearside front section", zoneId: "ns-front-door", required: true, kind: "exterior" },
    { id: "ns-centre", label: "Nearside centre section", zoneId: "ns-sliding-door", required: vehicleType !== "Low-floor", kind: "exterior" },
    { id: "ns-rear", label: "Nearside rear section", zoneId: "ns-rear-quarter", required: true, kind: "exterior" },
    { id: "rear-ns-corner", label: "Rear nearside corner", zoneId: "rear-bumper", required: true, kind: "exterior" },
    { id: "rear-full", label: "Rear full view", zoneId: "rear-door", required: true, kind: "exterior" },
    { id: "rear-os-corner", label: "Rear offside corner", required: true, kind: "exterior" },
    { id: "os-rear", label: "Offside rear section", zoneId: "os-rear-quarter", required: true, kind: "exterior" },
    { id: "os-centre", label: "Offside centre section", zoneId: "os-sliding-door", required: vehicleType !== "Low-floor", kind: "exterior" },
    { id: "os-front", label: "Offside front section", zoneId: "os-front-door", required: true, kind: "exterior" },
    { id: "front-os-corner", label: "Front offside corner", zoneId: "os-front-wing", required: true, kind: "exterior" },
    { id: "windscreen", label: "Windscreen", zoneId: "windscreen", required: true, kind: "exterior" },
    { id: "wheels-front", label: "Front wheels & tyres", zoneId: "wheels-tyres", required: true, kind: "exterior" },
    { id: "wheels-rear", label: "Rear wheels & tyres", zoneId: "wheels-tyres", required: true, kind: "exterior" },
    { id: "doors-access", label: "Doors & access points", required: true, kind: "exterior" },
    { id: "mirrors", label: "Mirrors", zoneId: "ns-mirror", required: true, kind: "exterior" },
    { id: "lights", label: "Exterior lights", zoneId: "lights", required: true, kind: "exterior" },
    { id: "reg-plates", label: "Registration plates", zoneId: "reg-plates", required: true, kind: "exterior" },
  ];
  if (vehicleType === "WAV" || vehicleType === "Low-floor") {
    base.push(
      { id: "wav-door", label: "Wheelchair access door", zoneId: "wheelchair-door", required: true, kind: "equipment" },
      { id: "wav-lift", label: "Wheelchair lift or ramp", zoneId: "wheelchair-lift", required: true, kind: "equipment" },
    );
  }
  base.push(
    { id: "interior", label: "Passenger interior", zoneId: "interior", required: true, kind: "interior" },
    { id: "walkaround-video", label: "Guided walkaround video", required: false, kind: "video" },
  );
  return base;
}

export function getCaptureTemplate(vehicleType: VehicleType, template: "onboarding-baseline" | "standard"): CaptureSlot[] {
  const slots = exteriorSlots(vehicleType);
  if (template === "onboarding-baseline") {
    return slots.map(s => ({
      ...s,
      required: s.kind === "video" ? true : s.required,
    }));
  }
  return slots.filter(s => s.required);
}

export const VIDEO_WALKAROUND_INSTRUCTION =
  "Start at the front registration plate and walk slowly clockwise around the vehicle. Keep the full side visible and pause briefly at each corner.";
