import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockPush, mockReplace, consoleSignIn, session, viewer } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  consoleSignIn: { signInToMachineConsole: vi.fn(), signOutOfMachineConsole: vi.fn(), requestMachineConsolePasswordReset: vi.fn() },
  session: { setOperatorPassword: vi.fn() },
  viewer: { resolveViewer: vi.fn(), forgetVerifiedViewer: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
vi.mock("@/lib/machineConsoleSignIn", () => consoleSignIn);
vi.mock("@/lib/operatorSession", () => session);
vi.mock("@/pages/admin/machines/viewer", () => viewer);

import { MachinesForgotPassword, MachinesSignIn, OperatorSetPassword } from "@/pages/operator/OperatorAuth";

const someViewer = { role: "operator", name: "Ravi", email: "r@x.in", franchiseId: null, gymId: null, can: new Set() };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  viewer.resolveViewer.mockResolvedValue(null);
});

async function signIn(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByTestId("input-email"), email);
  await user.type(screen.getByTestId("input-password"), password);
  await user.click(screen.getByTestId("button-login"));
}

describe("Machine console sign in", () => {
  it("signs in with one form and opens the console for whatever the account is", async () => {
    consoleSignIn.signInToMachineConsole.mockResolvedValue({ ok: true, role: "franchise" });
    render(<MachinesSignIn />);
    await waitFor(() => expect(viewer.resolveViewer).toHaveBeenCalledTimes(1));
    viewer.resolveViewer.mockResolvedValue({ ...someViewer, role: "franchise" });
    await signIn("p@x.in", "secret-phrase");
    expect(consoleSignIn.signInToMachineConsole).toHaveBeenCalledWith("p@x.in", "secret-phrase");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/machines"));
    expect(screen.queryByTestId("sign-in-operator")).not.toBeInTheDocument();
  });

  it("shows the one message when no account takes the password", async () => {
    consoleSignIn.signInToMachineConsole.mockResolvedValue({ ok: false, error: { code: "wrong", message: "Incorrect email or password. Please try again." } });
    render(<MachinesSignIn />);
    await signIn("r@x.in", "nope");
    expect(await screen.findByTestId("login-notice")).toHaveTextContent("Incorrect email or password");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("signs back out and explains when the account cannot open the console yet", async () => {
    consoleSignIn.signInToMachineConsole.mockResolvedValue({ ok: true, role: "gym" });
    render(<MachinesSignIn />);
    await signIn("g@x.in", "good-phrase");
    expect(await screen.findByTestId("login-notice")).toHaveTextContent("Machine access isn't on for this account yet");
    expect(consoleSignIn.signOutOfMachineConsole).toHaveBeenCalledWith("gym");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("goes straight to the console when already signed in", async () => {
    viewer.resolveViewer.mockResolvedValue(someViewer);
    render(<MachinesSignIn />);
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
    expect(mockPush).toHaveBeenCalledWith("/machines/sign-in");
    unmount();
    render(<MachinesSignIn />);
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

describe("Forgot password", () => {
  it("says the same thing whether or not the address has an account", async () => {
    consoleSignIn.requestMachineConsolePasswordReset.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<MachinesForgotPassword />);
    await user.type(screen.getByTestId("input-email"), "r@x.in");
    await user.click(screen.getByTestId("button-send-reset"));
    expect(consoleSignIn.requestMachineConsolePasswordReset).toHaveBeenCalledWith("r@x.in");
    expect(await screen.findByTestId("reset-requested")).toHaveTextContent("If that address has an account");
  });
});
