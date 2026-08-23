import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: vi.fn() })),
  usePathname: vi.fn(() => "/onboarding/demo"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

import { DEMO_TOKEN, MOCK_TOKENS, resetMockOnboarding } from "@shared/onboarding/mockApi";
import OnboardingFlow from "@/pages/onboarding/OnboardingFlow";

/**
 * The wizard shell.
 *
 * What is worth testing here is not the markup — it is the two properties the shell
 * exists to guarantee: the rendered step comes from the server's record, and closing
 * the tab loses nothing.
 *
 * Steps 1, 2, 3 and 5 have real copy now, so a few assertions below do cover content —
 * but only the parts that are load-bearing rather than decorative: that step 2 states
 * the restrictions instead of only the upside, that step 3 shows the whole agreement
 * and takes two deliberate actions to sign it, and that step 5 does not let a deferred
 * deposit disappear. Wording that can change without changing the deal is left alone.
 *
 * These run against the same in-memory mock the app uses in development, so the
 * flow is exercised end-to-end rather than against per-test stubs.
 */

const VALID = {
  legalEntityName: "Iron Temple Fitness Private Limited",
  gstin: "29AABCU9603R1ZM",
  registeredAddress: "12 MG Road, Indiranagar, Bengaluru, Karnataka 560038",
  signatoryName: "Rohit Menon",
  signatoryDesignation: "Director",
};

beforeEach(() => {
  resetMockOnboarding();
});

/** Renders and waits for the token to resolve. */
async function open(token: string = DEMO_TOKEN) {
  const user = userEvent.setup();
  render(<OnboardingFlow token={token} />);
  await waitFor(() => expect(screen.queryByTestId("onboarding-loading")).not.toBeInTheDocument());
  return user;
}

/** Fills the blanks the seeded record leaves and submits step 1. */
async function completeDetails(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("input-legalEntityName"), VALID.legalEntityName);
  await user.type(screen.getByTestId("input-gstin"), VALID.gstin);
  await user.type(screen.getByTestId("input-registeredAddress"), VALID.registeredAddress);
  await user.type(screen.getByTestId("input-signatoryName"), VALID.signatoryName);
  await user.type(screen.getByTestId("input-signatoryDesignation"), VALID.signatoryDesignation);
  await user.click(screen.getByTestId("button-continue"));
}

describe("OnboardingFlow — opening a link", () => {
  it("shows a loading state, then step 1 with the gym's name", async () => {
    render(<OnboardingFlow token={DEMO_TOKEN} />);
    expect(screen.getByTestId("onboarding-loading")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId("progress-rail")).toBeInTheDocument());
    expect(screen.getByTestId("header-gym-name")).toHaveTextContent("Iron Temple Fitness");
    // By role, because the title also appears in the mobile rail — both renderings
    // are in the DOM under test, only one of them is visible at a given width.
    expect(screen.getByRole("heading", { level: 1, name: "Confirm your details" })).toBeInTheDocument();
    expect(screen.getByTestId("input-legalEntityName")).toBeInTheDocument();
  });

  it("prefills what the sales call already established and leaves the rest blank", async () => {
    await open();
    expect(screen.getByTestId("input-tradeName")).toHaveValue("Iron Temple Fitness");
    expect(screen.getByTestId("input-legalEntityName")).toHaveValue("");
  });

  it.each([
    [MOCK_TOKENS.expired, "This link has expired"],
    [MOCK_TOKENS.revoked, "This link is no longer valid"],
    ["garbage-token", "We couldn't find this link"],
  ])("shows its own screen for %s", async (token, heading) => {
    await open(token);
    expect(screen.getByTestId("token-problem")).toBeInTheDocument();
    expect(screen.getByText(heading)).toBeInTheDocument();
    // Each terminal screen has a way out. A dead end here loses the gym entirely.
    expect(screen.getByTestId("button-token-cta")).toBeInTheDocument();
  });
});

