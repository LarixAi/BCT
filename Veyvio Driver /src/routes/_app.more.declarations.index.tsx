import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { DeclarationRow } from "@/components/driver/more/DeclarationRow";
import { driverCopy } from "@/copy/driver-messages";
import { useMoreStore } from "@/store/more";

export const Route = createFileRoute("/_app/more/declarations/")({
  head: () => ({ meta: [{ title: "Driver declarations — Veyvio Driver" }] }),
  component: DeclarationsPage,
});

function DeclarationsPage() {
  const declarations = useMoreStore((s) => s.declarations);
  const due = declarations.filter((item) => item.status === "due" || item.status === "overdue" || item.status === "in_progress");
  const onFile = declarations.filter((item) => item.status === "submitted" || item.status === "on_file");

  return (
    <MoreSubpageLayout title="Driver declarations">
      <p className="text-sm text-muted">{driverCopy.declarations.listIntro}</p>

      {due.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
            Action required
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {due.map((declaration) => (
              <DeclarationRow key={declaration.id} declaration={declaration} />
            ))}
          </div>
        </section>
      )}

      {onFile.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted">
            On file
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {onFile.map((declaration) => (
              <DeclarationRow key={declaration.id} declaration={declaration} />
            ))}
          </div>
        </section>
      )}
    </MoreSubpageLayout>
  );
}
