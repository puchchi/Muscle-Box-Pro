import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import PreferredSourceButton, {
  PreferredSourceCard,
  PREFERRED_SOURCE_LISTED,
} from "@/components/seo/PreferredSourceButton";

/*
  The gate, asserted rather than trusted to review. Google's source preferences tool returns
  "No results" for this domain, so the badge would land a reader on an empty search — and a
  Google-branded button that visibly fails costs more credibility than no button at all.

  This test is written to survive the flag being flipped on for real: it checks the two states
  agree with the flag, not that the flag has a particular value.
*/
describe("PreferredSourceButton, gated on whether Google lists the site", () => {
  it("renders nothing while the site is not a listed source", () => {
    const { container } = render(<PreferredSourceButton />);
    if (PREFERRED_SOURCE_LISTED) {
      expect(screen.getByTestId("preferred-source")).toBeInTheDocument();
    } else {
      expect(container).toBeEmptyDOMElement();
    }
  });
});

describe("PreferredSourceCard", () => {
  /*
    The one assertion that decides whether the button works at all. Google stores a preferred
    source per domain, so a `q` carrying a path or a full URL would send the reader to a tool
    that has nothing to offer them — and the link would still look fine in review.
  */
  it("asks Google to prefer the domain, with no path", () => {
    render(<PreferredSourceCard />);
    const href = screen.getByTestId("link-preferred-source").getAttribute("href") ?? "";
    expect(href).toBe("https://www.google.com/preferences/source?q=muscleboxpro.com");
    expect(href).not.toMatch(/q=[^&]*muscleboxpro\.com\//);
  });

  /*
    This is the deeplink, not Google's JavaScript widget, and the widget's one advantage is
    that it returns the reader to the article. A new tab is how that is paid for, so losing
    the attribute means an article reader is navigated off mid-read.
  */
  it("opens in a new tab so the article is not lost", () => {
    render(<PreferredSourceCard />);
    const link = screen.getByTestId("link-preferred-source");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("names the link for anyone who cannot see the badge", () => {
    render(<PreferredSourceCard />);
    expect(
      screen.getByRole("link", { name: /add as a preferred source on google/i }),
    ).toBeInTheDocument();
  });

  it("serves Google's light badge by default and the dark one on request", () => {
    const { unmount } = render(<PreferredSourceCard />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("preferred-source-light"),
    );
    unmount();

    render(<PreferredSourceCard theme="dark" />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      expect.stringContaining("preferred-source-dark"),
    );
  });

  it("explains what the click does before asking for it", () => {
    render(<PreferredSourceCard />);
    expect(screen.getByTestId("preferred-source")).toHaveTextContent(
      /preferred source .* weight in what Google shows you/i,
    );
  });
});
