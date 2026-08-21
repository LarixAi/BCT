import { useEffect } from "react";
import { siteContact } from "@/lib/open-decisions";

type PageMetaOptions = {
  title: string;
  description?: string;
  path?: string;
  noIndex?: boolean;
};

const defaultDescription =
  "Connect bookings, drivers, vehicles, yard operations, maintenance and compliance with Veyvio—one trusted platform for passenger transport teams.";

export function usePageMeta({ title, description, path = "/", noIndex = false }: PageMetaOptions) {
  useEffect(() => {
    const fullTitle = title.includes("Veyvio") ? title : `${title} | Veyvio`;
    const metaDescription = description ?? defaultDescription;
    const canonicalUrl = `${siteContact.domain}${path === "/" ? "" : path}`;

    document.title = fullTitle;

    setMeta("name", "description", metaDescription);
    setMeta("property", "og:title", fullTitle);
    setMeta("property", "og:description", metaDescription);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:image", `${siteContact.domain}/og-image.png`);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", fullTitle);
    setMeta("name", "twitter:description", metaDescription);
    setLink("canonical", canonicalUrl);

    if (noIndex) {
      setMeta("name", "robots", "noindex, nofollow");
    } else {
      removeMeta("name", "robots");
    }
  }, [title, description, path, noIndex]);
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attr, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function removeMeta(attr: "name" | "property", key: string) {
  document.head.querySelector(`meta[${attr}="${key}"]`)?.remove();
}

function setLink(rel: string, href: string) {
  let element = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.rel = rel;
    document.head.appendChild(element);
  }
  element.href = href;
}
