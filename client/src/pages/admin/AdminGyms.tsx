"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminGymList } from "@/lib/adminApi";
import type { AdminGymListRow } from "@shared/admin/gyms";
import type { OnboardingStatus } from "@shared/onboarding/types";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { ErrorPanel, Pill } from "./AdminUi";
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
type Sort = { key: SortKey; dir: "asc" | "desc" };

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
        <Button asChild className="rounded-xl cursor-pointer bg-primary text-white font-bold">
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
        <div className="mb-4 space-y-3">
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
                aria-label="Filter loaded gyms by name or email"
                className="bg-white border-gray-200 h-10 rounded-xl pl-9"
                data-testid="input-filter"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Filters the {rows.length} loaded {rows.length === 1 ? "gym" : "gyms"} only. The API
              has no search, so load more to widen it.
            </p>
          </div>
        </div>
      )}

      {!isLoading && rows.length === 0 && !problem && (
        <p className="text-sm text-muted-foreground" data-testid="admin-gyms-empty">
          No gyms yet. Inviting one is the first step of onboarding.
        </p>
      )}

      {visible.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th sortKey="name" sort={sort} onSort={toggleSort}>
                  Gym
                </Th>
                <Th sortKey="status" sort={sort} onSort={toggleSort}>
                  Status
                </Th>
                <Th>Contact</Th>
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
                    className="hover:bg-gray-50 transition-colors"
                    data-testid={`row-gym-${row.gymId}`}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/gyms/${row.gymId}`}
                        className="font-semibold text-foreground hover:underline"
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
                    <td className="px-4 py-2.5">
                      <p className="text-foreground">{row.noticesEmail}</p>
                      <p className="text-xs text-muted-foreground">{row.noticesPhone}</p>
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground whitespace-nowrap">
                      {formatIstDateTime(row.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <span className="text-muted-foreground">
                        {formatIstDateTime(row.updatedAt)}
                      </span>
                      {/*
                        Three days, matching `stalledGyms` on the overview, so the two screens do
                        not disagree about which gyms are stuck.
                      */}
                      {quiet !== null && quiet >= 3 && (
                        <span
                          className="block text-xs font-semibold text-amber-700 tabular-nums"
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

function Chip({
  label,
  count,
  selected,
  onClick,
  testId,
}: {
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-gray-200 bg-white text-muted-foreground hover:border-gray-300 hover:text-foreground"
      }`}
      data-testid={testId}
    >
      {label}
      <span className={`tabular-nums ${selected ? "opacity-80" : "text-gray-400"}`}>{count}</span>
    </button>
  );
}

/**
 * A column header, sortable when given a key.
 *
 * `aria-sort` on the cell rather than a class on the arrow, because the arrow is the only thing
 * saying which column the table is ordered by and an icon is not something a screen reader reads.
 * "Contact" has no key: it holds two values, and sorting on "whichever of the email and the phone
 * came first in the markup" is an order nobody asked for.
 */
function Th({
  children,
  sortKey,
  sort,
  onSort,
  align = "left",
}: {
  children: React.ReactNode;
  sortKey?: SortKey;
  sort?: Sort | null;
  onSort?: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey && sort?.key === sortKey ? sort.dir : null;
  const base = `px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
    align === "right" ? "text-right" : "text-left"
  }`;

  if (!sortKey || !onSort) {
    return <th className={base}>{children}</th>;
  }

  return (
    <th
      className={base}
      aria-sort={active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors ${
          active ? "text-foreground" : ""
        } ${align === "right" ? "flex-row-reverse" : ""}`}
        data-testid={`sort-${sortKey}`}
      >
        {children}
        {active === "asc" ? (
          <ArrowUp className="w-3 h-3" aria-hidden />
        ) : active === "desc" ? (
          <ArrowDown className="w-3 h-3" aria-hidden />
        ) : null}
      </button>
    </th>
  );
}
