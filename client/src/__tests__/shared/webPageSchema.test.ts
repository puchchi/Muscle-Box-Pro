import { describe, expect, it } from "vitest";
import { PAGE_CHANGED_ON } from "@shared/seo/pages";
import { webPageSchemas } from "@shared/seo/webPage";

describe("webPageSchemas", () => {
  it("links the breadcrumb and page to the layout's site graph, dated from the sitemap table", () => {
    const [breadcrumb, page] = webPageSchemas({ path: "/join", crumb: "Join", title: "T", description: "D", imageAlt: "A" });
    expect(breadcrumb.itemListElement.map((i) => i.item)).toEqual(["https://www.muscleboxpro.com/", "https://www.muscleboxpro.com/join"]);
    expect(page.breadcrumb["@id"]).toBe(breadcrumb["@id"]);
    expect(page.isPartOf["@id"]).toBe("https://www.muscleboxpro.com/#website");
    expect(page.dateModified).toBe(PAGE_CHANGED_ON["/join"]);
  });
});
