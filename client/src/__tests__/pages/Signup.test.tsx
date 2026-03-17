import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentProps<"div">) => (
      <div {...props}>{children}</div>
    ),
  },
}));

const { mockFunctionsInvoke } = vi.hoisted(() => ({
  mockFunctionsInvoke: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: mockFunctionsInvoke },
  },
}));

import Signup from "@/pages/Signup";

describe("Signup page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────
  it("renders JOIN THE PROS heading", () => {
    render(<Signup />);
    expect(screen.getByRole("heading", { name: /join the pros/i })).toBeInTheDocument();
  });

  it("renders USER and GYM OWNER tabs", () => {
    render(<Signup />);
    expect(screen.getByRole("tab", { name: /user/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /gym owner/i })).toBeInTheDocument();
  });

  it("shows user form fields by default", () => {
    render(<Signup />);
    expect(screen.getByPlaceholderText(/john doe/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+91 98765 43210/)).toBeInTheDocument();
  });

  it("renders link to /login", () => {
    render(<Signup />);
    const loginLink = screen.getByRole("link", { name: /sign in/i });
    expect(loginLink).toHaveAttribute("href", "/login");
  });

  // ─── Tab switching ───────────────────────────────────────────────────────────
  it("switches to gym form when GYM OWNER tab is clicked", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: /gym owner/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/gym owner name/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/gym address/i)).toBeInTheDocument();
    });
  });

  it("switches back to user form when USER tab is clicked", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: /gym owner/i }));
    await user.click(screen.getByRole("tab", { name: /user/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/john doe/i)).toBeInTheDocument();
    });
  });

  // ─── User form validation ────────────────────────────────────────────────────
  it("shows name validation error when name is too short", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/john doe/i), "A");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });

  it("shows email validation error for invalid email in user form", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/john doe/i), "John Doe");
    await user.type(screen.getByPlaceholderText(/you@example.com/i), "not-email");
    fireEvent.submit(screen.getByRole("button", { name: /create account/i }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it("shows mobile validation error when mobile is too short", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/john doe/i), "John Doe");
    await user.type(screen.getByPlaceholderText(/you@example.com/i), "john@example.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "123");
    await user.type(screen.getAllByDisplayValue("")[0], "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid mobile number/i)).toBeInTheDocument();
    });
  });

  it("shows password validation error when password is too short", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    // Fill all valid fields except password
    await user.type(screen.getByPlaceholderText(/john doe/i), "John Doe");
    await user.type(screen.getByPlaceholderText(/you@example.com/i), "john@example.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    // Password field uses placeholder ••••••••
    const passwordInput = screen.getByPlaceholderText("••••••••");
    await user.type(passwordInput, "abc");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    });
  });

  // ─── User form submission ────────────────────────────────────────────────────
  it("calls auth-signup edge function with correct payload on user signup", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Verification email sent." },
      error: null,
    });
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/john doe/i), "John Doe");
    await user.type(screen.getByPlaceholderText(/you@example.com/i), "john@example.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith("auth-signup", {
        body: {
          name: "John Doe",
          email: "john@example.com",
          password: "secret123",
          mobile: "9876543210",
        },
      });
    });
  });

  it("shows success message after successful user signup", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "Verification link has been sent." },
      error: null,
    });
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/john doe/i), "John Doe");
    await user.type(screen.getByPlaceholderText(/you@example.com/i), "john@example.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Verification link has been sent.")).toBeInTheDocument();
    });
  });

  it("shows error message when auth-signup function returns an error", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: null,
      error: { message: "Email already registered." },
    });
    render(<Signup />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(/john doe/i), "John Doe");
    await user.type(screen.getByPlaceholderText(/you@example.com/i), "john@example.com");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.type(screen.getByPlaceholderText("••••••••"), "secret123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText("Email already registered.")).toBeInTheDocument();
    });
  });

  // ─── Gym form ────────────────────────────────────────────────────────────────
  it("validates gym form fields", async () => {
    render(<Signup />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: /gym owner/i }));

    // Submit empty form
    await user.click(screen.getByRole("button", { name: /contact us/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/name is required/i).length).toBeGreaterThan(0);
    });
  });

  it("calls contact-request edge function on gym form submit", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "We will contact you soon." },
      error: null,
    });
    render(<Signup />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: /gym owner/i }));

    await user.type(screen.getByPlaceholderText(/gym owner name/i), "Raj Fitness");
    await user.type(screen.getByPlaceholderText(/gym address/i), "123 Main Street, Delhi");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.type(screen.getByPlaceholderText(/owner@gym.com/i), "raj@gym.com");

    await user.click(screen.getByRole("button", { name: /contact us/i }));

    await waitFor(() => {
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "contact-request",
        expect.objectContaining({
          body: expect.objectContaining({
            name: "Raj Fitness",
            email: "raj@gym.com",
          }),
        })
      );
    });
  });

  it("shows success message after gym form submission", async () => {
    mockFunctionsInvoke.mockResolvedValue({
      data: { message: "We will reach out soon!" },
      error: null,
    });
    render(<Signup />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: /gym owner/i }));

    await user.type(screen.getByPlaceholderText(/gym owner name/i), "Raj Fitness");
    await user.type(screen.getByPlaceholderText(/gym address/i), "123 Main Street, Delhi");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.type(screen.getByPlaceholderText(/owner@gym.com/i), "raj@gym.com");

    await user.click(screen.getByRole("button", { name: /contact us/i }));

    await waitFor(() => {
      expect(screen.getByText("We will reach out soon!")).toBeInTheDocument();
    });
  });

  it("shows SENDING... on gym submit button while submitting", async () => {
    // Delay resolution so we can catch intermediate state
    let resolve!: (v: unknown) => void;
    mockFunctionsInvoke.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<Signup />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("tab", { name: /gym owner/i }));

    await user.type(screen.getByPlaceholderText(/gym owner name/i), "Raj Fitness");
    await user.type(screen.getByPlaceholderText(/gym address/i), "123 Main Street, Delhi");
    await user.type(screen.getByPlaceholderText(/\+91 98765 43210/), "9876543210");
    await user.type(screen.getByPlaceholderText(/owner@gym.com/i), "raj@gym.com");

    await user.click(screen.getByRole("button", { name: /contact us/i }));

    expect(screen.getByRole("button", { name: /sending.../i })).toBeDisabled();

    resolve({ data: { message: "Done" }, error: null });
  });
});