describe("OnboardingFlow — the rail", () => {
  it("locks every step ahead of the one the server is on", async () => {
    await open();
    expect(screen.getByTestId("rail-step-1")).toHaveAttribute("aria-current", "step");
    for (const step of [2, 3, 4, 5]) {
      expect(screen.getByTestId(`rail-step-${step}`)).toBeDisabled();
    }
  });

  it("says where the gym is on a phone as well as on a desktop", async () => {
    await open();
    expect(screen.getByTestId("mobile-step-title")).toHaveTextContent("Confirm your details");
    expect(screen.getByText("Step 1 of 5")).toBeInTheDocument();
  });
});

describe("OnboardingFlow — step 1 to step 2", () => {
  it("refuses to advance on an invalid GSTIN and stays on step 1", async () => {
    const user = await open();
    await user.type(screen.getByTestId("input-legalEntityName"), VALID.legalEntityName);
    await user.type(screen.getByTestId("input-gstin"), "NOT-A-GSTIN");
    await user.click(screen.getByTestId("button-continue"));

    await waitFor(() =>
      expect(screen.getByText(/15-character GSTIN/)).toBeInTheDocument(),
    );
    expect(screen.getByTestId("input-legalEntityName")).toBeInTheDocument();
  });

  it("advances on valid details and shows that gym's own commercials", async () => {
    const user = await open();
    await completeDetails(user);

    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    expect(screen.getByRole("heading", { level: 1, name: "Your partnership" })).toBeInTheDocument();
    // Read from the terms row, not from the public page's constants at render time.
    expect(screen.getByText("₹50,000")).toBeInTheDocument();
    expect(screen.getByText("24 months")).toBeInTheDocument();
  });

  it("shows the legal name in the agreement preview as it is typed", async () => {
    const user = await open();
    await user.type(screen.getByTestId("input-legalEntityName"), VALID.legalEntityName);
    expect(screen.getByTestId("preview-legal-name")).toHaveTextContent(VALID.legalEntityName);
  });
});

describe("OnboardingFlow — the step 1 frame", () => {
  it("says who sent the link and offers the deal restated", async () => {
    await open();
    const intro = screen.getByTestId("onboarding-intro");
    expect(intro).toHaveTextContent("Anurag from MuscleBoxPro sent you this link");
    // By role: the next/link mock in this file forwards href and children only, so
    // the component's own data-testid never reaches the DOM under test.
    expect(screen.getByRole("link", { name: /The deal, restated/ })).toHaveAttribute(
      "href",
      "/gym-partnership",
    );
  });

  it("drops the introduction once step 1 is being revisited rather than done", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    await user.click(screen.getByTestId("rail-step-1"));
    expect(screen.queryByTestId("onboarding-intro")).not.toBeInTheDocument();
  });
});

/**
 * Step 2's one non-negotiable property.
 *
 * The screen can be redesigned freely, but if the restrictions ever stop being on it
 * then "I have read and agree" in step 3 is a worse statement and a §14 dispute in
 * month three is a surprise. That is what this asserts — not the wording of any one
 * bullet, but that the block is present and carries clause references someone can
 * check against the agreement itself.
 */
describe("OnboardingFlow — step 2 states the restrictions", () => {
  async function reachStepTwo() {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    return user;
  }

  it("shows the uncomfortable parts with the clauses they come from", async () => {
    await reachStepTwo();
    const block = screen.getByTestId("worth-knowing");
    for (const clause of ["§3", "§14", "§21", "§12.4", "§5.6"]) {
      expect(block).toHaveTextContent(clause);
    }
  });

  it("describes the machine from the shared spec and what the gym has to provide", async () => {
    await reachStepTwo();
    expect(screen.getByTestId("machine-model")).toHaveTextContent("MuscleBoxPro MBP-1");
    // Spelled out rather than "76×60×180", because the question is whether it fits.
    expect(screen.getByTestId("machine-panel")).toHaveTextContent("180 cm tall");
    expect(screen.getByTestId("what-we-need")).toBeInTheDocument();
    expect(screen.getByTestId("timeline")).toHaveTextContent("Site survey");
  });

  it("leads the milestone with whichever-comes-first rather than the cup count alone", async () => {
    await reachStepTwo();
    // Both tests named, in that order: a gym told "15,000 cups" and then stepped up
    // at ~4,200 has been undersold its own deal.
    expect(screen.getByTestId("terms-list")).toHaveTextContent(
      /Whichever comes first of 15,000 paid cups or ₹5,00,000/,
    );
  });
});

