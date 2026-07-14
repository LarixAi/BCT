import type { DutyStop, PassengerTask } from "@/types/duty";
import type { PassengerProfile } from "@/types/passenger";
import { getPassengerProfile } from "@/domain/passenger/passenger-profiles";

export interface PassengerPickupChecklistItem {
  id: string;
  label: string;
  detail?: string;
}

export function getPickupPassengerTask(stop: DutyStop | null | undefined): PassengerTask | null {
  if (!stop) return null;
  return stop.passengerTasks.find((task) => task.type === "pickup") ?? stop.passengerTasks[0] ?? null;
}

export function getProfileForStop(stop: DutyStop | null | undefined): PassengerProfile | null {
  const task = getPickupPassengerTask(stop);
  if (!task) return null;
  return getPassengerProfile(task.passengerId);
}

export function buildPickupChecklist(profile: PassengerProfile): PassengerPickupChecklistItem[] {
  const items: PassengerPickupChecklistItem[] = [];

  for (const need of profile.accessibilityNeeds) {
    items.push({ id: need.id, label: need.label, detail: need.driverAction });
  }

  if (profile.assistanceAnimal) {
    items.push({
      id: "assist_animal_space",
      label: "Assistance dog space confirmed",
      detail: profile.assistanceAnimalNotes,
    });
  }

  if (profile.wheelchairUser) {
    items.push({
      id: "restraint_check",
      label: "Wheelchair restraint ready before moving off",
    });
  }

  if (profile.communicationNotes[0]) {
    items.push({
      id: "communication",
      label: "Communication approach confirmed",
      detail: profile.communicationNotes[0],
    });
  }

  return items;
}

export function tripPassengerFromProfile(profile: PassengerProfile): import("@/types/trips").TripPassenger {
  return {
    id: profile.id,
    name: profile.displayName,
    passengerProfileId: profile.id,
    mobilityNotes: profile.journeySummary,
    wheelchairRequired: profile.wheelchairUser,
    boardingInstructions: profile.boardingAssistance.join(" · "),
    handoverRequirements: profile.handoverRequirements,
    safeguardingWarning: Boolean(profile.safeguardingNotes),
    status: "scheduled",
  };
}
