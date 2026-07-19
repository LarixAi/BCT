import { ArrowLeft } from "lucide-react";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";

export default function DriverSubpageHeader({ title, subtitle, onBack, right }) {
  return (
    <div
      className="flex items-center gap-2 px-4 pb-3 border-b border-gray-100 shrink-0 bg-white"
      style={{ paddingTop: DRIVER_SCREEN_TOP }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Go back"
        className="w-10 h-10 flex items-center justify-center rounded-full active:bg-gray-100 shrink-0"
      >
        <ArrowLeft className="w-5 h-5 text-black" />
      </button>
      <div className="flex-1 min-w-0">
        <h1 className="font-bold text-lg text-black truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
