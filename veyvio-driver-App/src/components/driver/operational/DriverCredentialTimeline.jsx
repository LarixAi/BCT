function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryChip(days) {
  if (days === null) return { text: "—", className: "bg-muted text-muted-foreground" };
  if (days < 0) return { text: "Expired", className: "bg-red-100 text-red-800" };
  if (days <= 30) return { text: `${days}d left`, className: "bg-amber-100 text-amber-900" };
  if (days <= 90) return { text: `${days}d left`, className: "bg-[var(--ridova-teal)]/15 text-[var(--ridova-teal-dark)]" };
  return { text: `${days}d left`, className: "bg-[var(--ridova-lime)]/15 text-[var(--ridova-on-lime)] font-semibold" };
}

function CredentialRow({ label, date }) {
  const days = daysUntil(date);
  const chip = expiryChip(days);

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-b-0 min-h-[44px]">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{date || "Not set"}</p>
      </div>
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${chip.className}`}>
        {chip.text}
      </span>
    </div>
  );
}

export default function DriverCredentialTimeline({ driver }) {
  const rows = [
    { label: "Driving licence", date: driver.licenceExpiryDate },
    { label: "CPC / DQC", date: driver.dqcExpiryDate },
  ];

  if (driver.canDoSchoolRuns) {
    rows.push({ label: "DBS check", date: driver.dbsExpiryDate });
  }

  return (
    <div className="px-4">
      {rows.map((row) => (
        <CredentialRow key={row.label} label={row.label} date={row.date} />
      ))}
    </div>
  );
}
