import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Direct-touch file input — required on Android WebView (programmatic .click() is blocked). */
export function DocumentFilePicker({
  children,
  accept,
  capture,
  disabled,
  className,
  onFile,
}: {
  children: ReactNode;
  accept: string;
  capture?: boolean;
  disabled?: boolean;
  className?: string;
  onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <label
      className={cn(
        "relative flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        disabled={disabled}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          if (inputRef.current) inputRef.current.value = "";
        }}
      />
      <span className="pointer-events-none flex items-center justify-center gap-2 px-3 py-2.5">
        {children}
      </span>
    </label>
  );
}
