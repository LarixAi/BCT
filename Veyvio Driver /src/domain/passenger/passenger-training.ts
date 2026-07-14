/** Passenger-centred journey training content and module registry. */

import type { BarrierPerspective } from "@/domain/passenger/passenger-barriers";

export type { BarrierCategory, BarrierPerspective } from "@/domain/passenger/passenger-barriers";
export {
  BARRIER_CATEGORY_LABELS,
  BARRIER_PERSPECTIVES,
  BARRIERS_INTRO,
  getBarrierPerspective,
  getBarrierPerspectiveForProfile,
} from "@/domain/passenger/passenger-barriers";

export type PcjTrainingModuleId = "barriers" | "angie_bad_journey" | "say_or_do";

export interface PcjTrainingModule {
  id: PcjTrainingModuleId;
  title: string;
  description: string;
  href: "/more/training/barriers-to-transport" | "/more/training/angie-bad-journey" | "/more/training/say-or-do";
  totalSteps: number;
}

export const PCJ_TRAINING_MODULES: PcjTrainingModule[] = [
  {
    id: "barriers",
    title: "Barriers to transport",
    description: "Hear from Bethany, Dalvinder, Mark, and Siobhan — and what to do on shift.",
    href: "/more/training/barriers-to-transport",
    totalSteps: 4,
  },
  {
    id: "angie_bad_journey",
    title: "Angie's perspective — a difficult journey",
    description: "What went wrong when Annie the assistance dog was treated as a pet.",
    href: "/more/training/angie-bad-journey",
    totalSteps: 1,
  },
  {
    id: "say_or_do",
    title: "What would you say or do?",
    description: "Choose your response at the pickup, on board, and at handover.",
    href: "/more/training/say-or-do",
    totalSteps: 3,
  },
];

export const QUALIFICATIONS_ON_FILE = [
  { name: "Safeguarding for passenger transport", status: "Completed", expiry: "2026-06-30" },
  { name: "Wheelchair securement", status: "Completed", expiry: "2025-12-01" },
  { name: "Emergency evacuation", status: "Refresher due", expiry: "2026-09-01" },
  { name: "Defensive driving", status: "Completed", expiry: "2027-03-15" },
];

