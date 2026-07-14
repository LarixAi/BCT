import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { formatDamageRef } from "@/domain/condition/condition-helpers";
import { OBSERVATION_LABELS, type EvidenceSimilarityHint } from "@/types/condition";

interface SimilarityHintPanelProps {
  hint: EvidenceSimilarityHint;
  vehicleId?: string;
  compact?: boolean;
}

export function SimilarityHintPanel({ hint, vehicleId, compact }: SimilarityHintPanelProps) {
  const tone = hint.confidence === "high" ? "border-primary/30 bg-primary/5"
    : hint.confidence === "medium" ? "border-warn/40 bg-warn/10"
    : "border-border bg-secondary/30";

  return (
    <div className={`rounded-xs border p-3 space-y-2 text-xs ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 font-bold uppercase tracking-widest text-[10px]">
          <Sparkles className="size-3" /> AI similarity hint
        </div>
        <span className="font-mono font-bold tabular-nums">{hint.score}%</span>
      </div>
      <p>{hint.summary}</p>
      <p className="text-[10px] text-muted">
        Suggested: <span className="font-bold">{OBSERVATION_LABELS[hint.suggestedClassification]}</span>
        {" · "}{hint.confidence} confidence
      </p>
      {!compact && hint.factors.length > 0 && (
        <ul className="text-[11px] text-muted space-y-0.5">
          {hint.factors.map(f => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
      )}
      {hint.duplicateCandidate && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-warn">
          Possible duplicate — compare with existing record before assigning blame
        </p>
      )}
      {hint.matchedDamageId && vehicleId && (
        <Link
          to="/yard/$vehicleId/condition/damage/$damageId"
          params={{ vehicleId, damageId: hint.matchedDamageId }}
          className="inline-block text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
        >
          View {formatDamageRef(hint.matchedDamageId)} →
        </Link>
      )}
      <p className="text-[10px] text-muted italic">{hint.disclaimer}</p>
    </div>
  );
}
