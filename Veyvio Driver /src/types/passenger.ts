/** Passenger-centred journey profile — operational needs for drivers on duty. */

export type PassengerMobilityCategory =
  | "ambulatory"
  | "wheelchair_user"
  | "visual_impairment"
  | "learning_disability"
  | "hidden_disability"
  | "other";

export type PassengerAssistanceLevel = "none" | "light" | "full" | "two_person";

export interface PassengerAccessibilityNeed {
  id: string;
  label: string;
  driverAction: string;
}

export interface PassengerProfile {
  id: string;
  displayName: string;
  preferredName?: string;
  ageGroup?: "child" | "young_adult" | "adult" | "older_adult";
  mobilityCategory: PassengerMobilityCategory;
  assistanceLevel: PassengerAssistanceLevel;
  wheelchairUser: boolean;
  usesMobilityAid: boolean;
  assistanceAnimal: boolean;
  assistanceAnimalNotes?: string;
  communicationNotes: string[];
  boardingAssistance: string[];
  inVehicleAssistance: string[];
  handoverRequirements?: string;
  safeguardingNotes?: string;
  vulnerabilityFlag: boolean;
  accessibilityNeeds: PassengerAccessibilityNeed[];
  /** Short operational summary for list views */
  journeySummary: string;
}

export interface PassengerManifestEntry {
  passengerId: string;
  profile: PassengerProfile;
  pickupStopId?: string;
  dropoffStopId?: string;
  escortRequired: boolean;
  escortName?: string;
}
