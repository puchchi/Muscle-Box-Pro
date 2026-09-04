"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminGymList } from "@/lib/adminApi";
import type { AdminGymListRow } from "@shared/admin/gyms";
import type { OnboardingStatus } from "@shared/onboarding/types";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Chip, ErrorPanel, Pill, Th, type TableSort } from "./AdminUi";
import { formatIstDateTime, STATUS_CLASS, STATUS_LABEL } from "./adminFormat";
import { STATUS_LADDER, stalledFor } from "./adminFunnel";

/**
 * The Gyms tab — every gym, newest first.
 *
 * ## Two things about how it pages, both forced by the index
 *
 * `GET /admin/gyms` runs one query over `gsi4-gymlist`: a **constant partition** with `createdAt` as
 * the sort key. That buys newest-first without a table scan, and it is the whole of what it buys.
 * There is no server-side search, no status filter and no other ordering, so:
 *
 * - **The filter box, the status chips and the column sort are all client-side, over the rows
 *   already fetched.** The page says so, because a search box that silently only searches page one
 *   is worse than no search box — an admin who types a gym's name, sees nothing, and concludes the
 *   gym does not exist has been actively misled. The same caveat covers the chips: the counts on
 *   them are counts of what is loaded.
 * - **Paging is "load more", appending.** The cursor is DynamoDB's `LastEvaluatedKey`, which is
 *   forward-only: there is no page 2 to jump to and no total to count against. Appending matches
 *   what the cursor can actually do, and it keeps the client-side view useful as more rows arrive.
 *
 * §5 records the scale bound on that index — at thousands of gyms it becomes a partition per status
 * or per month. Worth knowing before this page grows a feature that assumes otherwise.
 */

type SortKey = "name" | "status" | "createdAt" | "updatedAt";
type Sort = TableSort<SortKey>;

