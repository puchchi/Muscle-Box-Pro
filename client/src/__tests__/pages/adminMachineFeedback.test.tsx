import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mockList, mockGet, mockUpdate, mockSearch } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGet: vi.fn(),
  mockUpdate: vi.fn(),
  mockSearch: { current: "" },
}));
vi.mock("@/lib/adminMachineApi", () => ({
  listFeedback: mockList,
  getFeedback: mockGet,
  updateFeedback: mockUpdate,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams(mockSearch.current)),
}));
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

import { feedbackListSchema, feedbackSchema, type Feedback } from "@shared/admin/feedbackSchema";
import AdminMachineFeedback from "@/pages/admin/AdminMachineFeedback";
import { firstLine } from "@/pages/admin/machines/feedbackLabels";

const base = {
  id: "f1",
  sn: "SN001",
  shopName: "Andheri gym",
  type: "query",
  goodsId: null,
  goodsName: null,
  rating: null,
  reason: null,
  message: "Do you have a vegan shake?",
  email: null,
  phone: null,
  orderId: null,
  orderLinked: false,
  state: "new",
  note: null,
  receivedAt: "2026-10-01T10:00:00Z",
  updatedAt: null,
  updatedBy: null,
};

const fb = (over: Record<string, unknown> = {}): Feedback => feedbackSchema.parse({ ...base, ...over });

const review = fb({ id: "r1", type: "review", goodsId: "g1", goodsName: "Mango shake", rating: 4, message: null, orderId: "O-1", orderLinked: true });
const complaint = fb({ id: "c1", type: "complaint", reason: "not_dispensed", message: "Paid, got nothing.\nPlease refund.", phone: "+91 98200 00000", orderId: "O-2", orderLinked: false });
const query = fb({ id: "q1", email: "asha@example.com" });

function listed(items: Feedback[], extra: Record<string, unknown> = {}) {
  return { ok: true, data: { items, nextCursor: null, newCount: 2, counts: null, ...extra } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSearch.current = "";
  mockGet.mockImplementation(() => new Promise(() => {}));
});

describe("feedbackSchema", () => {
  it("parses each type, with null and missing fields", () => {
    expect(fb().type).toBe("query");
    expect(review).toMatchObject({ type: "review", rating: 4, goodsName: "Mango shake", reason: null });
    expect(complaint).toMatchObject({ type: "complaint", reason: "not_dispensed", rating: null });
    const sparse = feedbackSchema.parse({ id: "x", sn: "S", type: "query", state: "closed", receivedAt: "2026-10-01T10:00:00Z" });
    expect(sparse).toMatchObject({ shopName: "", message: null, email: null, phone: null, orderId: null, orderLinked: false, note: null });
  });

  it("refuses an unknown type or state", () => {
    expect(feedbackSchema.safeParse({ ...base, type: "spam" }).success).toBe(false);
    expect(feedbackSchema.safeParse({ ...base, state: "open" }).success).toBe(false);
  });

  it("reads a list without newCount or counts", () => {
    expect(feedbackListSchema.parse({ items: [], nextCursor: null })).toEqual({ items: [], nextCursor: null, newCount: 0, counts: null });
  });
});

describe("firstLine", () => {
  it("takes the first non-empty line and shortens it", () => {
    expect(firstLine("\n  Hello\nthere")).toBe("Hello");
    expect(firstLine(null)).toBe("");
    expect(firstLine("a".repeat(100), 10)).toBe(`${"a".repeat(9)}…`);
  });
});

