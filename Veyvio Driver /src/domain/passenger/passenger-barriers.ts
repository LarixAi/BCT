/** Passenger-centred journey training — barriers perspectives (CTauk-aligned). */

export type BarrierCategory = "attitude" | "environment" | "policy";

export interface BarrierPerspective {
  id: string;
  name: string;
  role: "passenger" | "parent_carer";
  /** Links to operational passenger profile when applicable */
  linkedProfileId?: string;
  quote: string;
  barrierCategories: BarrierCategory[];
  driverTakeaway: string;
}

export const BARRIER_CATEGORY_LABELS: Record<BarrierCategory, string> = {
  attitude: "Attitudes",
  environment: "Physical environment",
  policy: "Policies and procedures",
};

export const BARRIERS_INTRO =
  "Passengers can face barriers that affect their journeys — attitudes, the physical environment, and policies. These often have a greater impact than the impairment itself.";

export const BARRIER_PERSPECTIVES: BarrierPerspective[] = [
  {
    id: "perspective_bethany",
    name: "Bethany",
    role: "parent_carer",
    quote:
      "Oscar can get distressed if there is a small change to the journey. One time there was a new passenger assistant who he hadn't met before. It took longer than the allocated pick up time of three minutes for me to calm him down so the bus had to leave without him.",
    barrierCategories: ["policy", "attitude"],
    driverTakeaway:
      "Allow time when routines change. A new assistant or a distressed passenger is not a three-minute problem — call operations before leaving without the passenger.",
  },
  {
    id: "perspective_dalvinder",
    name: "Dalvinder",
    role: "passenger",
    linkedProfileId: "pax_dalvinder",
    quote:
      "Some drivers don't realise that I can't see them waving or pointing where to go. They get annoyed or impatient when I need to be guided or given some verbal directions.",
    barrierCategories: ["attitude"],
    driverTakeaway:
      "Introduce yourself and use clear verbal guidance. Do not rely on gestures, pointing, or waving — patience at pickup prevents a difficult journey.",
  },
  {
    id: "perspective_mark",
    name: "Mark",
    role: "passenger",
    linkedProfileId: "pax_mark",
    quote:
      "I can get really tired and anxious when I don't know what's going on. Sometimes the driver doesn't even talk to me. They only talk to the person I'm with. It makes me feel invisible.",
    barrierCategories: ["attitude"],
    driverTakeaway:
      "Speak directly to Mark using simple language. Explain what is happening next — do not communicate only through an escort or support worker.",
  },
  {
    id: "perspective_siobhan",
    name: "Siobhan",
    role: "passenger",
    linkedProfileId: "pax_siobhan",
    quote:
      "Sometimes I might be much more comfortable using the passenger lift. But because drivers know that I can use the steps, it feels like it's a big inconvenience to them when I ask.",
    barrierCategories: ["attitude", "environment"],
    driverTakeaway:
      "Ask Siobhan how she wants to board today. Deploy the lift when requested — ability to use steps does not mean steps are the right choice.",
  },
];

export function getBarrierPerspective(id: string): BarrierPerspective | null {
  return BARRIER_PERSPECTIVES.find((item) => item.id === id) ?? null;
}

export function getBarrierPerspectiveForProfile(profileId: string): BarrierPerspective | null {
  return BARRIER_PERSPECTIVES.find((item) => item.linkedProfileId === profileId) ?? null;
}

/** @deprecated Migrated to useTrainingStore — read once for legacy localStorage */
export const BARRIER_TRAINING_STORAGE_KEY = "veyvio.training.barriers.viewed";

export function loadLegacyViewedBarrierIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BARRIER_TRAINING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}
