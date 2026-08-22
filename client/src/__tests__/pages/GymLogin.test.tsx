import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  usePathname: vi.fn(() => "/gym/login"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("framer-motion", () => import("@/test/framerMotion"));

const { mockSignIn } = vi.hoisted(() => ({ mockSignIn: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithPassword: mockSignIn } },
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined) },
}));

import GymLogin from "@/pages/gym/GymLogin";

describe("GymLogin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("redirects to the gym dashboard on successful sign in", async () => {
    mockSignIn.mockResolvedValue({ data: { session: { access_token: "t" } }, error: null });
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "supersecret");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: "owner@yourgym.com",
        password: "supersecret",
      });
      expect(mockPush).toHaveBeenCalledWith("/gym/dashboard");
    });
  });

  it("shows an error and does not redirect on bad credentials", async () => {
    mockSignIn.mockResolvedValue({ data: { session: null }, error: { message: "Invalid login" } });
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

  it("does not redirect when the call succeeds but no session comes back", async () => {
    mockSignIn.mockResolvedValue({ data: { session: null }, error: null });
    render(<GymLogin />);
    const user = userEvent.setup();

    await user.type(screen.getByTestId("input-email"), "owner@yourgym.com");
    await user.type(screen.getByTestId("input-password"), "supersecret");
    await user.click(screen.getByTestId("button-login"));

    await waitFor(() => {
      expect(screen.getByText(/incorrect email or password/i)).toBeInTheDocument();
    });
    expect(mockPush).not.toHaveBeenCalled();
  });
});
