import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

export function MessageComposer({
  value,
  onChange,
  onSend,
  disabled,
  placeholder = "Write a message…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="sticky bottom-20 flex items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-lg">
      <button
        type="button"
        className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-muted"
        aria-label="Add attachment"
        disabled={disabled}
      >
        <Plus className="size-5" />
      </button>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={disabled ? "Messaging disabled while driving" : placeholder}
        disabled={disabled}
        className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <Button size="sm" onClick={onSend} disabled={disabled || !value.trim()}>
        Send
      </Button>
    </div>
  );
}

export function DrivingSafetyNotice() {
  return (
    <div className="rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-sm text-warn">
      <p className="font-semibold">Driving safety mode</p>
      <p className="text-xs">Stop safely when possible to read or reply to messages.</p>
    </div>
  );
}
