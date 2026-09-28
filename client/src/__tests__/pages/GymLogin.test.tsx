import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
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

const { mockSetQueryData } = vi.hoisted(() => ({ mockSetQueryData: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    setQueryData: mockSetQueryData,
  },
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

  /*
    The login response *is* the session, and the dashboard reads it from this cache. It used
    to be invalidated instead, which threw away the answer the request had just paid for and
    left the gym on "Loading your portal..." while the same question was asked again.
  */
  it("hands the session it just received to the dashboard", async () => {
    const session = { email: "owner@yourgym.com", gymId: "gym_1", role: "owner", gymStatus: "trading" };
    mockSignIn.mockResolvedValue({ ok: true, data: session });
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "supersecret");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(mockSetQueryData).toHaveBeenCalledWith(["gym-session"], session);
    });
  });

  /*
    The remaining wait after a correct password is the route change, and it belongs to the
    button that started it. Releasing it here offered a second submit of a form whose page
    is already leaving.
  */
  it("keeps the button busy through the redirect", async () => {
    mockSignIn.mockResolvedValue({
      ok: true,
      data: { email: "owner@yourgym.com", gymId: "gym_1", role: "owner", gymStatus: "trading" },
    });
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "supersecret");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/gym/dashboard"));
    expect(screen.getByTestId("button-login")).toBeDisabled();
    expect(screen.getByTestId("button-login")).toHaveTextContent(/signing in/i);
  });

  it("releases the form when the password was wrong", async () => {
    // The other half of the rule above: a gym who mistyped must be able to try again.
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => screen.getByText(/incorrect email or password/i));
    expect(screen.getByTestId("button-login")).toBeEnabled();
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
    A failed sign-in changes nothing else on the page: no navigation, no title change, no
    field marked. Without the live region a screen reader is told nothing at all, and the
    gym owner is left waiting on a form that looks like it never submitted.
  */
  it("announces the failure instead of only drawing it", async () => {
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/incorrect email or password/i);
  });

  /*
    The notice used to render between the password field and the submit button, which pushed
    the button 46px down the page and left the message covering where it had been — so the
    reflex second click after a failure landed on the error text. Asserted on DOM order
    because that is what decides the layout.
  */
  it("puts the failure above the fields, not on top of the submit button", async () => {
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));

    await screen.findByTestId("login-notice");
    const order = [...document.querySelectorAll("[data-testid]")].map((el) =>
      el.getAttribute("data-testid"),
    );
    expect(order.indexOf("login-notice")).toBeLessThan(order.indexOf("input-email"));
    expect(order.indexOf("login-notice")).toBeLessThan(order.indexOf("button-login"));
  });

  /*
    Focus went to `<body>` because the button is disabled while the request is in flight and
    re-enabling it does not hand focus back. A keyboard user then tabs in from the logo.
  */
  it("returns focus to the password field after a failure", async () => {
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));

    await screen.findByRole("alert");
    expect(screen.getByTestId("input-password")).toHaveFocus();
  });

  /*
    The recovery route is the point of the error, but only for a credential failure: telling
    someone to reset a password they typed correctly, because the request never left the
    building, sends them round a loop that cannot help.
  */
  it("offers the reset route on a credential failure", async () => {
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));

    const alert = await screen.findByTestId("login-notice");
    const reset = within(alert).getByRole("link", { name: /reset your password/i });
    expect(reset).toHaveAttribute("href", "/gym/forgot-password");
  });

  it("does not offer the reset route when the request never arrived", async () => {
    mockSignIn.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "We couldn't reach us just now." },
    });
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "supersecret");
    await user.click(screen.getByTestId("button-login"));

    const alert = await screen.findByTestId("login-notice");
    expect(within(alert).queryByRole("link")).not.toBeInTheDocument();
  });

  /*
    A stale "incorrect email or password" sitting above the field being corrected reads as a
    verdict on what is currently typed.
  */
  it("drops the failure once the gym starts correcting it", async () => {
    mockSignIn.mockResolvedValue(SIGN_IN_FAILED);
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "wrongpass");
    await user.click(screen.getByTestId("button-login"));
    await screen.findByTestId("login-notice");

    await user.type(screen.getByTestId("input-password"), "x");

    await waitFor(() => {
      expect(screen.queryByTestId("login-notice")).not.toBeInTheDocument();
    });
  });

  /*
    Both fields, because a password manager that cannot see `current-password` will not offer
    to fill or to save, on the one page whose entire job is signing in.
  */
  it("lets a password manager fill both fields", () => {
    render(<GymLogin />);
    expect(screen.getByTestId("input-email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByTestId("input-password")).toHaveAttribute("autocomplete", "current-password");
  });

  /*
    This page carries the whole site's "already signed in" check. `Navbar` cannot read an
    `HttpOnly` cookie, so its button always points here — which is only correct as long as
    arriving here with a live session lands on the dashboard.
  */
  it("forwards an existing session to the dashboard", async () => {
    const session = { email: "owner@yourgym.com", gymId: "gym_1", role: "owner", gymStatus: "trading" };
    mockFetchSession.mockResolvedValue(session);
    render(<GymLogin />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/gym/dashboard");
    });
    // Carrying the session with it, so the page we forward to does not re-ask.
    expect(mockSetQueryData).toHaveBeenCalledWith(["gym-session"], session);
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
