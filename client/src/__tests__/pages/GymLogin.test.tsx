import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
  usePathname: vi.fn(() => "/gym/login"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

/**
 * Mocked at the seam, not at the auth provider.
 *
 * These tests used to mock `supabase.auth.signInWithPassword` directly, which meant they
 * only described the page's behaviour on the Supabase path — the one being removed. Mocking
 * `@/lib/gymSession` instead makes every assertion below true of the cookie sessions too,
 * because the page genuinely cannot tell which is behind it.
 */
const { mockSignIn, mockFetchSession } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockFetchSession: vi.fn(),
}));
vi.mock("@/lib/gymSession", () => ({
  GYM_SESSION_QUERY_KEY: ["gym-session"],
  signInToPortal: mockSignIn,
  fetchGymSession: mockFetchSession,
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined) },
}));

import GymLogin from "@/pages/gym/GymLogin";

const SIGN_IN_FAILED = {
  ok: false as const,
  error: { code: "invalid_token" as const, message: "Incorrect email or password. Please try again." },
};

describe("GymLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // The default for every test but the forwarding ones: nobody is signed in.
    mockFetchSession.mockResolvedValue(null);
  });

  it("renders without crashing", () => {
    render(<GymLogin />);
  });

  it("shows the PARTNER LOGIN heading", () => {
    render(<GymLogin />);
    expect(screen.getByRole("heading", { name: /partner login/i })).toBeInTheDocument();
  });

  it("shows email and password fields", () => {
    render(<GymLogin />);
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.getByTestId("input-password")).toBeInTheDocument();
  });

  it("links to the gym forgot-password route", () => {
    render(<GymLogin />);
    const link = screen.getByRole("link", { name: /forgot password/i });
    expect(link).toHaveAttribute("href", "/gym/forgot-password");
  });

  // Consumer signup was removed; portal accounts only exist post-agreement.
  it("offers no signup link, only lead capture", () => {
    render(<GymLogin />);
    const hrefs = screen.getAllByRole("link").map((el) => el.getAttribute("href"));
    expect(hrefs).not.toContain("/signup");
    expect(hrefs).toContain("/gym-demo");
  });

  /*
    The "remember me for 30 days" checkbox is gone: nothing read it, and the cookie
    sessions are a fixed 12 hours that do not refresh, so the promise was one this page
    could not keep either way.
  */
  it("does not offer to remember the sign-in", () => {
    render(<GymLogin />);
    expect(screen.queryByTestId("checkbox-remember")).not.toBeInTheDocument();
    expect(screen.queryByText(/remember me/i)).not.toBeInTheDocument();
  });

  it("redirects to the gym dashboard on successful sign in", async () => {
    mockSignIn.mockResolvedValue({
      ok: true,
      data: { email: "owner@yourgym.com", gymId: "gym_1", role: "owner", gymStatus: "trading" },
    });
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "supersecret");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("owner@yourgym.com", "supersecret");
      expect(mockPush).toHaveBeenCalledWith("/gym/dashboard");
    });
  });

  it("shows an error and does not redirect on bad credentials", async () => {
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });

  /*
    A dropped request is worth telling apart from a wrong password, and this is the one
    place in the app where that distinction is made. "Incorrect email or password" for a
    request that never arrived sends a gym owner round the loop of retyping a password
    they know is right.
  */
  it("passes a network failure through instead of blaming the password", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "We couldn't reach us just now." },
    });
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "supersecret");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(screen.getByText(/couldn't reach us/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/incorrect email or password/i)).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  /*
    This page carries the whole site's "already signed in" check. `Navbar` cannot read an
    `HttpOnly` cookie, so its button always points here — which is only correct as long as
    arriving here with a live session lands on the dashboard.
  */
  it("forwards an existing session to the dashboard", async () => {
    mockFetchSession.mockResolvedValue({
      email: "owner@yourgym.com",
      gymId: "gym_1",
      role: "owner",
      gymStatus: "trading",
    });
    render(<GymLogin />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/gym/dashboard");
    });
  });

  it("shows the form rather than waiting on the session check", () => {
    // Deliberately not awaited. Almost every visitor is signed out, and making them all
    // wait on a round trip to see a password field is the wrong trade.
    mockFetchSession.mockReturnValue(new Promise(() => {}));
    render(<GymLogin />);
    expect(screen.getByTestId("input-password")).toBeInTheDocument();
    expect(screen.getByTestId("button-login")).toBeEnabled();
  });

  it("leaves a signed-out visitor on the form", async () => {
    render(<GymLogin />);
    await waitFor(() => expect(mockFetchSession).toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
