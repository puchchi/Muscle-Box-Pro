import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockPush, mockReplace, session } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  session: { signOutAsOperator: vi.fn(), fetchOperatorSession: vi.fn(), signInAsOperator: vi.fn(), setOperatorPassword: vi.fn(), requestOperatorPasswordReset: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
vi.mock("@/lib/operatorSession", () => session);
vi.mock("@/lib/adminMachineApi", () => ({ fetchViewer: vi.fn() }));

import { MachinesSignIn, OperatorForgotPassword, OperatorLogin, OperatorSetPassword } from "@/pages/operator/OperatorAuth";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  session.fetchOperatorSession.mockResolvedValue(null);
});

describe("Operator sign in", () => {
  it("signs in and opens the machine console", async () => {
    session.signInAsOperator.mockResolvedValue({ ok: true, data: { email: "r@x.in", name: "Ravi", machines: [], expiresAt: null } });
    const user = userEvent.setup();
    render(<OperatorLogin />);
    await user.type(screen.getByTestId("input-email"), "r@x.in");
    await user.type(screen.getByTestId("input-password"), "secret-phrase");
    await user.click(screen.getByTestId("button-login"));
    expect(session.signInAsOperator).toHaveBeenCalledWith("r@x.in", "secret-phrase");
    expect(mockPush).toHaveBeenCalledWith("/machines");
  });

  it("shows the server's one message when the password is wrong", async () => {
    session.signInAsOperator.mockResolvedValue({ ok: false, error: { code: "invalid_token", message: "Incorrect email or password. Please try again." } });
    const user = userEvent.setup();
    render(<OperatorLogin />);
    await user.type(screen.getByTestId("input-email"), "r@x.in");
    await user.type(screen.getByTestId("input-password"), "nope");
    await user.click(screen.getByTestId("button-login"));
    expect(await screen.findByTestId("login-notice")).toHaveTextContent("Incorrect email or password");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("goes straight to the console when already signed in", async () => {
    session.fetchOperatorSession.mockResolvedValue({ email: "r@x.in", name: "Ravi", machines: [], expiresAt: null });
    render(<OperatorLogin />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/machines"));
  });
});

describe("Operator set password", () => {
  it("refuses two different passwords without calling the server", async () => {
    const user = userEvent.setup();
    render(<OperatorSetPassword handle="h1" />);
    await user.type(screen.getByTestId("input-password"), "first-phrase");
    await user.type(screen.getByTestId("input-confirm-password"), "other-phrase");
    await user.click(screen.getByTestId("button-set-password"));
    expect(screen.getByRole("alert")).toHaveTextContent("don't match");
    expect(session.setOperatorPassword).not.toHaveBeenCalled();
  });

  it("sets the password and fills the email in on the sign-in page", async () => {
    session.setOperatorPassword.mockResolvedValue({ ok: true, data: { email: "r@x.in" } });
    const user = userEvent.setup();
    const { unmount } = render(<OperatorSetPassword handle="h1" />);
    await user.type(screen.getByTestId("input-password"), "good-phrase");
    await user.type(screen.getByTestId("input-confirm-password"), "good-phrase");
    await user.click(screen.getByTestId("button-set-password"));
    expect(session.setOperatorPassword).toHaveBeenCalledWith("h1", "good-phrase");
    await user.click(await screen.findByTestId("button-go-to-login"));
    expect(mockPush).toHaveBeenCalledWith("/operator/login");
    unmount();
    render(<OperatorLogin />);
    await waitFor(() => expect(screen.getByTestId("input-email")).toHaveValue("r@x.in"));
    expect(sessionStorage.getItem("mbp.operator.email")).toBeNull();
  });

  it("explains a link that was replaced", async () => {
    session.setOperatorPassword.mockResolvedValue({ ok: false, error: { code: "revoked_token", message: "x" } });
    const user = userEvent.setup();
    render(<OperatorSetPassword handle="h1" />);
    await user.type(screen.getByTestId("input-password"), "good-phrase");
    await user.type(screen.getByTestId("input-confirm-password"), "good-phrase");
    await user.click(screen.getByTestId("button-set-password"));
    expect(await screen.findByTestId("set-password-problem")).toHaveTextContent("This link no longer works");
  });
});

describe("Operator forgot password", () => {
  it("says the same thing whether or not the address has an account", async () => {
    session.requestOperatorPasswordReset.mockResolvedValue({ ok: true, data: undefined });
    const user = userEvent.setup();
    render(<OperatorForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "r@x.in");
    await user.click(screen.getByTestId("button-send-reset"));
    expect(await screen.findByTestId("reset-requested")).toHaveTextContent("If that address has an operator account");
  });
});

describe("Machine console sign-in chooser", () => {
  it("links to each kind of sign-in", () => {
    render(<MachinesSignIn />);
    expect(screen.getByTestId("sign-in-operator")).toHaveAttribute("href", "/operator/login");
    expect(screen.getByTestId("sign-in-franchise")).toHaveAttribute("href", "/franchise/login");
    expect(screen.getByTestId("sign-in-gym")).toHaveAttribute("href", "/gym/login");
    expect(screen.getByTestId("sign-in-admin")).toHaveAttribute("href", "/admin/login");
  });
});
