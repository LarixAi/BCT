import type { ReactNode } from "react";
import { BrandWordmark } from "@/components/brand/BrandWordmark";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="px-4 py-3 bg-accent text-white border-b border-white/10 pt-safe">
        <div className="mx-auto max-w-lg flex items-center gap-3">
          <BrandWordmark size="header" className="text-left" />
          <div className="text-[10px] text-white/60 uppercase tracking-widest leading-snug">
            Move smarter.
            <br />
            Operate safer.
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 pb-safe">{children}</main>
    </div>
  );
}
