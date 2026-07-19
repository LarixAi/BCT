import { ArrowLeft } from "lucide-react";
import { DRIVER_SAFE_TOP } from "@/lib/driverSafeArea";

/**
 * Black header bar that extends behind the status bar (Uber trip-details style).
 * Background is black through the safe area; controls sit below the status bar.
 */
export default function DriverBlackHeader({ title, onBack, right }) {
  return (
    <div className="bg-black text-white shrink-0" style={{ paddingTop: DRIVER_SAFE_TOP }}>
      <div className="flex items-center px-2 h-12 pb-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Go back"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-white/10 shrink-0"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-semibold truncate px-1">{title}</h1>
        <div className="w-11 h-11 flex items-center justify-center shrink-0">{right}</div>
      </div>
    </div>
  );
}
