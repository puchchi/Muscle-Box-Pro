import { afterEach, describe, expect, it, vi } from "vitest";

const BASE = "https://docs.example/sandbox";

async function api(base = BASE) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_MBP_DOCS_API_URL", base);
  return import("@/lib/adminDocsApi");
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

const wireDoc = { docId: "d_" + "a".repeat(32), title: "Handbook", contentType: "application/pdf" as const, size: 2048, createdAt: "2026-11-25T06:30:00.000Z", createdBy: "ops@muscleboxpro.com", link: null };

const pdf = (name = "handbook.pdf", size = 2048) => new File([new Uint8Array(size)], name, { type: "application/pdf" });
const mp4 = (name = "demo.mp4", size = 4096) => new File([new Uint8Array(size)], name, { type: "video/mp4" });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("adminDocsApi", () => {
  it("derives api.muscleboxpro.com/docs in production, and is off elsewhere when the variable is unset", async () => {
    await api("");
    const { apiBaseUrl } = await import("@/lib/apiClient");
    expect(apiBaseUrl("docsAdmin")).toBe("https://api.muscleboxpro.com/docs");

    vi.stubEnv("NEXT_PUBLIC_MBP_API_URL", "https://abc123.execute-api.ap-south-1.amazonaws.com/sandbox");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { docsAdminConfigured, fetchDocuments } = await api("");
    expect(docsAdminConfigured()).toBe(false);
    expect((await fetchDocuments()).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lists documents from the admin path", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { documents: [wireDoc] }));
    vi.stubGlobal("fetch", fetch);
    const { fetchDocuments } = await api();
    expect(await fetchDocuments()).toMatchObject({ ok: true, data: { documents: [{ title: "Handbook" }] } });
    expect(fetch.mock.calls[0]![0]).toBe(`${BASE}/admin/documents`);
  });

  it("uploads in three steps: ask for a signed PUT, send the file to it with the signed headers, then complete", async () => {
    const docId = wireDoc.docId;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(201, { docId, url: "https://s3.example/docs/x.pdf?sig=1", headers: { "Content-Type": "application/pdf" }, expiresInSeconds: 300 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json(200, wireDoc));
    vi.stubGlobal("fetch", fetch);
    const { uploadDocument } = await api();
    const file = pdf("handbook.pdf", 2048);

    const result = await uploadDocument(file, "  Handbook ");

    expect(result).toMatchObject({ ok: true, data: { docId, title: "Handbook" } });
    const [start, put, complete] = fetch.mock.calls as [string, RequestInit][];
    expect(start[0]).toBe(`${BASE}/admin/documents`);
    expect(JSON.parse(start[1].body as string)).toEqual({ title: "Handbook", size: 2048, contentType: "application/pdf" });
    expect(put[0]).toBe("https://s3.example/docs/x.pdf?sig=1");
    expect(put[1]).toMatchObject({ method: "PUT", headers: { "Content-Type": "application/pdf" }, body: file });
    expect(complete[0]).toBe(`${BASE}/admin/documents/${docId}/complete`);
    expect(put[1].credentials).toBeUndefined();
  });

  it("uploads a video as video/mp4, with the signed headers the server returned", async () => {
    const docId = wireDoc.docId;
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(201, { docId, url: "https://s3.example/docs/x.mp4?sig=1", headers: { "Content-Type": "video/mp4" }, expiresInSeconds: 300 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(json(200, { ...wireDoc, title: "Demo", contentType: "video/mp4", size: 4096 }));
    vi.stubGlobal("fetch", fetch);
    const { uploadDocument } = await api();
    const file = mp4();

    expect(await uploadDocument(file, "Demo")).toMatchObject({ ok: true, data: { contentType: "video/mp4" } });
    const [start, put] = fetch.mock.calls as [string, RequestInit][];
    expect(JSON.parse(start[1].body as string)).toEqual({ title: "Demo", size: 4096, contentType: "video/mp4" });
    expect(put[1]).toMatchObject({ method: "PUT", headers: { "Content-Type": "video/mp4" }, body: file });
  });

  it("refuses any other kind of file without calling the server", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { uploadDocument } = await api();
    expect(await uploadDocument(new File(["x"], "clip.mov", { type: "video/quicktime" }), "Clip")).toMatchObject({ ok: false, error: { code: "validation" } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads a document with no type, from a server that predates videos, as a PDF", async () => {
    const { contentType: _omitted, ...legacy } = wireDoc;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { documents: [legacy] })));
    const { fetchDocuments } = await api();
    expect(await fetchDocuments()).toMatchObject({ ok: true, data: { documents: [{ contentType: "application/pdf" }] } });
  });

  it("does not complete an upload whose PUT failed, and says so", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(json(201, { docId: wireDoc.docId, url: "https://s3.example/x", headers: {}, expiresInSeconds: 300 }))
      .mockResolvedValueOnce(new Response("denied", { status: 403 }));
    vi.stubGlobal("fetch", fetch);
    const { uploadDocument } = await api();
    const result = await uploadDocument(pdf(), "Handbook");
    expect(result).toMatchObject({ ok: false, error: { message: expect.stringContaining("didn't reach storage") } });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("keeps the server's words when it refuses the file, and maps a signed-out session", async () => {
    const { uploadDocument, fetchDocuments } = await api();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(400, { code: "invalid_request", message: "Some of the details aren't right.", fieldErrors: { size: "Up to 25 MB." } })));
    expect(await uploadDocument(pdf(), "x")).toMatchObject({ ok: false, error: { code: "validation", fieldErrors: { size: "Up to 25 MB." } } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, { code: "signed_out", message: "Please sign in again." })));
    expect(await fetchDocuments()).toMatchObject({ ok: false, error: { code: "invalid_token" } });
  });

  it("deletes by id, escaping it", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { docId: "d_1", deleted: true }));
    vi.stubGlobal("fetch", fetch);
    const { deleteDocument } = await api(`${BASE}/`);
    expect(await deleteDocument("d/1")).toMatchObject({ ok: true, data: { deleted: true } });
    expect(fetch.mock.calls[0]![0]).toBe(`${BASE}/admin/documents/d%2F1`);
    expect(fetch.mock.calls[0]![1].method).toBe("DELETE");
  });

  it("uses the server's link, and builds one from the API address when the environment has no domain", async () => {
    const { documentLink } = await api();
    expect(documentLink({ ...wireDoc, link: "https://api.muscleboxpro.com/docs/d_1" })).toBe("https://api.muscleboxpro.com/docs/d_1");
    expect(documentLink(wireDoc)).toBe(`${BASE}/${wireDoc.docId}`);
  });
});
