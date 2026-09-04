import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * The enquiry backlog inside the Franchises tab.
 *
 * `AdminGyms.test.tsx`'s division: the API seam is mocked, because the transport and the parse are
 * covered in `adminFranchiseApi.test.ts`, and what is under test is what this screen does with a page
 * of enquiries. The cases are the four places this screen can mislead somebody:
 *
 * 1. **A rejection with no note.** Nobody is told they were rejected, so the note is the only record
 *    of why, and the form must refuse before the request rather than after it.
 * 2. **A converted row.** It is terminal server-side, so offering a decision on it would be offering
 *    a button that answers 409.
 * 3. **Switching status.** It is a fresh read, not a filter over the rows on screen.
 * 4. **What the invite carries.** The email, phone, tier and application id, and never a legal entity
 *    name.
 */

vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { mockFetchApplications, mockTriage } = vi.hoisted(() => ({
  mockFetchApplications: vi.fn(),
  mockTriage: vi.fn(),
}));
vi.mock("@/lib/adminFranchiseApi", () => ({
  fetchFranchiseApplications: mockFetchApplications,
  triageFranchiseApplication: mockTriage,
}));

import AdminFranchiseApplications from "@/pages/admin/AdminFranchiseApplications";
import { franchiseApplicationPageFixture } from "@/test/franchiseApplicationsFixture";

const NEW_ID = "3f7c9a1e-5b2d-4068-a5c3-e7f9b2d40681";
const REVIEWED_ID = "a2d51c60-7e94-4b13-9f28-6c05a7e3b149";
const CONVERTED_ID = "e5147c02-8b6a-4d93-9f21-3c70a5e8b146";

