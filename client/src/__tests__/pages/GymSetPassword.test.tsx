import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/gym/set-password/abc"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

const { mockSetPassword } = vi.hoisted(() => ({ mockSetPassword: vi.fn() }));
vi.mock("@/lib/gymSession", () => ({ setPortalPassword: mockSetPassword }));

import GymSetPassword from "@/pages/gym/GymSetPassword";

const HANDLE = "b7f3c1a29d5e4408a1c6f0e2d3b4a596";

/** Fills both boxes with the same password and submits. */
async function submit(password: string, confirm = password) {
  const user = userEvent.setup();
  await user.type(screen.getByTestId("input-new-password"), password);
  await user.type(screen.getByTestId("input-confirm-password"), confirm);
  await user.click(screen.getByTestId("button-set-password"));
}

describe("GymSetPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPassword.mockResolvedValue({ ok: true, data: undefined });
  });

  it("sends the handle it was given with the password", async () => {
    render(<GymSetPassword handle={HANDLE} />);
    await submit("a-good-long-password");

    await waitFor(() => {
      expect(mockSetPassword).toHaveBeenCalledWith(HANDLE, "a-good-long-password");
    });
  });

  describe("what it refuses to send", () => {
    /*
      This check cannot be left to the server: it receives one password and has no way to
      know the gym typed two different ones. Getting it wrong burns a single-use link on a
      password the owner cannot reproduce.
    */
    it("will not submit two different passwords", async () => {
      render(<GymSetPassword handle={HANDLE} />);
      await submit("a-good-long-password", "a-good-long-passwerd");

      expect(await screen.findByTestId("password-error")).toHaveTextContent(/don't match/i);
      expect(mockSetPassword).not.toHaveBeenCalled();
    });

    it("will not submit a password the shared schema rejects", async () => {
      render(<GymSetPassword handle={HANDLE} />);
      await submit("short");

      expect(await screen.findByTestId("password-error")).toHaveTextContent(/at least 12/i);
      expect(mockSetPassword).not.toHaveBeenCalled();
    });
  });

  describe("once it has worked", () => {
    it("says the password is set and does not pretend to sign anyone in", async () => {
      render(<GymSetPassword handle={HANDLE} />);
      await submit("a-good-long-password");

      const done = await screen.findByTestId("set-password-done");
      expect(done).toHaveTextContent(/your password is set/i);
      // The route sets a password and stops. A link that also opened a session would *be* a
      // session, and a forwarded email would hand someone a logged-in portal.
      expect(mockPush).not.toHaveBeenCalled();
      expect(screen.queryByTestId("input-new-password")).toBeNull();
    });

    it("offers the login page as the next step", async () => {
      render(<GymSetPassword handle={HANDLE} />);
      await submit("a-good-long-password");

      const user = userEvent.setup();
      await user.click(await screen.findByTestId("button-go-to-login"));
      expect(mockPush).toHaveBeenCalledWith("/gym/login");
    });
  });

  /**
   * Each of these is a real thing that happens to a relayed link, and each needs its own
   * copy: "ask us for another" is right for an expired link and wrong for one already spent
   * by someone who has a working password.
   */
  describe("a link that cannot be spent", () => {
    it.each([
      ["expired_token", /expired/i],
      ["revoked_token", /already been used/i],
      ["invalid_token", /don't recognise/i],
    ])("explains %s specifically", async (code, expected) => {
      mockSetPassword.mockResolvedValue({ ok: false, error: { code, message: "server copy" } });
      render(<GymSetPassword handle={HANDLE} />);
      await submit("a-good-long-password");

      expect(await screen.findByTestId("set-password-problem")).toHaveTextContent(expected);
      // The form stays: for `invalid_token` in particular the fix may be retyping, and
      // stripping the inputs would leave nothing to retry with.
      expect(screen.getByTestId("input-new-password")).toBeInTheDocument();
    });

    it("keeps a network failure away from the link's reputation", async () => {
      mockSetPassword.mockResolvedValue({
        ok: false,
        error: { code: "network", message: "unreachable" },
      });
      render(<GymSetPassword handle={HANDLE} />);
      await submit("a-good-long-password");

      const problem = await screen.findByTestId("set-password-problem");
      expect(problem).toHaveTextContent(/your link is still good/i);
      expect(problem).not.toHaveTextContent(/expired|already been used/i);
    });

    it("falls back to a general explanation for a code with no copy", async () => {
      // `wrong_step` belongs to the onboarding wizard and should never reach this route. If
      // it somehow does, the gym gets a plain apology rather than a blank amber panel.
      mockSetPassword.mockResolvedValue({
        ok: false,
        error: { code: "wrong_step", message: "server copy" },
      });
      render(<GymSetPassword handle={HANDLE} />);
      await submit("a-good-long-password");

      expect(await screen.findByTestId("set-password-problem")).toHaveTextContent(
        /couldn't set your password/i,
      );
    });
  });

  /*
    A rejected password is not a rejected link. Putting it in the amber panel would send the
    gym owner off to ask for a replacement link, which would not help — they would meet the
    same rule again with a fresh handle spent.
  */
  it("puts a server field error on the input, not on the link", async () => {
    mockSetPassword.mockResolvedValue({
      ok: false,
      error: {
        code: "validation",
        message: "That password can't be used.",
        fieldErrors: { password: "This password is too common. Pick another." },
      },
    });
    render(<GymSetPassword handle={HANDLE} />);
    await submit("a-good-long-password");

    expect(await screen.findByTestId("password-error")).toHaveTextContent(/too common/i);
    expect(screen.queryByTestId("set-password-problem")).toBeNull();
  });
});
