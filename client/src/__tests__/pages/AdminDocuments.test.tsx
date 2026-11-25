import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: vi.fn() })),
  usePathname: vi.fn(() => "/admin/documents"),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { mockFetchSession, mockSignOut } = vi.hoisted(() => ({ mockFetchSession: vi.fn(), mockSignOut: vi.fn() }));
vi.mock("@/lib/adminSession", () => ({
  ADMIN_SESSION_QUERY_KEY: ["admin-session"],
  fetchAdminSession: mockFetchSession,
  signOutAsAdmin: mockSignOut,
}));

const api = vi.hoisted(() => ({ fetchDocuments: vi.fn(), uploadDocument: vi.fn(), deleteDocument: vi.fn(), configured: true }));
vi.mock("@/lib/adminDocsApi", () => ({
  fetchDocuments: api.fetchDocuments,
  uploadDocument: api.uploadDocument,
  deleteDocument: api.deleteDocument,
  docsAdminConfigured: () => api.configured,
  documentLink: (doc: { link: string | null; docId: string }) => doc.link ?? `https://api.muscleboxpro.com/docs/${doc.docId}`,
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

import AdminDocuments from "@/pages/admin/AdminDocuments";

const SESSION = { email: "ops@muscleboxpro.com", role: "admin", displayName: "Ops Team", expiresAt: "2099-01-01T00:00:00.000Z" };

const doc = (n: number, title: string, contentType = "application/pdf") => ({
  docId: `d_${String(n).padStart(32, "0")}`,
  title,
  contentType,
  size: 3_332_103,
  createdAt: "2026-11-25T06:30:00.000Z",
  createdBy: "ops@muscleboxpro.com",
  link: `https://api.muscleboxpro.com/docs/d_${String(n).padStart(32, "0")}`,
});

const HANDBOOK = doc(1, "Franchise Dashboard Documentation");
const GUIDE = doc(2, "Machine App Guide (Client)");
const DEMO = doc(4, "Machine Order Demo", "video/mp4");

const pdf = (name = "guide.pdf") => new File([new Uint8Array(10)], name, { type: "application/pdf" });

beforeEach(() => {
  vi.clearAllMocks();
  api.configured = true;
  mockFetchSession.mockResolvedValue(SESSION);
  api.fetchDocuments.mockResolvedValue({ ok: true, data: { documents: [HANDBOOK, GUIDE] } });
});

describe("AdminDocuments", () => {
  it("lists every document with its link, and a way to open and copy it", async () => {
    render(<AdminDocuments />);
    expect(await screen.findByTestId(`row-document-${HANDBOOK.docId}`)).toHaveTextContent("Franchise Dashboard Documentation");
    expect(screen.getByTestId(`link-text-${HANDBOOK.docId}`)).toHaveTextContent(HANDBOOK.link);
    expect(screen.getByTestId(`open-${GUIDE.docId}`)).toHaveAttribute("href", GUIDE.link);
    expect(screen.getByTestId(`open-${GUIDE.docId}`)).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByTestId(`row-document-${GUIDE.docId}`)).toHaveTextContent("3.2 MB");
  });

  it("copies a link to the clipboard", async () => {
    const user = userEvent.setup();
    render(<AdminDocuments />);
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await user.click(await screen.findByTestId(`copy-${HANDBOOK.docId}`));
    expect(writeText).toHaveBeenCalledWith(HANDBOOK.link);
    expect(await screen.findByText("Copied")).toBeInTheDocument();
  });

  it("is in the sidebar", async () => {
    render(<AdminDocuments />);
    expect(await screen.findByTestId("link-documents")).toHaveAttribute("href", "/admin/documents");
  });

  it("says so when there are no documents, and when the API is not configured", async () => {
    api.fetchDocuments.mockResolvedValue({ ok: true, data: { documents: [] } });
    const { unmount } = render(<AdminDocuments />);
    expect(await screen.findByText("No Data")).toBeInTheDocument();
    unmount();

    api.configured = false;
    render(<AdminDocuments />);
    expect(await screen.findByTestId("documents-not-configured")).toHaveTextContent("NEXT_PUBLIC_MBP_DOCS_API_URL");
    expect(api.fetchDocuments).toHaveBeenCalledTimes(1);
  });

  it("shows the server's problem when the list cannot be loaded", async () => {
    api.fetchDocuments.mockResolvedValue({ ok: false, error: { code: "network", message: "We couldn't reach the server." }, issues: [] });
    render(<AdminDocuments />);
    expect(await screen.findByTestId("documents-error")).toHaveTextContent("We couldn't reach the server.");
  });

  it("refuses an empty title and a non-PDF without calling the API", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<AdminDocuments />);
    await screen.findByTestId("documents-table");

    await user.click(screen.getByTestId("documents-upload"));
    expect(screen.getByTestId("documents-title-error")).toBeInTheDocument();
    expect(screen.getByTestId("documents-file-error")).toHaveTextContent("Choose a PDF or an MP4 video.");

    await user.type(screen.getByTestId("documents-title"), "Notes");
    await user.upload(screen.getByTestId("documents-file"), new File(["x"], "notes.txt", { type: "text/plain" }));
    await user.click(screen.getByTestId("documents-upload"));
    expect(screen.getByTestId("documents-file-error")).toHaveTextContent("Only PDF or MP4 files.");
    expect(api.uploadDocument).not.toHaveBeenCalled();
  });

  it("marks a video as a video and a PDF as a PDF", async () => {
    api.fetchDocuments.mockResolvedValue({ ok: true, data: { documents: [DEMO, HANDBOOK] } });
    render(<AdminDocuments />);
    expect(await screen.findByTestId(`type-${DEMO.docId}`)).toHaveTextContent("Video");
    expect(screen.getByTestId(`type-${HANDBOOK.docId}`)).toHaveTextContent("PDF");
  });

  it("uploads an MP4 video, and refuses a video over its larger cap and a PDF over its smaller one", async () => {
    const user = userEvent.setup({ applyAccept: false });
    api.uploadDocument.mockResolvedValue({ ok: true, data: DEMO });
    render(<AdminDocuments />);
    await screen.findByTestId("documents-table");

    await user.type(screen.getByTestId("documents-title"), "Machine Order Demo");
    const video = new File([new Uint8Array(10)], "demo.mp4", { type: "video/mp4" });
    await user.upload(screen.getByTestId("documents-file"), video);
    await user.click(screen.getByTestId("documents-upload"));
    await waitFor(() => expect(api.uploadDocument).toHaveBeenCalledWith(video, "Machine Order Demo"));

    const oversizedVideo = new File(["x"], "big.mp4", { type: "video/mp4" });
    Object.defineProperty(oversizedVideo, "size", { value: 101 * 1024 * 1024 });
    await user.type(screen.getByTestId("documents-title"), "Big");
    await user.upload(screen.getByTestId("documents-file"), oversizedVideo);
    await user.click(screen.getByTestId("documents-upload"));
    expect(screen.getByTestId("documents-file-error")).toHaveTextContent("Videos can be up to 100 MB.");

    const midPdf = new File(["x"], "mid.pdf", { type: "application/pdf" });
    Object.defineProperty(midPdf, "size", { value: 30 * 1024 * 1024 });
    await user.upload(screen.getByTestId("documents-file"), midPdf);
    await user.click(screen.getByTestId("documents-upload"));
    expect(screen.getByTestId("documents-file-error")).toHaveTextContent("PDFs can be up to 25 MB.");
    expect(api.uploadDocument).toHaveBeenCalledTimes(1);
  });

  it("uploads a PDF, reloads the list and clears the form", async () => {
    const user = userEvent.setup();
    const added = doc(3, "Operator Handbook");
    api.uploadDocument.mockResolvedValue({ ok: true, data: added });
    render(<AdminDocuments />);
    await screen.findByTestId("documents-table");
    api.fetchDocuments.mockResolvedValue({ ok: true, data: { documents: [added, HANDBOOK, GUIDE] } });

    await user.type(screen.getByTestId("documents-title"), "Operator Handbook");
    const file = pdf("handbook.pdf");
    await user.upload(screen.getByTestId("documents-file"), file);
    await user.click(screen.getByTestId("documents-upload"));

    await waitFor(() => expect(api.uploadDocument).toHaveBeenCalledWith(file, "Operator Handbook"));
    expect(await screen.findByTestId("documents-notice")).toHaveTextContent('Added "Operator Handbook".');
    expect(await screen.findByTestId(`row-document-${added.docId}`)).toBeInTheDocument();
    expect(screen.getByTestId("documents-title")).toHaveValue("");
  });

  it("keeps the form and shows the server's words when an upload is refused", async () => {
    const user = userEvent.setup();
    api.uploadDocument.mockResolvedValue({ ok: false, error: { code: "validation", message: "This isn't a PDF." }, issues: [] });
    render(<AdminDocuments />);
    await screen.findByTestId("documents-table");
    await user.type(screen.getByTestId("documents-title"), "Fake");
    await user.upload(screen.getByTestId("documents-file"), pdf());
    await user.click(screen.getByTestId("documents-upload"));
    expect(await screen.findByTestId("documents-error")).toHaveTextContent("This isn't a PDF.");
    expect(screen.getByTestId("documents-title")).toHaveValue("Fake");
  });

  it("asks before deleting, deletes on confirm, and says the link stops working", async () => {
    const user = userEvent.setup();
    api.deleteDocument.mockResolvedValue({ ok: true, data: { docId: GUIDE.docId, deleted: true } });
    render(<AdminDocuments />);
    await user.click(await screen.findByTestId(`delete-${GUIDE.docId}`));
    expect(api.deleteDocument).not.toHaveBeenCalled();
    const dialog = await screen.findByTestId("documents-delete-dialog");
    expect(dialog).toHaveTextContent("Machine App Guide (Client)");

    api.fetchDocuments.mockResolvedValue({ ok: true, data: { documents: [HANDBOOK] } });
    await user.click(within(dialog).getByTestId("documents-delete-dialog-confirm"));

    await waitFor(() => expect(api.deleteDocument).toHaveBeenCalledWith(GUIDE.docId));
    expect(await screen.findByTestId("documents-notice")).toHaveTextContent("Its link no longer works.");
    await waitFor(() => expect(screen.queryByTestId(`row-document-${GUIDE.docId}`)).not.toBeInTheDocument());
  });

  it("does not delete when the dialog is cancelled", async () => {
    const user = userEvent.setup();
    render(<AdminDocuments />);
    await user.click(await screen.findByTestId(`delete-${HANDBOOK.docId}`));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(api.deleteDocument).not.toHaveBeenCalled();
  });
});
