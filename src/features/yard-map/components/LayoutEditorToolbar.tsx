import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  DoorOpen,
  LogIn,
  LogOut,
  Move,
  RotateCw,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type { LayoutEditorTool } from "@/features/yard-map/lib/layout-editor-draft";

interface LayoutEditorToolbarProps {
  editMode: boolean;
  tool: LayoutEditorTool;
  hasChanges: boolean;
  selectedBayId: string | null;
  selectedCustomId: string | null;
  compact?: boolean;
  onToggleEdit: () => void;
  onToolChange: (tool: LayoutEditorTool) => void;
  onRotateBay: () => void;
  onDeleteSelected: () => void;
  onReset: () => void;
  onCopy: () => Promise<boolean>;
}

const TOOLS: { id: LayoutEditorTool; label: string; icon: typeof Move; hint: string }[] = [
  { id: "move-bay", label: "Move bays", icon: Move, hint: "Drag bays to reposition" },
  { id: "add-building", label: "Building", icon: Building2, hint: "Drag on map to add a building" },
  { id: "add-gate", label: "Gate", icon: DoorOpen, hint: "Drag to mark entrance & exit" },
  { id: "add-entrance", label: "Entrance", icon: LogIn, hint: "Drag to mark entrance" },
  { id: "add-exit", label: "Exit", icon: LogOut, hint: "Drag to mark exit" },
  { id: "add-safety", label: "Safety zone", icon: AlertTriangle, hint: "Drag yellow hatched no-parking area" },
];

export function LayoutEditorToolbar({
  editMode,
  tool,
  hasChanges,
  selectedBayId,
  selectedCustomId,
  compact = false,
  onToggleEdit,
  onToolChange,
  onRotateBay,
  onDeleteSelected,
  onReset,
  onCopy,
}: LayoutEditorToolbarProps) {
  const [copied, setCopied] = useState(false);
  const activeTool = TOOLS.find(t => t.id === tool);

  async function handleCopy() {
    const ok = await onCopy();
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className={`rounded border border-border bg-white ${compact ? "p-1.5" : "p-2"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleEdit}
          className={`inline-flex h-9 items-center gap-1.5 rounded px-3 text-xs font-bold transition-colors ${
            editMode ? "bg-primary text-white" : "border border-border text-foreground hover:border-primary/50"
          }`}
        >
          {editMode ? <X className="size-3.5" aria-hidden /> : <Move className="size-3.5" aria-hidden />}
          {editMode ? "Done adjusting" : "Adjust layout"}
        </button>

        {editMode && selectedBayId ? (
          <button
            type="button"
            onClick={onRotateBay}
            className="inline-flex h-9 items-center gap-1.5 rounded border border-primary bg-primary/5 px-3 text-xs font-bold text-primary"
          >
            <RotateCw className="size-3.5" aria-hidden />
            Rotate bay 90°
          </button>
        ) : null}

        {editMode && selectedCustomId ? (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="inline-flex h-9 items-center gap-1.5 rounded border border-vor/40 px-3 text-xs font-bold text-vor"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Remove
          </button>
        ) : null}

        {hasChanges && (
          <>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 items-center gap-1.5 rounded border border-border px-3 text-xs font-bold hover:border-vor/50 hover:text-vor"
            >
              Reset layout
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex h-9 items-center gap-1.5 rounded border border-border px-3 text-xs font-bold hover:border-primary/50"
            >
              {copied ? <Check className="size-3.5 text-ok" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? "Copied" : "Copy layout"}
            </button>
          </>
        )}
      </div>

      {editMode ? (
        <>
          <div className={`flex flex-wrap gap-1 ${compact ? "" : "mt-2"}`}>
            {TOOLS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onToolChange(id)}
                className={`inline-flex h-8 items-center gap-1 rounded px-2 text-[10px] font-bold uppercase tracking-wide ${
                  tool === id ? "bg-primary text-white" : "bg-muted/30 text-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-3" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <p className={`text-xs text-muted ${compact ? "mt-1" : "mt-2"}`}>
            {activeTool?.hint}
            {tool === "move-bay" ? " Tap a bay, then use Rotate. " : " Draw a box on the map. "}
            Changes save on this device.
          </p>
        </>
      ) : hasChanges ? (
        <p className="text-xs text-warn">Local layout tweaks applied.</p>
      ) : null}
    </div>
  );
}
