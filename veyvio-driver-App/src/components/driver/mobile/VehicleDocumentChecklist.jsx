/**
 * Uber-style vehicle document checklist rows — each links to its own page.
 */
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import VehicleDocProgress from "@/components/driver/mobile/vehicle-docs/VehicleDocProgress";
import VehicleDocStatusBadge from "@/components/driver/mobile/vehicle-docs/VehicleDocStatusBadge";
import {
  VEHICLE_DOCUMENT_CHECKLIST,
  vehicleChecklistHeading,
  resolveChecklistStatus,
  vehicleDocPath,
  getChecklistDisplayParts,
} from "@/lib/vehicleDocumentChecklist";

function ChecklistRow({ item, vehicle, documents, linkState }) {
  const status = resolveChecklistStatus(item, vehicle, documents);
  const { tag, title } = getChecklistDisplayParts(item);
  const needsHighlight = status.key === "required" || status.key === "rejected" || status.key === "expired";

  return (
    <Link
      to={vehicleDocPath(item.id)}
      state={linkState}
      className={`w-full flex items-center gap-3 py-4 border-b border-gray-100 text-left active:bg-gray-50 ${
        needsHighlight ? "bg-amber-50/40" : ""
      }`}
    >
      <div className="flex-1 min-w-0 pr-2">
        {tag ? (
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1">
            {tag}
          </span>
        ) : item.optional ? (
          <span className="inline-block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Optional
          </span>
        ) : null}
        <p className="text-[17px] text-black leading-snug pr-1">{title}</p>
        <div className="mt-1.5">
          <VehicleDocStatusBadge status={status} />
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-300 shrink-0" strokeWidth={2} />
    </Link>
  );
}

export default function VehicleDocumentChecklist({ vehicle, documents, linkState }) {
  return (
    <div className="bg-white">
      <div className="px-4 pt-4 pb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Vehicle</p>
        <h2 className="text-[20px] font-bold text-black leading-snug mt-1">
          {vehicleChecklistHeading(vehicle)}
        </h2>
        <p className="text-sm text-gray-600 mt-1">Tap a document to view details or upload.</p>
      </div>

      <VehicleDocProgress vehicle={vehicle} documents={documents} />

      <div className="px-4 pt-2">
        {VEHICLE_DOCUMENT_CHECKLIST.map((item) => (
          <ChecklistRow key={item.id} item={item} vehicle={vehicle} documents={documents} linkState={linkState} />
        ))}
      </div>
    </div>
  );
}
