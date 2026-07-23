import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { RegPlate } from "@/components/yard/primitives";
import { Button } from "@/components/ui/button";
import { buildEquipmentQrPayload } from "@/domain/equipment/equipment-qr";
import { Printer } from "lucide-react";

export interface EquipmentAssetLabelProps {
  label: string;
  assetId: string;
  qrCode: string;
  vehicleReg: string;
  vehicleBay?: string;
  assignedBy?: string;
  className?: string;
}

export function EquipmentAssetLabel({
  label,
  assetId,
  qrCode,
  vehicleReg,
  vehicleBay,
  assignedBy,
  className = "",
}: EquipmentAssetLabelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const payload = buildEquipmentQrPayload(qrCode);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(payload, {
      width: 220,
      margin: 1,
      color: { dark: "#0B1526", light: "#FFFFFF" },
    })
      .then(url => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return (
    <div className={`equipment-asset-label ${className}`}>
      <div className="rounded-xs border-2 border-[#0B1526] bg-white p-4 text-center max-w-[280px] mx-auto">
        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#12A89D]">Veyvio Yard</div>
        <div className="mt-2 text-sm font-extrabold uppercase tracking-wide text-[#0B1526] leading-tight">{label}</div>
        <div className="mt-3 grid place-items-center min-h-[220px]">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt={`QR code for ${qrCode}`} className="size-[200px]" />
          ) : (
            <div className="size-[200px] grid place-items-center border border-dashed border-border text-[10px] text-muted">
              Generating QR…
            </div>
          )}
        </div>
        <div className="mt-2 font-mono text-xs font-bold tracking-wider text-[#0B1526]">{qrCode}</div>
        <div className="mt-3 pt-3 border-t border-border space-y-1 text-[10px] text-muted">
          <div className="flex items-center justify-center gap-2">
            <span className="uppercase tracking-widest font-bold">Assigned</span>
            <RegPlate reg={vehicleReg} className="text-[10px]" />
            {vehicleBay && <span className="font-mono">{vehicleBay}</span>}
          </div>
          <div className="font-mono text-[9px]">{assetId}</div>
          {assignedBy && <div>Checked out by {assignedBy}</div>}
        </div>
      </div>
    </div>
  );
}

export function PrintEquipmentLabelButton({
  label,
  assetId,
  qrCode,
  vehicleReg,
  vehicleBay,
  assignedBy,
}: EquipmentAssetLabelProps) {
  const print = () => {
    const html = document.getElementById("equipment-label-print-root")?.innerHTML;
    if (!html) return;
    const win = window.open("", "_blank", "noopener,noreferrer,width=360,height=520");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>${label} label</title>
      <style>
        body { margin: 0; padding: 16px; font-family: Inter, system-ui, sans-serif; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <>
      <div id="equipment-label-print-root" className="hidden" aria-hidden>
        <EquipmentAssetLabel
          label={label}
          assetId={assetId}
          qrCode={qrCode}
          vehicleReg={vehicleReg}
          vehicleBay={vehicleBay}
          assignedBy={assignedBy}
        />
      </div>
      <Button
        type="button"
        onClick={print}
        className="w-full bg-primary hover:bg-primary/90 text-white uppercase tracking-widest font-bold"
      >
        <Printer className="size-4 mr-2" />
        Print sticker label
      </Button>
    </>
  );
}
