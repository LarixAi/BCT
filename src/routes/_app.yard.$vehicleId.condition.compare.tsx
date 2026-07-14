import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { EvidenceCompareSlider } from "@/components/condition/EvidenceCompareSlider";
import { SimilarityHintPanel } from "@/components/condition/SimilarityHintPanel";
import { computeEvidenceSimilarityHint } from "@/domain/condition/evidence-similarity";
import { useYard } from "@/store/yard";

export const Route = createFileRoute("/_app/yard/$vehicleId/condition/compare")({
  validateSearch: (s: Record<string, unknown>) => ({
    damageId: typeof s.damageId === "string" ? s.damageId : undefined,
    zoneId: typeof s.zoneId === "string" ? s.zoneId : undefined,
  }),
  component: ComparePage,
});

function ComparePage() {
  const { vehicleId } = Route.useParams();
  const { damageId, zoneId: searchZone } = Route.useSearch();
  const vehicle = useYard(s => s.vehicles.find(v => v.id === vehicleId));
  const damageRecords = useYard(s => s.damageRecords);
  const inspections = useYard(s => s.inspections);
  const media = useYard(s => s.inspectionMedia);

  const record = damageRecords.find(d => d.id === damageId);
  const zoneId = record?.zoneId ?? searchZone;

  const zoneMedia = useMemo(() => {
    if (!zoneId) return [];
    return media
      .filter(m => m.vehicleZoneId === zoneId && inspections.some(i => i.id === m.inspectionId && i.vehicleId === vehicleId))
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }, [media, zoneId, inspections, vehicleId]);

  if (!vehicle) throw notFound();

  const baseline = zoneMedia[zoneMedia.length - 1];
  const latest = zoneMedia[0];

  const similarityHint = useMemo(() => {
    if (!zoneId) return null;
    return computeEvidenceSimilarityHint({
      vehicleId,
      zoneId,
      damageType: record?.damageType,
      observedAt: latest?.capturedAt ?? new Date().toISOString(),
      description: record?.description,
      damageRecords,
      beforeCapturedAt: baseline?.capturedAt,
      afterCapturedAt: latest?.capturedAt,
    });
  }, [vehicleId, zoneId, record, damageRecords, baseline, latest]);

  return (
    <div className="space-y-4 pb-8">
      <Link to="/yard/$vehicleId/condition" params={{ vehicleId }} className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Condition
      </Link>
      <h1 className="font-display text-lg font-extrabold uppercase tracking-tight">Compare evidence</h1>
      <p className="text-xs text-muted">Side-by-side comparison for investigation — does not determine responsibility automatically.</p>

      {zoneMedia.length < 2 ? (
        <p className="text-xs text-muted bg-secondary/50 p-4 rounded-xs">Not enough zone photographs yet. Complete an onboarding baseline or bodywork inspection.</p>
      ) : (
        <EvidenceCompareSlider
          beforeSrc={baseline?.dataUrl}
          afterSrc={latest?.dataUrl}
          beforeLabel="Earlier / baseline"
          afterLabel="Latest"
        />
      )}
      {similarityHint && zoneMedia.length >= 2 && (
        <SimilarityHintPanel hint={similarityHint} vehicleId={vehicleId} />
      )}
      {record && (
        <div className="bg-white border border-border rounded-xs p-4 text-xs">
          <div className="font-bold uppercase tracking-wider">{record.title}</div>
          <p className="text-muted mt-1">Known damage record — compare to decide existing, new, or worsened.</p>
        </div>
      )}
    </div>
  );
}