describe("OnboardingFlow — going back", () => {
  it("renders an earlier step read-only, with a way back to the current one", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    await user.click(screen.getByTestId("rail-step-1"));

    expect(screen.getByTestId("reviewing-banner")).toBeInTheDocument();
    expect(screen.getByTestId("input-legalEntityName")).toBeDisabled();
    // No Continue button on a step that cannot be submitted — a disabled one reads
    // like a bug rather than like "you already did this".
    expect(screen.queryByTestId("button-continue")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("button-return-to-current"));
    expect(screen.getByTestId("terms-list")).toBeInTheDocument();
  });
});

describe("OnboardingFlow — saving and resuming", () => {
  it("autosaves a draft and says so", async () => {
    const user = await open();
    await user.type(screen.getByTestId("input-legalEntityName"), "Iron Temple Fitness Pvt");

    // The debounce is 800ms; the promise the footer's claim rests on is that this
    // indicator appears without anyone pressing anything.
    await waitFor(() => expect(screen.getByTestId("draft-saved")).toBeInTheDocument(), {
      timeout: 3000,
    });
  });

  it("reopening the same link lands on the step the server is on, not step 1", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    // Stands in for closing the tab and opening the emailed link again later. The
    // step lives in the record, so the URL — unchanged — resolves to step 2.
    const { unmount } = render(<OnboardingFlow token={DEMO_TOKEN} />);
    await waitFor(() => expect(screen.getAllByTestId("terms-list").length).toBeGreaterThan(1));
    unmount();
  });

  it("restores an unsubmitted draft on reopen", async () => {
    const user = await open();
    await user.clear(screen.getByTestId("input-legalEntityName"));
    await user.type(screen.getByTestId("input-legalEntityName"), "Half Typed Name Ltd");
    await waitFor(() => expect(screen.getByTestId("draft-saved")).toBeInTheDocument(), {
      timeout: 3000,
    });

    render(<OnboardingFlow token={DEMO_TOKEN} />);
    await waitFor(() => {
      const inputs = screen.getAllByTestId("input-legalEntityName");
      expect(inputs[inputs.length - 1]).toHaveValue("Half Typed Name Ltd");
    });
  });
});

/**
 * Step 3 — the reader and the signing panel.
 *
 * Four properties, each of which a redesign could quietly drop and each of which the
 * signature's defensibility rests on: the plain-language panel is above the contract
 * and links into it, the whole document is actually rendered rather than summarised,
 * the panel does not sign on one click, and a wrong code fails visibly.
 *
 * Note on the scroll gate: happy-dom has no layout engine, so `getBoundingClientRect()`
 * returns zeros and `AgreementReader` treats an unmeasurable document as scrolled (see
 * its `rect.height === 0` branch). That is why the panel is open here without any
 * scrolling — the gate itself is not what these tests exercise.
 */
