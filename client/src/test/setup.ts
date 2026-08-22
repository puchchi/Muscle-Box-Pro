import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";

// ─── Async util timeout ──────────────────────────────────────────────────────
// Testing Library defaults `waitFor` to 1000ms. The contact and advertiser form
// flows type into three fields with userEvent before they wait, which already costs
// ~1.2s of that budget on an idle machine, so under load a `waitFor` could lose the
// race and fail a test that had nothing wrong with it. Raised rather than left to
// chance: a real hang still fails, four seconds later.
configure({ asyncUtilTimeout: 5000 });

// ─── Environment Variables ───────────────────────────────────────────────────
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://testproject.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

// ─── window.matchMedia ───────────────────────────────────────────────────────
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ─── window.innerWidth ───────────────────────────────────────────────────────
Object.defineProperty(window, "innerWidth", { writable: true, value: 1024 });

// ─── IntersectionObserver ────────────────────────────────────────────────────
// Use a class so vi.restoreAllMocks() doesn't wipe the implementation.
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// ─── ResizeObserver ──────────────────────────────────────────────────────────
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// ─── localStorage ────────────────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// ─── Reset mocks between tests ───────────────────────────────────────────────
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});
