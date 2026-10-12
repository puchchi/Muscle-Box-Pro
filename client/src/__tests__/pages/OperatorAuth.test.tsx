import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockPush, mockReplace, consoleSignIn, viewer } = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockReplace: vi.fn(),
  consoleSignIn: { signInToMachineConsole: vi.fn(), signOutOfMachineConsole: vi.fn(), requestMachineConsolePasswordReset: vi.fn() },
  viewer: { resolveViewer: vi.fn(), forgetVerifiedViewer: vi.fn() },
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mockPush, replace: mockReplace }) }));
vi.mock("@/lib/machineConsoleSignIn", () => consoleSignIn);
vi.mock("@/pages/admin/machines/viewer", () => viewer);

import { MachinesForgotPassword, MachinesSignIn } from "@/pages/operator/OperatorAuth";

const someViewer = { role: "operator", name: "Ravi", email: null, franchiseId: null, gymId: null, can: new Set() };

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  viewer.resolveViewer.mockResolvedValue(null);
});

async function signIn(login: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByTestId("input-login"), login);
  await user.type(screen.getByTestId("input-password"), password);
  await user.click(screen.getByTestId("button-login"));
}

describe("Machine console sign in", () => {
  it("signs in with one form and opens a franchise on its overview", async () => {
    consoleSignIn.signInToMachineConsole.mockResolvedValue({ ok: true, role: "franchise" });
    render(<MachinesSignIn />);
    await waitFor(() => expect(viewer.resolveViewer).toHaveBeenCalledTimes(1));
    viewer.resolveViewer.mockResolvedValue({ ...someViewer, role: "franchise" });
    await signIn("p@x.in", "secret-phrase");
    expect(consoleSignIn.signInToMachineConsole).toHaveBeenCalledWith("p@x.in", "secret-phrase");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/franchise/dashboard"));
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

  it("takes an operator ID in the same box", async () => {
    consoleSignIn.signInToMachineConsole.mockResolvedValue({ ok: true, role: "operator" });
    render(<MachinesSignIn />);
    await waitFor(() => expect(viewer.resolveViewer).toHaveBeenCalledTimes(1));
    viewer.resolveViewer.mockResolvedValue(someViewer);
    await signIn("OP_MBP_01", "secret-phrase");
    expect(consoleSignIn.signInToMachineConsole).toHaveBeenCalledWith("OP_MBP_01", "secret-phrase");
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/machines"));
  });

  it("asks again for something that is neither an email nor an operator ID", async () => {
    render(<MachinesSignIn />);
    await signIn("ab", "secret-phrase");
    expect(screen.getByRole("alert")).toHaveTextContent("operator ID like op_mbp_01");
    expect(consoleSignIn.signInToMachineConsole).not.toHaveBeenCalled();
  });

  it("goes straight to the console when already signed in", async () => {
    viewer.resolveViewer.mockResolvedValue(someViewer);
    render(<MachinesSignIn />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/machines"));
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
    expect(screen.getByTestId("operator-reset-note")).toHaveTextContent("Ask the person who added you");
  });
});
