import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The admin login page and the page it lands on.
 *
 * Both are mocked at `@/lib/adminSession`, the same way `GymLogin.test.tsx` mocks the gym
 * seam: the pages genuinely cannot tell a cookie session from a sandbox bearer one, so
 * asserting against the seam is what keeps these tests true of both.
 *
 * The cases worth having are the ones about *what is deliberately absent*. A forgot-password
 * link and a signup link are both things a well-meaning edit would add for symmetry with the
 * partner login, and both would lead somewhere that cannot help — there is no self-service
 * admin reset and no email sender (§9.2), and admins exist because a row was seeded.
 */

const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, replace: mockReplace })),
  usePathname: vi.fn(() => "/admin/login"),
}));

const { mockSignIn, mockFetchSession, mockSignOut } = vi.hoisted(() => ({
  mockSignIn: vi.fn(),
  mockFetchSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/lib/adminSession", () => ({
  ADMIN_SESSION_QUERY_KEY: ["admin-session"],
  signInAsAdmin: mockSignIn,
  fetchAdminSession: mockFetchSession,
  signOutAsAdmin: mockSignOut,
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    removeQueries: vi.fn(),
  },
}));

// The overview counts the funnel over `GET /admin/gyms` — mocked here so these cases stay about
// the session and nothing reaches the network. What it does with a page of gyms is
// `AdminGyms.test.tsx`'s and the funnel's own business.
const { mockFetchList } = vi.hoisted(() => ({ mockFetchList: vi.fn() }));
vi.mock("@/lib/adminApi", () => ({
  fetchAdminGymList: mockFetchList,
  ADMIN_GYMS_QUERY_KEY: ["admin", "gyms"],
  adminGymQueryKey: (gymId: string) => ["admin", "gym", gymId],
}));

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminHome from "@/pages/admin/AdminHome";
import { adminGymListFixture } from "@/test/adminGymFixture";

/** One list row to vary the status of. The overview reads nothing else off it. */
const LIST_ROW = adminGymListFixture().gyms[0];

const SESSION = {
  email: "ops@muscleboxpro.com",
  role: "admin",
  displayName: "Ops Team",
  expiresAt: "2026-08-23T19:30:00.000Z",
};

describe("AdminLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Nobody signed in, which is the case for every test but the forwarding one.
    mockFetchSession.mockResolvedValue(null);
    mockSignOut.mockResolvedValue(undefined);
  });

  it("renders the two fields and nothing else to fill in", () => {
    render(<AdminLogin />);
    expect(screen.getByTestId("input-email")).toBeInTheDocument();
    expect(screen.getByTestId("input-password")).toBeInTheDocument();
    expect(screen.getByTestId("admin-login-heading")).toBeInTheDocument();
  });

  it("offers no recovery or signup route, because neither exists", () => {
    render(<AdminLogin />);
    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows the form before the session probe answers", () => {
    // Almost everyone opening this is not signed in. Making all of them wait on a round trip
    // to see a password field is the wrong order; the signed-in minority get a brief form.
    render(<AdminLogin />);
    expect(screen.getByTestId("button-login")).toBeInTheDocument();
  });

  it("forwards an admin who already has a session", async () => {
    mockFetchSession.mockResolvedValue(SESSION);
    render(<AdminLogin />);
    // `replace`, not `push`: a login page in the back-history of a signed-in admin is a trap
    // that bounces them forward again.
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin"));
  });

  it("signs in and lands on the admin home", async () => {
    mockSignIn.mockResolvedValue({ ok: true, data: SESSION });
    render(<AdminLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "ops@muscleboxpro.com");
    await user.type(screen.getByTestId("input-password"), "correct horse");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("ops@muscleboxpro.com", "correct horse");
      expect(mockPush).toHaveBeenCalledWith("/admin");
    });
  });

  it("shows the seam's message verbatim, throttle included", async () => {
    // The server's 429 copy is the case that matters: it tells an admin the password may
    // well work in a minute, and a page substituting "incorrect email or password" would
    // have them retyping a correct one until they gave up.
    mockSignIn.mockResolvedValue({
      ok: false,
      error: { code: "validation", message: "Too many attempts. Try again shortly." },
    });
    render(<AdminLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "ops@muscleboxpro.com");
    await user.type(screen.getByTestId("input-password"), "correct horse");
    await user.click(screen.getByTestId("button-login"));

    const error = await screen.findByTestId("admin-login-error");
    expect(error).toHaveTextContent("Too many attempts. Try again shortly.");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("submits a short password rather than refusing it", async () => {
    // This is a login: the password already exists and its rules were enforced when it was
    // set. A client-side length check can only refuse a credential that would have worked,
    // and it blames the admin for a disagreement between this form and the seeder.
    mockSignIn.mockResolvedValue({ ok: true, data: SESSION });
    render(<AdminLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "ops@muscleboxpro.com");
    await user.type(screen.getByTestId("input-password"), "abc");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith("ops@muscleboxpro.com", "abc"));
  });

  it("does not send a malformed email to the server", async () => {
    // Only the *outcome* is asserted, not which layer produced it. `type="email"` means the
    // platform's own constraint validation refuses the submit before react-hook-form runs,
    // so the zod message never renders — asserting on it would be testing a branch the
    // browser preempts. The zod rule stays as the belt-and-braces for paths where native
    // validation does not apply, and this pins the part that matters either way: nothing
    // malformed reaches `POST /admin/login`, where it would burn one of the per-email
    // throttle attempts on a typo.
    render(<AdminLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "not-an-email");
    await user.type(screen.getByTestId("input-password"), "correct horse");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => expect(mockSignIn).not.toHaveBeenCalled());
    expect(mockPush).not.toHaveBeenCalled();
  });
});

