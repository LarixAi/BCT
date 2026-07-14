import type { BrandWordmarkSize } from "@/components/brand/BrandWordmark";
import wordmarkChrome from "@/assets/brand/wordmark-chrome.svg";
import wordmarkCompact from "@/assets/brand/wordmark-compact.svg";
import wordmarkSplash from "@/assets/brand/wordmark-splash.svg";
import { cn } from "@/lib/utils";

const GRAPHIC = {
  splash: { src: wordmarkSplash, className: "h-[4.5rem] w-auto max-w-[min(100%,17rem)]" },
  header: { src: wordmarkCompact, className: "h-7 w-auto" },
  chrome: { src: wordmarkChrome, className: "h-6 w-auto" },
  icon: { src: wordmarkChrome, className: "h-5 w-auto" },
} as const satisfies Record<BrandWordmarkSize, { src: string; className: string }>;

/** SVG wordmark — reliable on iOS where sub-10px HTML text often disappears. */
export function BrandWordmarkGraphic({
  size = "splash",
  className,
}: {
  size?: BrandWordmarkSize;
  className?: string;
}) {
  const graphic = GRAPHIC[size];

  return (
    <img
      src={graphic.src}
      alt="Veyvio Driver"
      className={cn("brand-wordmark-graphic block shrink-0 select-none", graphic.className, className)}
      decoding="async"
      draggable={false}
    />
  );
}
