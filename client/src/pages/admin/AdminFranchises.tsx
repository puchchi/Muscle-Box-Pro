"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminFranchiseList } from "@/lib/adminFranchiseApi";
import type { AdminFranchiseListRow } from "@shared/admin/franchises";
import AdminFranchiseApplications from "./AdminFranchiseApplications";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Chip, ErrorPanel, Notice, Pill, StatCard, Th, type TableSort } from "./AdminUi";
import { formatIstDateTime } from "./adminFormat";
import {
  FRANCHISE_GROUPS,
  FRANCHISE_GROUP_OF,
  FRANCHISE_STATUS_CLASS,
  FRANCHISE_STATUS_LABEL,
  FRANCHISE_STATUS_LADDER,
  franchiseNameOf,
  franchiseStalledFor,
  franchiseStepLabel,
  summariseFranchises,
  type FranchiseGroupId,
} from "./adminFranchiseFormat";

/**
 * The Franchises tab — every franchise, newest first, and the queue of ones waiting on us.
 *
 * `AdminGyms.tsx` with two differences, both of which come from the shape of the data rather than
 * from taste:
 *
 * - **The chips filter by group, not by status.** Seventeen chips is not a filter, it is a legend.
 *   The five groups in `adminFranchiseFormat.ts` split on who owes the next move, which is the
 *   question someone opening this page is actually asking.
 * - **There is a second view that is not client-side.** `?queue=review` reads a sparse index holding
 *   only what is waiting on a decision, oldest first, and it is **complete** — unlike everything
 *   else on this page, which filters and counts over the rows already fetched. That distinction is
 *   the reason the toggle exists, so both halves say which they are.
 *
 * A third view sits behind the same chips and is a different resource entirely: the `/franchise`
 * enquiry backlog, on `GET /admin/franchise-applications`. It is here rather than on a page of its
 * own because an enquiry and a franchise are two states of one pipeline, and this is where an invite
 * comes from. `AdminFranchiseApplications` owns its own fetch, so nothing is requested for it until
 * its chip is pressed.
 *
 * What this page cannot show, and no amount of client-side work will fix: **the tier and the
 * investment**. Neither is on `AdminFranchiseListRow`, because neither is on the `PROFILE` row the
 * list handler reads, so there is no pipeline value to total here. The detail page is the only place
 * that knows what a franchise is worth.
 */

type SortKey = "name" | "status" | "createdAt" | "updatedAt";
type Sort = TableSort<SortKey>;
type View = "all" | "review" | "applications";

