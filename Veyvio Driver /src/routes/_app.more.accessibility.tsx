import { createFileRoute } from "@tanstack/react-router";
import { MoreSubpageLayout } from "@/components/driver/more/MoreLayout";
import { useMoreStore } from "@/store/more";
import { Label } from "@/components/ui/label";
import type { AccessibilityPreferences } from "@/types/more";

export const Route = createFileRoute("/_app/more/accessibility")({
  head: () => ({ meta: [{ title: "Accessibility — Veyvio Driver" }] }),
  component: AccessibilityPage,
});

function AccessibilityPage() {
  const prefs = useMoreStore((s) => s.accessibility);
  const update = useMoreStore((s) => s.updateAccessibility);

  const toggles: { key: keyof AccessibilityPreferences; label: string }[] = [
    { key: "highContrast", label: "High contrast" },
    { key: "reduceMotion", label: "Reduce motion" },
    { key: "largerTouchTargets", label: "Larger touch targets" },
    { key: "screenReaderOptimised", label: "Screen-reader optimisation" },
    { key: "hapticFeedback", label: "Haptic feedback" },
    { key: "readAloud", label: "Read instructions aloud" },
  ];

  return (
    <MoreSubpageLayout title="Accessibility">
      <p className="text-sm text-muted">These preferences apply throughout the Driver app.</p>

      <div className="space-y-2 rounded-xl border border-border bg-card p-4">
        <Label htmlFor="text-size">Text size</Label>
        <select
          id="text-size"
          value={prefs.textSize}
          onChange={(e) =>
            update({ textSize: e.target.value as AccessibilityPreferences["textSize"] })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="default">Default</option>
          <option value="large">Large</option>
          <option value="extra_large">Extra large</option>
        </select>
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {toggles.map(({ key, label }) => (
          <label key={key} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm">{label}</span>
            <input
              type="checkbox"
              checked={Boolean(prefs[key])}
              onChange={(e) => update({ [key]: e.target.checked })}
              className="size-5 accent-primary"
            />
          </label>
        ))}
      </div>
    </MoreSubpageLayout>
  );
}