describe("OnboardingFlow — step 3 reads and signs", () => {
  async function reachStepThree() {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("agreement-body")).toBeInTheDocument());
    return user;
  }

  it("puts the plain-language clauses above the agreement, each linking into it", async () => {
    await reachStepThree();
    const inShort = screen.getByTestId("in-short");
    for (const clause of ["3", "6", "9.4", "5.6", "14", "24.6", "21", "12.4", "36.1", "34", "46"]) {
      expect(screen.getByTestId(`in-short-link-${clause}`)).toBeInTheDocument();
    }
    // The summary is a summary: it says so, so nobody can claim it stood in for the text.
    expect(inShort).toHaveTextContent("the agreement below is what binds");
    // The two terms a gym would be most annoyed to discover after signing are in the
    // panel and not only in the body: liability with no cap, and a forum in our district.
    expect(inShort).toHaveTextContent(/neither of us has a cap on liability for direct loss/i);
    expect(inShort).toHaveTextContent(/Gautam Buddha Nagar/);
  });

  it("renders the whole document with a contents index and the server's hash of it", async () => {
    await reachStepThree();
    expect(screen.getByTestId("agreement-index")).toBeInTheDocument();
    // Not an excerpt: a clause from the far end of the document, and a schedule.
    expect(screen.getByTestId("section-47")).toBeInTheDocument();
    expect(screen.getByTestId("section-Schedule H")).toBeInTheDocument();
    // Handed down by the server at issuance, so it is on screen from the first paint —
    // there is no "computing..." state left to wait through.
    expect(screen.getByTestId("content-hash").textContent).toMatch(/^[0-9a-f]{64}$/);
    // And then vouched for: this browser rendered the same text and got the same hash.
    // Without this line the test would pass against a page displaying a fingerprint of
    // some document other than the one it is showing.
    await waitFor(() => expect(screen.getByTestId("hash-verified")).toBeInTheDocument());
    // v2.2 resolved all eight of v2.1's blocking markers, so the internal "can't be
    // issued yet" panel must be absent. It is not dead code: it renders again the moment
    // a future version carries a blocks-send marker, which is what agreement-v2-2.test.ts
    // asserts is currently not the case.
    expect(screen.queryByTestId("agreement-not-issuable")).not.toBeInTheDocument();
  });

  it("will not sign until both assertions are ticked", async () => {
    const user = await reachStepThree();
    await waitFor(() => expect(screen.getByTestId("button-sign")).toBeEnabled());

    // §32 authority is a separate representation, so ticking only the first is not assent.
    await user.click(screen.getByTestId("checkbox-agreed"));
    await user.click(screen.getByTestId("button-sign"));
    expect(screen.getByTestId("error-authorised")).toBeInTheDocument();
    expect(screen.getByTestId("agreement-body")).toBeInTheDocument();
    expect(screen.queryByTestId("deposit-amount")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("checkbox-authorised"));
    await user.click(screen.getByTestId("button-sign"));
    await waitFor(() => expect(screen.getByTestId("deposit-amount")).toBeInTheDocument());
  });

  it("does not ask for a signing code it cannot verify", async () => {
    // SES is not live and the signing endpoint rejects an `otpCode`, so the panel must
    // not tell a gym we emailed and checked one. Asserted rather than left implicit,
    // because the phase is still in the file behind `SIGNING_REQUIRES_OTP` and the
    // failure mode of turning it on too early is a screen that lies.
    await reachStepThree();
    expect(screen.queryByTestId("button-request-otp")).not.toBeInTheDocument();
    expect(screen.queryByTestId("input-otp")).not.toBeInTheDocument();
    expect(screen.queryByTestId("otp-sent-to")).not.toBeInTheDocument();
  });
});

/**
 * Step 4 — the deposit.
 *
 * The money screen, so the assertions are about the properties that protect it: this
 * page never decides that a payment arrived, the link is presented as forwardable
 * (which is the entire reason for using Payment Links), and the harsh half of §5 is on
 * screen at the moment money changes hands rather than only in the contract.
 */
