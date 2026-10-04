import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetch, mockSave } = vi.hoisted(() => ({ mockFetch: vi.fn(), mockSave: vi.fn() }));
vi.mock("@/lib/adminMachineApi", () => ({
  fetchMachineVoices: mockFetch,
  setMachineVoices: mockSave,
  uploadMachineFile: vi.fn(),
  contentTypeOf: (f: { type: string }) => f.type,
}));

import { MachineVoicesTab } from "@/pages/admin/machines/MachineVoicesTab";

const file = (name: string) => ({ url: `https://cdn/voice/${name}`, path: `voice/${name}`, fileName: name, md5: "m", size: 2048 });
const set = (positions: Record<string, ReturnType<typeof file> | null>, version = 0) => ({
  positions: { "1": null, "2": null, "3": null, "4": null, "5": null, ...positions },
  version,
  updatedAt: null,
  updatedBy: null,
});

const voices = {
  defaults: set({ "1": file("welcome.mp3"), "3": file("ready.mp3") }, 3),
  override: set({ "3": file("ready-andheri.mp3") }, 1),
  effective: {},
};

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue({ ok: true, data: voices });
  mockSave.mockReset();
});

describe("MachineVoicesTab", () => {
  it("shows which prompts are the machine's own and which come from the default", async () => {
    render(<MachineVoicesTab sn="SN1" onSaved={() => {}} />);
    await screen.findByTestId("voice-slots");
    expect(screen.getByTestId("voice-1-file")).toHaveTextContent("welcome.mp3");
    expect(screen.getByTestId("voice-1-source")).toHaveTextContent("Default");
    expect(screen.getByTestId("voice-3-file")).toHaveTextContent("ready-andheri.mp3");
    expect(screen.getByTestId("voice-3-source")).toHaveTextContent("This machine");
    expect(screen.getByTestId("voice-2-empty")).toHaveTextContent("No prompt. The machine stays silent here.");
    expect(screen.getByTestId("voice-3-remove")).toHaveTextContent("Use default");
  });

  it("goes back to the default and saves with the override's version", async () => {
    const onSaved = vi.fn();
    mockSave.mockResolvedValue({ ok: true, data: { ...voices, override: set({}, 2), restartPending: 1 } });
    render(<MachineVoicesTab sn="SN1" onSaved={onSaved} />);
    await userEvent.click(await screen.findByTestId("voice-3-remove"));
    expect(screen.getByTestId("voice-3-source")).toHaveTextContent("Default");
    await userEvent.click(screen.getByTestId("button-save-machine-voices"));
    expect(mockSave).toHaveBeenCalledWith("SN1", { "1": null, "2": null, "3": null, "4": null, "5": null }, 1);
    await waitFor(() =>
      expect(screen.getByTestId("machine-voices-notice")).toHaveTextContent(
        "Saved. The machine picks this up the next time its app starts. 1 machine now shows Restart pending.",
      ),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it("offers a reload when someone else saved first", async () => {
    mockSave.mockResolvedValue({ ok: false, error: { code: "stale_write", message: "Someone else changed this." }, issues: [] });
    render(<MachineVoicesTab sn="SN1" onSaved={() => {}} />);
    await userEvent.click(await screen.findByTestId("button-save-machine-voices"));
    expect(await screen.findByTestId("button-reload-machine-voices")).toBeInTheDocument();
  });
});
