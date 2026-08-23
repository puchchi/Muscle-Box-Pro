import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/contact"),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

const { mockFunctionsInvoke } = vi.hoisted(() => ({
  mockFunctionsInvoke: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: mockFunctionsInvoke },
  },
}));

import ContactUs from "@/pages/ContactUs";

describe("ContactUs page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<ContactUs />);
  });

  it("shows CONTACT US heading", () => {
    render(<ContactUs />);
    expect(screen.getByRole("heading", { name: /contact us/i })).toBeInTheDocument();
  });

  it("shows contact email", () => {
    render(<ContactUs />);
    expect(screen.getByText(/contact@muscleboxpro\.com/i)).toBeInTheDocument();
  });

  // Not a bare /noida/i: the footer links a Noida landing page, so that matched twice.
  it("shows address / location info", () => {
    render(<ContactUs />);
    expect(screen.getByRole("heading", { name: /our office/i })).toBeInTheDocument();
    expect(screen.getByText(/sector 75, noida/i)).toBeInTheDocument();
  });

  it("renders Send a Message form with Name, Email and Message fields", () => {
    render(<ContactUs />);
    expect(screen.getByPlaceholderText(/your name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/how can we help/i)).toBeInTheDocument();
  });

  it("renders the SEND MESSAGE submit button", () => {
    render(<ContactUs />);
    expect(screen.getByRole("button", { name: /send message/i })).toBeInTheDocument();
  });

  it("calls contact-request edge function with correct payload", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Thanks for reaching out." },
      error: null,
    });
    render(<ContactUs />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/your name/i), "Alice");
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "alice@example.com");
    await user.type(screen.getByPlaceholderText(/how can we help/i), "I have a question.");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith("contact-request", {
        body: {
          name: "Alice",
          email: "alice@example.com",
          message: "I have a question.",
        },
      });
    });
  });

  it("shows success message after form submission", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Thanks for reaching out. We will contact you shortly." },
      error: null,
    });
    render(<ContactUs />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/your name/i), "Alice");
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "alice@example.com");
    await user.type(screen.getByPlaceholderText(/how can we help/i), "Hello!");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/thanks for reaching out/i)).toBeInTheDocument();
    });
  });

  /**
   * Success unmounts the form, so holding a reference to an input and asking whether it
   * is empty tests a detached node. "Send Another Message" is where the clearing
   * becomes visible — and where leaving it uncleared would send us a duplicate.
   */
  it("returns to an empty form when asked to send another message", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Done." },
      error: null,
    });
    render(<ContactUs />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/your name/i), "Alice");
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "alice@example.com");
    await user.type(screen.getByPlaceholderText(/how can we help/i), "Hello!");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send another message/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /send another message/i }));

    expect(screen.getByPlaceholderText(/your name/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/you@example\.com/i)).toHaveValue("");
    expect(screen.getByPlaceholderText(/how can we help/i)).toHaveValue("");
  });

  it("shows error notice when the edge function returns an error", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: new Error("Server error."),
    });
    render(<ContactUs />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/your name/i), "Alice");
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "alice@example.com");
    await user.type(screen.getByPlaceholderText(/how can we help/i), "Hello!");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
  });

  it("shows SENDING... and disables button while submitting", async () => {
    let resolve!: (v: unknown) => void;
    mockFunctionsInvoke.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<ContactUs />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/your name/i), "Alice");
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "alice@example.com");
    await user.type(screen.getByPlaceholderText(/how can we help/i), "Hello!");
    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();

    resolve({ data: { message: "Done." }, error: null });
  });
});
