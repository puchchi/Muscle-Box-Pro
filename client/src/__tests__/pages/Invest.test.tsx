import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/invest"),
  useRouter: vi.fn(() => ({ push: vi.fn(), replace: vi.fn() })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

vi.mock("@/components/footer/index", () => ({
  default: () => <footer data-testid="footer" />,
}));

const submitInvestorEnquiry = vi.fn();
vi.mock("@/lib/investorApi", async () => {
  // `INVESTOR_ENQUIRY_FIELDS` is what the page loops over to place a 400's field errors, so the real
  // list has to come through. Mocking it as a literal here is how the "an unlisted field is ignored"
  // test would pass while the page silently dropped a field the endpoint had marked.
  const actual = await import("@/lib/investorApi");
  return { ...actual, submitInvestorEnquiry: (...args: unknown[]) => submitInvestorEnquiry(...args) };
});

import Invest from "@/pages/Invest";

const NAME = "Rahul Sharma";
const EMAIL = "rahul@fund.com";

async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
  // By placeholder, not by label: this form's labels carry no `htmlFor`, so `getByLabelText`
  // finds nothing.
  await user.type(screen.getByPlaceholderText(NAME), NAME);
  await user.type(screen.getByPlaceholderText(EMAIL), EMAIL);
}

// By testid, because the hero CTA that scrolls down to the form says "Request Pitch Deck" too.
const submit = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByTestId("button-submit-investor-enquiry"));

describe("Invest page", () => {
  beforeEach(() => {
    submitInvestorEnquiry.mockReset();
  });

  it("renders without crashing", () => {
    render(<Invest />);
  });

  it("submits through the investor API and omits the untouched optional fields", async () => {
    submitInvestorEnquiry.mockResolvedValue({ ok: true, data: { reference: "MBP-IN-a1b2c3d4e5", emailed: true } });
    const user = userEvent.setup();
    render(<Invest />);

    await fillRequired(user);
    await submit(user);

    await waitFor(() => expect(submitInvestorEnquiry).toHaveBeenCalledTimes(1));
    // Exactly the two fields that were filled in. `firm: ""` would be a stored empty string
    // standing for "left it alone", which is the distinction the endpoint keeps.
    expect(submitInvestorEnquiry).toHaveBeenCalledWith({ name: NAME, email: EMAIL });
  });

  it("sends the optional fields that were filled in", async () => {
    submitInvestorEnquiry.mockResolvedValue({ ok: true, data: { reference: "MBP-IN-0000000001" } });
    const user = userEvent.setup();
    render(<Invest />);

    await fillRequired(user);
    await user.type(screen.getByPlaceholderText(/Sequoia, AngelList/i), "Acme Capital");
    await user.selectOptions(screen.getByRole("combobox"), "Family Office");
    await user.type(screen.getByPlaceholderText(/investment thesis/i), "Interested in the ad revenue.");
    await submit(user);

    await waitFor(() =>
      expect(submitInvestorEnquiry).toHaveBeenCalledWith({
        name: NAME,
        email: EMAIL,
        firm: "Acme Capital",
        investorType: "Family Office",
        message: "Interested in the ad revenue.",
      }),
    );
  });

  it("shows the reference, which is the string the enquirer will quote back", async () => {
    submitInvestorEnquiry.mockResolvedValue({ ok: true, data: { reference: "MBP-IN-a1b2c3d4e5", emailed: true } });
    const user = userEvent.setup();
    render(<Invest />);

    await fillRequired(user);
    await submit(user);

    expect(await screen.findByTestId("investor-receipt")).toHaveTextContent("MBP-IN-a1b2c3d4e5");
  });

  /*
   * The deck is attached to the acknowledgement the endpoint sends, so the success copy is a claim
   * about a mail that either went out or did not. Telling somebody to check an inbox nothing was sent
   * to is the one thing this state must not do, and `emailed: false` is the only signal that it wasn't.
   */
  it("does not promise an email when the acknowledgement did not send", async () => {
    submitInvestorEnquiry.mockResolvedValue({
      ok: true,
      data: { reference: "MBP-IN-a1b2c3d4e5", emailed: false, emailReason: "ses_throttled" },
    });
    const user = userEvent.setup();
    render(<Invest />);

    await fillRequired(user);
    await submit(user);

    const receipt = await screen.findByTestId("investor-receipt");
    expect(receipt).toHaveTextContent(/did not go out/i);
    expect(receipt).not.toHaveTextContent(/check your spam/i);
    // Still the reference, because the enquiry is stored either way.
    expect(receipt).toHaveTextContent("MBP-IN-a1b2c3d4e5");
  });

  /*
   * A duplicate or rate-limited submission is a 202 carrying the earlier reference and no `emailed`
   * key. That has to read as success: the acknowledgement went out ten minutes ago.
   */
  it("treats a reference with no emailed flag as a successful submission", async () => {
    submitInvestorEnquiry.mockResolvedValue({ ok: true, data: { reference: "MBP-IN-deadbeef01" } });
    const user = userEvent.setup();
    render(<Invest />);

    await fillRequired(user);
    await submit(user);

    const receipt = await screen.findByTestId("investor-receipt");
    expect(receipt).toHaveTextContent(/emailed you the pitch deck/i);
    expect(receipt).not.toHaveTextContent(/did not go out/i);
  });

  /*
   * The three optional fields are not validated in the browser, so a length the endpoint refuses is
   * only reportable by the endpoint. Before this the 400 landed in the banner alone and the applicant
   * had nothing telling them which box was too long.
   */
  it("marks the field a 400 names, including one the form does not validate itself", async () => {
    submitInvestorEnquiry.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "Some details need fixing.",
        fieldErrors: { message: "Please keep this under 2000 characters" },
      },
    });
    const user = userEvent.setup();
    render(<Invest />);

    await fillRequired(user);
    await submit(user);

    expect(await screen.findByText("Please keep this under 2000 characters")).toBeInTheDocument();
    expect(screen.getByText("Some details need fixing.")).toBeInTheDocument();
  });

  it("shows the failure banner and stays on the form when the request does not complete", async () => {
    submitInvestorEnquiry.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "We couldn't reach us just now." },
    });
    const user = userEvent.setup();
    render(<Invest />);

    await fillRequired(user);
    await submit(user);

    expect(await screen.findByText("We couldn't reach us just now.")).toBeInTheDocument();
    expect(screen.queryByTestId("investor-receipt")).not.toBeInTheDocument();
    // The typed answers survive, so a retry is one click rather than a refill.
    expect(screen.getByPlaceholderText(NAME)).toHaveValue(NAME);
  });

  it("does not call the API with an email it can already tell is invalid", async () => {
    const user = userEvent.setup();
    render(<Invest />);

    await user.type(screen.getByPlaceholderText(NAME), NAME);
    await user.type(screen.getByPlaceholderText(EMAIL), "rahul@fund");
    await submit(user);

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(submitInvestorEnquiry).not.toHaveBeenCalled();
  });

  /*
   * The endpoint recognises this list without enforcing it (`INVESTOR_TYPES` in
   * `domain/investorEnquiry.ts`), and an unrecognised value is flagged on the internal lead mail. So
   * the two lists drifting apart is not an outage, but it does quietly mislabel a lead.
   */
  it("offers the five investor types the endpoint recognises", () => {
    render(<Invest />);
    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent)
      .filter((text) => text !== "Select type...");
    expect(options).toEqual([
      "Angel Investor",
      "Venture Capital",
      "Family Office",
      "Strategic Partner",
      "Other",
    ]);
  });
});