export function trainingModuleStatusLabel(
  status: "not_started" | "in_progress" | "completed",
  module: PcjTrainingModule,
  progress: import("@/store/training").TrainingProgress,
): string {
  if (status === "completed") {
    const completedAt = progress.completedAt[module.id];
    return completedAt
      ? `Completed · ${new Date(completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
      : "Completed";
  }
  if (status === "in_progress") {
    if (module.id === "barriers") {
      return `In progress · ${progress.viewedBarrierIds.length} of ${module.totalSteps} viewed`;
    }
    if (module.id === "say_or_do") {
      return `In progress · ${progress.completedScenarioIds.length} of ${module.totalSteps} done`;
    }
    return "In progress";
  }
  return "Not started";
}

export interface AngieBadJourneyBeat {
  id: string;
  heading: string;
  narrative: string;
  angieQuote?: string;
  wrongApproach: string;
  betterApproach: string;
}

export const ANGIE_BAD_JOURNEY_INTRO =
  "Angie travels with her assistance dog Annie. A bad journey often starts with small attitudes — treating Annie as optional or a distraction.";

export const ANGIE_BAD_JOURNEY_BEATS: AngieBadJourneyBeat[] = [
  {
    id: "pickup",
    heading: "At pickup",
    narrative:
      "Angie is waiting with Annie at her feet. Another driver once asked her to put Annie in the luggage hold because the floor looked crowded.",
    angieQuote:
      "Annie isn't luggage. She's how I know where I am and stay calm. When a driver treats her like a pet or an inconvenience, I lose confidence before we've even moved.",
    wrongApproach: "Ask Angie to move Annie to the hold or a seat to keep the aisle clear.",
    betterApproach:
      "Confirm floor space at Angie's seat before she boards. Do not separate Annie from Angie unless there is an immediate safety risk — then call operations first.",
  },
  {
    id: "on_board",
    heading: "On board",
    narrative:
      "Mid-journey, a passenger reaches to pet Annie without asking. The driver says nothing.",
    angieQuote:
      "When nobody steps in, it feels like my safety doesn't matter. Annie is working — distractions put us both at risk.",
    wrongApproach: "Ignore it — Annie is friendly and it is not your problem.",
    betterApproach:
      "Calmly remind all passengers not to distract or pet the assistance dog. Speak to Angie, not over her.",
  },
  {
    id: "dropoff",
    heading: "At drop-off",
    narrative:
      "The driver opens the door and talks only to the shop assistant waiting outside, assuming Angie needs help Angie did not ask for.",
    angieQuote:
      "People rush to 'help' without asking what I need. It is embarrassing and it makes me dread the next journey.",
    wrongApproach: "Physically guide Angie or move Annie without checking what Angie wants.",
    betterApproach:
      "Ask Angie how she wants to alight. Offer an arm if requested — otherwise give clear verbal information about the step and door.",
  },
];

export interface SayOrDoScenario {
  id: string;
  title: string;
  context: string;
  passengerName: string;
  linkedProfileId?: string;
  options: {
    id: string;
    label: string;
    correct: boolean;
    feedback: string;
  }[];
}

export const SAY_OR_DO_SCENARIOS: SayOrDoScenario[] = [
  {
    id: "scenario_dalvinder_pickup",
    title: "Dalvinder at the kerb",
    context:
      "You arrive at Newcastle Street. Dalvinder is at the door but does not move toward the vehicle when you wave from the cab.",
    passengerName: "Dalvinder",
    linkedProfileId: "pax_dalvinder",
    options: [
      {
        id: "a",
        label: "Honk and point to the open door.",
        correct: false,
        feedback: "Dalvinder cannot see gestures from the cab. This creates anxiety and delays boarding.",
      },
      {
        id: "b",
        label: "Leave the cab, introduce yourself, and offer your arm with verbal directions.",
        correct: true,
        feedback: "Clear verbal guidance and a predictable approach builds trust before boarding.",
      },
      {
        id: "c",
        label: "Call operations to report a no-show after 30 seconds.",
        correct: false,
        feedback: "Allow reasonable time and use verbal contact before assuming a no-show.",
      },
    ],
  },
  {
    id: "scenario_mark_onboard",
    title: "Mark on board",
    context:
      "Mark is travelling with a support worker. The worker answers when you ask if everyone is ready to move off.",
    passengerName: "Mark",
    linkedProfileId: "pax_mark",
    options: [
      {
        id: "a",
        label: "Continue speaking only to the support worker — it is faster.",
        correct: false,
        feedback: "Mark told us this makes him feel invisible. Speak to Mark directly using simple language.",
      },
      {
        id: "b",
        label: "Ask Mark directly if he is ready, and explain the next stop in plain terms.",
        correct: true,
        feedback: "Direct communication reduces anxiety and respects Mark as the passenger.",
      },
      {
        id: "c",
        label: "Set off — the support worker confirmed readiness.",
        correct: false,
        feedback: "Confirm with Mark himself. Escorts support the journey; they do not replace the passenger.",
      },
    ],
  },
  {
    id: "scenario_angie_dog",
    title: "Angie and Annie",
    context:
      "Angie boards with Annie at her feet. A passenger asks to pet Annie and says dogs are usually allowed on this route.",
    passengerName: "Angie",
    linkedProfileId: "pax_angie",
    options: [
      {
        id: "a",
        label: "Allow it — Annie looks friendly and it keeps the peace.",
        correct: false,
        feedback: "Annie is a working assistance dog. Distractions compromise Angie’s safety.",
      },
      {
        id: "b",
        label: "Tell the passenger Annie is working and must not be petted. Check Angie has floor space.",
        correct: true,
        feedback: "Protect the working dog space and speak calmly to the whole vehicle.",
      },
      {
        id: "c",
        label: "Ask Angie to move Annie to the luggage area.",
        correct: false,
        feedback: "Never separate an assistance dog from the passenger without a safety-critical reason.",
      },
    ],
  },
];

export function getSayOrDoScenario(id: string): SayOrDoScenario | null {
  return SAY_OR_DO_SCENARIOS.find((item) => item.id === id) ?? null;
}
