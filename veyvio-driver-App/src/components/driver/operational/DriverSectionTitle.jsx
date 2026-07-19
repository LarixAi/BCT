export default function DriverSectionTitle({ children, action }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between gap-3 first:mt-0">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--ridova-teal-dark)]">{children}</h2>
      {action}
    </div>
  );
}