export default function AdminFranchises() {
  const guard = useAdminGuard();
  const [view, setView] = useState<View>("all");
  /** Null until the enquiries view has been opened, so its chip shows no number rather than a wrong one. */
  const [applicationCount, setApplicationCount] = useState<number | null>(null);
  const [rows, setRows] = useState<AdminFranchiseListRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);
  const [filter, setFilter] = useState("");
  const [group, setGroup] = useState<FranchiseGroupId | "all">("all");
  /** Null rather than a default column, for `AdminGyms`'s reason: the server's order is the honest one. */
  const [sort, setSort] = useState<Sort | null>(null);

  const load = useCallback(
    async (which: View, from: string | null) => {
      const result = await fetchAdminFranchiseList(
        which === "review" ? { queue: "review" } : from ? { cursor: from } : {},
      );
      if (!result.ok) {
        setProblem({ message: result.error.message, issues: result.issues });
        return;
      }
      setProblem(null);
      setRows((prev) => (from ? [...prev, ...result.data.franchises] : result.data.franchises));
      setCursor(result.data.nextCursor);
    },
    [],
  );

  useEffect(() => {
    if (guard.state !== "ready") return;
    // The enquiries view reads a different resource and fetches it itself, so this effect has
    // nothing to do for it. Without the guard, opening that tab would fetch the franchise list too.
    if (view === "applications") return;
    let cancelled = false;
    setIsLoading(true);
    load(view, null).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [guard.state, load, view]);

  async function handleLoadMore() {
    if (!cursor) return;
    setIsLoadingMore(true);
    try {
      await load(view, cursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function switchTo(next: View) {
    if (next === view) return;
    // Everything narrowing the old view is cleared: a group chip left selected from the full list
    // would silently hide half of a queue that is meant to be everything waiting on us.
    setGroup("all");
    setFilter("");
    setSort(null);
    setRows([]);
    setCursor(null);
    // A franchise-list failure has no bearing on the enquiries view, which reads a different route.
    setProblem(null);
    setView(next);
  }

  const summary = useMemo(
    () => summariseFranchises(rows, view === "review" || cursor === null),
    [rows, view, cursor],
  );

  const needle = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    const matched = rows.filter((row) => {
      if (group !== "all" && FRANCHISE_GROUP_OF[row.status] !== group) return false;
      if (needle === "") return true;
      return (
        row.tradeName.toLowerCase().includes(needle) ||
        row.legalEntityName.toLowerCase().includes(needle) ||
        row.noticesEmail.toLowerCase().includes(needle)
      );
    });
    return sort ? sortRows(matched, sort) : matched;
  }, [rows, group, needle, sort]);

  if (guard.state !== "ready") return <AdminChecking />;

  const now = Date.now();
  const narrowed = group !== "all" || needle !== "";
  const showingApplications = view === "applications";

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: key === "name" ? "asc" : "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  return (
    <AdminShell session={guard.session}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
            data-testid="admin-franchises-heading"
          >
            Franchises
          </h1>
          <p className="text-muted-foreground text-sm">
            {view === "applications"
              ? "Enquiries from the form on /franchise, and what we decided about each one."
              : isLoading
                ? "Loading…"
                : view === "review"
                  ? `${rows.length} waiting on a decision or a bank check, longest first.`
                  : narrowed
                    ? `${visible.length} of ${rows.length} loaded.`
                    : `${rows.length} loaded, newest first.`}
          </p>
        </div>
        <Button asChild className="rounded-xl cursor-pointer bg-primary-fill text-primary-foreground font-bold">
          <Link href="/admin/franchises/new" data-testid="link-invite-franchise">
            <Plus className="w-4 h-4" aria-hidden />
            Invite a franchise
          </Link>
        </Button>
      </div>

      {problem && (
        <div className="mb-5">
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="admin-franchises-error"
            issuesTestId="admin-franchises-issues"
          />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Which franchises to show">
        {/* No numbers on the franchise chips while the enquiries view is showing: no franchise list
            is on screen then, and "All franchises 0" is a false claim rather than an unknown one. */}
        <Chip
          label="All franchises"
          count={showingApplications ? undefined : view === "all" ? rows.length : 0}
          selected={view === "all"}
          onClick={() => switchTo("all")}
          testId="view-all"
        />
        <Chip
          label="Review queue"
          count={
            showingApplications ? undefined : view === "review" ? rows.length : summary.counts.waiting
          }
          selected={view === "review"}
          onClick={() => switchTo("review")}
          testId="view-review"
        />
        <Chip
          label="Enquiries"
          count={applicationCount ?? undefined}
          selected={view === "applications"}
          onClick={() => switchTo("applications")}
          testId="view-applications"
        />
      </div>

      {view === "applications" ? (
        <AdminFranchiseApplications onLoaded={setApplicationCount} />
      ) : (
        // Called rather than rendered as a component. A nested component would be a new type on
        // every render, which unmounts the filter input and loses focus on each keystroke.
        franchiseList()
      )}
    </AdminShell>
  );

  function franchiseList() {
    return (
      <>
      {view === "review" ? (
        <div className="mb-4">
          <Notice testId="admin-franchises-queue-note">
            Everything at KYC submitted or under review, oldest first. This is the one read on this
            page that is complete rather than a page: it comes from an index holding only franchises
            waiting on us, and it does not page.
          </Notice>
        </div>
      ) : (
        rows.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="With us"
                value={String(summary.counts.waiting)}
                hint="A decision or a bank check we owe."
                tone={summary.counts.waiting > 0 ? "warn" : "plain"}
                testId="stat-waiting"
              />
              <StatCard
                label="Signed"
                value={String(summary.counts.committed)}
                hint="Binding term sheet, not yet active."
                testId="stat-committed"
              />
              <StatCard
                label="Active"
                value={String(summary.counts.active)}
                hint="Signed, funded and live."
                tone={summary.counts.active > 0 ? "good" : "plain"}
                testId="stat-active"
              />
              <StatCard
                label="Held or declined"
                value={String(summary.counts.attention)}
                hint="On hold, or declined and terminal."
                testId="stat-attention"
              />
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by group">
              <Chip
                label="Everything"
                count={rows.length}
                selected={group === "all"}
                onClick={() => setGroup("all")}
                testId="chip-all"
              />
              {/* Only groups actually present: a chip reading "Active 0" invites the reading that no
                  franchise has ever gone live, when it means none of the loaded ones has. */}
              {FRANCHISE_GROUPS.filter((entry) => summary.counts[entry.id] > 0).map((entry) => (
                <Chip
                  key={entry.id}
                  label={entry.label}
                  count={summary.counts[entry.id]}
                  selected={group === entry.id}
                  onClick={() => setGroup(group === entry.id ? "all" : entry.id)}
                  testId={`chip-${entry.id}`}
                />
              ))}
            </div>

            <div>
              <div className="relative max-w-sm">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  aria-hidden
                />
                <Input
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  placeholder="Filter by name or email"
                  aria-label="Filter loaded franchises by name or email"
                  className="bg-white border-gray-200 h-10 rounded-xl pl-9"
                  data-testid="input-filter"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Filters and counts cover the {rows.length} loaded{" "}
                {rows.length === 1 ? "franchise" : "franchises"} only. The API has no search, so load
                more to widen it.
              </p>
            </div>
          </div>
        )
      )}

      {!isLoading && rows.length === 0 && !problem && (
        <p className="text-sm text-muted-foreground" data-testid="admin-franchises-empty">
          {view === "review"
            ? "Nothing is waiting on a decision."
            : "No franchises yet. Inviting one is the first step."}
        </p>
      )}

      {visible.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th sortKey="name" sort={sort} onSort={toggleSort}>
                  Franchise
                </Th>
                <Th sortKey="status" sort={sort} onSort={toggleSort}>
                  Status
                </Th>
                <Th>Contact</Th>
                {/* Hidden below `lg`, where the five columns no longer fit and the choice is
                    between losing this one and scrolling "Last change" off the edge. The stall
                    flag lives on that column, so this is the one to drop. */}
                <Th
                  sortKey="createdAt"
                  sort={sort}
                  onSort={toggleSort}
                  align="right"
                  className="hidden lg:table-cell"
                >
                  Invited
                </Th>
                <Th sortKey="updatedAt" sort={sort} onSort={toggleSort} align="right">
                  Last change
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((row) => {
                const quiet = franchiseStalledFor(row, now);
                return (
                  <tr
                    key={row.franchiseId}
                    className="hover:bg-gray-50 transition-colors"
                    data-testid={`row-franchise-${row.franchiseId}`}
                  >
                    {/* A minimum width, unlike the gym list: every other column here is
                        `whitespace-nowrap`, so this is the only one that can shrink, and a legal
                        entity name wraps to five lines before the table admits it needs to scroll. */}
                    <td className="px-4 py-2.5 min-w-[11rem]">
                      <Link
                        href={`/admin/franchises/${row.franchiseId}`}
                        className="font-semibold text-foreground hover:underline"
                        data-testid={`link-franchise-${row.franchiseId}`}
                      >
                        {franchiseNameOf(row)}
                      </Link>
                      {/* The legal entity name is empty until step 1 lands, and the invite only
                          needs a trade name, so a second line appears when there is one to show. */}
                      {row.legalEntityName !== "" && row.legalEntityName !== row.tradeName && (
                        <p className="text-xs text-muted-foreground">{row.legalEntityName}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Pill
                        className={FRANCHISE_STATUS_CLASS[row.status]}
                        testId={`status-${row.franchiseId}`}
                      >
                        {FRANCHISE_STATUS_LABEL[row.status]}
                      </Pill>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {franchiseStepLabel(row.status)}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="text-foreground">{row.noticesEmail}</p>
                      <p className="text-xs text-muted-foreground">{row.noticesPhone}</p>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <span className="text-muted-foreground">
                        {formatIstDateTime(row.updatedAt)}
                      </span>
                      {/* Five days, matching `stalledFranchises`, so the two screens agree about
                          which franchises are stuck. */}
                      {quiet !== null && quiet >= 5 && (
                        <span
                          className="block text-xs font-semibold text-amber-700 tabular-nums"
                          data-testid={`quiet-${row.franchiseId}`}
                        >
                          {quiet} {quiet === 1 ? "day" : "days"} quiet
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {narrowed && visible.length === 0 && rows.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-franchises-no-match">
          Nothing in the {rows.length} loaded {rows.length === 1 ? "franchise" : "franchises"}{" "}
          matches
          {needle !== "" && <> “{filter.trim()}”</>}
          {needle !== "" && group !== "all" && " in"}
          {group !== "all" && (
            <> {(FRANCHISE_GROUPS.find((entry) => entry.id === group)?.label ?? group).toLowerCase()}</>
          )}
          .
        </p>
      )}

      {cursor && (
        <div className="mt-5">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="rounded-xl cursor-pointer"
            data-testid="button-load-more"
          >
            {isLoadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
      </>
    );
  }
}

/**
 * A stable sort over the loaded rows.
 *
 * `status` sorts by the ladder rather than alphabetically, for `sortRows`'s reason on the gym side.
 * `on_hold` and `declined` are not on the ladder at all, so both sort last — which is where they
 * belong: neither is a position in the pipeline, and dropping a declined franchise into the middle
 * of it by rank would be worse than parking it at the end.
 */
function sortRows(rows: AdminFranchiseListRow[], sort: Sort): AdminFranchiseListRow[] {
  const direction = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case "name":
        return direction * franchiseNameOf(a).localeCompare(franchiseNameOf(b), "en");
      case "status": {
        const rank = (row: AdminFranchiseListRow) => {
          const at = FRANCHISE_STATUS_LADDER.indexOf(row.status);
          return at < 0 ? FRANCHISE_STATUS_LADDER.length : at;
        };
        return direction * (rank(a) - rank(b));
      }
      default:
        return direction * (Date.parse(a[sort.key]) - Date.parse(b[sort.key]));
    }
  });
}
