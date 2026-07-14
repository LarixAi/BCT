import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { DocumentRow } from "@/components/driver/more/DocumentRow";
import { driverCopy } from "@/copy/driver-messages";
import { useMoreStore } from "@/store/more";

export const Route = createFileRoute("/_app/more/documents/")({
  head: () => ({ meta: [{ title: "Licences and documents — Veyvio Driver" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const documents = useMoreStore((s) => s.driverMore.documents);

  return (
    <MoreSubpageLayout title="Licences and documents">
      <p className="text-sm text-muted">{driverCopy.documents.listIntro}</p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {documents.map((doc) => (
          <DocumentRow key={doc.id} document={doc} />
        ))}
      </div>
    </MoreSubpageLayout>
  );
}
