import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { buildReadyChecksHome } from "@/data/mocks/vehicle-check";
import { FilterChipBar } from "@/components/driver/shared/FilterChipBar";
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
    <div className="animate-in-up space-y-4">
      <Link to="/checks" className="text-sm text-link">
        ← Checks
      </Link>
      <header>
        <h1 className="font-display text-xl font-extrabold">Previous checks</h1>
        <p className="text-sm text-muted">Completed records are read-only. Corrections require an auditable amendment.</p>
      </header>

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
  );
}