describe("Feedback list", () => {
  it("opens on New and renders each type's What cell", async () => {
    mockList.mockResolvedValue(listed([review, complaint, query]));
    render(<AdminMachineFeedback />);
    expect(await screen.findByTestId("what-r1")).toHaveTextContent("Mango shake★★★★☆4 out of 5 stars");
    expect(mockList).toHaveBeenCalledWith({ type: undefined, sn: undefined, state: "new" }, null);
    expect(screen.getByTestId("filter-state")).toHaveValue("new");
    expect(screen.getByTestId("what-c1")).toHaveTextContent("Didn't get my drink");
    expect(screen.getByTestId("what-q1")).toHaveTextContent("—");
    expect(screen.getByTestId("type-c1")).toHaveClass("text-rose-200");
    expect(screen.getByTestId("type-r1")).toHaveClass("text-emerald-200");
    expect(screen.getByTestId("open-c1")).toHaveTextContent(/^Paid, got nothing\.$/);
    expect(screen.getByTestId("contact-phone-c1")).toBeInTheDocument();
    expect(screen.queryByTestId("contact-email-c1")).not.toBeInTheDocument();
    expect(screen.getByTestId("contact-email-q1")).toBeInTheDocument();
    expect(screen.queryByText("asha@example.com")).not.toBeInTheDocument();
  });

  it("links an order only when it is linked", async () => {
    mockList.mockResolvedValue(listed([review, complaint]));
    render(<AdminMachineFeedback />);
    const linked = await screen.findByTestId("order-r1");
    expect(linked.tagName).toBe("A");
    expect(linked).toHaveAttribute("href", "/machines/orders/O-1");
    const unlinked = screen.getByTestId("order-c1");
    expect(unlinked.tagName).not.toBe("A");
    expect(unlinked).toHaveTextContent("O-2Not found");
  });

  it("filters by type, state and SN, and loads more with the cursor", async () => {
    mockList.mockResolvedValueOnce(listed([query], { nextCursor: "next1", counts: { query: 3, review: 5, complaint: 1 } }));
    render(<AdminMachineFeedback />);
    await screen.findByTestId("row-feedback-q1");
    expect(screen.getByTestId("chip-type-review")).toHaveTextContent("5");
    expect(screen.getByTestId("chip-type-all")).toHaveTextContent("9");

    mockList.mockResolvedValueOnce(listed([complaint]));
    await userEvent.click(screen.getByTestId("button-load-more"));
    expect(mockList).toHaveBeenLastCalledWith({ type: undefined, sn: undefined, state: "new" }, "next1");
    await screen.findByTestId("row-feedback-c1");
    expect(screen.getByTestId("row-feedback-q1")).toBeInTheDocument();

    mockList.mockResolvedValue(listed([]));
    await userEvent.click(screen.getByTestId("chip-type-complaint"));
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ type: "complaint", state: "new" }), null);

    await userEvent.selectOptions(screen.getByTestId("filter-state"), "closed");
    await userEvent.type(screen.getByTestId("filter-sn"), " SN009 ");
    await userEvent.click(screen.getByTestId("button-search"));
    expect(mockList).toHaveBeenLastCalledWith({ type: "complaint", state: "closed", sn: "SN009" }, null);
  });

  it("shows every state when opened from a rating link", async () => {
    mockSearch.current = "type=review&sn=SN001";
    mockList.mockResolvedValue(listed([review]));
    render(<AdminMachineFeedback />);
    await screen.findByTestId("row-feedback-r1");
    expect(mockList).toHaveBeenCalledWith({ type: "review", sn: "SN001", state: undefined }, null);
    expect(screen.getByTestId("chip-type-review")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("filter-sn")).toHaveValue("SN001");
  });

  it("shows NoData when there are none", async () => {
    mockList.mockResolvedValue(listed([]));
    render(<AdminMachineFeedback />);
    expect(await screen.findByTestId("feedback-table")).toHaveTextContent(/no data/i);
  });
});

describe("Feedback detail", () => {
  it("shows the message as text with its line breaks, and the contact links", async () => {
    const html = fb({ id: "h1", message: "<b>bold</b>\nline two", email: "asha@example.com", phone: "+91 98200 00000" });
    mockList.mockResolvedValue(listed([html]));
    render(<AdminMachineFeedback />);
    await userEvent.click(await screen.findByTestId("open-h1"));
    const dialog = await screen.findByTestId("feedback-dialog");
    const message = within(dialog).getByTestId("feedback-message");
    expect(message.textContent).toBe("<b>bold</b>\nline two");
    expect(message.querySelector("b")).toBeNull();
    expect(message).toHaveClass("whitespace-pre-wrap");
    expect(within(dialog).getByTestId("feedback-email")).toHaveAttribute("href", "mailto:asha@example.com");
    expect(within(dialog).getByTestId("feedback-phone")).toHaveAttribute("href", "tel:+919820000000");
  });

  it("links the order from the detail", async () => {
    mockList.mockResolvedValue(listed([review]));
    render(<AdminMachineFeedback />);
    await userEvent.click(await screen.findByTestId("row-feedback-r1"));
    expect(within(await screen.findByTestId("feedback-dialog")).getByTestId("feedback-order")).toHaveAttribute("href", "/machines/orders/O-1");
  });

  it("saves the state and the note, then shows who changed it", async () => {
    mockList.mockResolvedValue(listed([complaint]));
    mockUpdate.mockResolvedValue({
      ok: true,
      data: { ...complaint, state: "replied", note: "Refunded by UPI", updatedAt: "2026-10-01T11:00:00Z", updatedBy: "ops@mbp.in" },
    });
    render(<AdminMachineFeedback />);
    await userEvent.click(await screen.findByTestId("open-c1"));
    const dialog = await screen.findByTestId("feedback-dialog");
    const save = within(dialog).getByTestId("button-save-feedback");
    expect(save).toBeDisabled();

    await userEvent.selectOptions(within(dialog).getByTestId("input-feedback-state"), "replied");
    await userEvent.type(within(dialog).getByTestId("input-feedback-note"), "  Refunded by UPI ");
    await userEvent.click(save);

    expect(mockUpdate).toHaveBeenCalledWith("c1", { state: "replied", note: "Refunded by UPI" });
    expect(await within(dialog).findByTestId("feedback-updated")).toHaveTextContent("by ops@mbp.in");
    expect(screen.getByTestId("state-c1")).toHaveTextContent("Replied");
    expect(within(dialog).getByTestId("input-feedback-note")).toHaveAttribute("maxLength", "1000");
  });

  it("refreshes the detail from GET feedback/{id}", async () => {
    mockList.mockResolvedValue(listed([query]));
    mockGet.mockResolvedValue({ ok: true, data: { ...query, state: "closed", note: "Answered by phone" } });
    render(<AdminMachineFeedback />);
    await userEvent.click(await screen.findByTestId("open-q1"));
    const dialog = await screen.findByTestId("feedback-dialog");
    await act(async () => {});
    expect(mockGet).toHaveBeenCalledWith("q1");
    expect(within(dialog).getByTestId("input-feedback-note")).toHaveValue("Answered by phone");
    expect(within(dialog).getByTestId("input-feedback-state")).toHaveValue("closed");
    expect(screen.getByTestId("state-q1")).toHaveTextContent("Closed");
  });
});
