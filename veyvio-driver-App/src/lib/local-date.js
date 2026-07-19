/** Local calendar date YYYY-MM-DD (device timezone — matches how drivers think about "today"). */
export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localToday() {
  return formatLocalDate(new Date());
}

/** Add calendar days to a YYYY-MM-DD date (local calendar arithmetic). */
export function addLocalDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return formatLocalDate(d);
}

/** Map an ISO timestamp to the driver's local calendar date. */
export function localDateFromTimestamp(iso) {
  if (!iso) return null;
  return formatLocalDate(new Date(iso));
}
