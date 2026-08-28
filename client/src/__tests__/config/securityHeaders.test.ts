import { describe, it, expect, vi } from "vitest";
import nextConfig from "../../../../next.config.mjs";
import { MBP_API_BASE_URL } from "@/lib/apiClient";

/**
 * The response headers, checked here because they fail **in production only**.
 *
 * `next dev` does not apply `headers()` the way a Vercel deploy does, so a CSP that blocks
 * the onboarding API or a `Referrer-Policy` that leaks a credential is invisible locally and
 * invisible in every other test in this suite. Both of the things asserted below are load-
 * bearing security controls that a plausible tidy-up would remove without anyone noticing —
 * which is the whole reason to pin them from the outside.
 *
 * These are not tests about CSP in general. Each one names a specific thing that breaks.
 */

/** The header set Next applies to every route. */
async function headers(): Promise<Record<string, string>> {
  const rules = await nextConfig.headers!();
  const global = rules.find((rule) => rule.source === "/(.*)");
  if (!global) throw new Error("expected a rule matching every path");
  return Object.fromEntries(global.headers.map((header) => [header.key, header.value]));
}

/** One directive's source list, e.g. `connect-src` → `["'self'", "https://…"]`. */
async function directive(name: string): Promise<string[]> {
  const csp = (await headers())["Content-Security-Policy"];
  const found = csp
    .split(";")
    .map((part) => part.trim())
    .find((part) => part === name || part.startsWith(`${name} `));
  if (!found) throw new Error(`expected a ${name} directive in the CSP`);
  return found.split(/\s+/).slice(1);
}

describe("connect-src and the onboarding API", () => {
  it("allows the origin the API client actually calls", async () => {
    // The one assertion that matters: if these two drift, every wizard and dashboard
    // request is blocked by the browser in production and nowhere else. `MBP_API_BASE_URL`
    // is imported rather than typed out so the check follows the client rather than
    // restating it.
    expect(await directive("connect-src")).toContain(new URL(MBP_API_BASE_URL).origin);
  });

  it("does not allow an execute-api host", async () => {
    // Not stylistic. `www.muscleboxpro.com` and `api.muscleboxpro.com` share one
    // registrable domain, which is what makes the session cookies same-*site* and keeps
    // `SameSite=Lax`'s CSRF protection. On `execute-api.<region>.amazonaws.com` the
    // requests become cross-site, the cookies need `SameSite=None`, and that protection is
    // gone. An entry appearing here means the domain doing the security work was bypassed.
    //
    // This is the *production* config — env unset, which is what Vercel builds with. The
    // sandbox needs that host and gets it from `nonProductionApiOrigin()`, which returns
    // null here; the next test is the other half of that pair. The two together are the
    // point: the entry exists where the requests do and nowhere else.
    const sources = await directive("connect-src");
    expect(sources.filter((source) => source.includes("amazonaws.com"))).toEqual([]);
  });

  it("allows the sandbox host only when the build is pointed at it", async () => {
    // Integration testing needs a browser on `localhost:3000` to reach the sandbox stack, and
    // a static entry for it would have shipped to production. So it is derived from
    // `NEXT_PUBLIC_MBP_API_URL`, read at build time. Both halves are asserted here because
    // the risk is a well-meaning simplification that keeps the sandbox working and quietly
    // widens production's CSP — which is invisible in every other test, since only a
    // deployed build applies these headers at all.
    const sandbox = "https://6t9q5v5v97.execute-api.ap-south-1.amazonaws.com/sandbox";
    vi.stubEnv("NEXT_PUBLIC_MBP_API_URL", sandbox);
    vi.resetModules();

    const fresh = await import("../../../../next.config.mjs");
    const rules = await fresh.default.headers!();
    const csp = rules
      .find((rule) => rule.source === "/(.*)")!
      .headers.find((header) => header.key === "Content-Security-Policy")!.value;

    // The exact origin, with the stage path dropped — CSP source expressions match on
    // scheme/host/port, and a path here would restrict rather than widen. And the
    // production host stays: a build can be pointed elsewhere without losing it.
    expect(csp).toContain(new URL(sandbox).origin);
    expect(csp).toContain("https://api.muscleboxpro.com");

    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("names every origin explicitly rather than allowing a wildcard", async () => {
    const sources = await directive("connect-src");
    expect(sources).not.toContain("*");
    expect(sources.filter((source) => source.includes("*"))).toEqual([]);
  });
});

describe("the referrer policy the onboarding handle depends on", () => {
  it("never sends a path cross-origin", async () => {
    // The onboarding handle is a 30-day credential and it is *in the URL* by design. Step 4
    // sends the gym to Razorpay, and a policy that forwarded the full referrer would hand
    // the live handle to a third party. `strict-origin-when-cross-origin` sends only the
    // origin, so the path — and the handle — is stripped before it leaves.
    //
    // `mbp-backend` §4.3 cites this header as the reason the leak is already closed. That
    // makes this line a dependency of another repo's threat model, not a default worth
    // adjusting. The allowed set is the three policies that withhold the path; anything
    // else — `unsafe-url`, `origin-when-cross-origin`'s laxer cousins, no header at all —
    // reopens it.
    const policy = (await headers())["Referrer-Policy"];
    expect(["strict-origin-when-cross-origin", "no-referrer", "same-origin"]).toContain(policy);
  });

  /**
   * Every frontend route that carries a credential in its URL. Both handles are opaque
   * bearer tokens: the onboarding one is good for 30 days, and the set-password one is
   * single-use — which makes a leak there *worse*, because whoever receives the referrer can
   * spend the link, and the gym owner then meets "already used" on a link they never opened.
   *
   * A new route joining this list is the failure mode: this test names the two that exist, so
   * a third has to be added here deliberately rather than shipping with the global policy.
   */
  const CREDENTIAL_ROUTES = ["/gym/onboarding", "/gym/set-password"];

  it.each(CREDENTIAL_ROUTES)(
    "withholds even the origin on %s, which carries a credential",
    async (prefix) => {
      const rules = await nextConfig.headers!();
      const scoped = rules.filter((rule) => rule.source.startsWith(prefix));
      expect(scoped).toHaveLength(1);
      expect(scoped[0].headers).toContainEqual({ key: "Referrer-Policy", value: "no-referrer" });

      // Order is the load-bearing part and it is easy to get wrong: Next applies every
      // matching rule and the *last* `Referrer-Policy` wins. Moved above the `/(.*)` block,
      // the rule would be silently overwritten by the global default and the assertion above
      // would still pass.
      const globalIndex = rules.findIndex((rule) => rule.source === "/(.*)");
      const scopedIndex = rules.findIndex((rule) => rule.source.startsWith(prefix));
      expect(scopedIndex).toBeGreaterThan(globalIndex);
    },
  );
});
