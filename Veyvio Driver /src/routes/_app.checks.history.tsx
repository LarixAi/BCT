import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { buildReadyChecksHome } from "@/data/mocks/vehicle-check";
import { FilterChipBar } from "@/components/driver/shared/FilterChipBar";
import { FocusedPageShell } from "@/components/driver/shells/FocusedPageShell";
import { HomeCard, HomeCardLabel, HomeDetailRow } from "@/components/driver/home/HomeCard";
import { matchesCheckHistoryFilter } from "@/domain/driver/assignment-filters";
import { CHECK_HISTORY_FILTERS, type CheckHistoryFilter } from "@/types/driver-filters";

export const Route = createFileRoute("/_app/checks/history")({
  head: () => ({ meta: [{ title: "Check history — Veyvio Driver" }] }),
  component: CheckHistoryPage,
});

const MOCK_HISTORY = [
  buildReadyChecksHome().vehicle.lastCompletedCheck!,
  {
    id: "vc_hist_2",
    reference: "VC-20260711-09821",
    completedAt: "06:28",
    result: "nil_defects" as const,
    odometer: 48102,
  },
  {
    id: "vc_hist_3",
    reference: "VC-20260710-08734",
    completedAt: "14:15",
    result: "defects_reported" as const,
    odometer: 48044,
  },
];

function CheckHistoryPage() {
  const [filter, setFilter] = useState<CheckHistoryFilter>("all");
  const records = MOCK_HISTORY.filter((record) => matchesCheckHistoryFilter(record.result, filter));

  return (
    <FocusedPageShell
      title="Previous checks"
      backTo="/checks"
      backLabel="Checks"
      eyebrow="History"
      subtitle="Completed records are read-only. Corrections require an auditable amendment."
    >
      <div className="animate-in-up space-y-4">
        <FilterChipBar
          label="Check history filters"
          size="sm"
          options={CHECK_HISTORY_FILTERS}
          active={filter}
          onChange={setFilter}
        />

        <div className="space-y-3">
          {records.length === 0 ? (
            <p className="text-sm text-muted">No checks match this filter.</p>
          ) : (
            records.map((record) => (
              <HomeCard key={record.id}>
                <HomeCardLabel>{record.reference}</HomeCardLabel>
                <dl className="mt-2 space-y-2">
                  <HomeDetailRow label="Completed" value={record.completedAt} />
                  <HomeDetailRow label="Odometer" value={record.odometer.toLocaleString()} />
                  <HomeDetailRow
                    label="Result"
                    value={record.result === "nil_defects" ? "Nil defects" : "Defects reported"}
                  />
                </dl>
              </HomeCard>
            ))
          )}
        </div>
      </div>
    </FocusedPageShell>
  );
}
