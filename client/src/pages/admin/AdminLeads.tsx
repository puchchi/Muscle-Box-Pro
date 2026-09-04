"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminReadResult } from "@/lib/adminApi";
import { fetchLeads } from "@/lib/adminLeadsApi";
import { fetchFranchiseApplications } from "@/lib/adminFranchiseApi";
import type { Lead, LeadKind } from "@shared/admin/leads";
import type {
  FranchiseApplicationRow,
  FranchiseTriageStatus,
} from "@shared/admin/franchiseApplications";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { ErrorPanel, Notice, Pill } from "./AdminUi";
import { formatIstDateTime } from "./adminFormat";
import {
  FRANCHISE_TRIAGE_CLASS,
  FRANCHISE_TRIAGE_LABEL,
  franchiseEnquiryWants,
} from "./adminFranchiseFormat";
import { inviteHrefForApplication } from "./franchiseInviteLink";

/**
 * The Enquiries tab — every way somebody can write in, read-only.
 *
 * Demo and campaign are the last two things in the product still living in Supabase, which is frozen: no
 * migration will run against it and nothing new will be added. Investor enquiries moved to DynamoDB on
 * 2026-08-31. Franchise enquiries are a fourth tab and a different API — see below. There is
 * deliberately nothing here that writes.
 *
 * ## Why the franchise backlog is listed twice
 *
 * `AdminFranchiseApplications`, inside the Franchises tab, is where a franchise enquiry is triaged and
 * converted, and that is not moving: an enquiry and a franchise are two states of one pipeline and the
 * invite comes from that screen. But this page is the one an admin opens to ask "has anybody written
 * in?", and the franchise form is the only one whose answer was not on it — the highest-value enquiry
 * we take was the single kind you had to know to go looking for. So it appears here as rows, with its
 * triage state shown and the row's own next step linked, and every decision stays on the other screen.
 *
 * ## It fetches when you open it, and only for the tab you open
 *
 * Nothing is requested on `/admin`. Each tab is fetched the first time it is selected and then kept in
 * `pages`, so switching back and forth costs nothing and a stale view is refreshed by pressing Refresh
 * rather than by a timer. Four tabs opened once is four requests for a session, which is the whole cost
 * of this screen.
 *
 * ## One table for four shapes
 *
 * The sources have different fields, flattened into one `Row` where a field a source does not have is
 * `null`. Rendering that as one table with blanks in it, rather than four per-kind layouts, is a
 * deliberate trade: an investor enquiry has no phone number, and a blank cell under a heading is
 * easier to read correctly than a table that changes shape under you. The two columns that are
 * franchise-only are the ones nothing else could fill — a triage state and a link to act on it.
 */

/** The three kinds `GET /admin/leads/{kind}` serves, plus the backlog that is its own API. */
type Tab = LeadKind | "franchise";

const TAB_LABEL: Record<Tab, string> = {
  demo: "Demo requests",
  campaign: "Campaign enquiries",
  investor: "Investor enquiries",
  franchise: "Franchise enquiries",
};

/** What the Details column holds for each tab, since it is shared and its meaning is not. */
const TAB_NOTE: Record<Tab, string> = {
  demo: "Gym name and location, as typed into the demo form.",
  campaign: "Brand name. This form asks for nothing else, so the other columns are blank by design.",
  investor:
    "Firm and investor type. This form asks for no phone number. The MBP-IN reference under each name is the one the enquirer was emailed, so it is searchable above.",
  franchise:
    "Company, the market they want, and the tier with the figures they were quoted. These rows are read-only here. Reviewing, rejecting and the notes we keep against an enquiry live under Franchises, and Invite opens the invite form with this applicant's answers in it.",
};

const KINDS: LeadKind[] = ["demo", "campaign", "investor"];

/** The route clamps at 200 and defaults to 50. `AdminFranchiseApplications` asks for the same 100. */
const FRANCHISE_LIMIT = 100;

type Problem = { message: string; issues: string[] };

/**
 * One enquiry, whichever form it came from.
 *
 * `organisation`, `place` and `detail` are the three lines of the Details cell rather than named
 * fields, because what they hold differs per tab and the column heading is the same either way. The
 * server's `investorType` and a franchise tier line are the same slot.
 */
type Row = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  organisation: string | null;
  place: string | null;
  detail: string | null;
  message: string | null;
  reference: string | null;
  /** Where a franchise enquiry has got to. `null` on the three kinds that have no triage. */
  status: FranchiseTriageStatus | null;
  /** The row's own next step, and the only link on this page that leads to a write. */
  next: { href: string; label: string } | null;
};