function resolvesPage(over: Record<string, unknown> = {}) {
  mockFetchApplications.mockResolvedValue({
    ok: true,
    data: { ...franchiseApplicationPageFixture(), ...over },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTriage.mockResolvedValue({
    ok: true,
    data: {
      applicationId: REVIEWED_ID,
      reference: "MBP-FR-A2D51C607E",
      status: "reviewed",
      note: "Spoke on 24 Aug.",
      decidedByEmail: "anurag@muscleboxpro.com",
      decidedAt: "2026-08-24T09:15:00.000Z",
    },
  });
});

describe("AdminFranchiseApplications", () => {
  it("asks for every status on first load and reports the count to its parent", async () => {
    resolvesPage();
    const onLoaded = vi.fn();
    render(<AdminFranchiseApplications onLoaded={onLoaded} />);

    expect(await screen.findByTestId(`row-application-${NEW_ID}`)).toBeInTheDocument();
    expect(mockFetchApplications).toHaveBeenCalledWith({ limit: 100 });
    expect(onLoaded).toHaveBeenCalledWith(4);
  });

  it("says what nobody has looked at yet, over the rows it loaded", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    expect(await screen.findByTestId("stat-applications-new")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-applications-loaded")).toHaveTextContent("4");
  });

  it("states on screen that neither decision reaches the applicant", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    expect(await screen.findByTestId("applications-privacy-note")).toHaveTextContent(
      /neither is served to the applicant/i,
    );
  });

  it("carries the applicant's details into the invite form, and no entity name", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    const href = (await screen.findByTestId(`link-convert-${REVIEWED_ID}`)).getAttribute("href");
    const params = new URLSearchParams((href ?? "").split("?")[1]);
    expect(href?.startsWith("/admin/franchises/new?")).toBe(true);
    expect(params.get("application")).toBe(REVIEWED_ID);
    expect(params.get("email")).toBe("vikram@shettyfitness.in");
    expect(params.get("tier")).toBe("territory");
    expect(params.has("legalEntityName")).toBe(false);
  });

  it("offers a converted enquiry its franchise instead of a second invite", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    expect(await screen.findByTestId(`link-converted-${CONVERTED_ID}`)).toHaveAttribute(
      "href",
      "/admin/franchises/b7e2c1a4-9f38-4d6b-8e05-3c1f7a2d9b64",
    );
    expect(screen.queryByTestId(`link-convert-${CONVERTED_ID}`)).toBeNull();
  });

  it("offers no decision on a converted enquiry, because the route would refuse one", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    await userEvent.click(await screen.findByTestId(`toggle-application-${CONVERTED_ID}`));

    expect(screen.getByTestId(`triage-closed-${CONVERTED_ID}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`button-triage-${CONVERTED_ID}`)).toBeNull();
  });

  it("shows what the applicant wrote only once the row is opened", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    expect(screen.queryByText("Shetty Fitness Ventures")).toBeNull();
    await userEvent.click(await screen.findByTestId(`toggle-application-${REVIEWED_ID}`));
    expect(screen.getByText("Shetty Fitness Ventures")).toBeInTheDocument();
    expect(screen.getByText(/Two gyms in Mangaluru/)).toBeInTheDocument();
  });

  it("refuses a rejection with no note before sending anything", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    await userEvent.click(await screen.findByTestId(`toggle-application-${NEW_ID}`));
    await userEvent.click(screen.getByTestId(`triage-rejected-${NEW_ID}`));
    await userEvent.click(screen.getByTestId(`button-triage-${NEW_ID}`));

    expect(await screen.findByText(/only record/i)).toBeInTheDocument();
    expect(mockTriage).not.toHaveBeenCalled();
  });

  it("records a review, then rereads the list because the status is derived server-side", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    await userEvent.click(await screen.findByTestId(`toggle-application-${REVIEWED_ID}`));
    await userEvent.clear(screen.getByTestId("input-note"));
    await userEvent.type(screen.getByTestId("input-note"), "Funding confirmed.");
    await userEvent.click(screen.getByTestId(`button-triage-${REVIEWED_ID}`));

    await waitFor(() =>
      expect(mockTriage).toHaveBeenCalledWith(REVIEWED_ID, {
        status: "reviewed",
        note: "Funding confirmed.",
      }),
    );
    expect(await screen.findByTestId("applications-saved")).toHaveTextContent(
      /MBP-FR-A2D51C607E marked reviewed/,
    );
    // Nothing was sent, said on the banner rather than left for an admin to assume.
    expect(screen.getByTestId("applications-saved")).toHaveTextContent(/Nothing was sent/);
    expect(mockFetchApplications).toHaveBeenCalledTimes(2);
  });

  it("starts the form from the note already on the row, rather than blanking it", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    await userEvent.click(await screen.findByTestId(`toggle-application-${REVIEWED_ID}`));
    expect(screen.getByTestId("input-note")).toHaveValue(
      "Spoke on 24 Aug. Funding is in place. Sending an invite once the second district is confirmed.",
    );
  });

  it("asks the server again when a status chip is pressed, because the filter is a read", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    await userEvent.click(await screen.findByTestId("app-status-new"));

    await waitFor(() =>
      expect(mockFetchApplications).toHaveBeenLastCalledWith({ limit: 100, status: "new" }),
    );
  });

  it("leaves the tab's count alone while a status filter is on, since it counts enquiries", async () => {
    resolvesPage();
    const onLoaded = vi.fn();
    render(<AdminFranchiseApplications onLoaded={onLoaded} />);

    await screen.findByTestId(`row-application-${NEW_ID}`);
    mockFetchApplications.mockResolvedValue({
      ok: true,
      data: { ...franchiseApplicationPageFixture(), applications: [], statuses: ["converted"] },
    });
    await userEvent.click(screen.getByTestId("app-status-converted"));

    await waitFor(() => expect(mockFetchApplications).toHaveBeenCalledTimes(2));
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledWith(4);
  });

  it("puts no count on the status chips, since the only honest one would be zero", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    expect(await screen.findByTestId("app-status-rejected")).toHaveTextContent(/^Rejected$/);
  });

  it("says the list has gone short when the slab was the binding constraint", async () => {
    resolvesPage({ capped: true, scanned: 400 });
    render(<AdminFranchiseApplications />);

    expect(await screen.findByTestId("applications-capped")).toHaveTextContent(/400 rows/);
  });

  it("keeps quiet about capping on an ordinary page", async () => {
    resolvesPage();
    render(<AdminFranchiseApplications />);

    await screen.findByTestId(`row-application-${NEW_ID}`);
    expect(screen.queryByTestId("applications-capped")).toBeNull();
  });

  it("shows the field paths when the read fails the schema", async () => {
    mockFetchApplications.mockResolvedValue({
      ok: false,
      error: { code: "network", message: "The franchise enquiries came back in a shape this page does not recognise." },
      issues: ["applications.0.status: Invalid enum value"],
    });
    render(<AdminFranchiseApplications />);

    expect(await screen.findByTestId("applications-error")).toHaveTextContent(/does not recognise/);
    expect(screen.getByTestId("applications-issues")).toHaveTextContent("applications.0.status");
  });

  it("keeps a failed write on the form rather than claiming the decision landed", async () => {
    resolvesPage();
    mockTriage.mockResolvedValue({
      ok: false,
      error: {
        code: "wrong_step",
        message: "A franchise has already been created from this application.",
      },
    });
    render(<AdminFranchiseApplications />);

    await userEvent.click(await screen.findByTestId(`toggle-application-${NEW_ID}`));
    await userEvent.click(screen.getByTestId(`button-triage-${NEW_ID}`));

    expect(await screen.findByTestId(`triage-error-${NEW_ID}`)).toHaveTextContent(
      /already been created/,
    );
    expect(screen.queryByTestId("applications-saved")).toBeNull();
  });
});
