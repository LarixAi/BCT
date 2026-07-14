import { getDocumentTypeDefinition } from "@/domain/more/document-catalog";
import {
  documentNeedsEvidence,
  ensureDocumentSides,
  getCaptureProgress,
} from "@/domain/more/document-compliance";
import type { ComplianceDocument } from "@/types/more";
import { DocumentSideCaptureCard } from "@/components/driver/more/DocumentSideCaptureCard";
import { driverCopy } from "@/copy/driver-messages";

export function DocumentEvidencePanel({ document }: { document: ComplianceDocument }) {
  const typeDef = getDocumentTypeDefinition(document.documentTypeId);
  const withSides = ensureDocumentSides(document);
  const progress = getCaptureProgress(withSides);
  const needsEvidence = documentNeedsEvidence(withSides);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
        <p className="text-sm font-semibold">{typeDef.captureLabel}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {needsEvidence ? typeDef.renewalGuidance : typeDef.guidance}
        </p>
        {typeDef.sides.length > 1 && (
          <p className="mt-2 text-xs font-medium text-muted">{progress.label}</p>
        )}
      </div>

      {withSides.reviewState && (
        <div className="rounded-xl border border-link/20 bg-link/5 px-4 py-3 text-sm">
          <p className="font-semibold">{withSides.reviewState}</p>
          {withSides.actionRequired && (
            <p className="mt-1 text-xs text-muted">{withSides.actionRequired}</p>
          )}
        </div>
      )}

      <div className="space-y-3">
        {typeDef.sides.map((definition) => {
          const capture =
            withSides.sides.find((side) => side.sideId === definition.id) ??
            ({ sideId: definition.id, status: "missing" } as const);

          return (
            <DocumentSideCaptureCard
              key={definition.id}
              document={withSides}
              side={capture}
              definition={definition}
            />
          );
        })}
      </div>

      <p className="text-xs text-muted">{driverCopy.documents.officeReviewNote}</p>
    </div>
  );
}