type Loaded = {
  rows: Row[];
  /** Rows in the collection, not rows here. `null` when the source could not tell us. */
  total: number | null;
  /** The source said its answer went short. Franchise only; the leads route is not bounded that way. */
  capped: boolean;
};

export default function AdminLeads() {
  const guard = useAdminGuard();
  const [kind, setKind] = useState<Tab>("demo");
  /**
   * One entry per tab that has been opened. Not a single `page`, because switching tabs would then
   * throw away a list that has already been paid for and fetch it again on the way back.
   */
  const [pages, setPages] = useState<Partial<Record<Tab, Loaded>>>({});
  const [loading, setLoading] = useState<Tab | null>(null);
  const [problems, setProblems] = useState<Partial<Record<Tab, Problem>>>({});
  /**
   * The lead route's own whitelist, once any of its three tabs has answered. Null until then, which is
   * what `KINDS` is for. The franchise tab cannot come from here: it is a different API, and asking the
   * leads route to name it would be asking it about a list it does not serve.
   */
  const [leadKinds, setLeadKinds] = useState<LeadKind[] | null>(null);
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const load = useCallback(async (which: Tab) => {
    setLoading(which);
    const result = await fetchTab(which);
    if (!result.ok) {
      setProblems((prev) => ({ ...prev, [which]: { message: result.error.message, issues: result.issues } }));
    } else {
      setProblems((prev) => ({ ...prev, [which]: undefined }));
      setPages((prev) => ({ ...prev, [which]: result.data.page }));
      if (result.data.kinds !== null) setLeadKinds(result.data.kinds);
    }
    setLoading((current) => (current === which ? null : current));
  }, []);

  useEffect(() => {
    if (guard.state !== "ready") return;
    // Already held, so selecting the tab again is free. This is the whole of the lazy-loading rule:
    // a request happens on first sight of a tab and on an explicit Refresh, never on a re-render.
    if (pages[kind] !== undefined || problems[kind] !== undefined) return;
    void load(kind);
  }, [guard.state, kind, pages, problems, load]);

  if (guard.state !== "ready") return <AdminChecking />;

  const page = pages[kind];
  const problem = problems[kind];
  const isLoading = loading === kind;
  const needle = filter.trim().toLowerCase();
  const rows = page?.rows ?? [];
  const visible = needle === "" ? rows : rows.filter((lead) => matches(lead, needle));
  const showsTriage = kind === "franchise";

  function toggleMessage(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <AdminShell session={guard.session}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
            data-testid="admin-leads-heading"
          >
            Enquiries
          </h1>
          <p className="text-muted-foreground text-sm" data-testid="admin-leads-count">
            {isLoading
              ? "Loading…"
              : page === undefined
                ? "Nothing loaded yet."
                : countLine(page, visible.length, needle !== "")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void load(kind)}
          disabled={isLoading}
          className="rounded-xl cursor-pointer"
          data-testid="button-refresh-leads"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4" role="group" aria-label="Which enquiries to show">
        {/*
          The lead route's `kinds` once it has answered, so three of the four tabs come from the
          server's own whitelist rather than from a copy of it. Before the first response there is
          nothing to draw them from, which is why the local constant exists at all.
        */}
        {[...(leadKinds ?? KINDS), "franchise" as const].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            aria-pressed={kind === value}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
              kind === value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300 hover:text-foreground"
            }`}
            data-testid={`tab-leads-${value}`}
          >
            {TAB_LABEL[value]}
            {pages[value] !== undefined && (
              <span className={`tabular-nums ${kind === value ? "opacity-80" : "text-gray-400"}`}>
                {pages[value]?.rows.length ?? 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {problem && (
        <div className="mb-5">
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="admin-leads-error"
            issuesTestId="admin-leads-issues"
          />
        </div>
      )}

      {page?.capped === true && (
        <div className="mb-4">
          <Notice testId="admin-leads-capped">
            This list has outgrown the slab its route reads, so the oldest enquiries are no longer in
            it. Treat the count as a floor. Filtering by status under Franchises reaches further back.
          </Notice>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          <div className="relative max-w-sm">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden
            />
            <Input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter by name, email, place or reference"
              aria-label="Filter loaded enquiries"
              className="bg-white border-gray-200 h-10 rounded-xl pl-9"
              data-testid="input-filter-leads"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Filters the {rows.length} loaded {rows.length === 1 ? "enquiry" : "enquiries"} only. There
            is no search on the API.
          </p>
        </div>
      )}

      {!isLoading && page !== undefined && rows.length === 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-leads-empty">
          Nothing here yet. {TAB_LABEL[kind]} arrive from the public forms on the website.
        </p>
      )}

      {visible.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          {/*
            `min-w-` with the scroller above it, rather than letting five columns share whatever width
            there is. On a phone the shared width collapses the Message column to one word per line and
            a single enquiry becomes a screen and a half; a sideways scroll is the lesser evil.
          */}
          <table className={`w-full text-sm ${showsTriage ? "min-w-[54rem]" : "min-w-[46rem]"}`}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>Who</Th>
                <Th>Contact</Th>
                <Th>Details</Th>
                <Th>Message</Th>
                <Th align="right">Received</Th>
                {showsTriage && <Th align="right">Where it stands</Th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((lead) => {
                const message = lead.message?.trim() ?? "";
                const open = expanded.has(lead.id);
                return (
                  <tr key={lead.id} className="align-top" data-testid={`row-lead-${lead.id}`}>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-foreground">{lead.name || "Not given"}</p>
                      {/*
                        Under the name rather than in a sixth column: only investor leads have one, and an
                        empty column on two of the three tabs costs every row width it would explain.
                      */}
                      {lead.reference && (
                        <p
                          className="text-xs text-muted-foreground tabular-nums"
                          data-testid={`lead-reference-${lead.id}`}
                        >
                          {lead.reference}
                        </p>
                      )}
                      {/*
                        Where a franchise enquiry stands has a column of its own, and on a phone that
                        column is off the right-hand edge of the scroller. On the one tab where the
                        state is the point of the row it rides under the name as well, which is what
                        the triage table does. No testid: the one on the column stays the only match.
                      */}
                      {lead.status && (
                        <div className="sm:hidden mt-1.5">
                          <Pill className={FRANCHISE_TRIAGE_CLASS[lead.status]}>
                            {FRANCHISE_TRIAGE_LABEL[lead.status]}
                          </Pill>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 sm:min-w-[12rem]">
                      {/*
                        A `mailto:` rather than plain text, because answering an enquiry is the only
                        thing anybody does with this screen. The inbox tab replies to mail that came
                        *to* us; these rows are people who used a form and never sent one.
                      */}
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-foreground hover:underline break-all"
                        data-testid={`lead-email-${lead.id}`}
                      >
                        {lead.email}
                      </a>
                      {lead.phone && <p className="text-xs text-muted-foreground">{lead.phone}</p>}
                    </td>
                    <td className="px-4 py-2.5">
                      {lead.organisation && <p className="text-foreground">{lead.organisation}</p>}
                      {lead.place && <p className="text-xs text-muted-foreground">{lead.place}</p>}
                      {lead.detail && <p className="text-xs text-muted-foreground">{lead.detail}</p>}
                      {!lead.organisation && !lead.place && !lead.detail && (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 max-w-[38ch]">
                      {message === "" ? (
                        <span className="text-gray-400">—</span>
                      ) : message.length <= 160 ? (
                        <p className="whitespace-pre-wrap break-words text-muted-foreground">
                          {message}
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleMessage(lead.id)}
                          aria-expanded={open}
                          className="text-left cursor-pointer"
                          data-testid={`lead-message-${lead.id}`}
                        >
                          {/*
                            Two whole class lists rather than one with a conditional suffix. `block` and
                            `line-clamp-3` both set `display`, and `block` was winning, so the collapsed
                            state rendered the entire message and "Show more" did nothing.
                          */}
                          <span
                            className={
                              open
                                ? "block whitespace-pre-wrap break-words text-muted-foreground"
                                : "line-clamp-3 break-words text-muted-foreground"
                            }
                          >
                            {message}
                          </span>
                          <span className="text-xs font-semibold text-primary">
                            {open ? "Show less" : "Show more"}
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(lead.createdAt)}
                    </td>
                    {showsTriage && (
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        {lead.status && (
                          <Pill
                            className={FRANCHISE_TRIAGE_CLASS[lead.status]}
                            testId={`lead-status-${lead.id}`}
                          >
                            {FRANCHISE_TRIAGE_LABEL[lead.status]}
                          </Pill>
                        )}
                        {/*
                          The one link out of a read-only page, and it goes to the screen that owns the
                          decision rather than pretending to be it.
                        */}
                        {lead.next && (
                          <p className="mt-1">
                            <Link
                              href={lead.next.href}
                              className="text-xs font-semibold text-primary-ink hover:underline"
                              data-testid={`lead-next-${lead.id}`}
                            >
                              {lead.next.label}
                            </Link>
                          </p>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {needle !== "" && visible.length === 0 && rows.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-leads-no-match">
          Nothing in the {rows.length} loaded {rows.length === 1 ? "enquiry" : "enquiries"} matches
          “{filter.trim()}”.
        </p>
      )}

      {page !== undefined && (
        <div className="mt-5">
          <Notice testId="admin-leads-note">{TAB_NOTE[kind]}</Notice>
        </div>
      )}
    </AdminShell>
  );
}

/**
 * Fetch one tab, whichever API it lives on.
 *
 * `kinds` comes back only from the leads route, and `null` is not "no kinds" — it is "this tab could not
 * have told you". The franchise backlog is served by `MbpFranchiseAdmin` and knows nothing about the
 * other three, so a franchise response must not be allowed to narrow the tab strip.
 */
async function fetchTab(
  which: Tab,
): Promise<AdminReadResult<{ page: Loaded; kinds: LeadKind[] | null }>> {
  if (which !== "franchise") {
    const result = await fetchLeads(which);
    if (!result.ok) return result;
    const rows = result.data.leads.map(leadToRow);
    return {
      ok: true,
      data: { page: { rows, total: result.data.total, capped: false }, kinds: result.data.kinds },
    };
  }

  const result = await fetchFranchiseApplications({ limit: FRANCHISE_LIMIT });
  if (!result.ok) return result;
  const rows = result.data.applications.map(applicationToRow);
  return {
    ok: true,
    data: {
      // `null` when the slab was the binding constraint, because then the length is a fact about the
      // request and not about the backlog. `capped` says so in words underneath.
      page: { rows, total: result.data.capped ? null : rows.length, capped: result.data.capped },
      kinds: null,
    },
  };
}

function leadToRow(lead: Lead): Row {
  return {
    id: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    createdAt: lead.createdAt,
    organisation: lead.organisation,
    place: lead.location,
    detail: lead.investorType,
    message: lead.message,
    reference: lead.reference,
    status: null,
    next: null,
  };
}

/**
 * A franchise enquiry as a row on this page.
 *
 * `next` is the applicant's own next step and it is the same link the Franchises screen shows, built by
 * the same function: an enquiry with a franchise behind it points at the franchise, and one without
 * points at the invite form carrying its answers. A converted enquiry with no `franchiseId` is the one
 * case with nowhere to go, and an empty cell is the honest rendering of it.
 */
function applicationToRow(row: FranchiseApplicationRow): Row {
  const franchiseId = row.triage?.franchiseId ?? null;
  return {
    id: row.applicationId,
    name: row.name,
    email: row.email,
    phone: row.mobile,
    createdAt: row.createdAt,
    organisation: row.company?.trim() || null,
    place: row.targetMarket,
    detail: franchiseEnquiryWants(row),
    message: row.background?.trim() || null,
    reference: row.reference,
    status: row.status,
    next: franchiseId
      ? { href: `/admin/franchises/${franchiseId}`, label: "Its franchise" }
      : row.status === "new" || row.status === "reviewed"
        ? { href: inviteHrefForApplication(row), label: "Invite" }
        : null,
  };
}

/**
 * `reference` is in here because pasting the `MBP-IN-…` out of an investor's reply is the one lookup this
 * screen is asked for by something other than a name, and it is the only field they were given. The same
 * is true of `MBP-FR-…` on a franchise enquiry, and its triage state is here so that "new" narrows the
 * list to what nobody has looked at.
 */
function matches(lead: Row, needle: string): boolean {
  return [
    lead.name,
    lead.email,
    lead.phone,
    lead.organisation,
    lead.place,
    lead.detail,
    lead.reference,
    lead.status === null ? null : FRANCHISE_TRIAGE_LABEL[lead.status],
  ].some((value) => (value ?? "").toLowerCase().includes(needle));
}

/**
 * "12 of 40 in the table" and its variants.
 *
 * `total` is rows in the Supabase table, not rows on screen, and it is the only number here that could
 * mislead: a page cut short by the server's limit with no note would read as the whole table. When the
 * count is missing entirely the line says how many are loaded and claims nothing else.
 */
function countLine(page: Loaded, shown: number, narrowed: boolean): string {
  const loaded = page.rows.length;
  const noun = loaded === 1 ? "enquiry" : "enquiries";
  if (narrowed) return `${shown} of ${loaded} loaded ${noun}.`;
  if (page.total === null) return `${loaded} loaded, newest first.`;
  if (page.total > loaded) return `${loaded} of ${page.total} loaded, newest first.`;
  return `${loaded} ${noun}, newest first.`;
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
