import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const { mockPush, mockGetSession } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/auth/callback"),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
    },
  },
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: vi.fn(() => ({ toast: mockToast })),
}));

import AuthCallback from "@/pages/AuthCallback";

describe("AuthCallback page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Finalizing sign-in...' loading text", () => {
    mockGetSession.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AuthCallback />);
    expect(screen.getByText(/finalizing sign-in/i)).toBeInTheDocument();
  });

  it("redirects to /account when session is valid", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok", user: { email: "u@e.com" } } },
    });
    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/account");
    });
  });

  it("calls toast with success when session is valid", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok", user: { email: "u@e.com" } } },
    });
    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Signed in successfully" })
      );
    });
  });

  it("redirects to /login when session is null", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/login");
    });
  });

  it("calls toast with destructive variant when session is null", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    render(<AuthCallback />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "destructive", title: "Authentication failed" })
      );
    });
  });
});
