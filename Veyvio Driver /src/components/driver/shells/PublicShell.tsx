import type { ReactNode } from "react";
import { BrandPublicHeader } from "@/components/brand/SplashBrandMark";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <BrandPublicHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col overflow-y-auto px-4 py-5 pb-safe">
        {children}
      </main>
    </div>
  );
}
