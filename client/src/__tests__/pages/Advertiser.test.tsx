import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/advertise"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

/**
 * This file had no framer-motion mock, so it ran the real library — and the page wraps
 * its form and its confirmation in `<AnimatePresence mode="wait">`, which holds the
 * incoming panel until the outgoing one finishes exiting. Under happy-dom that exit
 * never finishes, so the panel a test was waiting for simply never arrived.
 */
vi.mock("framer-motion", () => import("@/test/framerMotion"));

vi.mock("@/lib/auth", () => ({ hasAccessTokenSync: vi.fn(() => false) }));

const { mockFunctionsInvoke } = vi.hoisted(() => ({
  mockFunctionsInvoke: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: mockFunctionsInvoke },
  },
}));

import Advertiser from "@/pages/Advertiser";

describe("Advertiser page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<Advertiser />);
  });

  it("shows REACH ACTIVE USERS heading", () => {
    render(<Advertiser />);
    expect(screen.getByText(/reach active users/i)).toBeInTheDocument();
  });

  it("shows the three feature cards", () => {
    render(<Advertiser />);
    expect(screen.getAllByText(/captive audience/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/hd displays/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/high conversion/i).length).toBeGreaterThan(0);
  });

  it("shows Start Your Campaign section", () => {
    render(<Advertiser />);
    expect(screen.getByText(/start your campaign/i)).toBeInTheDocument();
  });

  it("renders brand name, email and mobile inputs", () => {
    render(<Advertiser />);
    expect(screen.getByPlaceholderText(/nike, gymshark/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/marketing@brand\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+91 98765 43210/)).toBeInTheDocument();
  });

  it("renders CONTACT FOR PRICING button", () => {
    render(<Advertiser />);
    expect(screen.getByRole("button", { name: /contact for pricing/i })).toBeInTheDocument();
  });

  it("calls campaign-request with correct payload", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Our advertising team will contact you shortly." },
      error: null,
    });
    render(<Advertiser />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/nike, gymshark/i), "FitBrand");
    await user.type(screen.getByPlaceholderText(/marketing@brand\.com/i), "ads@fitbrand.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.click(screen.getByRole("button", { name: /contact for pricing/i }));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "campaign-request",
        expect.objectContaining({
          body: expect.objectContaining({
            brandName: "FitBrand",
            email: "ads@fitbrand.com",
            mobile: "9876543210",
          }),
        })
      );
    });
  });

  /**
   * The confirmation copy is the page's own, not the edge function's — `data.message`
   * is discarded. This test used to mock a message and then assert that message, so it
   * was asserting the mock rather than the page.
   */
  it("shows its own confirmation after submission, not the function's message", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "ignored by the page" },
      error: null,
    });
    render(<Advertiser />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/nike, gymshark/i), "FitBrand");
    await user.type(screen.getByPlaceholderText(/marketing@brand\.com/i), "ads@fitbrand.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.click(screen.getByRole("button", { name: /contact for pricing/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /inquiry received/i })).toBeInTheDocument();
    });
    expect(screen.getByText(/reach out within 24 hours/i)).toBeInTheDocument();
    expect(screen.queryByText(/ignored by the page/i)).toBeNull();
  });

  it("shows error message when edge function fails", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: new Error("Unable to process request."),
    });
    render(<Advertiser />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/nike, gymshark/i), "FitBrand");
    await user.type(screen.getByPlaceholderText(/marketing@brand\.com/i), "ads@fitbrand.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.click(screen.getByRole("button", { name: /contact for pricing/i }));

    await waitFor(() => {
      expect(screen.getByText(/unable to process request/i)).toBeInTheDocument();
    });
  });

  it("shows SUBMITTING... while waiting for response", async () => {
    let resolve!: (v: unknown) => void;
    mockFunctionsInvoke.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<Advertiser />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/nike, gymshark/i), "FitBrand");
    await user.type(screen.getByPlaceholderText(/marketing@brand\.com/i), "ads@fitbrand.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.click(screen.getByRole("button", { name: /contact for pricing/i }));

    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();

    resolve({ data: { message: "Done." }, error: null });
  });

  /**
   * Success unmounts the form, so the old version of this test held a reference to a
   * detached input and asked whether it was empty — a question with no bearing on what
   * the user sees, and one that failed whether or not the page cleared its state.
   *
   * "Submit Another Inquiry" is what makes the clearing observable, and what makes it
   * matter: a brand that comes back to the form and finds its previous entry still
   * there sends us the same inquiry twice.
   */
  it("returns to an empty form when asked to submit another inquiry", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Done." },
      error: null,
    });
    render(<Advertiser />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/nike, gymshark/i), "FitBrand");
    await user.type(screen.getByPlaceholderText(/marketing@brand\.com/i), "ads@fitbrand.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.click(screen.getByRole("button", { name: /contact for pricing/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit another inquiry/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /submit another inquiry/i }));

    expect(screen.getByPlaceholderText(/nike, gymshark/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/marketing@brand\.com/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/\+91 98765 43210/)).toHaveValue("");
  });
});
