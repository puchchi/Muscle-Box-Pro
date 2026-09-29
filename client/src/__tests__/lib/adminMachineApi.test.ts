import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }));
vi.mock("@/lib/apiClient", () => ({ machineApiRequest: mockRequest }));

import {
  contentTypeOf,
  deleteAd,
  deleteGood,
  fetchAds,
  fetchAllMachines,
  fetchMachineVoices,
  setAdSchedules,
  setMachineVoices,
  setQrSettings,
  setVoiceDefaults,
  uploadMachineFile,
  fetchEquipmentLog,
  fetchMachines,
  fetchRestockHistory,
  fetchStock,
  queryString,
  restock,
  setGoodListing,
  updateMachine,
  uploadGoodsPicture,
} from "@/lib/adminMachineApi";

const slot = {
  slotId: "s1",
  materialId: "m1",
  name: "Whey",
  position: "1",
  rawType: "powder",
  unit: "g",
  capacity: 1000,
  warnCapacity: 100,
  residueQty: 400,
  low: false,
};

function resolves(...data: unknown[]) {
  for (const d of data) mockRequest.mockResolvedValueOnce({ ok: true, data: d });
}

function fails(code: string, message: string, fieldErrors?: Record<string, string>) {
  mockRequest.mockResolvedValueOnce({ ok: false, error: { code, message, fieldErrors } });
}

const call = (i = 0) => mockRequest.mock.calls[i] as [string, string, unknown?];

beforeEach(() => mockRequest.mockReset());

describe("queryString", () => {
  it("drops empty, null and undefined values", () => {
    expect(queryString({ a: "", b: null, c: undefined })).toBe("");
    expect(queryString({ name: "whey", page: 2, cursor: null })).toBe("?name=whey&page=2");
  });

  it("escapes cursors so + and = survive", () => {
    expect(queryString({ cursor: "ab+c=" })).toBe("?cursor=ab%2Bc%3D");
  });
});

describe("request paths", () => {
  it("lists machines with filters and paging", async () => {
    resolves({ items: [], total: 0 });
    await fetchMachines({ name: "gym", sn: undefined }, 1, 20);
    expect(call()[0]).toBe("GET");
    expect(call()[1]).toBe("/machines?name=gym&page=1&pageSize=20");
  });

  it("escapes the SN in the path and sends the expected version", async () => {
    fails("stale_write", "This was changed elsewhere. Reload to see the current values.");
    await updateMachine("a/b", { name: "X" } as never, 7);
    expect(call()[0]).toBe("PATCH");
    expect(call()[1]).toBe("/machines/a%2Fb");
    expect(call()[2]).toEqual({ name: "X", expectedVersion: 7 });
  });

  it("asks for the first history page without a cursor", async () => {
    resolves({ items: [], nextCursor: null });
    await fetchRestockHistory("SN01", null);
    expect(call()[1]).toBe("/machines/SN01/stock/history");
  });

  it("adds the cursor and limit to log requests", async () => {
    resolves({ items: [], nextCursor: null });
    await fetchEquipmentLog({ sn: "SN01", code: "E12" }, "c1");
    expect(call()[1]).toBe("/logs/equipment?sn=SN01&code=E12&cursor=c1&limit=20");
  });

  it("sends the dry run flag for listing", async () => {
    resolves({ machinesChanged: 3, dryRun: true });
    const result = await setGoodListing("g1", true, true);
    expect(call()).toEqual(["PUT", "/goods/g1/listing", { listed: true, dryRun: true }]);
    expect(result).toEqual({ ok: true, data: { machinesChanged: 3, dryRun: true } });
  });

  it("sends restock rows with the level the admin saw", async () => {
    resolves({ changes: [], items: [slot] });
    await restock("SN01", [{ slotId: "s1", add: 600, seenResidueQty: 400 }]);
    expect(call()).toEqual(["POST", "/machines/SN01/stock/restock", { items: [{ slotId: "s1", add: 600, seenResidueQty: 400 }] }]);
  });
});