export default function AdminGyms() {
  const guard = useAdminGuard();
  const [rows, setRows] = useState<AdminGymListRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);
  const [filter, setFilter] = useState("");
  const [status, setStatus] = useState<OnboardingStatus | "all">("all");
  /**
   * Null rather than a default column, so the first thing an admin sees is the order the server
   * sent — newest first, which is the only order the index can produce and therefore the only one
   * that stays true across a "Load more".
   */
  const [sort, setSort] = useState<Sort | null>(null);

  const load = useCallback(async (from: string | null) => {
    const result = await fetchAdminGymList(from ? { cursor: from } : {});
    if (!result.ok) {
      setProblem({ message: result.error.message, issues: result.issues });
      return;
    }
    setProblem(null);
    // Appending rather than replacing, and only ever called with the cursor that produced the
    // rows already held — so the two stay in step. `setRows(prev => …)` rather than
    // `[...rows, …]` because two clicks of "Load more" in flight at once would otherwise have
    // the second overwrite the first's page with a stale copy of the list.
    setRows((prev) => (from ? [...prev, ...result.data.gyms] : result.data.gyms));
    setCursor(result.data.nextCursor);
  }, []);

  useEffect(() => {
    if (guard.state !== "ready") return;
    let cancelled = false;
    load(null).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [guard.state, load]);

  async function handleLoadMore() {
    if (!cursor) return;
    setIsLoadingMore(true);
    try {
      await load(cursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  const counts = useMemo(() => countByStatus(rows), [rows]);

  const needle = filter.trim().toLowerCase();
  const visible = useMemo(() => {
    const matched = rows.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (needle === "") return true;
      return (
        row.tradeName.toLowerCase().includes(needle) ||
        row.legalEntityName.toLowerCase().includes(needle) ||
        row.noticesEmail.toLowerCase().includes(needle)
      );
    });
    return sort ? sortRows(matched, sort) : matched;
  }, [rows, status, needle, sort]);

  if (guard.state !== "ready") return <AdminChecking />;

  const now = Date.now();
  const narrowed = status !== "all" || needle !== "";

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: key === "name" ? "asc" : "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      // Third click clears it, back to the server's own order rather than a third arbitrary one.
      return null;
    });
  }

  return (
    <AdminShell session={guard.session}>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
            data-testid="admin-gyms-heading"
          >
            Gyms
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Loading…"
              : narrowed
                ? `${visible.length} of ${rows.length} loaded.`
                : `${rows.length} loaded, newest first.`}
          </p>
        </div>
        <Button asChild className="rounded-xl cursor-pointer bg-primary-fill text-primary-foreground font-bold">
          <Link href="/admin/gyms/new" data-testid="link-invite-gym">
            <Plus className="w-4 h-4" aria-hidden />
            Invite a gym
          </Link>
        </Button>
      </div>

      {problem && (
        <div className="mb-5">
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="admin-gyms-error"
            issuesTestId="admin-gyms-issues"
          />
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          {/* The search box beside the chips rather than under them: they are one control between
              them, and stacked they pushed the first gym below the fold on a laptop. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
              <Chip
                label="All"
                count={rows.length}
                selected={status === "all"}
                onClick={() => setStatus("all")}
                testId="chip-all"
              />
              {/*
                Only the statuses actually present. A chip reading "Signed 0" invites the reading
                that no gym has ever signed, when what it means is that none of the loaded ones has.
              */}
              {STATUS_LADDER.filter((value) => (counts.get(value) ?? 0) > 0).map((value) => (
                <Chip
                  key={value}
                  label={STATUS_LABEL[value]}
                  count={counts.get(value) ?? 0}
                  selected={status === value}
                  onClick={() => setStatus(status === value ? "all" : value)}
                  testId={`chip-${value}`}
                />
              ))}
            </div>

            <div className="relative w-full sm:ml-auto sm:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                aria-hidden
              />
              <Input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter by name or email"
                aria-label="Filter loaded gyms by name or email"
                className="bg-white border-gray-200 h-10 rounded-xl pl-9"
                data-testid="input-filter"
              />
            </div>
          </div>

          {/* Only worth saying while a page remains. Told to "load more to widen it" with no more
              to load, an admin goes looking for a button that is not there. */}
          {cursor !== null && (
            <p className="text-xs text-muted-foreground mt-2" data-testid="filter-scope">
              These filter the {rows.length} gyms loaded so far. The API has no search of its own,
              so load more to widen them.
            </p>
          )}
        </div>
      )}

      {!isLoading && rows.length === 0 && !problem && (
        <p className="text-sm text-muted-foreground" data-testid="admin-gyms-empty">
          No gyms yet. Inviting one is the first step of onboarding.
        </p>
      )}

      {visible.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          {/*
            Two renderings of the same rows, one per width, rather than a table that scrolls
            sideways. Five columns do not fit a phone: at 390px the gym name wrapped to three lines
            and both date columns — including the "quiet" warning that is the reason to read this
            list at all — sat off the right edge of a scroll container that announced itself
            nowhere.
            The split is at `lg` rather than `md` because the table needs 807px and `md` grants it
            718, which is the same sideways scroll one breakpoint up.
          */}
          <ul className="divide-y divide-gray-100 lg:hidden" data-testid="list-gyms-cards">
            {visible.map((row) => {
              const quiet = stalledFor(row, now);
              return (
                <li key={row.gymId}>
                  <Link
                    href={`/admin/gyms/${row.gymId}`}
                    className="block px-4 py-3 hover:bg-gray-50 transition-colors"
                    data-testid={`card-gym-${row.gymId}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">{row.tradeName}</p>
                        {row.legalEntityName !== "" &&
                          row.legalEntityName !== row.tradeName && (
                            <p className="truncate text-xs text-muted-foreground">
                              {row.legalEntityName}
                            </p>
                          )}
                      </div>
                      <Pill className={STATUS_CLASS[row.status]}>{STATUS_LABEL[row.status]}</Pill>
                    </div>
                    <p className="mt-1.5 truncate text-sm text-muted-foreground">
                      {row.noticesEmail}
                    </p>
                    <p className="text-xs text-muted-foreground">{row.noticesPhone}</p>
                    <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
                      Invited {formatIstDateTime(row.createdAt)}
                      {row.updatedAt !== row.createdAt && (
                        <>, last change {formatIstDateTime(row.updatedAt)}</>
                      )}
                    </p>
                    {quiet !== null && quiet >= 3 && (
                      <p className="text-xs font-semibold tabular-nums text-amber-700">
                        {quiet} {quiet === 1 ? "day" : "days"} quiet
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>

          <table className="hidden w-full text-sm lg:table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {/* The floor matters: `w-full` on the contact column below forces every other one
                    to its min-content width, and min-content for a wrapping name is its longest
                    word. Without this, "Password Floor Probe" sets as three lines. */}
                <Th sortKey="name" sort={sort} onSort={toggleSort} className="min-w-[13rem]">
                  Gym
                </Th>
                <Th sortKey="status" sort={sort} onSort={toggleSort}>
                  Status
                </Th>
                {/* The slack column. Left to the browser the surplus width was shared out evenly
                    and every row read as five islands with rivers between them; here it lands in
                    the one column whose content is genuinely long. */}
                <Th className="w-full">Contact</Th>
                <Th sortKey="createdAt" sort={sort} onSort={toggleSort} align="right">
                  Invited
                </Th>
                <Th sortKey="updatedAt" sort={sort} onSort={toggleSort} align="right">
                  Last change
                </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((row) => {
                const quiet = stalledFor(row, now);
                return (
                  <tr
                    key={row.gymId}
                    // `relative` positions the name link's stretched overlay below. The row already
                    // highlighted on hover, which promised a click target the 100px name link did
                    // not deliver.
                    className="relative hover:bg-gray-50 transition-colors"
                    data-testid={`row-gym-${row.gymId}`}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/gyms/${row.gymId}`}
                        className="font-semibold text-foreground hover:underline after:absolute after:inset-0"
                        data-testid={`link-gym-${row.gymId}`}
                      >
                        {row.tradeName}
                      </Link>
                      {/*
                        Both names, because they differ often enough that showing one is a
                        question — and the legal entity is what the agreement binds. Blank, not
                        merely different, is now a real state too: since 2026-08-23 an admin can
                        invite a gym before it has one, and `"" !== tradeName` would otherwise
                        print an empty second line for every gym still waiting on step 1.
                      */}
                      {row.legalEntityName !== "" && row.legalEntityName !== row.tradeName && (
                        <p className="text-xs text-muted-foreground">{row.legalEntityName}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Pill className={STATUS_CLASS[row.status]} testId={`status-${row.gymId}`}>
                        {STATUS_LABEL[row.status]}
                      </Pill>
                    </td>
                    {/* Above the row's overlay, so an address can still be selected and copied.
                        Nothing in here is a link, so lifting it costs no click. */}
                    <td className="relative z-10 px-4 py-2.5">
                      <p className="text-foreground">{row.noticesEmail}</p>
                      <p className="text-xs text-muted-foreground">{row.noticesPhone}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums whitespace-nowrap">
                      <span className="text-muted-foreground">
                        {formatIstDateTime(row.updatedAt)}
                      </span>
                      {/*
                        Three days, matching `stalledGyms` on the overview, so the two screens do
                        not disagree about which gyms are stuck.
                      */}
                      {quiet !== null && quiet >= 3 && (
                        <span
                          className="block text-xs font-semibold text-amber-700"
                          data-testid={`quiet-${row.gymId}`}
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
        <p className="text-sm text-muted-foreground" data-testid="admin-gyms-no-match">
          Nothing in the {rows.length} loaded {rows.length === 1 ? "gym" : "gyms"} matches
          {needle !== "" && <> “{filter.trim()}”</>}
          {needle !== "" && status !== "all" && " at"}
          {status !== "all" && <> {STATUS_LABEL[status].toLowerCase()}</>}.
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
    </AdminShell>
  );
}

function countByStatus(rows: AdminGymListRow[]): Map<OnboardingStatus, number> {
  const counts = new Map<OnboardingStatus, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  return counts;
}

/**
 * A stable sort over the loaded rows.
 *
 * `status` sorts by the ladder's order rather than alphabetically, which is the only sort of a
 * status that answers a question: "invited" before "signed" is progress, "Active" before "Invited"
 * is the alphabet. A status the ladder does not list sorts last rather than first, so a new value
 * added server-side is conspicuous instead of silently leading the table.
 */
function sortRows(rows: AdminGymListRow[], sort: Sort): AdminGymListRow[] {
  const direction = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    switch (sort.key) {
      case "name":
        return direction * nameOf(a).localeCompare(nameOf(b), "en");
      case "status": {
        const rankA = STATUS_LADDER.indexOf(a.status);
        const rankB = STATUS_LADDER.indexOf(b.status);
        return direction * ((rankA < 0 ? STATUS_LADDER.length : rankA) - (rankB < 0 ? STATUS_LADDER.length : rankB));
      }
      default:
        return direction * (Date.parse(a[sort.key]) - Date.parse(b[sort.key]));
    }
  });
}

function nameOf(row: AdminGymListRow): string {
  return row.tradeName || row.legalEntityName || row.slug;
}
