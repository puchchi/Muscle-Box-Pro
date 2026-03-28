import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
const mockGetSearchParam = vi.fn(() => null as string | null); // no token by default

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/forgot-password"),
  useSearchParams: vi.fn(() => ({ get: mockGetSearchParam })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...p }: React.ComponentProps<"div">) => <div {...p}>{children}</div>,
  },
}));

vi.mock("@/lib/auth", () => ({ hasAccessTokenSync: vi.fn(() => false) }));

const { mockResetForEmail, mockUpdateUser } = vi.hoisted(() => ({
  mockResetForEmail: vi.fn(),
  mockUpdateUser: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: mockResetForEmail,
      updateUser: mockUpdateUser,
    },
  },
}));

import ForgotPassword from "@/pages/ForgotPassword";

// ─── Email request mode (no token) ───────────────────────────────────────────
describe("ForgotPassword — email request mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue(null);
  });

  it("renders without crashing", () => {
    render(<ForgotPassword />);
  });

  it("shows RESET PASSWORD heading", async () => {
    render(<ForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
    });
  });

  it("shows email input field", async () => {
    render(<ForgotPassword />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    });
  });

  it("shows SEND RECOVERY LINK button", async () => {
    render(<ForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send recovery link/i })).toBeInTheDocument();
    });
  });

  it("shows Back to Login link", async () => {
    render(<ForgotPassword />);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /back to login/i });
      expect(link).toHaveAttribute("href", "/login");
    });
  });

  it("calls resetPasswordForEmail with the entered email", async () => {
    mockResetForEmail.mockResolvedValue({ error: null });
    render(<ForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByPlaceholderText(/you@example\.com/i));
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(mockResetForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({ redirectTo: expect.stringContaining("forgot-password") })
      );
    });
  });

  it("shows success message after email is sent", async () => {
    mockResetForEmail.mockResolvedValue({ error: null });
    render(<ForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByPlaceholderText(/you@example\.com/i));
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset link has been sent/i)).toBeInTheDocument();
    });
  });

  it("shows error message when resetPasswordForEmail fails", async () => {
    mockResetForEmail.mockResolvedValue({ error: new Error("Rate limit exceeded.") });
    render(<ForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByPlaceholderText(/you@example\.com/i));
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });
});

// ─── Reset mode (token present) ──────────────────────────────────────────────
describe("ForgotPassword — reset mode (token present)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue("sometoken123");
  });

  it("shows SET NEW PASSWORD heading in reset mode", async () => {
    render(<ForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /set new password/i })).toBeInTheDocument();
    });
  });

  it("shows two password fields in reset mode", async () => {
    render(<ForgotPassword />);
    await waitFor(() => {
      const fields = screen.getAllByPlaceholderText("••••••••");
      expect(fields.length).toBe(2);
    });
  });

  it("shows UPDATE PASSWORD button", async () => {
    render(<ForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
    });
  });

  it("shows password mismatch error when passwords differ", async () => {
    render(<ForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getAllByPlaceholderText("••••••••"));
    const [newPass, confirmPass] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPass, "password123");
    await user.type(confirmPass, "differentpass");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("calls updateUser when passwords match", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    render(<ForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getAllByPlaceholderText("••••••••"));
    const [newPass, confirmPass] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPass, "newpassword1");
    await user.type(confirmPass, "newpassword1");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpassword1" });
    });
  });

  it("shows success message after password reset", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    render(<ForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getAllByPlaceholderText("••••••••"));
    const [newPass, confirmPass] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPass, "newpassword1");
    await user.type(confirmPass, "newpassword1");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password has been reset successfully/i)).toBeInTheDocument();
    });
  });
});
