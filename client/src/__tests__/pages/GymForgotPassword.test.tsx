import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
const mockGetSearchParam = vi.fn(() => null as string | null); // no token by default

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/gym/forgot-password"),
  useSearchParams: vi.fn(() => ({ get: mockGetSearchParam })),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// The component uses motion.div *and* motion.p. Stubbing only `div` makes the
// missing tag render as `undefined` and every test in the file fails with
// "Element type is invalid" — which is how this suite was silently broken.
vi.mock("framer-motion", () => import("@/test/framerMotion"));

vi.mock("@/lib/auth", () => ({ hasAccessTokenSync: vi.fn(() => false) }));

const { mockInvoke, mockUpdateUser } = vi.hoisted(() => ({
  mockInvoke: vi.fn(),
  mockUpdateUser: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { updateUser: mockUpdateUser },
    functions: { invoke: mockInvoke },
  },
}));

import GymForgotPassword from "@/pages/gym/GymForgotPassword";

// ─── Email request mode (no token) ───────────────────────────────────────────
describe("GymForgotPassword — email request mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue(null);
  });

  it("renders without crashing", () => {
    render(<GymForgotPassword />);
  });

  it("shows RESET PASSWORD heading", async () => {
    render(<GymForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /reset password/i })).toBeInTheDocument();
    });
  });

  it("shows email input field", async () => {
    render(<GymForgotPassword />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/you@example\.com/i)).toBeInTheDocument();
    });
  });

  it("shows SEND RECOVERY LINK button", async () => {
    render(<GymForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /send recovery link/i })).toBeInTheDocument();
    });
  });

  it("shows a Back to Sign In link pointing at the gym login route", async () => {
    render(<GymForgotPassword />);
    await waitFor(() => {
      const link = screen.getByRole("link", { name: /back to sign in/i });
      expect(link).toHaveAttribute("href", "/gym/login");
    });
  });

  it("invokes the forgot-password function with the entered email", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
    render(<GymForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByPlaceholderText(/you@example\.com/i));
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "owner@yourgym.com");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("forgot-password", {
        body: { email: "owner@yourgym.com" },
      });
    });
  });

  it("shows a neutral success message that does not confirm the account exists", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: null });
    render(<GymForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByPlaceholderText(/you@example\.com/i));
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "owner@yourgym.com");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset link has been sent/i)).toBeInTheDocument();
    });
  });

  it("shows an error message when the function call fails", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: "Rate limit exceeded." } });
    render(<GymForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getByPlaceholderText(/you@example\.com/i));
    await user.type(screen.getByPlaceholderText(/you@example\.com/i), "owner@yourgym.com");
    await user.click(screen.getByRole("button", { name: /send recovery link/i }));

    await waitFor(() => {
      expect(screen.getByText(/rate limit exceeded/i)).toBeInTheDocument();
    });
  });
});

// ─── Reset mode (token present) ──────────────────────────────────────────────
describe("GymForgotPassword — reset mode (token present)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSearchParam.mockReturnValue("sometoken123");
  });

  it("shows SET NEW PASSWORD heading in reset mode", async () => {
    render(<GymForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /set new password/i })).toBeInTheDocument();
    });
  });

  it("shows two password fields in reset mode", async () => {
    render(<GymForgotPassword />);
    await waitFor(() => {
      const fields = screen.getAllByPlaceholderText("••••••••");
      expect(fields.length).toBe(2);
    });
  });

  it("shows UPDATE PASSWORD button", async () => {
    render(<GymForgotPassword />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
    });
  });

  it("shows password mismatch error when passwords differ", async () => {
    render(<GymForgotPassword />);
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
    render(<GymForgotPassword />);
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
    render(<GymForgotPassword />);
    const user = userEvent.setup();

    await waitFor(() => screen.getAllByPlaceholderText("••••••••"));
    const [newPass, confirmPass] = screen.getAllByPlaceholderText("••••••••");
    await user.type(newPass, "newpassword1");
    await user.type(confirmPass, "newpassword1");
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
    });
  });
});