describe("OnboardingFlow — step 4 takes the deposit", () => {
  async function reachStepFour(user: ReturnType<typeof userEvent.setup>) {
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("agreement-body")).toBeInTheDocument());
    // Enabled only once this browser has re-rendered the document and matched the
    // server's hash — the check that replaced computing the hash here.
    await waitFor(() => expect(screen.getByTestId("button-sign")).toBeEnabled());
    await user.click(screen.getByTestId("checkbox-agreed"));
    await user.click(screen.getByTestId("checkbox-authorised"));
    await user.click(screen.getByTestId("button-sign"));
    await waitFor(() => expect(screen.getByTestId("deposit-amount")).toBeInTheDocument());
  }

  it("states what the deposit can be taken for, including the parts against the gym", async () => {
    const user = await open();
    await reachStepFour(user);

    const panel = screen.getByTestId("deposit-amount");
    // §5.6–5.7 is the harshest clause in the agreement. If it is ever only in the
    // contract and not on this screen, a forfeited deposit becomes a surprise.
    expect(panel).toHaveTextContent("§5.6–5.7");
    expect(panel).toHaveTextContent(/forfeit the whole deposit/);
    expect(panel).toHaveTextContent("§5.8");
    expect(screen.getByTestId("deposit-status")).toHaveTextContent("Not paid yet");
  });

  it("issues a forwardable link and does not mark anything paid on its own", async () => {
    const user = await open();
    await reachStepFour(user);

    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("deposit-link-panel")).toBeInTheDocument());

    // Opens off-site, in a new tab, and is safe to hand to someone else — the reason
    // this is a Payment Link rather than an in-page checkout.
    const link = screen.getByTestId("link-payment");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    expect(screen.getByTestId("deposit-link-panel")).toHaveTextContent(
      /don't have to be the one who pays/,
    );

    // Still on step 4 and still unpaid: issuing a link is not a payment.
    expect(screen.getByTestId("deposit-status")).toHaveTextContent("Awaiting payment");
    expect(screen.getByTestId("deposit-waiting")).toHaveTextContent(/close the tab/);
  });

  it("says so when it checks and the money has not landed yet", async () => {
    const user = await open();
    await reachStepFour(user);
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("button-refresh-deposit")).toBeInTheDocument());

    // First check: settlement has not reached our record. A "check" that changes
    // nothing visible reads as a broken button.
    await user.click(screen.getByTestId("button-refresh-deposit"));
    await waitFor(() =>
      expect(screen.getByTestId("deposit-waiting")).toHaveTextContent(/still can't see it/),
    );
    expect(screen.getByTestId("deposit-amount")).toBeInTheDocument();

    // Second check: the webhook has landed, so the wizard moves on by itself.
    await user.click(screen.getByTestId("button-refresh-deposit"));
    await waitFor(() => expect(screen.getByTestId("input-portal-password")).toBeInTheDocument());
    expect(screen.getByTestId("deposit-outcome")).toHaveTextContent("Deposit received");
    expect(screen.getByTestId("deposit-receipt-no")).toHaveTextContent("MBP-DEP-");
  });
});

/**
 * The rest of the flow, end to end.
 *
 * What the walk is really for is the joins: that a signature carries a hash, that
 * deferring the deposit does not orphan a signed gym, and that the last step hands over
 * to the dashboard.
 */
describe("OnboardingFlow — the whole flow", () => {
  it("walks sign, defer the deposit, and set a password", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("agreement-body")).toBeInTheDocument());

    // Enabled only once the browser has re-rendered the document and confirmed it hashes
    // to the value the server pinned at issuance.
    await waitFor(() => expect(screen.getByTestId("button-sign")).toBeEnabled());
    await user.click(screen.getByTestId("checkbox-agreed"));
    await user.click(screen.getByTestId("checkbox-authorised"));
    await user.click(screen.getByTestId("button-sign"));

    await waitFor(() => expect(screen.getByTestId("deposit-amount")).toBeInTheDocument());
    expect(screen.getByTestId("deposit-status")).toHaveTextContent("Not paid yet");

    await user.click(screen.getByTestId("button-pay-later"));
    await waitFor(() => expect(screen.getByTestId("input-portal-password")).toBeInTheDocument());

    // Steps 1 and 2 are viewable but locked once signed.
    expect(screen.getByTestId("rail-step-1")).not.toBeDisabled();

    // What was signed is stated back, keyed to the same hash the signature carries.
    expect(screen.getByTestId("signed-confirmation")).toHaveTextContent("Rohit Menon");
    expect(screen.getByTestId("agreement-hash-short")).toHaveAttribute(
      "title",
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    // A deferred deposit is still owed, and step 5 says so rather than reading like
    // the gym is done paying.
    expect(screen.getByTestId("deposit-outcome")).toHaveTextContent("Deposit still to pay");
    // The second signature at installation (§6) is disclosed before anyone leaves.
    expect(screen.getByTestId("what-happens-next")).toHaveTextContent("Schedule A is signed on site");

    // A short password is caught in the browser: no round trip, no navigation.
    await user.type(screen.getByTestId("input-portal-password"), "short");
    await user.click(screen.getByTestId("button-continue"));
    expect(screen.getByTestId("error-portal-password")).toHaveTextContent("at least 8 characters");
    expect(mockPush).not.toHaveBeenCalled();

    await user.clear(screen.getByTestId("input-portal-password"));
    await user.type(screen.getByTestId("input-portal-password"), "a-long-enough-password");
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/gym/dashboard"));
  });
});
