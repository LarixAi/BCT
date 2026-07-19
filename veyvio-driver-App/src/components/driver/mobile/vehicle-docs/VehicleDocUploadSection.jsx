import { useRef } from "react";
import { Upload, RefreshCw, AlertCircle, FileText, X } from "lucide-react";
import { vehicleDocTypeLabel } from "@/lib/vehicleDocumentTypes";

const inputClass =
  "w-full bg-white rounded-xl px-4 py-3 text-sm text-black outline-none border border-gray-200 focus:ring-2 focus:ring-black/10 focus:border-gray-300";
const labelClass = "text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block";

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VehicleDocUploadSection({
  uploadType,
  docNumber,
  onDocNumberChange,
  expiryDate,
  onExpiryDateChange,
  file,
  onFileChange,
  uploading,
  uploadError,
  onSubmit,
  submitLabel = "Submit for review",
  heading = "Upload document",
}) {
  const fileInputRef = useRef(null);

  return (
    <div className="space-y-4">
      <p className="text-[15px] font-bold text-black">{heading}</p>

      {uploadError && (
        <p className="text-sm text-red-600 flex items-start gap-2 bg-red-50 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          {uploadError}
        </p>
      )}

      <div>
        <label className={labelClass}>Reference / policy no. (optional)</label>
        <input
          value={docNumber}
          onChange={(e) => onDocNumberChange(e.target.value)}
          className={inputClass}
          placeholder={vehicleDocTypeLabel(uploadType)}
        />
      </div>

      <div>
        <label className={labelClass}>Expiry date (if applicable)</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => onExpiryDateChange(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>File</label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={(e) => onFileChange(e.target.files?.[0] || null)}
          className="sr-only"
        />
        {!file ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center active:bg-gray-100 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-[15px] font-semibold text-black">Choose PDF or photo</p>
            <p className="text-sm text-gray-500 mt-1">Tap to browse your files</p>
          </button>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-black truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                onFileChange(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              aria-label="Remove file"
              className="w-9 h-9 flex items-center justify-center rounded-full active:bg-gray-100 shrink-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!file || uploading}
        className="w-full py-4 bg-black text-white rounded-xl text-[15px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:bg-gray-900"
      >
        {uploading ? (
          <RefreshCw className="w-5 h-5 animate-spin" />
        ) : (
          <Upload className="w-5 h-5" />
        )}
        {uploading ? "Uploading…" : submitLabel}
      </button>
    </div>
  );
}
