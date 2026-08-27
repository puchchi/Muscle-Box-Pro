import { describe, it, vi, beforeEach } from "vitest";
import { writeFileSync } from "fs";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
  usePathname: vi.fn(() => "/gym/dashboard"),
}));
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock("@/lib/gymSession", () => ({
  GYM_SESSION_QUERY_KEY: ["gym-session"],
  fetchGymSession: vi.fn().mockResolvedValue({
    email: "owner@yourgym.com",
    gymId: "gym_iron_temple",
    role: "owner",
    gymStatus: "trading",
  }),
  signOutOfPortal: vi.fn(),
}));
vi.mock("@/lib/queryClient", () => ({
  queryClient: { invalidateQueries: vi.fn(), removeQueries: vi.fn() },
}));

const { payout } = vi.hoisted(() => ({ payout: { value: null as unknown } }));
vi.mock("@/lib/gymPayoutAccountApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/gymPayoutAccountApi")>();
  return { ...actual, fetchPayoutAccount: async () => payout.value };
});

import GymDashboard from "@/pages/gym/GymDashboard";

const ACCOUNT = {
  accountHolderName: "Iron Temple Fitness Pvt Ltd",
  accountNumberLast4: "4417",
  ifsc: "HDFC0001234",
  bankName: "HDFC Bank",
  accountType: "current" as const,
  updatedAt: "2026-04-29T10:05:00.000Z",
};

function renderDash() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <GymDashboard />
    </QueryClientProvider>,
  );
}

function dump(name: string) {
  writeFileSync(
    `/tmp/mbp-${name}.html`,
    `<!doctype html><html class="dark"><head><meta charset="utf-8"><link rel="stylesheet" href="/tmp/mbp-app.css"></head><body class="dark bg-background">${document.body.innerHTML}</body></html>`,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("visual dump", () => {
  it("account tab with an account on file", async () => {
    payout.value = ACCOUNT;
    renderDash();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await waitFor(() => screen.getByTestId("card-payout"));
    await user.click(screen.getByTestId("tab-account"));
    await waitFor(() => screen.getByTestId("payout-account-summary"));
    dump("account-tab");
  });

  it("the prompt and the form", async () => {
    payout.value = null;
    renderDash();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await waitFor(() => screen.getByTestId("payout-account-prompt"));
    dump("prompt");
    await user.click(screen.getByTestId("button-prompt-add-payout-account"));
    await waitFor(() => screen.getByTestId("input-account-number"));
    dump("form");
  });

  it("the removal confirmation", async () => {
    payout.value = ACCOUNT;
    renderDash();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await waitFor(() => screen.getByTestId("card-payout"));
    await user.click(screen.getByTestId("tab-account"));
    await waitFor(() => screen.getByTestId("payout-account-summary"));
    await user.click(screen.getByTestId("button-remove-payout-account"));
    await waitFor(() => screen.getByTestId("button-confirm-remove-payout-account"));
    dump("removal");
  });
});
