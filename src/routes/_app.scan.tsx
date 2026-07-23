import { useCallback, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { yardCopy } from "@/copy/yard-messages";
import { useYard } from "@/store/yard";
import { RegPlate, StatusChip } from "@/components/yard/primitives";
import { QrScannerPanel } from "@/components/scan/QrScannerPanel";
import { isCameraScanSupported, resolveScanTarget } from "@/domain/scan/scan-ref";
import { listScannableEquipment } from "@/domain/equipment/equipment-lookup";
import { buildEquipmentQrPayload } from "@/domain/equipment/equipment-qr";
import { openTasksForVehicle } from "@/domain/tasks/task-automation";
import { ScanLine, Search, ListTodo, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/scan")({
  head: () => ({
    meta: [
      { title: "Scan — Veyvio Yard" },
      { name: "description", content: "Scan vehicle, equipment, bay or task QR codes." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const navigate = useNavigate();
  const vehicles = useYard(s => s.vehicles);
  const bays = useYard(s => s.bays);
  const defects = useYard(s => s.defects);
  const equipment = useYard(s => s.equipment);
  const tasks = useYard(s => s.tasks) ?? [];
  const [q, setQ] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraSupported = useMemo(() => isCameraScanSupported(), []);

  const scanContext = useMemo(
    () => ({ vehicles, bays, defects, tasks, equipment }),
    [vehicles, bays, defects, tasks, equipment],
  );

  const navigateScan = useCallback((value: string) => {
    const target = resolveScanTarget(value, scanContext);
    if (!target) {
      toast.error(yardCopy.toast.scan.noMatch(value));
      return;
    }
    setCameraOpen(false);
    if (target.action?.type === "transfer-equipment") {
      useYard.getState().openSheet({
        kind: "transfer-equipment",
        vehicleId: target.action.vehicleId,
        itemId: target.action.itemId,
      });
    }
    void navigate({ to: target.to, params: target.params });
  }, [navigate, scanContext]);

  const filtered = useMemo(
    () => vehicles.filter(v =>
      v.reg.toLowerCase().includes(q.toLowerCase()) ||
      v.bayId.toLowerCase().includes(q.toLowerCase()) ||
      v.id.toLowerCase().includes(q.toLowerCase()),
    ).slice(0, 12),
    [vehicles, q],
  );

  const equipmentMatches = useMemo(
    () => listScannableEquipment(equipment, vehicles, q),
    [equipment, vehicles, q],
  );

  return (
    <div className="space-y-4 animate-in-up pb-4">
      <div className="bg-white border border-border rounded-xs p-6 text-center">
        <div className="mx-auto grid size-20 place-items-center rounded-xs border-2 border-dashed border-primary/40 bg-primary/5">
          <ScanLine className="size-10 text-primary" />
        </div>
        <h1 className="mt-4 font-display text-lg font-extrabold tracking-tight">Scan QR code</h1>
        <p className="mt-1 text-sm text-muted">
          Vehicle · Equipment asset · Defect · Task · Bay reference
        </p>
        {cameraOpen ? (
          <div className="mt-4 text-left">
            <QrScannerPanel onScan={navigateScan} onClose={() => setCameraOpen(false)} />
          </div>
        ) : (
          <Button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={!cameraSupported}
            className="mt-4 w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold text-xs"
          >
            <Camera className="size-4 mr-2" />
            {cameraSupported ? "Open camera scanner" : "Camera not available on this device"}
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Simulate scan</div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && q.trim()) navigateScan(q);
            }}
            placeholder="Reg, bay, EQ-HV-A3F2, veyvio:equipment:…"
            className="pl-9"
          />
        </div>
        {q.trim() && (
          <Button
            type="button"
            variant="outline"
            onClick={() => navigateScan(q)}
            className="w-full text-[10px] uppercase tracking-widest font-bold"
          >
            Go to match
          </Button>
        )}
        {equipmentMatches.length > 0 && (
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Equipment assets</div>
            <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
              {equipmentMatches.map(row => (
                <button
                  key={`${row.vehicleId}-${row.item.id}`}
                  type="button"
                  onClick={() => navigateScan(buildEquipmentQrPayload(row.scanValue))}
                  className="w-full text-left p-3 hover:bg-secondary/50 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold uppercase tracking-wider">{row.item.label}</div>
                    <div className="text-[10px] text-muted font-mono mt-0.5">{row.scanValue}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <RegPlate reg={row.vehicleReg} className="text-[10px]" />
                    <div className="text-[10px] text-muted font-mono mt-0.5">{row.bayId}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted px-1">Vehicles</div>
        <div className="bg-white border border-border rounded-xs overflow-hidden divide-y divide-border">
          {filtered.map(v => {
            const linked = openTasksForVehicle(tasks, v.id);
            return (
              <div key={v.id} className="divide-y divide-border">
                <Link
                  to="/yard/$vehicleId"
                  params={{ vehicleId: v.id }}
                  className="flex items-center justify-between gap-3 p-3 hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-bold text-muted">{v.bayId}</span>
                    <RegPlate reg={v.reg} />
                  </div>
                  <StatusChip status={v.status} />
                </Link>
                {linked.length > 0 && (
                  <div className="bg-secondary/30 px-3 py-2 space-y-1">
                    {linked.slice(0, 2).map(task => (
                      <Link
                        key={task.id}
                        to="/tasks/$taskId"
                        params={{ taskId: task.id }}
                        className="flex items-center gap-2 text-xs text-primary hover:underline"
                      >
                        <ListTodo className="size-3.5 shrink-0" />
                        <span className="truncate">{task.title}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-4 text-xs text-muted text-center">No matches</p>
          )}
        </div>
      </div>
    </div>
  );
}
