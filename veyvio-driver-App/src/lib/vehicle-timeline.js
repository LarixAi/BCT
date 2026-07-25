const CATEGORY_LABELS = {
  check: "Check",
  defect: "Defect",
  yard: "Yard",
  handback: "Handback",
  fuel: "Fuel",
  adblue: "AdBlue",
  report: "Report",
};

export function timelineCategoryLabel(category) {
  return CATEGORY_LABELS[String(category ?? "").toLowerCase()] ?? "Activity";
}

export function formatTimelineWhen(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
