import { Check } from "lucide-react";

export default function AreaCheckbox({ checked }) {
  return (
    <div
      className={`w-6 h-6 rounded-[4px] flex items-center justify-center shrink-0 ${
        checked ? "bg-black" : "border-2 border-gray-300 bg-white"
      }`}
    >
      {checked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
    </div>
  );
}
