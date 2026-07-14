import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import type { ReturnToServiceBlocker } from "@/domain/condition/return-to-service-gate";
import { canReturnToService } from "@/domain/condition/return-to-service-gate";

interface ReturnToServiceGateProps {
  blockers: ReturnToServiceBlocker[];
  vehicleId: string;
}

export function ReturnToServiceGate({ blockers, vehicleId }: ReturnToServiceGateProps) {
  if (canReturnToService(blockers)) {
    return (
      <div className="bg-ok/10 border border-ok/30 rounded-xs p-3 text-xs text-ok">
        <div className="font-bold uppercase tracking-widest text-[10px]">Ready for return-to-service</div>
        <p className="mt-1">Repairs verified and no outstanding safety blockers. Complete the return-to-service yard check to release the vehicle.</p>
      </div>
    );
  }

  return (
    <div className="bg-vor/5 border border-vor/30 rounded-xs p-4 space-y-2">
      <div className="flex items-center gap-1 text-xs font-extrabold uppercase tracking-widest text-vor">
        <ShieldAlert className="size-3.5" /> Return-to-service blocked
      </div>
      <p className="text-[11px] text-muted">Complete these steps before authorising release from VOR.</p>
      <ul className="space-y-2">
        {blockers.map(b => (
          <li key={b.id} className="text-xs bg-white border border-border rounded-xs p-2">
            <div className="font-bold">{b.label}</div>
            <div className="text-muted mt-0.5">{b.detail}</div>
            {b.to && (
              <Link
                to={b.to}
                params={b.params ?? (b.to.includes("$vehicleId") ? { vehicleId } : undefined)}
                className="inline-block mt-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
              >
                Resolve →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
