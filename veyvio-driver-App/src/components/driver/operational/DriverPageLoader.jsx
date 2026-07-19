export default function DriverPageLoader({ label = "Loading…" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3" role="status" aria-live="polite">
      <div className="w-8 h-8 border-2 border-[var(--ridova-teal)]/30 border-t-[var(--ridova-teal)] rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
