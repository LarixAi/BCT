import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout, MoreField } from "@/components/driver/more/MoreLayout";
import { DocumentEvidencePanel } from "@/components/driver/more/DocumentEvidencePanel";
import { documentStatusLabel } from "@/domain/more/more-helpers";
import { getDocumentTypeDefinition } from "@/domain/more/document-catalog";
import { getCaptureProgress } from "@/domain/more/document-compliance";
import { useMoreStore } from "@/store/more";

export const Route = createFileRoute("/_app/more/documents/$documentId")({
  head: () => ({ meta: [{ title: "Document — Veyvio Driver" }] }),
  component: DocumentDetailPage,
});

function DocumentDetailPage() {
  const { documentId } = Route.useParams();
  const document = useMoreStore((s) => s.driverMore.documents.find((item) => item.id === documentId));

  if (!document) {
    return (
      <MoreSubpageLayout title="Document" backTo="/more/documents">
        <p className="text-sm text-muted">Document not found.</p>
      </MoreSubpageLayout>
    );
  }

  const typeDef = getDocumentTypeDefinition(document.documentTypeId);
  const progress = getCaptureProgress(document);

  return (
    <MoreSubpageLayout title={document.name} backTo="/more/documents">
      <div className="rounded-xl border border-border bg-card">
        <MoreField label="Category" value={document.category} />
        <MoreField label="Status" value={documentStatusLabel(document.status)} />
        <MoreField label="Evidence required" value={typeDef.captureLabel} />
        {typeDef.sides.length > 1 && (
          <MoreField label="Capture progress" value={progress.label} />
        )}
        {document.expiryDate && <MoreField label="Expiry date" value={document.expiryDate} />}
        {document.lastVerifiedDate && (
          <MoreField label="Last verified" value={document.lastVerifiedDate} />
        )}
        {document.reviewState && <MoreField label="Review state" value={document.reviewState} />}
        {document.actionRequired && (
          <MoreField label="Action required" value={document.actionRequired} />
        )}
      </div>

      <DocumentEvidencePanel document={document} />
    </MoreSubpageLayout>
  );
}