describe("responses", () => {
  it("returns parsed data", async () => {
    resolves({ items: [slot] });
    expect(await fetchStock("SN01")).toEqual({ ok: true, data: { items: [slot] } });
  });

  it("reports a malformed response with the field paths", async () => {
    resolves({ items: [{ ...slot, capacity: "lots" }] });
    const result = await fetchStock("SN01");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("network");
    expect(result.issues.join(" ")).toContain("capacity");
  });

  it("passes server errors through untouched", async () => {
    fails("stale_stock", "Stock changed on the machine.", { "items.0.add": "Too much." });
    const result = await restock("SN01", [{ slotId: "s1", add: 1, seenResidueQty: 0 }]);
    expect(result).toEqual({
      ok: false,
      error: { code: "stale_stock", message: "Stock changed on the machine.", fieldErrors: { "items.0.add": "Too much." } },
      issues: [],
    });
  });

  it("treats a delete with no body as success", async () => {
    resolves(undefined);
    expect(await deleteGood("g1")).toEqual({ ok: true, data: true });
    expect(call()).toEqual(["DELETE", "/goods/g1"]);
  });

  it("passes in_use through on delete", async () => {
    fails("in_use", "Listed on 2 machines. Unlist it first.");
    const result = await deleteGood("g1");
    expect(result.ok || result.error.code).toBe("in_use");
  });
});

