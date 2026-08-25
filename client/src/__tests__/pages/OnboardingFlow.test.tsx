import { describe, it, expect, beforeEach, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

import {
  createMockOnboardingApi,
  DEMO_TOKEN,
  MOCK_TOKENS,
  resetMockOnboarding,
} from "@shared/onboarding/mockApi";
import { STEP_META } from "@shared/onboarding/steps";
import { markReturnedFromGateway, rememberPaymentAttempt } from "@/lib/depositReturn";
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

/** Steps 1 to 3, ending on step 4 with the agreement signed. */
async function signTheAgreement(user: ReturnType<typeof userEvent.setup>) {
  await completeDetails(user);
  await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
  await user.click(screen.getByTestId("button-continue"));
  await waitFor(() => expect(screen.getByTestId("agreement-body")).toBeInTheDocument());
  // Awaited rather than asserted: the panel is locked until the reading gate reports the
  // document scrolled, which happens an effect after `agreement-body` first paints.
  await waitFor(() => expect(screen.getByTestId("button-sign")).toBeEnabled());
  await user.click(screen.getByTestId("checkbox-agreed"));
  await user.click(screen.getByTestId("button-sign"));
  await waitFor(() => expect(screen.getByTestId("deposit-amount")).toBeInTheDocument());
}

describe("OnboardingFlow — opening a link", () => {
  it("shows a loading state, then step 1 with the gym's name", async () => {
    render(<OnboardingFlow token={DEMO_TOKEN} />);
    expect(screen.getByTestId("onboarding-loading")).toBeInTheDocument();

    await waitFor(() => expect(screen.getByTestId("progress-rail")).toBeInTheDocument());
    expect(screen.getByTestId("header-gym-name")).toHaveTextContent("Iron Temple Fitness");
    // On a first pass the introduction is the page header, so the `h1` is the welcome
    // rather than the step title — which the rail, its mobile line and the intro's own
    // step list were all already saying. See `showIntro` in OnboardingFlow.
    expect(
      screen.getByRole("heading", { level: 1, name: "Let's get Iron Temple Fitness set up" }),
    ).toBeInTheDocument();
    // Whichever header renders, there is exactly one of them.
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
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
    for (const step of [2, 3, 4, 5, 6]) {
      expect(screen.getByTestId(`rail-step-${step}`)).toBeDisabled();
    }
  });

  it("says where the gym is on a phone as well as on a desktop", async () => {
    await open();
    expect(screen.getByTestId("mobile-step-title")).toHaveTextContent("Confirm your details");
    expect(screen.getByText(`Step 1 of ${STEP_META.length}`)).toBeInTheDocument();
  });

  /**
   * The phone's one bar and the desktop's row of them have to be the same measurement.
   *
   * The bar was drawn from `completedSteps.length`, so on step 2 with step 1 behind it the
   * desktop rail filled two while the phone filled one — and the phone is the layout where
   * the bar is the only sense of progress there is room for. Asserted at step 1 as well as
   * step 2, because the bug was invisible at the first step (0 done, 1 filled, both one
   * step apart) and only opened up as the flow ran.
   *
   * The denominator comes from `STEP_META` rather than being written out, so adding a step
   * moves this test's expectation with the rail instead of failing it.
   */
  it("fills the phone's bar by the same rule the desktop rail's bars use", async () => {
    const user = await open();
    expect(screen.getByTestId("mobile-progress-bar")).toHaveStyle({
      transform: `scaleX(${1 / STEP_META.length})`,
    });

    await completeDetails(user);
    await waitFor(() =>
      expect(screen.getByTestId("rail-step-2")).toHaveAttribute("aria-current", "step"),
    );
    // Step 1 done and step 2 on screen: two, not one.
    expect(screen.getByTestId("mobile-progress-bar")).toHaveStyle({
      transform: `scaleX(${2 / STEP_META.length})`,
    });
  });
});

describe("OnboardingFlow — step 1 to step 2", () => {
  it("refuses to advance on an invalid GSTIN and stays on step 1", async () => {
    const user = await open();
    await user.type(screen.getByTestId("input-legalEntityName"), VALID.legalEntityName);
    await user.type(screen.getByTestId("input-gstin"), "NOT-A-GSTIN");
    await user.click(screen.getByTestId("button-continue"));

    // Twice on purpose: once under the field, and once in the summary at the top of the
    // form. Eleven fields do not fit a screen, so a rejected submit that only marked the
    // input left the button looking broken and the reason two scrolls away.
    await waitFor(() => expect(screen.getByTestId("details-error-summary")).toBeInTheDocument());
    const summary = within(screen.getByTestId("details-error-summary"));
    expect(summary.getByText(/15-character GSTIN/)).toBeInTheDocument();
    expect(screen.getAllByText(/15-character GSTIN/)).toHaveLength(2);
    // Not colour alone: the input says it is the invalid one.
    expect(screen.getByTestId("input-gstin")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByTestId("input-legalEntityName")).toBeInTheDocument();

    // And the summary is a way back to the field, not just a list of complaints.
    await user.click(summary.getByRole("button", { name: /GSTIN/ }));
    expect(screen.getByTestId("input-gstin")).toHaveFocus();
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

  /**
   * GSTIN became optional on 2026-08-24 and this is the half of it that is easy to get wrong: the
   * label can say "Optional" while the resolver still refuses to submit, and the only symptom is a
   * Continue button that does nothing. So the assertion is reaching step 2, not the absence of a
   * message.
   *
   * The malformed case above still stands unchanged, which is the point of the pair — blank bills
   * nobody, a transposed digit bills the wrong entity for the whole term.
   */
  it("advances with the GSTIN left blank, because it is an invoicing field and not a contractual one", async () => {
    const user = await open();
    await user.type(screen.getByTestId("input-legalEntityName"), VALID.legalEntityName);
    await user.type(screen.getByTestId("input-registeredAddress"), VALID.registeredAddress);
    await user.type(screen.getByTestId("input-signatoryName"), VALID.signatoryName);
    await user.type(screen.getByTestId("input-signatoryDesignation"), VALID.signatoryDesignation);
    expect(screen.getByTestId("input-gstin")).toHaveValue("");
    await user.click(screen.getByTestId("button-continue"));

    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    expect(screen.queryByTestId("details-error-summary")).not.toBeInTheDocument();
  });

  // Removed 2026-08-24. The field stays on `GymDetails` so old values round-trip, which is exactly
  // why this is asserted on the DOM: nothing about the type or the schema would notice the input
  // coming back.
  it("does not ask for an FSSAI licence number", async () => {
    await open();
    expect(screen.queryByTestId("input-fssaiLicenceNumber")).not.toBeInTheDocument();
    expect(screen.queryByText(/FSSAI/)).not.toBeInTheDocument();
  });

  /**
   * Added 2026-08-24. A gym with no registered entity behind it used to have to claim
   * `proprietorship`, which names a constitution someone could be asked to evidence.
   *
   * Submitted rather than only counted in the list, because the enum lives in three places — this
   * schema, `shared/admin/gymsSchema.ts` and `ENTITY_TYPES` in the backend — and the ones that
   * refuse an unknown value are not the one the dropdown is built from.
   */
  it("offers a not-registered entity type, and accepts it", async () => {
    const user = await open();
    const select = screen.getByTestId("select-entity-type");
    expect(within(select).getByRole("option", { name: "Not registered / individual" })).toBeInTheDocument();

    await user.selectOptions(select, "unregistered");
    await user.type(screen.getByTestId("input-legalEntityName"), "Rohit Menon");
    await user.type(screen.getByTestId("input-registeredAddress"), VALID.registeredAddress);
    await user.type(screen.getByTestId("input-signatoryName"), VALID.signatoryName);
    await user.type(screen.getByTestId("input-signatoryDesignation"), "Proprietor");
    await user.click(screen.getByTestId("button-continue"));

    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
  });

  it("shows the legal name in the agreement preview as it is typed", async () => {
    const user = await open();
    await user.type(screen.getByTestId("input-legalEntityName"), VALID.legalEntityName);
    expect(screen.getByTestId("preview-legal-name")).toHaveTextContent(VALID.legalEntityName);
  });

  // The preview is only useful if it is on screen while the name is being typed, and it
  // spent a while as a card of its own above the whole form — where a phone had scrolled
  // it off the top by the time anyone reached the field. Asserting the grouping rather
  // than the pixels: same fieldset means same viewport at every width.
  it("keeps the agreement preview in the same group as the field it previews", async () => {
    await open();
    const group = screen.getByTestId("input-legalEntityName").closest("fieldset");
    expect(group).not.toBeNull();
    expect(group).toContainElement(screen.getByTestId("agreement-preview"));
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
    // And the step's own title takes the `h1` back, rather than the page losing its
    // header along with the introduction that was carrying it.
    expect(
      screen.getByRole("heading", { level: 1, name: "Confirm your details" }),
    ).toBeInTheDocument();
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

  /**
   * The five restrictions, in the words a gym owner will meet them in.
   *
   * Asserted by their text and not by a "§3" chip: the chips used to sit beside each
   * numeral and were removed on purpose (see `RESTRICTIONS` in `StepPartnership`), on the
   * grounds that two markers per row pushed the sentence 80px in and a gym reading a
   * plain-language summary is not the reader who wants a citation. The clause each phrase
   * summarises is named here so this test still pins the mapping the screen no longer
   * shows — the data keeps `clause`, and this is what stops the list quietly losing one.
   */
  const RESTRICTIONS_IN_DOCUMENT_ORDER = [
    { clause: "§3", phrase: "stays our property" },
    { clause: "§5.6", phrase: "deposit can be drawn against" },
    { clause: "§12.4", phrase: "persistently underperforms" },
    { clause: "§14", phrase: "cannot open the machine" },
    { clause: "§21", phrase: "cannot move the machine" },
  ];

  it("shows the uncomfortable parts rather than leaving them to the contract", async () => {
    await reachStepTwo();
    const block = screen.getByTestId("worth-knowing");
    for (const { phrase } of RESTRICTIONS_IN_DOCUMENT_ORDER) {
      expect(block).toHaveTextContent(phrase);
    }
  });

  /**
   * Document order, and a count derived from the list.
   *
   * A gym owner checking this summary against the real thing scrolls the agreement, and
   * the agreement is in numerical order — so a list that runs §3, §14, §21, §12.4, §5.6
   * asks them to scroll back twice and reads as no order at all. That property outlived
   * the visible chips: the order is the reason the mapping above is worth pinning. The
   * count in the sentence above the list is derived from the list for the same reason "In
   * short" derives its own: a hardcoded "All five" is the one claim that goes stale
   * silently.
   */
  it("lists the restrictions in the order the agreement does, and counts them itself", async () => {
    await reachStepTwo();
    const block = screen.getByTestId("worth-knowing");
    const text = block.textContent ?? "";
    const positions = RESTRICTIONS_IN_DOCUMENT_ORDER.map(({ phrase }) => text.indexOf(phrase));
    expect(positions.every((at) => at >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(block).toHaveTextContent("The 5 restrictions");

    // Numbered, and an `ol` rather than a `ul` painted to look like one: the sentence
    // says there are five, so the list has to let a reader count them. Read off the first
    // cell of each row rather than the block's text, which is prose with digits in it.
    const rows = block.querySelectorAll("ol > li");
    expect(rows).toHaveLength(5);
    expect([...rows].map((row) => row.firstElementChild?.textContent)).toEqual([
      "1.",
      "2.",
      "3.",
      "4.",
      "5.",
    ]);
  });

  it("describes the machine from the shared spec and what the gym has to provide", async () => {
    await reachStepTwo();
    expect(screen.getByTestId("machine-model")).toHaveTextContent("MuscleBoxPro MBP-1");
    // Spelled out rather than "76×60×180", because the question is whether it fits.
    expect(screen.getByTestId("machine-panel")).toHaveTextContent("180 cm tall");
    expect(screen.getByTestId("what-we-need")).toBeInTheDocument();
    // The survey is on the timeline, and the timeline says whose move each step is — two
    // of the five are the gym's, which is the question a reader brings to this list.
    const timeline = screen.getByTestId("timeline");
    expect(timeline).toHaveTextContent("We survey the site");
    expect(timeline).toHaveTextContent("You sign");
    expect(timeline).toHaveTextContent("You pay the deposit");
  });

  /**
   * The machine photo is a 1.9 MB PNG shown at 128px wide on a desktop.
   *
   * `srcset` is the property that matters rather than which component produced it: it is
   * what lets the browser fetch a thumbnail-sized AVIF instead of the full render, and a
   * plain `<img src>` emits none. Asserted because the cost is invisible on a fast
   * connection and this page is opened from an email, on a phone, on mobile data.
   */
  it("offers the machine photo in sizes a phone can afford", async () => {
    await reachStepTwo();
    const photo = screen.getByAltText("MuscleBoxPro MBP-1 protein shake machine");
    expect(photo).toHaveAttribute("srcset");
    expect(photo).toHaveAttribute("loading", "lazy");
  });

  /**
   * "20% → 50%" is the only figure on this step whose meaning is in a glyph.
   *
   * An arrow is not a word: read out, the card becomes "20% 50%" over a label that does
   * not say which comes first, and that is the number a gym would repeat back to a
   * business partner.
   */
  it("says the profit share rises, for a reader who cannot see the arrow", async () => {
    await reachStepTwo();
    expect(screen.getByTestId("terms-cards")).toHaveTextContent("20% rising to 50%");
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
  /**
   * Step 2 offers its own way back, and step 1 is really editable when reached through it.
   *
   * Both halves matter. The rail could already navigate, but it scrolls off the top of a
   * six-panel page, and it used to land on a step 1 whose every input was disabled — so the
   * answer to "that entity name is wrong" was to email us. The name is the field the signature
   * hash covers, which makes it the one worth being able to fix without an amendment.
   */
  it("lets a gym go back from step 2 and actually correct step 1", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    await user.click(screen.getByTestId("button-back"));

    const name = screen.getByTestId("input-legalEntityName");
    expect(name).toBeEnabled();
    expect(name).toHaveValue(VALID.legalEntityName);
    // The banner has to say the fields are live, not "nothing here can be changed".
    expect(screen.getByTestId("reviewing-banner")).toHaveTextContent(/change whatever you need/i);

    await user.clear(name);
    await user.type(name, "Iron Temple Wellness Private Limited");
    await user.click(screen.getByTestId("button-continue"));

    // Submitting a correction lands back on step 2 rather than stranding them on step 1:
    // `run` clears the view override, so the server's step is what renders.
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    expect(screen.getByTestId("header-gym-name")).toHaveTextContent("Iron Temple Fitness");

    // And the correction stuck, rather than the form having been decorative.
    await user.click(screen.getByTestId("rail-step-1"));
    expect(screen.getByTestId("input-legalEntityName")).toHaveValue(
      "Iron Temple Wellness Private Limited",
    );
  });

  it("does not welcome a returning gym to the flow a second time", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    await user.click(screen.getByTestId("button-back"));

    // `showIntro` keys off `completedSteps`, not off the form being editable — otherwise an
    // editable revisit brings back "Let's get you set up" over a form already submitted once.
    expect(screen.queryByTestId("onboarding-intro")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Confirm your details" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  /**
   * The window closes when step 2 is acknowledged, and the UI has to close with it.
   *
   * The server's ladder is what decides this: a step 1 commit writes `details_submitted`, and
   * `forwardOnlyCondition` refuses to write that onto a row already at `partnership_ack`, which
   * comes back as `wrong_step`. An enabled form here would be a gym typing a correction into a
   * page that answers "Please complete the earlier steps first" — see `DETAILS_EDITABLE_FROM`.
   */
  it("renders step 1 read-only once step 2 is acknowledged and the server would refuse it", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("rail-step-3")).toHaveAttribute("aria-current", "step"));

    await user.click(screen.getByTestId("rail-step-1"));

    expect(screen.getByTestId("reviewing-banner")).toHaveTextContent(
      /nothing here can be changed/i,
    );
    expect(screen.getByTestId("input-legalEntityName")).toBeDisabled();
    // No Continue button on a step that cannot be submitted — a disabled one reads
    // like a bug rather than like "you already did this".
    expect(screen.queryByTestId("button-continue")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("button-return-to-current"));
    expect(screen.getByTestId("agreement-body")).toBeInTheDocument();
  });

  it("offers no way back from a step 2 that is itself being revisited", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("rail-step-3")).toHaveAttribute("aria-current", "step"));

    await user.click(screen.getByTestId("rail-step-2"));

    // The whole action row goes with `readOnly`, and it should: from here step 1 is behind an
    // acknowledgement, so a button promising a trip back to edit it would promise a read-only page.
    expect(screen.getByTestId("terms-list")).toBeInTheDocument();
    expect(screen.queryByTestId("button-back")).not.toBeInTheDocument();
  });

  // Each step carries its state in sr-only text beside the number, because the colour of
  // a circle is not information. Going back was exactly when that text lied: `canView`
  // also allows the step the server is on, which is by definition not in
  // `completedSteps`, so the one step the gym was being invited to return to announced
  // itself as "not available yet" on a button that worked.
  it("does not call the step it is working on unavailable", async () => {
    const user = await open();
    await completeDetails(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    await user.click(screen.getByTestId("rail-step-1"));

    const current = screen.getByTestId("rail-step-2");
    expect(current).toBeEnabled();
    expect(current).toHaveTextContent(/in progress/);
    expect(screen.getByTestId("rail-step-1")).toHaveTextContent(/completed/);
    // Still the right words for a step nobody can reach yet.
    expect(screen.getByTestId("rail-step-4")).toHaveTextContent(/not available yet/);
  });
});

/**
 * "The machine will stand at the registered address."
 *
 * A convenience over two fields the agreement keeps separate — §41 serves notices at the
 * registered address, Schedule A locates the machine at the installation one. The checkbox is not
 * part of `GymDetails`, so what the tests hold is what it does to the two real values: mirrors
 * while ticked, hands the field back on untick, and submits a genuine installation address either
 * way rather than a flag the server would have to interpret.
 */
describe("OnboardingFlow — the same-address checkbox", () => {
  it("starts unticked when the two addresses differ", async () => {
    // The seeded record has an installation address and no registered one, so there is nothing
    // to infer a tick from — and a tick here would blank the address the gym already has.
    await open();
    expect(screen.getByTestId("checkbox-same-address")).not.toBeChecked();
    expect(screen.getByTestId("input-installationAddress")).toBeEnabled();
  });

  it("mirrors the registered address and locks the field while ticked", async () => {
    const user = await open();
    await user.type(screen.getByTestId("input-registeredAddress"), VALID.registeredAddress);
    await user.click(screen.getByTestId("checkbox-same-address"));

    const installation = screen.getByTestId("input-installationAddress");
    expect(installation).toHaveValue(VALID.registeredAddress);
    expect(installation).toBeDisabled();
  });

  it("keeps mirroring if the registered address is still being typed", async () => {
    // The order most people actually use it in: tick first, then finish typing. A one-shot copy
    // would leave the machine's location as whatever half-sentence was in the box at that moment.
    const user = await open();
    await user.click(screen.getByTestId("checkbox-same-address"));
    await user.type(screen.getByTestId("input-registeredAddress"), VALID.registeredAddress);

    expect(screen.getByTestId("input-installationAddress")).toHaveValue(VALID.registeredAddress);
  });

  it("hands the field back on untick, without discarding what was mirrored", async () => {
    // The gym in unit 4 of the building it is registered in: tick, untick, edit one line. The
    // registered address must not follow.
    const user = await open();
    await user.type(screen.getByTestId("input-registeredAddress"), VALID.registeredAddress);
    await user.click(screen.getByTestId("checkbox-same-address"));
    await user.click(screen.getByTestId("checkbox-same-address"));

    const installation = screen.getByTestId("input-installationAddress");
    expect(installation).toBeEnabled();
    expect(installation).toHaveValue(VALID.registeredAddress);

    await user.clear(installation);
    await user.type(installation, "Unit 4, 12 MG Road, Indiranagar, Bengaluru 560038");
    expect(screen.getByTestId("input-registeredAddress")).toHaveValue(VALID.registeredAddress);
  });

  it("submits the mirrored address as a real installation address", async () => {
    // The whole point of mirroring into the field rather than sending a flag: the server, the
    // agreement and Schedule A all see an address, and none of them has to know a box was ticked.
    const user = await open();
    await user.type(screen.getByTestId("input-legalEntityName"), VALID.legalEntityName);
    await user.type(screen.getByTestId("input-gstin"), VALID.gstin);
    await user.type(screen.getByTestId("input-registeredAddress"), VALID.registeredAddress);
    await user.click(screen.getByTestId("checkbox-same-address"));
    await user.type(screen.getByTestId("input-signatoryName"), VALID.signatoryName);
    await user.type(screen.getByTestId("input-signatoryDesignation"), VALID.signatoryDesignation);
    await user.click(screen.getByTestId("button-continue"));

    // Advancing at all is the assertion: `gymDetailsSchema` requires a full installation address,
    // so a step 2 on screen means one was submitted.
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());
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
 * Three properties, each of which a redesign could quietly drop and each of which the
 * signature's defensibility rests on: the whole document is actually rendered rather
 * than summarised, the panel does not sign on one click, and a wrong code fails visibly.
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

  it("renders the whole document with a contents index and the server's hash of it", async () => {
    await reachStepThree();
    expect(screen.getByTestId("agreement-index")).toBeInTheDocument();
    // Not an excerpt: a clause from the far end of the document, and a schedule.
    expect(screen.getByTestId("section-47")).toBeInTheDocument();
    expect(screen.getByTestId("section-Schedule H")).toBeInTheDocument();
    // Handed down by the server at issuance, so it is on screen from the first paint —
    // there is no "computing..." or "checking..." state left to wait through.
    expect(screen.getByTestId("content-hash").textContent).toMatch(/^[0-9a-f]{64}$/);
    // v2.3 carries no blocks-send marker, so the internal "can't be issued yet" panel must
    // be absent. It is not dead code: it renders again the moment a version does carry one,
    // which is what agreement-v2-3.test.ts asserts is currently not the case.
    expect(screen.queryByTestId("agreement-not-issuable")).not.toBeInTheDocument();
  });

  /**
   * Reading progress reaches a screen reader as a progressbar, not as part of a control's name.
   *
   * The figure used to be plain text inside the `<summary>` that opens the contents, which
   * made it part of that control's accessible name — so the name changed about a hundred
   * times over one read of the document, and a name that mutates while the control is
   * focused is re-announced on every change. Moving it to a `progressbar` means it is
   * available on demand and quiet in between. `100` here because happy-dom lays nothing out
   * and `useReadingPercent` deliberately treats an unmeasurable document as scrolled.
   */
  it("exposes reading progress without putting it in the contents control's name", async () => {
    await reachStepThree();
    const bar = screen.getByRole("progressbar", { name: "Agreement read" });
    /*
      Awaited, because the figure is one effect behind the paint that this test's
      `agreement-body` wait returns on: the hook measures after commit, so the bar renders
      at 0 and is at 100 on the render after. Asserting it synchronously was reading the
      first of those two renders.
    */
    await waitFor(() => expect(bar).toHaveAttribute("aria-valuenow", "100"));
    expect(bar).toHaveAttribute("aria-valuetext", "100% read");
    // The visible figure stays, and stays out of the accessible name of the summary.
    expect(screen.getByTestId("reading-progress")).toHaveAttribute("aria-hidden", "true");
    /*
      The contents control itself is asserted through the index it reveals rather than by
      `getByRole("group", { name: "Contents" })`, which cannot pass in this environment
      whatever the markup says: a `<details>` maps to `group`, but `dom-accessibility-api`
      does not implement "name a details from its summary", so the computed name is "".
      What this test is actually about is that the progress figure is not in that name, and
      the `aria-hidden` above is the assertion for it.
    */
    expect(screen.getByRole("navigation", { name: "Agreement contents" })).toBeInTheDocument();
  });

  it("will not sign until the assertion is ticked", async () => {
    const user = await reachStepThree();
    await waitFor(() => expect(screen.getByTestId("button-sign")).toBeEnabled());

    await user.click(screen.getByTestId("button-sign"));
    expect(screen.getByTestId("error-agreed")).toBeInTheDocument();
    expect(screen.getByTestId("agreement-body")).toBeInTheDocument();
    expect(screen.queryByTestId("deposit-amount")).not.toBeInTheDocument();

    await user.click(screen.getByTestId("checkbox-agreed"));
    await user.click(screen.getByTestId("button-sign"));
    await waitFor(() => expect(screen.getByTestId("deposit-amount")).toBeInTheDocument());
  });

  it("asks for assent once, and does not restate §32 beside it", async () => {
    // The §32 authority checkbox was removed on 2026-08-25. The representation is in the
    // document being agreed to, so the panel must not grow a second tick back — and it
    // must not be left claiming authority in copy that no longer collects it either.
    await reachStepThree();
    await waitFor(() => expect(screen.getByTestId("button-sign")).toBeEnabled());
    const panel = screen.getByTestId("sign-panel");
    expect(within(panel).getAllByRole("checkbox")).toHaveLength(1);
    expect(screen.getByTestId("checkbox-agreed").closest("label")).toHaveTextContent(
      "I have read and agree to this Agreement.",
    );
    expect(panel).not.toHaveTextContent(/authorised to bind/i);
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
 * (which is the entire reason for using Payment Links), and paying is the only way
 * off the step since the defer button went on 2026-08-25.
 *
 * Since §25 the pay button also *leaves* — this tab goes to the payment page and the
 * gateway sends it back. Preview has no gateway, so pressing Pay lands directly in the
 * state the tab really returns in, which is what makes these assertions possible; the
 * route itself is covered by [DepositReturn.test.tsx](./DepositReturn.test.tsx).
 *
 * And since §26 the gym presses one button and gets an outcome. There is no "check now"
 * and nothing that asks it to declare a payment, so what these tests pin is that the
 * confirmation happens on its own — and that the slow wait, which is a *revisit* rather
 * than anything the pay button leads to, still says what it is waiting for.
 */
describe("OnboardingFlow — step 4 takes the deposit", () => {
  it("states the amount and offers the agreement rather than clause numbers", async () => {
    const user = await open();
    await signTheAgreement(user);

    const panel = screen.getByTestId("deposit-amount");
    expect(panel).toHaveTextContent("₹50,000");
    expect(screen.getByTestId("deposit-status")).toHaveTextContent("Not paid yet");
    // The five clause lines came off this screen on 2026-08-25, and the clause numbers with
    // them: a "§5.6" a gym cannot open from here is not a disclosure. What replaces them is
    // one click back to the document it has just signed.
    expect(panel).not.toHaveTextContent(/§\s*5/);
    await user.click(screen.getByTestId("button-read-agreement"));
    await waitFor(() => expect(screen.getByTestId("agreement-body")).toBeInTheDocument());
  });

  it("offers paying as the only way off the step", async () => {
    const user = await open();
    await signTheAgreement(user);

    // Paying is now what completes step 4. A defer button here would put a signed gym on
    // step 5 with the ₹50,000 outstanding, which is the state this removal ended.
    expect(screen.queryByTestId("button-pay-later")).not.toBeInTheDocument();
    expect(screen.getByTestId("button-continue")).toHaveTextContent("Pay ₹50,000 now");
    expect(screen.getByTestId("deposit-amount")).not.toHaveTextContent(/pay (this|it) later/i);
  });

  it("pays and reaches the receipt with nothing to press in between", async () => {
    const user = await open();
    await signTheAgreement(user);

    await user.click(screen.getByTestId("button-continue"));

    // Asserted inside the `waitFor`, because confirming is a state this tab passes
    // *through* on its way to the receipt — a second query would race the poll.
    await waitFor(() => {
      const panel = screen.getByTestId("deposit-waiting");
      // One press, then an outcome. The manual check went on 2026-08-25: a gym cannot know
      // whether the money reached us, so a button that asks it to say so is asking for a
      // claim we would have to ignore (§26).
      expect(panel).toHaveTextContent("Confirming your payment");
      expect(panel).not.toHaveTextContent(/I've paid/i);
      expect(screen.queryByTestId("button-refresh-deposit")).not.toBeInTheDocument();
      // Nothing to press *at all* while it confirms, including the way back to the gateway:
      // pressing that ten seconds after paying is how one ₹50,000 becomes two.
      expect(screen.queryByTestId("button-open-payment")).not.toBeInTheDocument();
      // A redirect is not a payment. Until our own record moves, this is still unpaid.
      expect(screen.getByTestId("deposit-status")).toHaveTextContent("Awaiting payment");
      // One card, not three: the separate "your payment link is ready" panel went on
      // 2026-08-25 when paying started navigating this tab (§25).
      expect(screen.queryByTestId("deposit-link-panel")).not.toBeInTheDocument();
    });

    // And then it finishes by itself, on the record rather than on the redirect.
    await waitFor(() => expect(screen.getByTestId("input-portal-password")).toBeInTheDocument());
    expect(screen.getByTestId("deposit-outcome")).toHaveTextContent("Deposit received");
    expect(screen.getByTestId("deposit-receipt-no")).toHaveTextContent("MBP-DEP-");
  });

  it("hands back the reference in full when a gym comes back for it", async () => {
    const user = await open();
    await signTheAgreement(user);
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("input-portal-password")).toBeInTheDocument());

    // Back to step 4, which is the only reason to return to it: the reference is what the
    // gym quotes at refund time, two years from now.
    await user.click(screen.getByTestId("rail-step-4"));
    const receipt = await waitFor(() => screen.getByTestId("deposit-receipt"));

    // Whole, not truncated behind a `title` no touch screen can open — and what the copy
    // button hands over is the same string that is on the screen.
    const reference = within(receipt).getByText(/^MBP-DEP-/);
    await user.click(screen.getByTestId("button-copy-receipt-no"));
    expect(await navigator.clipboard.readText()).toBe(reference.textContent);
    expect(screen.getByTestId("button-copy-receipt-no")).toHaveTextContent("Copied");

    // The gateway's own word for the method, put into English.
    expect(screen.getByTestId("deposit-paid-summary")).toHaveTextContent("paid by UPI");
    // The amount is stated once. It used to be in the heading and again in a cell below it.
    expect(screen.getByTestId("deposit-paid")).not.toHaveTextContent("Deposit received: ₹");
  });

  it("keeps the forwardable link in front of a gym that reopened the page", async () => {
    const user = await open();
    await signTheAgreement(user);

    // The slow wait is a *revisit*: after the pay button this tab has left for Razorpay, so
    // "waiting for the payment" is what a gym sees when it reopens its link while somebody
    // else pays from the forwarded copy. Driven through the API for that reason — a click
    // here would be the returning tab, which is the other test.
    const api = createMockOnboardingApi();
    await api.chooseDeposit(DEMO_TOKEN, "pay_now");
    cleanup();
    await open();

    await waitFor(() => expect(screen.getByTestId("deposit-waiting")).toBeInTheDocument());
    const panel = screen.getByTestId("deposit-waiting");
    expect(panel).toHaveTextContent("Waiting for the payment");
    expect(panel).toHaveTextContent(/close the tab/);
    // Safe to hand to someone else — the reason this is a Payment Link rather than an
    // in-page checkout.
    expect(panel).toHaveTextContent(/don't have to be the one who pays/);
    expect(screen.getByTestId("deposit-status")).toHaveTextContent("Awaiting payment");
    expect(screen.queryByTestId("button-refresh-deposit")).not.toBeInTheDocument();
    // `sessionStorage` died with the tab that left, so there is no stashed payment URL — and
    // this button asks for the link again rather than being absent and stranding the gym.
    expect(screen.getByTestId("button-open-payment")).toHaveTextContent("Open the payment page");
  });

  it("confirms on what the return route hands it, not on the query string", async () => {
    const user = await open();
    await signTheAgreement(user);

    const api = createMockOnboardingApi();
    await api.chooseDeposit(DEMO_TOKEN, "pay_now");

    // What `/gym/deposit-return` leaves for this tab on the way back in: where it was, the
    // link it was sent to, and the fact that a gateway returned it. None of that can travel
    // in the URL, because the URL is one we hand to Razorpay (§25).
    rememberPaymentAttempt({
      returnTo: "/gym/onboarding/iron-temple-fitness/demo",
      paymentUrl: "https://rzp.io/i/demo",
    });
    markReturnedFromGateway();
    cleanup();
    await open();

    await waitFor(() => {
      const panel = screen.getByTestId("deposit-waiting");
      expect(panel).toHaveTextContent("Confirming your payment");
      expect(panel).toHaveTextContent(/back from Razorpay/i);
      // No advice to forward it now. Somebody has just paid; a forwarded link at this point
      // buys a second ₹50,000 and a refund conversation.
      expect(panel).not.toHaveTextContent(/don't have to be the one who pays/);
    });

    await waitFor(() => expect(screen.getByTestId("input-portal-password")).toBeInTheDocument());
    expect(screen.getByTestId("deposit-outcome")).toHaveTextContent("Deposit received");
  });
});

/**
 * The rest of the flow, end to end.
 *
 * What the walk is really for is the joins: that a signature carries a hash, that the
 * deposit clearing carries the gym to its password, and that the last step hands over to
 * the dashboard.
 */
describe("OnboardingFlow — the whole flow", () => {
  it("walks sign, pay the deposit, and set a password", async () => {
    const user = await open();
    await signTheAgreement(user);
    expect(screen.getByTestId("deposit-status")).toHaveTextContent("Not paid yet");

    await user.click(screen.getByTestId("button-continue"));
    // One press and the deposit clears itself: the mock's first read reports the money as
    // not yet seen — the common case in reality — and the second finds it.
    await waitFor(() => expect(screen.getByTestId("input-portal-password")).toBeInTheDocument());

    // Steps 1 and 2 are viewable but locked once signed.
    expect(screen.getByTestId("rail-step-1")).not.toBeDisabled();

    // What was signed is stated back, keyed to the same hash the signature carries.
    expect(screen.getByTestId("signed-confirmation")).toHaveTextContent("Rohit Menon");
    expect(screen.getByTestId("agreement-hash-short")).toHaveAttribute(
      "title",
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    expect(screen.getByTestId("deposit-outcome")).toHaveTextContent("Deposit received");
    // The second signature at installation (§6) is disclosed before anyone leaves.
    expect(screen.getByTestId("what-happens-next")).toHaveTextContent("Schedule A is signed on site");

    // A short password is caught in the browser: no round trip, and the step does not move.
    await user.type(screen.getByTestId("input-portal-password"), "short");
    await user.click(screen.getByTestId("button-continue"));
    expect(screen.getByTestId("error-portal-password")).toHaveTextContent("at least 8 characters");
    expect(screen.getByTestId("input-portal-password")).toBeInTheDocument();

    await user.clear(screen.getByTestId("input-portal-password"));
    await user.type(screen.getByTestId("input-portal-password"), "a-long-enough-password");
    await user.click(screen.getByTestId("button-continue"));

    /*
      Onto step 6, not off to `/gym/dashboard`. Creating the account used to `router.push`,
      which meant the step that tracks the installation was the one screen a gym never saw
      — so the dashboard link moved onto step 6 and this assertion moved with it. `mockPush`
      is still checked, because a redirect coming back would take the step with it.
    */
    await waitFor(() => expect(screen.getByTestId("installation-status")).toBeInTheDocument());
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Open my dashboard" })).toHaveAttribute(
      "href",
      "/gym/dashboard",
    );
  });

  /**
   * A deposit that is outstanding on a signed record.
   *
   * Since 2026-08-25 the wizard cannot produce this: step 4 has no defer button, so a
   * record only reaches step 5 unpaid when we defer or waive it for a gym that asked. The
   * copy that says so is still on steps 5 and 6, and it is still what such a gym sees, so
   * it is driven through the API the way support would and the link is reopened.
   */
  it("still says a deferred deposit is owed on steps 5 and 6", async () => {
    const user = await open();
    await signTheAgreement(user);

    const api = createMockOnboardingApi();
    await api.chooseDeposit(DEMO_TOKEN, "pay_later");
    cleanup();
    await open();
    await waitFor(() => expect(screen.getByTestId("deposit-outcome")).toBeInTheDocument());
    expect(screen.getByTestId("deposit-outcome")).toHaveTextContent("Deposit still to pay");

    await api.createAccount(DEMO_TOKEN, "a-long-enough-password");
    cleanup();
    const reopened = await open();
    await waitFor(() => expect(screen.getByTestId("installation-status")).toBeInTheDocument());
    expect(screen.getByTestId("installation-deposit-note")).toHaveTextContent(
      "Installation waits for the deposit",
    );

    // And it is one click back to paying it, rather than an instruction to find step 4.
    await reopened.click(screen.getByTestId("button-go-to-deposit"));
    expect(screen.getByTestId("deposit-amount")).toBeInTheDocument();
    expect(screen.getByTestId("deposit-deferred")).toHaveTextContent("Still outstanding");
    expect(screen.getByTestId("button-continue")).toHaveTextContent("Pay ₹50,000 now");
  });
});

/**
 * Step 6 — installation.
 *
 * The one step the gym does not do, so what is worth pinning is that nothing on it
 * pretends otherwise: it renders on a record with no unit allocated, it names the
 * particulars that used to be blanks inside the signed agreement once they exist, and it
 * says the term runs from the installation date rather than from signing (§4.1) — the most
 * common wrong assumption available at this point in the flow.
 */
describe("OnboardingFlow — step 6 tracks the installation", () => {
  /** Signs, pays the deposit, sets a password: the shortest walk to step 6. */
  async function reachStepSix() {
    const user = await open();
    await signTheAgreement(user);
    await user.click(screen.getByTestId("button-continue"));
    // Two reads before the mock's webhook lands, both on the step's own timer.
    await waitFor(() => expect(screen.getByTestId("input-portal-password")).toBeInTheDocument());
    await user.type(screen.getByTestId("input-portal-password"), "a-long-enough-password");
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("installation-status")).toBeInTheDocument());
    return user;
  }

  it("renders the empty record honestly rather than inventing a machine", async () => {
    await reachStepSix();
    expect(screen.getByTestId("installation-status")).toHaveTextContent("Allocating your machine");
    // No unit yet, so no table of particulars — a Machine ID column of dashes reads as
    // data we hold and cannot show.
    expect(screen.queryByTestId("installation-unit")).not.toBeInTheDocument();
    // §4.1, at the point it matters.
    expect(screen.getByTestId("installation-status")).toHaveTextContent(
      /term runs from the installation date/,
    );
  });

  it("does not chase a deposit that has been paid", async () => {
    // The walk to step 6 pays it now, so the amber note has nothing to say. It is what a
    // deferred record still sees — asserted in "the whole flow".
    await reachStepSix();
    expect(screen.queryByTestId("installation-deposit-note")).not.toBeInTheDocument();
  });

  /**
   * The particulars that left the agreement in v2.3.
   *
   * Machine ID, serial number and installation date were blanks on the signature page up
   * to v2.2 — fields inside a document being executed electronically, describing a unit
   * nobody had allocated. They are recorded on the Installation Certificate now, and this
   * is the gym's view of that record, so the values have to actually appear here.
   */
  it("names the unit and the date once they exist", async () => {
    const user = await reachStepSix();
    await user.click(screen.getByTestId("button-preview-advance-installation"));

    const unit = screen.getByTestId("installation-unit");
    expect(unit).toHaveTextContent("MuscleBoxPro MBP-1");
    expect(unit).toHaveTextContent("MBP-0001-01");
    expect(screen.getByTestId("installation-status")).toHaveTextContent(
      "Booking your installation date",
    );

    await user.click(screen.getByTestId("button-preview-advance-installation"));
    expect(screen.getByTestId("installation-status")).toHaveTextContent(/^Installed on /);
    // Nothing on this step is a control the gym completes: the record moved because we
    // moved it, and there is no button here that could have signed anything.
    expect(screen.queryByTestId("button-sign")).not.toBeInTheDocument();
  });

  it("offers a way to read Schedule A rather than paraphrasing it and stopping there", async () => {
    const user = await reachStepSix();
    expect(screen.getByTestId("installation-checks")).toHaveTextContent(
      /sign the Installation Certificate/,
    );
    await user.click(screen.getByTestId("button-open-agreement"));
    expect(screen.getByTestId("section-Schedule A")).toBeInTheDocument();
  });
});
