import { PAGE_CHANGED_ON, type IndexablePath } from "./pages";

const BASE_URL = "https://www.muscleboxpro.com";

export const OG_IMAGE_URL = `${BASE_URL}/og-image.jpg`;

export function webPageSchemas({ path, crumb, title, description, imageAlt }: { path: IndexablePath; crumb: string; title: string; description: string; imageAlt: string }) {
  const url = `${BASE_URL}${path}`;
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE_URL}/` },
      { "@type": "ListItem", position: 2, name: crumb, item: url },
    ],
  };
  const webPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    inLanguage: "en-IN",
    isPartOf: { "@id": `${BASE_URL}/#website` },
    publisher: { "@id": `${BASE_URL}/#organization` },
    breadcrumb: { "@id": `${url}#breadcrumb` },
    dateModified: PAGE_CHANGED_ON[path],
    primaryImageOfPage: { "@type": "ImageObject", url: OG_IMAGE_URL, width: 1200, height: 800, caption: imageAlt },
  };
  return [breadcrumb, webPage] as const;
}
