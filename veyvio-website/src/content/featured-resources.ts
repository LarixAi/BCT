import { resourceArticles } from "@/content/resource-articles";

const articleByTitle = new Map(resourceArticles.map((article) => [article.title, article.path]));

export const featuredResourceLinks = [
  "Moving from paper vehicle checks",
  "Building a vehicle-damage workflow",
  "Preparing for transport software implementation",
  "Managing driver and vehicle readiness",
  "Improving end-of-shift vehicle handback",
  "Understanding operational audit evidence",
].map((title) => ({
  title,
  href: articleByTitle.get(title) ?? "/resources",
}));
