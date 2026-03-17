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
  usePathname: vi.fn(() => "/gym-demo"),
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

import GymDemo from "@/pages/GymDemo";

// Helper: fill in all required fields
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/john doe/i), "John Smith");
  await user.type(screen.getByPlaceholderText(/iron paradise/i), "Power Gym");
  await user.type(screen.getByPlaceholderText(/john@example\.com/i), "john@gym.com");
  await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
  await user.type(screen.getByPlaceholderText(/city, state/i), "Delhi");
}

describe("GymDemo page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(<GymDemo />);
  });

  it("shows GET A MACHINE heading", () => {
    render(<GymDemo />);
    expect(screen.getByText(/get a machine/i)).toBeInTheDocument();
  });

  it("shows Request a Free Demo heading", () => {
    render(<GymDemo />);
    expect(screen.getByRole("heading", { name: /request a free demo/i })).toBeInTheDocument();
  });

  it("renders all form fields", () => {
    render(<GymDemo />);
    expect(screen.getByPlaceholderText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/iron paradise/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/john@example\.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+91 98765 43210/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/city, state/i)).toBeInTheDocument();
  });

  it("renders SUBMIT REQUEST button", () => {
    render(<GymDemo />);
    expect(screen.getByRole("button", { name: /submit request/i })).toBeInTheDocument();
  });

  it("shows feature bullet points", () => {
    render(<GymDemo />);
    expect(screen.getAllByText(/free installation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/revenue share model/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/zero maintenance/i).length).toBeGreaterThan(0);
  });

  it("shows validation errors when form is submitted empty", async () => {
    render(<GymDemo />);
    fireEvent.submit(
      screen.getByRole("button", { name: /submit request/i }).closest("form")!
    );

    await waitFor(() => {
      expect(screen.getAllByText(/is required/i).length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    expect(mockFunctionsInvoke).not.toHaveBeenCalled();
  });

  it("shows email validation error for invalid email", async () => {
    render(<GymDemo />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/john doe/i), "John Smith");
    await user.type(screen.getByPlaceholderText(/iron paradise/i), "Power Gym");
    await user.type(screen.getByPlaceholderText(/john@example\.com/i), "not-an-email");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.type(screen.getByPlaceholderText(/city, state/i), "Delhi");

    fireEvent.submit(
      screen.getByRole("button", { name: /submit request/i }).closest("form")!
    );

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("calls demo-request edge function with correct payload on valid submit", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Thanks! We will contact you shortly." },
      error: null,
    });
    render(<GymDemo />);
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "demo-request",
        expect.objectContaining({
          body: expect.objectContaining({
            name: "John Smith",
            gymName: "Power Gym",
            email: "john@gym.com",
            mobile: "9876543210",
            location: "Delhi",
          }),
        })
      );
    });
  });

  it("shows success message after successful form submit", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Thanks for your interest." },
      error: null,
    });
    render(<GymDemo />);
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(screen.getByText(/thanks for your interest/i)).toBeInTheDocument();
    });
  });

  it("shows error notice when edge function returns error", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: new Error("Service unavailable."),
    });
    render(<GymDemo />);
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    await waitFor(() => {
      expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
    });
  });

  it("shows SUBMITTING... and disables button while submitting", async () => {
    let resolve!: (v: unknown) => void;
    mockFunctionsInvoke.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<GymDemo />);
    const user = userEvent.setup();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /submit request/i }));

    expect(screen.getByRole("button", { name: /submitting/i })).toBeInTheDocument();

    resolve({ data: { message: "Done." }, error: null });
  });
});
