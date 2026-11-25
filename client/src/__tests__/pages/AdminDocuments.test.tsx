import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { STATIC_DOCS, docUrl } from "@shared/admin/staticDocs";

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

vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn().mockResolvedValue(undefined), removeQueries: vi.fn() },
}));

import AdminDocuments from "@/pages/admin/AdminDocuments";

const SESSION = { email: "ops@muscleboxpro.com", role: "admin", displayName: "Ops Team", expiresAt: "2099-01-01T00:00:00.000Z" };

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchSession.mockResolvedValue(SESSION);
});

describe("static documents", () => {
  it("every listed file is shipped in public/assets/docs, so no link in the table is dead", () => {
    for (const doc of STATIC_DOCS) {
      expect(existsSync(join(process.cwd(), "public/assets/docs", doc.file)), doc.file).toBe(true);
    }
  });

  it("links point at the website's own /assets/docs path, never at storage or the API", () => {
    for (const doc of STATIC_DOCS) {
      expect(docUrl(doc)).toBe(`https://www.muscleboxpro.com/assets/docs/${doc.file}`);
    }
  });

  it("names carry a random suffix so a link cannot be guessed from the title", () => {
    for (const doc of STATIC_DOCS) expect(doc.file).toMatch(/-[0-9a-f]{16}\.(pdf|mp4)$/);
  });
});

describe("AdminDocuments", () => {
  it("lists every document with its public link and an open action", async () => {
    render(<AdminDocuments />);
    expect(await screen.findByTestId("documents-heading")).toBeInTheDocument();
    for (const doc of STATIC_DOCS) {
      expect(screen.getByTestId(`link-text-${doc.file}`)).toHaveTextContent(docUrl(doc));
      expect(screen.getByTestId(`open-${doc.file}`)).toHaveAttribute("href", docUrl(doc));
    }
  });
});