describe("AdminHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
    mockFetchList.mockResolvedValue({ ok: true, data: { gyms: [], nextCursor: null } });
  });

  it("proves the session by rendering what the server said", async () => {
    // The whole point of this page: login succeeding only proves the password was right. A
    // cookie the browser refused to store and a sandbox token that never reached the header
    // both look like a successful login and then fail on the first real request.
    mockFetchSession.mockResolvedValue(SESSION);
    render(<AdminHome />);

    expect(await screen.findByTestId("admin-email")).toHaveTextContent("ops@muscleboxpro.com");
    expect(screen.getByTestId("admin-name")).toHaveTextContent("Ops Team");
    expect(screen.getByTestId("admin-role")).toHaveTextContent("admin");
  });

  it("shows the expiry in IST, because that decides whether there is time to finish", async () => {
    // 19:30 UTC is 01:00 IST the following day — the exact case a UTC-formatted timestamp
    // gets wrong, and §9.3 sessions do not refresh, so the number has to be the real one.
    mockFetchSession.mockResolvedValue(SESSION);
    render(<AdminHome />);
    expect(await screen.findByTestId("admin-expires")).toHaveTextContent("24 Aug 2026, 01:00");
  });

  it("says so rather than guessing when there is no expiry", async () => {
    mockFetchSession.mockResolvedValue({ ...SESSION, expiresAt: "" });
    render(<AdminHome />);
    expect(await screen.findByTestId("admin-expires")).toHaveTextContent("Unknown");
  });

  it("sends an unauthenticated visitor to the login page", async () => {
    mockFetchSession.mockResolvedValue(null);
    render(<AdminHome />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/admin/login"));
    // And renders no identity in the meantime, not even an empty row.
    expect(screen.queryByTestId("admin-email")).not.toBeInTheDocument();
  });

  it("signs out through the seam, then leaves", async () => {
    // The call goes first and its result is unchecked: only the server can expire the
    // cookie, so a client-side clear alone would leave the session live for its full 12
    // hours. `signOutAsAdmin` is the thing that guarantees it neither throws nor reports
    // failure — asserted in `adminSession.test.ts` — which is why nothing here simulates a
    // rejection. Mocking one would be testing a contract violation rather than the page.
    mockFetchSession.mockResolvedValue(SESSION);
    render(<AdminHome />);
    const user = userEvent.setup();

    await user.click(await screen.findByTestId("button-signout"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith("/admin/login");
    });
  });

  it("says the sales figures do not exist rather than showing them as zero", async () => {
    // The expensive misreading this page can produce. An overview that reported ₹0 of trading
    // would be quoted at a partner or an investor as a fact about the gyms, when it is a fact
    // about our pipeline: nothing is ingested from the machines at all.
    mockFetchSession.mockResolvedValue(SESSION);
    render(<AdminHome />);

    const trading = await screen.findByTestId("card-trading");
    expect(screen.getByTestId("trading-cups-unavailable")).toBeInTheDocument();
    expect(screen.getByTestId("trading-statements-unavailable")).toBeInTheDocument();
    expect(trading).toHaveTextContent("no ingestion from the machines");
    expect(trading).toHaveTextContent("blanks rather than zeros");
    expect(trading).not.toHaveTextContent("₹0");
  });

  it("frames the gap by how many gyms are live", async () => {
    mockFetchSession.mockResolvedValue(SESSION);
    mockFetchList.mockResolvedValue({
      ok: true,
      data: {
        gyms: [
          { ...LIST_ROW, gymId: "g1", status: "active" },
          { ...LIST_ROW, gymId: "g2", status: "active" },
          { ...LIST_ROW, gymId: "g3", status: "invited" },
        ],
        nextCursor: null,
      },
    });
    render(<AdminHome />);

    // `findByText` rather than the notice's own test id: the notice is on screen while the count is
    // still loading, so asserting on the element resolves before the figure it is being asked about.
    expect(
      await screen.findByText("2 gyms are live. We hold no sales figures for any of them."),
    ).toBeInTheDocument();
  });

  it("does not claim missing sales when no gym is trading yet", async () => {
    mockFetchSession.mockResolvedValue(SESSION);
    render(<AdminHome />);
    expect(
      await screen.findByText(
        "No gym is live yet, so there would be nothing to report even with the pipeline built.",
      ),
    ).toBeInTheDocument();
  });

  it("names the API host it is talking to", async () => {
    // The first thing to look at when the integration is mysteriously broken: pointing a
    // build at the wrong stage looks exactly like a code fault, and `mbp-backend`'s two
    // sandbox gateways differ by six characters.
    mockFetchSession.mockResolvedValue(SESSION);
    render(<AdminHome />);
    expect(await screen.findByTestId("admin-api-host")).toHaveTextContent("api.muscleboxpro.com");
  });
});
