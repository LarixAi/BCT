export default function DriverEmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="mt-10 flex flex-col items-center text-center px-4">
      {Icon ? (
        <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-muted-foreground" aria-hidden="true" />
        </div>
      ) : null}
      <p className="font-semibold text-foreground">{title}</p>
      {description ? <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
