import { openDamageForVehicle } from "@/domain/condition/condition-helpers";
import type {
  DamageObservation,
  DamageRecord,
  DamageType,
  EvidenceSimilarityHint,
  ObservationClassification,
  SimilarityConfidence,
} from "@/types/condition";

const WORSENED_KEYWORDS = ["worse", "worsened", "bigger", "spread", "cracked", "deeper", "expanded"];

const RELATED_DAMAGE_TYPES: Partial<Record<DamageType, DamageType[]>> = {
  scratch: ["scuff", "paint_damage", "paint_transfer"],
  scuff: ["scratch", "paint_transfer", "paint_damage"],
  dent: ["impact_damage", "panel_misalignment"],
  crack: ["glass_damage", "broken_trim"],
};

function confidenceFromScore(score: number): SimilarityConfidence {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function typesRelated(a?: DamageType, b?: DamageType): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  return RELATED_DAMAGE_TYPES[a]?.includes(b) ?? RELATED_DAMAGE_TYPES[b]?.includes(a) ?? false;
}

function looksWorsened(description?: string): boolean {
  if (!description) return false;
  const lower = description.toLowerCase();
  return WORSENED_KEYWORDS.some(k => lower.includes(k));
}

export interface SimilarityInput {
  vehicleId: string;
  zoneId: string;
  damageType?: DamageType;
  observedAt: string;
  description?: string;
  reportSource?: DamageObservation["reportSource"];
  damageRecords: DamageRecord[];
  beforeCapturedAt?: string;
  afterCapturedAt?: string;
}

export function computeEvidenceSimilarityHint(input: SimilarityInput): EvidenceSimilarityHint {
  const openDamage = openDamageForVehicle(input.damageRecords, input.vehicleId);
  const zoneMatches = openDamage.filter(d => d.zoneId === input.zoneId);
  const exactType = zoneMatches.find(d => d.damageType === input.damageType);
  const relatedType = zoneMatches.find(d => typesRelated(d.damageType, input.damageType));
  const matched = exactType ?? relatedType;

  let score = 25;
  const factors: string[] = [];
  let suggested: ObservationClassification = "new_not_reported";
  let summary = "No matching damage on file for this zone — may be new.";
  let duplicateCandidate = false;

  if (matched) {
    score += exactType ? 45 : 30;
    factors.push(exactType ? "Same zone and damage type on record" : "Same zone with related damage type");
    if (looksWorsened(input.description)) {
      suggested = "existing_worsened";
      score += 15;
      summary = `Likely worsening of recorded damage (${matched.title}).`;
      factors.push("Description suggests deterioration");
    } else {
      suggested = "existing_unchanged";
      summary = `Evidence likely matches existing damage (${matched.title}).`;
    }
    const daysSince = daysBetween(matched.lastConfirmedAt, input.observedAt);
    if (daysSince <= 14) {
      score += 10;
      factors.push("Recently confirmed on this vehicle");
    }
    if (input.reportSource === "driver_report" && matched.origin !== "reported_during_duty") {
      duplicateCandidate = true;
      factors.push("Driver report overlaps undocumented-on-duty record");
    }
  } else if (zoneMatches.length > 0) {
    score += 20;
    suggested = "possible_new_review";
    summary = "Other damage exists in this zone — compare carefully before deciding.";
    factors.push("Zone has other open damage records");
  } else {
    factors.push("No open damage in this body zone");
  }

  if (input.beforeCapturedAt && input.afterCapturedAt) {
    const gapHours = hoursBetween(input.beforeCapturedAt, input.afterCapturedAt);
    if (gapHours < 48) {
      score += 5;
      factors.push("Compared images captured within 48 hours");
    } else if (gapHours > 24 * 30) {
      score -= 5;
      factors.push("Long gap between compared images");
    }
  }

  score = Math.min(95, Math.max(10, score));

  return {
    score,
    confidence: confidenceFromScore(score),
    suggestedClassification: suggested,
    summary,
    factors,
    matchedDamageId: matched?.id,
    duplicateCandidate,
    disclaimer: "Advisory hint only — Yard manager must confirm the investigation outcome.",
  };
}

export function findDuplicateDamageCandidates(
  observation: Pick<DamageObservation, "vehicleId" | "zoneId" | "damageType" | "classification" | "description">,
  damageRecords: DamageRecord[],
): DamageRecord[] {
  if (!["new_not_reported", "new_previously_reported", "possible_new_review"].includes(observation.classification)) {
    return [];
  }
  return openDamageForVehicle(damageRecords, observation.vehicleId).filter(d => {
    if (d.zoneId !== observation.zoneId) return false;
    return d.damageType === observation.damageType || typesRelated(d.damageType, observation.damageType);
  });
}

function daysBetween(from: string, to: string): number {
  return Math.abs(new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
}

function hoursBetween(from: string, to: string): number {
  return Math.abs(new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60);
}
