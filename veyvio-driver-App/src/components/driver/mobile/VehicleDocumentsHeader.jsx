import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";
import { DRIVER_OPERATOR_INFO } from "@/lib/driverOperatorInfo";

/** Uber-style documents header: back · title · Help pill */
export default function VehicleDocumentsHeader({ onBack, title }) {
  const brand = DRIVER_OPERATOR_INFO.name?.split(" ")[0] || "Fleet";
  const center = title || brand;

  return (
    <div
      className="flex items-center justify-between px-3 pb-3 border-b border-gray-200 shrink-0 bg-white"
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
      <span className="font-bold text-[17px] text-black tracking-tight truncate px-2 text-center flex-1">
        {center}
      </span>
      <Link
        to="/driver/help"
        className="px-4 py-2 rounded-full bg-gray-100 text-[15px] font-semibold text-black active:bg-gray-200 shrink-0"
      >
        Help
      </Link>
    </div>
  );
}
