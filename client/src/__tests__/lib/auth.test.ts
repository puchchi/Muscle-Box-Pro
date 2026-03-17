import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Supabase ────────────────────────────────────────────────────────────
const { mockGetSession, mockSignOut } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSignOut: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      signOut: mockSignOut,
    },
  },
}));

import {
  getAccessToken,
  getAccessTokenSync,
  hasAccessToken,
  hasAccessTokenSync,
  clearSession,
} from "@/lib/auth";

// The localStorage key matches the pattern in auth.ts:
// sb-{hostname.split(".")[0]}-auth-token
// NEXT_PUBLIC_SUPABASE_URL = "https://testproject.supabase.co"  → key = "sb-testproject-auth-token"
const STORAGE_KEY = "sb-testproject-auth-token";

describe("getAccessToken()", () => {
  it("returns the access_token when session exists", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok-abc123" } },
    });
    expect(await getAccessToken()).toBe("tok-abc123");
  });

  it("returns null when session is null", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await getAccessToken()).toBeNull();
  });

  it("returns null when access_token is missing", async () => {
    mockGetSession.mockResolvedValue({ data: { session: {} } });
    expect(await getAccessToken()).toBeNull();
  });
});

describe("getAccessTokenSync()", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the access_token from localStorage when valid JSON is stored", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: "sync-tok-xyz" })
    );
    expect(getAccessTokenSync()).toBe("sync-tok-xyz");
  });

  it("returns null when the localStorage key is absent", () => {
    expect(getAccessTokenSync()).toBeNull();
  });

  it("returns null when the stored JSON has no access_token field", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ other: "data" }));
    expect(getAccessTokenSync()).toBeNull();
  });

  it("returns null when stored value is malformed JSON", () => {
    window.localStorage.setItem(STORAGE_KEY, "not-valid-json{{");
    expect(getAccessTokenSync()).toBeNull();
  });

  it("returns null when stored JSON has null access_token", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: null })
    );
    expect(getAccessTokenSync()).toBeNull();
  });
});

describe("hasAccessToken()", () => {
  it("returns true when a token is present", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "tok-abc" } },
    });
    expect(await hasAccessToken()).toBe(true);
  });

  it("returns false when session is null", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await hasAccessToken()).toBe(false);
  });
});

describe("hasAccessTokenSync()", () => {
  it("returns true when token exists in localStorage", () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ access_token: "sync-tok" })
    );
    expect(hasAccessTokenSync()).toBe(true);
  });

  it("returns false when localStorage is empty", () => {
    window.localStorage.clear();
    expect(hasAccessTokenSync()).toBe(false);
  });
});

describe("clearSession()", () => {
  it("calls supabase.auth.signOut()", async () => {
    mockSignOut.mockResolvedValue({});
    await clearSession();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});
