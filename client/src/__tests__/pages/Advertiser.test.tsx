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
    expect(screen.getAllByText(/4k displays/i).length).toBeGreaterThan(0);
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

  it("shows success message after submission", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Thank you! Our advertising team will contact you shortly." },
      error: null,
    });
    render(<Advertiser />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/nike, gymshark/i), "FitBrand");
    await user.type(screen.getByPlaceholderText(/marketing@brand\.com/i), "ads@fitbrand.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.click(screen.getByRole("button", { name: /contact for pricing/i }));

    await waitFor(() => {
      expect(screen.getByText(/advertising team will contact you shortly/i)).toBeInTheDocument();
    });
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

  it("clears form after successful submission", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Done." },
      error: null,
    });
    render(<Advertiser />);
    const user = userEvent.setup();

    const brandInput = screen.getByPlaceholderText(/nike, gymshark/i);
    await user.type(brandInput, "FitBrand");
    await user.type(screen.getByPlaceholderText(/marketing@brand\.com/i), "ads@fitbrand.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.click(screen.getByRole("button", { name: /contact for pricing/i }));

    await waitFor(() => {
      expect(brandInput).toHaveValue("");
    });
  });
});
