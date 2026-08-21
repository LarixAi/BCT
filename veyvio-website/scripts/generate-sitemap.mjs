import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteUrl = process.env.VITE_SITE_URL ?? "https://veyvio.co.uk";
const base = siteUrl.replace(/\/$/, "");

const paths = [
  "/",
  "/demo",
  "/contact",
  "/community-transport",
  "/platform",
  "/platform/command",
  "/platform/driver",
  "/platform/yard",
  "/platform/maintenance",
  "/platform/customer-portal",
  "/solutions",
  "/solutions/transport-operations",
  "/solutions/fleet-safety-compliance",
  "/solutions/vehicle-readiness",
  "/solutions/workforce-readiness",
  "/solutions/multi-depot",
  "/solutions/accessible-transport",
  "/solutions/audit-evidence",
  "/integrations",
  "/pricing",
  "/trust",
  "/trust/security",
  "/trust/tenant-isolation",
  "/implementation",
  "/pilot-programme",
  "/resources",
  "/resources/guides",
  "/resources/templates",
  "/resources/insights",
  "/resources/glossary",
  "/resources/faqs",
  "/resources/moving-from-paper-vehicle-checks",
  "/resources/building-a-vehicle-damage-workflow",
  "/resources/preparing-for-transport-software-implementation",
  "/resources/managing-driver-and-vehicle-readiness",
  "/resources/improving-end-of-shift-vehicle-handback",
  "/resources/understanding-operational-audit-evidence",
  "/support",
  "/status",
  "/industries",
  "/industries/community-transport",
  "/industries/dial-a-ride",
  "/industries/home-to-school",
  "/industries/send-transport",
  "/industries/local-authorities",
  "/industries/healthcare-transport",
  "/industries/charities",
  "/industries/psv",
  "/legal/privacy",
  "/legal/product-privacy",
  "/legal/cookies",
  "/legal/terms",
  "/legal/accessibility-statement",
  "/legal/vulnerability-disclosure",
  "/support",
  "/about",
  "/mission",
  "/partners",
  "/careers",
  "/customer-success",
  "/release-notes",
];

const urls = paths
  .map((path) => {
    const loc = path === "/" ? `${base}/` : `${base}${path}`;
    const priority = path === "/" ? "1.0" : "0.7";
    return `  <url><loc>${loc}</loc><changefreq>weekly</changefreq><priority>${priority}</priority></url>`;
  })
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${base}/sitemap.xml
`;

const publicOut = resolve(__dirname, "../public/sitemap.xml");
const publicRobots = resolve(__dirname, "../public/robots.txt");
writeFileSync(publicOut, xml);
writeFileSync(publicRobots, robots);

const distOut = resolve(__dirname, "../dist/sitemap.xml");
const distRobots = resolve(__dirname, "../dist/robots.txt");
try {
  writeFileSync(distOut, xml);
  writeFileSync(distRobots, robots);
} catch {
  // dist may not exist yet
}

console.log(`Sitemap: ${paths.length} URLs → public/sitemap.xml (${base})`);
