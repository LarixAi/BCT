import { useMemo } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useYard } from "@/store/yard";
import { RegPlate } from "@/components/yard/primitives";
import { CHECK_TYPE_LABELS, getSectionDef } from "@/domain/yard/check-templates";
import { SAFETY_OUTCOME_LABEL, SAFETY_OUTCOME_TONE } from "@/domain/yard/check-outcome";
import { formatCheckDuration } from "@/domain/yard/check-submission";

export const Route = createFileRoute("/_app/checks/$checkId")({
  head: ({ params }) => ({
    meta: [
      { title: `Check ${params.checkId} — Veyvio Yard` },
      { name: "description", content: "Yard vehicle check record with section outcomes and audit metadata." },
    ],
  }),
  component: CheckDetail,
  notFoundComponent: () => <p className="p-8 text-center text-muted">Check not found.</p>,
});

function CheckDetail() {
  const { checkId } = Route.useParams();
  const check = useYard(s => s.yardChecks.find(c => c.id === checkId));
  const vehicle = useYard(s => s.vehicles.find(v => v.id === check?.vehicleId));
  const allDefects = useYard(s => s.defects);
  const defects = useMemo(
    () => allDefects.filter(d => d.raisedAt === check?.completedAt && d.vehicleId === check?.vehicleId),
    [allDefects, check],
  );

  if (!check) throw notFound();

  const defectSections = check.sections.filter(s => s.outcome === "defect");

  return (
    <div className="space-y-5 animate-in-up pb-8">
      <Link to="/checks" className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted hover:text-foreground">
        <ArrowLeft className="size-3" /> Yard Checks
      </Link>

      <header className="bg-white border border-border rounded-xs p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-lg font-extrabold uppercase tracking-tight">Check Record</h1>
            {vehicle && (
              <p className="mt-1 text-xs text-muted">
                <RegPlate reg={vehicle.reg} /> · <span className="font-mono">{vehicle.bayId}</span>
              </p>
            )}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-xs border ${SAFETY_OUTCOME_TONE[check.safetyOutcome]}`}>
            {SAFETY_OUTCOME_LABEL[check.safetyOutcome]}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <Meta label="Check type" value={CHECK_TYPE_LABELS[check.checkType].label} />
          <Meta label="Inspector" value={check.by} />
          <Meta label="Started" value={formatDt(check.startedAt)} />
          <Meta label="Completed" value={formatDt(check.completedAt)} />
          {check.odometer != null && <Meta label="Odometer" value={String(check.odometer)} />}
          {check.durationSeconds != null && <Meta label="Duration" value={formatCheckDuration(check.durationSeconds)} />}
          {check.deviceLabel && <Meta label="Device" value={check.deviceLabel} />}
          <Meta label="Submission" value={check.offlineSubmission ? "Offline (queued)" : "Online"} />
        </dl>
      </header>

      {defects.some(d => d.vorCaseId) && (
        <section className="bg-vor/5 border border-vor/30 rounded-xs p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest font-display text-vor flex items-center gap-1">
            <ShieldAlert className="size-3.5" /> VOR opened from this check
          </h2>
          <ul className="mt-2 space-y-1 text-xs">
            {defects.filter(d => d.vorCaseId).map(d => (
              <li key={d.id}>
                <Link to="/vor/$caseId" params={{ caseId: d.vorCaseId! }} className="font-mono text-vor hover:underline">
                  {d.vorCaseId} — {d.category}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="bg-white border border-border rounded-xs">
        <h2 className="p-3 border-b border-border text-xs font-extrabold uppercase tracking-widest font-display">
          Sections · {check.sections.length}
        </h2>
        <div className="divide-y divide-border">
          {check.sections.map(section => {
            const def = getSectionDef(section.sectionId);
            const tone =
              section.outcome === "passed" ? "text-ok"
              : section.outcome === "na" ? "text-muted"
              : "text-vor";
            return (
              <div key={section.sectionId} className="p-3 text-xs space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold uppercase tracking-wider">{section.title}</span>
                  <span className={`font-bold uppercase tracking-widest text-[10px] shrink-0 ${tone}`}>
                    {section.outcome === "passed" ? "Passed" : section.outcome === "na" ? "N/A" : "Defect"}
                  </span>
                </div>
                {section.outcome === "defect" && (
                  <div className="text-muted space-y-1">
                    {section.failedItemIds && section.failedItemIds.length > 0 && (
                      <p>
                        Items: {section.failedItemIds.map(id => def?.items.find(i => i.id === id)?.label ?? id).join("; ")}
                      </p>
                    )}
                    {section.safeToMove != null && (
                      <p>Safe to move: {section.safeToMove ? "Yes" : "No"}</p>
                    )}
                    {section.note && <p>{section.note}</p>}
                    {section.photoDataUrls && section.photoDataUrls.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {section.photoDataUrls.map((src, i) => (
                          <img key={i} src={src} alt={`Section ${section.title} photo ${i + 1}`} className="size-16 rounded-xs border border-border object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {defectSections.length > 0 && (
        <section className="bg-white border border-border rounded-xs p-4">
          <h2 className="text-xs font-extrabold uppercase tracking-widest font-display mb-2">
            Linked defects · {defects.length}
          </h2>
          <div className="space-y-2">
            {defects.map(d => (
              <Link key={d.id} to="/defects/$defectId" params={{ defectId: d.id }} className="block border border-border p-2 rounded-xs hover:bg-secondary/50 text-xs">
                <div className="font-bold uppercase tracking-wider">{d.category}</div>
                <p className="text-muted mt-0.5">{d.notes}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</dt>
      <dd className="font-medium mt-0.5">{value}</dd>
    </div>
  );
}

function formatDt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}
