import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/login"),
}));

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

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignIn,
    },
  },
}));

// Mock toast (not critical to these tests but prevents hook errors)
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
}));

// Mock fetch for resend-verification calls
global.fetch = vi.fn();

import Login from "@/pages/Login";

describe("Login page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────────
  it("renders SIGN IN heading", () => {
    render(<Login />);
    expect(screen.getByRole("heading", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders email and password inputs", () => {
    render(<Login />);
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.getByTestId("input-password")).toBeInTheDocument();
  });

  it("renders the submit button", () => {
    render(<Login />);
    expect(screen.getByTestId("button-login")).toBeInTheDocument();
  });

  it("renders link to /signup", () => {
    render(<Login />);
    const signupLink = screen.getByRole("link", { name: /sign up here/i });
    expect(signupLink).toHaveAttribute("href", "/signup");
  });

  it("renders link to /forgot-password", () => {
    render(<Login />);
    const forgotLink = screen.getByRole("link", { name: /forgot/i });
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });

  it("renders 'Remember me' checkbox", () => {
    render(<Login />);
    expect(screen.getByTestId("checkbox-remember")).toBeInTheDocument();
  });

  // ─── Validation ─────────────────────────────────────────────────────────────
  it("shows email validation error when invalid email is submitted", async () => {
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "not-an-email");
    await user.type(screen.getByTestId("input-password"), "password123");
    fireEvent.submit(screen.getByTestId("button-login").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/valid email is required/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("shows password length error when password is too short", async () => {
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "test@example.com");
    await user.type(screen.getByTestId("input-password"), "abc");
    fireEvent.submit(screen.getByTestId("button-login").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("shows validation errors when both fields are empty", async () => {
    render(<Login />);

    fireEvent.submit(screen.getByTestId("button-login").closest("form")!);

    await waitFor(() => {
      expect(screen.getByText(/valid email is required/i)).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  // ─── Successful login ────────────────────────────────────────────────────────
  it("calls supabase.auth.signInWithPassword with form values", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "user@example.com");
    await user.type(screen.getByTestId("input-password"), "password123");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "password123",
      });
    });
  });

  it("redirects to /account on successful login", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: { access_token: "tok" } },
      error: null,
    });
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "user@example.com");
    await user.type(screen.getByTestId("input-password"), "password123");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/account");
    });
  });

  // ─── Error states ────────────────────────────────────────────────────────────
  it("shows generic error notice on failed login", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid login credentials" },
    });
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "user@example.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't sign you in/i)
      ).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows warning notice when email is not confirmed", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: "Email not confirmed" },
    });
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "unverified@example.com");
    await user.type(screen.getByTestId("input-password"), "password123");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(screen.getByText(/email is not confirmed/i)).toBeInTheDocument();
    });
  });

  it("shows 'Resend verification link' button on unconfirmed email warning", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: "email not confirmed" },
    });
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "unverified@example.com");
    await user.type(screen.getByTestId("input-password"), "password123");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /resend verification link/i })
      ).toBeInTheDocument();
    });
  });

  it("shows error when session is null even with no error returned", async () => {
    mockSignIn.mockResolvedValue({ data: { session: null }, error: null });
    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "user@example.com");
    await user.type(screen.getByTestId("input-password"), "password123");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(screen.getByText(/couldn't sign you in/i)).toBeInTheDocument();
    });
  });

  // ─── Resend verification ─────────────────────────────────────────────────────
  it("calls resend-verification endpoint when resend button is clicked", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: "email not confirmed" },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: "Verification link sent." }),
    } as unknown as Response);

    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "unverified@example.com");
    await user.type(screen.getByTestId("input-password"), "password123");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() =>
      screen.getByRole("button", { name: /resend verification link/i })
    );

    await user.click(
      screen.getByRole("button", { name: /resend verification link/i })
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("resend-verification"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ email: "unverified@example.com" }),
        })
      );
    });
  });

  it("shows success notice after successful resend", async () => {
    mockSignIn.mockResolvedValue({
      data: { session: null },
      error: { message: "email not confirmed" },
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ message: "Check your inbox!" }),
    } as unknown as Response);

    render(<Login />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "unverified@example.com");
    await user.type(screen.getByTestId("input-password"), "password123");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() =>
      screen.getByRole("button", { name: /resend verification link/i })
    );

    await user.click(
      screen.getByRole("button", { name: /resend verification link/i })
    );

    await waitFor(() => {
      expect(screen.getByText("Check your inbox!")).toBeInTheDocument();
    });
  });
});