describe("uploadGoodsPicture", () => {
  const file = new File(["x"], "whey.png", { type: "image/png" });
  const started = { uploadId: "u 1", url: "https://bucket.example/key?sig=1", headers: { "Content-Type": "image/png" }, expiresInSeconds: 300 };
  const done = { file: { url: "https://cdn.example/whey.png", path: "goods/whey.png", fileName: "whey.png", md5: "abc" } };
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts, puts to S3 without cookies, then completes", async () => {
    resolves(started, done);
    fetchMock.mockResolvedValue({ ok: true });
    const result = await uploadGoodsPicture(file);
    expect(call(0)).toEqual(["POST", "/uploads", { kind: "goods", fileName: "whey.png", contentType: "image/png", size: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(started.url, {
      method: "PUT",
      headers: started.headers,
      body: file,
      credentials: "omit",
    });
    expect(call(1)).toEqual(["POST", "/uploads/u%201/complete", undefined]);
    expect(result).toEqual({ ok: true, data: done.file });
  });

  it("stops when S3 refuses the file", async () => {
    resolves(started);
    fetchMock.mockResolvedValue({ ok: false });
    const result = await uploadGoodsPicture(file);
    expect(result.ok).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("stops when the PUT never completes", async () => {
    resolves(started);
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect((await uploadGoodsPicture(file)).ok).toBe(false);
  });

  it("returns the file error from the complete step", async () => {
    resolves(started);
    fails("validation", "Some fields need fixing.", { file: "The picture must be square." });
    fetchMock.mockResolvedValue({ ok: true });
    const result = await uploadGoodsPicture(file);
    expect(result.ok || result.error.fieldErrors?.file).toBe("The picture must be square.");
  });

  it("never puts when the start is refused", async () => {
    fails("validation", "Some fields need fixing.", { size: "Up to 2 MB." });
    await uploadGoodsPicture(file);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

const media = { url: "https://cdn.example/ads/a.png", path: "ads/a.png", fileName: "a.png", md5: "m", size: 10, width: 1080, height: 1920 };
const ad = {
  adId: "AD1",
  no: "AD1",
  name: "Offer",
  description: "",
  type: "image",
  file: media,
  schedules: [],
  version: 2,
  createdAt: null,
  createdBy: "a@x",
  updatedAt: null,
  updatedBy: "a@x",
};
const voiceSet = { positions: { "1": null, "2": null, "3": null, "4": null, "5": null }, version: 0, updatedAt: null, updatedBy: null };
const empty = { "1": null, "2": null, "3": null, "4": null, "5": null };

describe("app-start data paths", () => {
  it("lists ads by name and page", async () => {
    resolves({ items: [ad], total: 1 });
    const result = await fetchAds("offer", 2, 20);
    expect(call()).toEqual(["GET", "/ads?name=offer&page=2&pageSize=20", undefined]);
    expect(result.ok && result.data.items[0]?.file.width).toBe(1080);
  });

  it("puts schedules with the version it read", async () => {
    resolves({ ad, restartPending: 3 });
    const rows = [{ allMachines: true, sns: [], start: "2026-10-01T09:00", end: "2026-10-02T09:00", sort: 0 }];
    const result = await setAdSchedules("AD 1", rows, 2);
    expect(call()).toEqual(["PUT", "/ads/AD%201/schedules", { schedules: rows, expectedVersion: 2 }]);
    expect(result.ok && result.data.restartPending).toBe(3);
  });

  it("deletes an ad and reads the restart count", async () => {
    resolves({ deleted: true, restartPending: 1 });
    const result = await deleteAd("AD1");
    expect(call()[0]).toBe("DELETE");
    expect(result.ok && result.data.restartPending).toBe(1);
  });

  it("saves default and per-machine voices", async () => {
    resolves({ defaults: voiceSet, restartPending: 0 });
    await setVoiceDefaults(empty, 4);
    expect(call()).toEqual(["PUT", "/voices", { positions: empty, expectedVersion: 4 }]);
    resolves({ defaults: voiceSet, override: voiceSet, effective: empty, restartPending: 1 });
    await setMachineVoices("SN 1", empty, 0);
    expect(call(1)).toEqual(["PUT", "/machines/SN%201/voices", { positions: empty, expectedVersion: 0 }]);
  });

  it("reads where each machine's voice comes from", async () => {
    resolves({ defaults: voiceSet, override: voiceSet, effective: { ...empty, "2": { file: media, source: "default" } } });
    const result = await fetchMachineVoices("SN1");
    expect(result.ok && result.data.effective["2"]?.source).toBe("default");
  });

  it("puts QR settings with the version", async () => {
    resolves({ settings: { logo: null, memberQr: null, memberTip: "", exchangeQr: null, exchangeTip: "", version: 1, updatedAt: null, updatedBy: null }, restartPending: 5 });
    const input = { logo: null, memberQr: null, memberTip: "", exchangeQr: { url: "u" }, exchangeTip: "Scan" };
    await setQrSettings(input, 0);
    expect(call()).toEqual(["PUT", "/qr", { ...input, expectedVersion: 0 }]);
  });

  it("walks every page of machines", async () => {
    const row = (sn: string) => ({
      sn, deviceExtNo: "", name: "", modelId: "", modelName: "", enabled: true, online: false, lastSeenAt: null, runStatus: null,
      faultStatus: "normal", faultRemark: "", statusAt: null, stockStatus: "normal", stockRemark: "", restartPending: false,
    });
    resolves({ items: Array.from({ length: 50 }, (_, i) => row(`A${i}`)), total: 51 }, { items: [row("B")], total: 51 });
    const result = await fetchAllMachines();
    expect(result.ok && result.data.length).toBe(51);
    expect(call(1)[1]).toBe("/machines?page=2&pageSize=50");
  });
});

describe("uploadMachineFile", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the kind, and a type the backend knows", async () => {
    resolves({ uploadId: "u", url: "https://bucket.example/k", headers: {}, expiresInSeconds: 300 }, { file: media });
    fetchMock.mockResolvedValue({ ok: true });
    await uploadMachineFile("voice", new File(["x"], "hi.aac", { type: "audio/x-aac" }));
    expect(call()).toEqual(["POST", "/uploads", { kind: "voice", fileName: "hi.aac", contentType: "audio/aac", size: 1 }]);
  });

  it("falls back to the extension when the browser sends no type", () => {
    expect(contentTypeOf({ name: "Welcome.WAV", type: "" })).toBe("audio/wav");
    expect(contentTypeOf({ name: "clip.mp4", type: "video/mp4" })).toBe("video/mp4");
    expect(contentTypeOf({ name: "noext", type: "" })).toBe("");
  });
});
