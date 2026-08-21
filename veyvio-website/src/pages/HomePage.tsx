import { Hero } from "@/components/sections/Hero";
import { usePageMeta } from "@/hooks/usePageMeta";
import { getStructuredData } from "@/lib/site-config";
import { BelowFoldPreview } from "@/components/sections/BelowFoldPreview";

export function HomePage() {
  usePageMeta({
    title: "Veyvio | Connected Transport Management Platform",
    path: "/",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(getStructuredData()) }}
      />
      <Hero />
      <BelowFoldPreview />
    </>
  );
}
