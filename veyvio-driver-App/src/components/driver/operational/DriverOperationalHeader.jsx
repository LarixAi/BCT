import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { APP_DISPLAY_NAME } from "@/lib/app-branding";
import { DRIVER_SCREEN_TOP } from "@/lib/driverSafeArea";
import { op } from "@/lib/driver-operational-theme";

export default function DriverOperationalHeader({
  title,
  subtitle,
  backTo = "/",
  onBack,
  right,
  sticky = true,
  showAppLabel = false,
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else navigate(backTo);
  };

  return (
    <header
      className={`px-4 pb-3 shrink-0 ${op.header} ${sticky ? "sticky top-0 z-20" : ""}`}
      style={{ paddingTop: DRIVER_SCREEN_TOP }}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center rounded-full active:bg-muted shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          {showAppLabel ? <p className={`${op.appLabel} truncate`}>{APP_DISPLAY_NAME}</p> : null}
          <h1 className="font-bold text-lg truncate text-foreground">{title}</h1>
          {subtitle ? <p className="text-xs text-muted-foreground truncate">{subtitle}</p> : null}
        </div>
        {right}
      </div>
    </header>
  );
}
