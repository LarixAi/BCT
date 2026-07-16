import type { ReactNode } from "react";
import { BrandPublicHeader } from "@/components/brand/SplashBrandMark";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <BrandPublicHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 pb-safe">{children}</main>
    </div>
  );
}
