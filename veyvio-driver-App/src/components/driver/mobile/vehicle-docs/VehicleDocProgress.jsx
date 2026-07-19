import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getChecklistProgress } from "@/lib/vehicleDocumentChecklist";

export default function VehicleDocProgress({ vehicle, documents }) {
  const progress = getChecklistProgress(vehicle, documents);
  const pct =
    progress.requiredTotal > 0
      ? Math.round((progress.requiredCompleted / progress.requiredTotal) * 100)
      : 100;

  return (
    <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[15px] font-bold text-black">Required documents</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {progress.requiredCompleted} of {progress.requiredTotal} complete
            {progress.optionalTotal > 0
              ? ` · ${progress.optionalCompleted} optional uploaded`
              : ""}
          </p>
        </div>
        {progress.allRequiredComplete ? (
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" aria-hidden />
        ) : (
          <span className="text-sm font-bold text-black tabular-nums">{pct}%</span>
        )}
      </div>

      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            progress.allRequiredComplete ? "bg-emerald-500" : "bg-black"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {progress.needsAction.length > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
          <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900 leading-snug">
            {progress.needsAction.length === 1
              ? "1 document still needs your attention."
              : `${progress.needsAction.length} documents still need your attention.`}
          </p>
        </div>
      )}
    </div>
  );
}
