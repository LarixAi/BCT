import { useEffect, useState } from "react";
import { Database, FlaskConical } from "lucide-react";
import { yardCopy } from "@/copy/yard-messages";
import { isDemoDataSource } from "@/platform/yard/data-source";
import { useYard } from "@/store/yard";

export function DataConnectionBanner() {
  const dataSource = useYard(s => s.dataSource);
  const hydrated = useYard(s => s.hydrated);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !hydrated) return null;

  const demo = isDemoDataSource(dataSource);

  return (
    <div
      className={`border-b px-4 py-1.5 ${
        demo
          ? "border-[#fed7aa] bg-[#fff7ed] text-[#9a3412]"
          : "border-[#abefc6] bg-[#ecfdf3] text-[#067647]"
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2 text-[11px] font-medium lg:mx-0 lg:max-w-none">
        {demo ? (
          <>
            <FlaskConical className="size-3.5 shrink-0" aria-hidden />
            <span>{yardCopy.connection.demoData}</span>
          </>
        ) : (
          <>
            <Database className="size-3.5 shrink-0" aria-hidden />
            <span>{yardCopy.connection.liveBackend}</span>
          </>
        )}
      </div>
    </div>
  );
}
