import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
  usePathname: vi.fn(() => "/onboarding/demo"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

/** The in-memory double, as in [OnboardingFlow.test.tsx](./OnboardingFlow.test.tsx). */
vi.mock("@/lib/onboardingApi", async () => {
  const { createMockOnboardingApi } = await import("@shared/onboarding/mockApi");
  return { onboardingApi: createMockOnboardingApi() };
});

import { DEMO_TOKEN, resetMockOnboarding } from "@shared/onboarding/mockApi";
import { onboardingApi } from "@/lib/onboardingApi";
import OnboardingFlow from "@/pages/onboarding/OnboardingFlow";

/**
 * What step 1 does when the *server* rejects it.
 *
 * Every other case in the suite runs against the in-memory double, which validates with the
 * same schema the form does — so by construction it cannot produce the case this file is about: a submit
 * the client was happy with and the API was not. That is not a hypothetical. Both of
 * 2026-08-24's schema changes (a blank GSTIN, an `unregistered` entity type) reached the
 * frontend before the deployed API, and the sandbox refused them with exactly the payload
 * stubbed below — so this is the shape of a real screenshot, not an invented one.
 *
 * It is also the divergence the design is *meant* to survive. `schema.ts` says a
 * server-side rule the client does not know about is "a form that fails on submit for no
 * visible reason", and these tests pin the visible reason: one red box, naming the field,
 * with a way to it.
 */

/** The AWS sandbox's own words, verbatim, for a blank GSTIN on 2026-08-24. */
const SERVER_REJECTION = {
  ok: false as const,
  error: {
    code: "validation" as const,
    message: "Please check the highlighted fields.",
    fieldErrors: { gstin: "GSTIN is required." },
  },
};

beforeEach(() => {
  resetMockOnboarding();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Fills what the seeded record leaves blank, GSTIN excepted, and submits. */
async function submitWithoutGstin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByTestId("input-legalEntityName"),
    "Iron Temple Fitness Private Limited",
  );
  await user.type(
    screen.getByTestId("input-registeredAddress"),
    "12 MG Road, Indiranagar, Bengaluru, Karnataka 560038",
  );
  await user.type(screen.getByTestId("input-signatoryName"), "Rohit Menon");
  await user.type(screen.getByTestId("input-signatoryDesignation"), "Director");
  await user.click(screen.getByTestId("button-continue"));
}

/** The same, GSTIN included, so the mock accepts it and the flow reaches step 2. */
async function submitWithGstin(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId("input-gstin"), "29AABCU9603R1ZM");
  await submitWithoutGstin(user);
}

async function open() {
  const user = userEvent.setup();
  render(<OnboardingFlow token={DEMO_TOKEN} />);
  await waitFor(() => expect(screen.queryByTestId("onboarding-loading")).not.toBeInTheDocument());
  return user;
}

describe("StepDetails — a rejection from the server", () => {
  it("shows one error box rather than the server's sentence stacked on top of the summary", async () => {
    vi.spyOn(onboardingApi, "submitDetails").mockResolvedValue(SERVER_REJECTION);
    const user = await open();
    await submitWithoutGstin(user);

    // The summary is the one that survives, because it is the one that says which field.
    await waitFor(() => expect(screen.getByTestId("details-error-summary")).toBeInTheDocument());
    expect(screen.queryByTestId("action-error")).not.toBeInTheDocument();
    // And therefore one announcement, not two racing ones.
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("names the field once, not twice, when the server's message already leads with it", async () => {
    vi.spyOn(onboardingApi, "submitDetails").mockResolvedValue(SERVER_REJECTION);
    const user = await open();
    await submitWithoutGstin(user);

    const summary = within(await screen.findByTestId("details-error-summary"));
    // "GSTIN is required.", not "GSTIN — GSTIN is required."
    expect(summary.getByRole("button", { name: "GSTIN is required." })).toBeInTheDocument();
  });

  it("takes focus, so the field it names is the next thing a keyboard reaches", async () => {
    vi.spyOn(onboardingApi, "submitDetails").mockResolvedValue(SERVER_REJECTION);
    const user = await open();
    await submitWithoutGstin(user);

    /*
      The summary arrives a round trip after the submit that caused it, which is the part
      that used to be missed: an effect keyed on `submitCount` alone had already run, on a
      render where this node did not exist yet. Focus landing here is the proof it did not.
    */
    await waitFor(() => expect(screen.getByTestId("details-error-summary")).toHaveFocus());

    await user.tab();
    expect(screen.getByRole("button", { name: "GSTIN is required." })).toHaveFocus();
  });

  it("keeps the banner for a field this form does not collect, rather than swallowing it", async () => {
    /*
      The suppression above is only safe while every named field is one the step can mark.
      `StepDetails` drops a key that is not on `GymDetails` — there is no input to attach it
      to — so a payload like this has to fall back to the banner. Silence would be a page
      whose Continue button does nothing for no stated reason.
    */
    vi.spyOn(onboardingApi, "submitDetails").mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Please check the highlighted fields.",
        fieldErrors: { cinNumber: "A CIN is required." },
      },
    });
    const user = await open();
    await submitWithoutGstin(user);

    await waitFor(() => expect(screen.getByTestId("action-error")).toBeInTheDocument());
    expect(screen.getByTestId("action-error")).toHaveTextContent("Please check the highlighted fields.");
    expect(screen.queryByTestId("details-error-summary")).not.toBeInTheDocument();
  });

  /**
   * The rejection does not follow the gym to another step.
   *
   * "Please check the highlighted fields." above step 2, which has no fields on it at all,
   * and no highlighting anywhere on the screen. `actionError` used to live until the *next*
   * action ran, so a rejected correction on step 1 followed by a click on the rail carried
   * the banner forward. Cleared in `goToStep` now.
   */
  it("does not carry the rejection to a step with no fields on it", async () => {
    const user = await open();
    await submitWithGstin(user);
    await waitFor(() => expect(screen.getByTestId("terms-list")).toBeInTheDocument());

    // Back to step 1, where a correction is now refused by the server.
    vi.spyOn(onboardingApi, "submitDetails").mockResolvedValue(SERVER_REJECTION);
    await user.click(screen.getByTestId("button-back"));
    await user.click(screen.getByTestId("button-continue"));
    await waitFor(() => expect(screen.getByTestId("details-error-summary")).toBeInTheDocument());

    await user.click(screen.getByTestId("rail-step-2"));

    expect(screen.getByTestId("terms-list")).toBeInTheDocument();
    expect(screen.queryByTestId("action-error")).not.toBeInTheDocument();
  });
});
