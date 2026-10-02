import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockFetchMaterials, mockFetchGoods, mockFetchModels, mockUpload } = vi.hoisted(() => ({
  mockFetchMaterials: vi.fn(),
  mockFetchGoods: vi.fn(),
  mockFetchModels: vi.fn(),
  mockUpload: vi.fn(),
}));
vi.mock("@/lib/adminMachineApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/adminMachineApi")>();
  return {
    contentTypeOf: actual.contentTypeOf,
    fetchMaterials: mockFetchMaterials,
    uploadGoodsPicture: vi.fn(),
    uploadMachineFile: mockUpload,
    fetchGoods: mockFetchGoods,
    fetchModels: mockFetchModels,
    deleteGood: vi.fn(),
    setGoodListing: vi.fn(),
  };
});
vi.mock("@/pages/admin/useAdminGuard", () => ({
  useAdminGuard: () => ({ state: "ready", session: { email: "a@x.in", role: "admin", displayName: "A", expiresAt: "2030-01-01T00:00:00Z" } }),
}));
vi.mock("@/pages/admin/machines/MachinesShell", () => ({
  MachinesShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { goodSchema, type Good } from "@shared/admin/machinesSchema";
import { GoodEditor } from "@/pages/admin/machines/GoodEditor";
import AdminMachineGoods from "@/pages/admin/AdminMachineGoods";

const wire = {
  goodsId: "g1",
  no: "SHAKE1",
  name: "Chocolate protein shake",
  nameEn: "",
  spec: "300 ml",
  priceInr: 149,
  sort: 1,
  modelId: "1",
  image: { url: "https://cdn.example/g.png", path: "g.png", fileName: "g.png", md5: "x" },
  recipe: [{ materialId: "powder1", qty: 30, waterQty: 0, waterType: 1, kqty: 0 }],
  machinesListed: 2,
  version: 3,
  createdAt: null,
  createdBy: null,
  updatedAt: null,
  updatedBy: null,
};

const good = (over: Record<string, unknown> = {}): Good => goodSchema.parse({ ...wire, ...over });

const materials = [
  { materialId: "powder1", name: "Whey", position: "1", rawType: "powder", unit: "g", capacity: 1000, warnCapacity: 100, expendRate: 1, enabled: true },
];

const MB = 1024 * 1024;
const pictureSize = new Map<string, [number, number]>();
const videoSeconds = new Map<string, number>();

function picture(name: string, { bytes = 1000, width = 600, height, type = "image/png" }: { bytes?: number; width?: number; height?: number; type?: string } = {}): File {
  pictureSize.set(name, [width, height ?? width]);
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

function video(name: string, seconds: number, bytes = 1000): File {
  videoSeconds.set(name, seconds);
  const file = new File(["x"], name, { type: "video/mp4" });
  Object.defineProperty(file, "size", { value: bytes });
  return file;
}

const uploaded = (name: string) => ({ ok: true, data: { url: `https://cdn.example/${name}`, path: name, fileName: name, md5: "m" } });

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 0;
  naturalHeight = 0;
  set src(url: string) {
    const size = pictureSize.get(url.replace("blob:", ""));
    setTimeout(() => {
      if (!size) return this.onerror?.();
      [this.naturalWidth, this.naturalHeight] = size;
      this.onload?.();
    });
  }
}

const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "src");

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchMaterials.mockResolvedValue({ ok: true, data: { items: materials } });
  mockFetchModels.mockResolvedValue({ ok: true, data: { items: [{ id: "1", name: "GS805", protocol: "2_000", versions: "1.0" }] } });
  mockUpload.mockImplementation(async (_kind: string, file: File) => uploaded(file.name));
  vi.stubGlobal("Image", FakeImage);
  URL.createObjectURL = vi.fn((file: File) => `blob:${file.name}`);
  URL.revokeObjectURL = vi.fn();
  Object.defineProperty(HTMLMediaElement.prototype, "src", {
    configurable: true,
    set(this: HTMLVideoElement, url: string) {
      const seconds = videoSeconds.get(url.replace("blob:", ""));
      setTimeout(() => {
        Object.defineProperty(this, "duration", { configurable: true, value: seconds ?? NaN });
        this.onloadedmetadata?.(new Event("loadedmetadata"));
      });
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (srcDescriptor) Object.defineProperty(HTMLMediaElement.prototype, "src", srcDescriptor);
});

describe("media in the goods schema", () => {
  it("reads a good with no media as none", () => {
    expect(goodSchema.parse(wire).media).toEqual([]);
  });

  it("keeps a picture and a video in order", () => {
    const media = [
      { url: "https://cdn.example/a.png", video: false },
      { url: "https://cdn.example/b.mp4", video: true },
    ];
    expect(good({ media }).media).toEqual(media);
  });
});

describe("GoodEditor more pictures and videos", () => {
  async function renderEditor(start: Good = good()) {
    const onSubmit = vi.fn().mockResolvedValue({ ok: true, data: { good: start, machinesUpdated: 2 } });
    render(<GoodEditor good={start} models={[{ id: "1", name: "GS805", protocol: "2_000", versions: "1.0" }]} onSubmit={onSubmit} />);
    await vi.waitFor(() => expect(mockFetchMaterials).toHaveBeenCalled());
    await screen.findByText("Slot 1: Whey");
    return { onSubmit, user: userEvent.setup({ applyAccept: false }) };
  }

  async function save(user: ReturnType<typeof userEvent.setup>, onSubmit: ReturnType<typeof vi.fn>) {
    await user.click(screen.getByTestId("button-save-good"));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    return onSubmit.mock.calls[0]![0].media as { url: string }[];
  }

  it("uploads every picked file with the goodsMedia kind, in order", async () => {
    const { onSubmit, user } = await renderEditor();
    await user.upload(screen.getByTestId("input-gallery"), [picture("a.png"), video("b.mp4", 12)]);
    await screen.findByTestId("gallery-item-1");

    expect(mockUpload.mock.calls.map(([kind, file]) => [kind, (file as File).name])).toEqual([
      ["goodsMedia", "a.png"],
      ["goodsMedia", "b.mp4"],
    ]);
    expect(await save(user, onSubmit)).toEqual([{ url: "https://cdn.example/a.png" }, { url: "https://cdn.example/b.mp4" }]);
  });

  it("refuses a GIF, a 3 MB picture and a 61 second video before uploading", async () => {
    const { user } = await renderEditor();
    await user.upload(screen.getByTestId("input-gallery"), [
      picture("c.gif", { type: "image/gif" }),
      picture("big.png", { bytes: 3 * MB }),
      video("long.mp4", 61),
    ]);

    const error = await screen.findByTestId("error-gallery");
    expect(error).toHaveTextContent("c.gif: PNG, JPG or MP4 only.");
    expect(error).toHaveTextContent("big.png: Up to 2 MB.");
    expect(error).toHaveTextContent("long.mp4: Videos can be up to 60 seconds.");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("refuses a picture that isn't square, and a video over 20 MB", async () => {
    const { user } = await renderEditor();
    const wide = picture("wide.png", { width: 800, height: 600 });
    await user.upload(screen.getByTestId("input-gallery"), [wide, video("huge.mp4", 10, 21 * MB)]);
    const error = await screen.findByTestId("error-gallery");
    expect(error).toHaveTextContent("wide.png: The picture must be square. This one is 800×600 px.");
    expect(error).toHaveTextContent("huge.mp4: Up to 20 MB.");
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it("refuses the files that would take it over 7", async () => {
    const seven = Array.from({ length: 6 }, (_, i) => ({ url: `https://cdn.example/${i}.png`, video: false }));
    const { user } = await renderEditor(good({ media: seven }));
    await user.upload(screen.getByTestId("input-gallery"), [picture("7.png"), picture("8.png")]);

    expect(await screen.findByTestId("error-gallery")).toHaveTextContent("Up to 7 more pictures and videos.");
    await screen.findByTestId("gallery-item-6");
    expect(mockUpload).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("button-add-gallery")).toBeDisabled();
  });

  it("keeps the files already uploaded when the server refuses one", async () => {
    mockUpload.mockImplementation(async (_kind: string, file: File) =>
      file.name === "b.png" ? { ok: false, error: { code: "invalid", message: "Bad file.", fieldErrors: { file: "This isn't a square picture." } } } : uploaded(file.name),
    );
    const { user } = await renderEditor();
    await user.upload(screen.getByTestId("input-gallery"), [picture("a.png"), picture("b.png"), picture("c.png")]);

    expect(await screen.findByTestId("error-gallery")).toHaveTextContent("b.png: This isn't a square picture.");
    await screen.findByTestId("gallery-item-1");
    expect(screen.queryByTestId("gallery-item-2")).not.toBeInTheDocument();
  });

  it("sends the order after Move left and Move right", async () => {
    const media = ["a", "b", "c"].map((n) => ({ url: `https://cdn.example/${n}.png`, video: false }));
    const { onSubmit, user } = await renderEditor(good({ media }));
    expect(screen.getByTestId("gallery-0-left")).toBeDisabled();
    expect(screen.getByTestId("gallery-2-right")).toBeDisabled();

    await user.click(screen.getByTestId("gallery-2-left"));
    await user.click(screen.getByTestId("gallery-0-right"));

    expect((await save(user, onSubmit)).map((m) => m.url)).toEqual([
      "https://cdn.example/c.png",
      "https://cdn.example/a.png",
      "https://cdn.example/b.png",
    ]);
  });

  it("drops an item on Remove, and sends none when all are removed", async () => {
    const media = ["a", "b"].map((n) => ({ url: `https://cdn.example/${n}.png`, video: false }));
    const { onSubmit, user } = await renderEditor(good({ media }));
    await user.click(screen.getByTestId("gallery-0-remove"));
    expect(screen.getAllByRole("img", { name: /^Picture/ })).toHaveLength(1);
    await user.click(screen.getByTestId("gallery-0-remove"));
    expect(screen.getByTestId("gallery-empty")).toBeInTheDocument();
    expect(await save(user, onSubmit)).toEqual([]);
  });

  it("disables Save while uploading and shows progress", async () => {
    let finish: (value: unknown) => void = () => {};
    mockUpload.mockImplementation((_kind: string, file: File) => new Promise((resolve) => (finish = () => resolve(uploaded(file.name)))));
    const { user } = await renderEditor();
    await user.upload(screen.getByTestId("input-gallery"), [picture("a.png"), picture("b.png")]);

    expect(await screen.findByTestId("gallery-progress")).toHaveTextContent("Uploading 1 of 2…");
    expect(screen.getByTestId("button-save-good")).toBeDisabled();
    finish(null);
    expect(await screen.findByText("Uploading 2 of 2…")).toBeInTheDocument();
    finish(null);
    await vi.waitFor(() => expect(screen.getByTestId("button-save-good")).toBeEnabled());
    expect(screen.queryByTestId("gallery-progress")).not.toBeInTheDocument();
  });

  it("shows a video as a video, not a picture", async () => {
    const media = [
      { url: "https://cdn.example/a.png", video: false },
      { url: "https://cdn.example/b.mp4", video: true },
    ];
    await renderEditor(good({ media }));
    const item = screen.getByTestId("gallery-item-1");
    expect(within(item).getByRole("img", { name: "Video 2" })).toBeInTheDocument();
    expect(item.querySelector("img")).toBeNull();
    expect(screen.getByTestId("gallery-item-0").querySelector("img")).toHaveAttribute("src", "https://cdn.example/a.png");
  });

  it("shows a backend media error under the section", async () => {
    const { onSubmit, user } = await renderEditor();
    onSubmit.mockResolvedValue({ ok: false, error: { code: "invalid", message: "Some fields need fixing.", fieldErrors: { media: "Upload the file again." } } });
    await user.click(screen.getByTestId("button-save-good"));
    expect(await screen.findByTestId("error-gallery")).toHaveTextContent("Upload the file again.");
  });
});

describe("goods list gallery count", () => {
  it("shows +N only on drinks with more pictures and videos", async () => {
    const media = [
      { url: "https://cdn.example/a.png", video: false },
      { url: "https://cdn.example/b.mp4", video: true },
      { url: "https://cdn.example/c.png", video: false },
    ];
    mockFetchGoods.mockResolvedValue({ ok: true, data: { items: [good({ goodsId: "a", media }), good({ goodsId: "b" })], total: 2 } });
    render(<AdminMachineGoods />);
    expect(await screen.findByTestId("gallery-count-a")).toHaveTextContent("+3");
    expect(screen.queryByTestId("gallery-count-b")).not.toBeInTheDocument();
  });
});
