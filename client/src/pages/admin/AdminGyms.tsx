"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchAdminGymList } from "@/lib/adminApi";
import type { AdminGymListRow } from "@shared/admin/gyms";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { formatIstDateTime, STATUS_CLASS, STATUS_LABEL } from "./adminFormat";

/**
 * The Gyms tab — every gym, newest first.
 *
 * ## Two things about how it pages, both forced by the index
 *
 * `GET /admin/gyms` runs one query over `gsi4-gymlist`: a **constant partition** with
 * `createdAt` as the sort key. That buys newest-first without a table scan, and it is the
 * whole of what it buys. There is no server-side search, no status filter and no other
 * ordering, so:
 *
 * - **The filter box is client-side, over the rows already fetched.** It says so on screen,
 *   because a search box that silently only searches page one is worse than no search box —
 *   an admin who types a gym's name, sees nothing, and concludes the gym does not exist has
 *   been actively misled.
 * - **Paging is "load more", appending.** The cursor is DynamoDB's `LastEvaluatedKey`, which
 *   is forward-only: there is no page 2 to jump to and no total to count against. Appending
 *   matches what the cursor can actually do, and it keeps the client-side filter useful as
 *   more rows arrive.
 *
 * §5 records the scale bound on that index — at thousands of gyms it becomes a partition per
 * status or per month. Worth knowing before this page grows a feature that assumes otherwise.
 */

export default function AdminGyms() {
  const guard = useAdminGuard();
  const [rows, setRows] = useState<AdminGymListRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);
  const [filter, setFilter] = useState("");

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

  if (guard.state !== "ready") return <AdminChecking />;

  const needle = filter.trim().toLowerCase();
  const visible = needle
    ? rows.filter(
        (row) =>
          row.tradeName.toLowerCase().includes(needle) ||
          row.legalEntityName.toLowerCase().includes(needle) ||
          row.noticesEmail.toLowerCase().includes(needle),
      )
    : rows;

  return (
    <AdminShell session={guard.session}>
      <div className="flex items-start justify-between gap-6 mb-6">
        <div>
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
            data-testid="admin-gyms-heading"
          >
            Gyms
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLoading ? "Loading…" : `${rows.length} loaded, newest first.`}
          </p>
        </div>
        <Button asChild className="rounded-xl cursor-pointer bg-primary text-white font-bold">
          <Link href="/admin/gyms/new" data-testid="link-invite-gym">
            Invite a gym
          </Link>
        </Button>
      </div>

      {problem && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 mb-6"
          data-testid="admin-gyms-error"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-600 leading-relaxed">{problem.message}</p>
            {/*
              Field paths, shown rather than logged. The audience for this panel is us, and
              `terms.securityDepositInr: Required` is the whole answer to "what changed on the
              backend?" — see `adminApi.ts`. A gym owner would never see this; an operator
              should not have to open the network tab for it.
            */}
            {problem.issues.length > 0 && (
              <ul className="mt-2 space-y-0.5" data-testid="admin-gyms-issues">
                {problem.issues.map((issue) => (
                  <li key={issue} className="text-xs text-red-500 font-mono">
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="mb-4">
          <Input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter by name or email"
            className="bg-white border-gray-200 h-10 rounded-xl max-w-sm"
            data-testid="input-filter"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Filters the {rows.length} loaded {rows.length === 1 ? "gym" : "gyms"} only — the API
            has no search, so load more to widen it.
          </p>
        </div>
      )}

      {!isLoading && rows.length === 0 && !problem && (
        <p className="text-sm text-muted-foreground" data-testid="admin-gyms-empty">
          No gyms yet. Inviting one is the first step of onboarding.
        </p>
      )}

      {visible.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>Gym</Th>
                <Th>Status</Th>
                <Th>Contact</Th>
                <Th>Invited</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((row) => (
                <tr key={row.gymId} className="hover:bg-gray-50" data-testid={`row-gym-${row.gymId}`}>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/gyms/${row.gymId}`}
                      className="font-semibold text-foreground hover:underline"
                      data-testid={`link-gym-${row.gymId}`}
                    >
                      {row.tradeName}
                    </Link>
                    {/* Both names, because they differ often enough that showing one is a
                        question — and the legal entity is what the agreement binds. */}
                    {row.legalEntityName !== row.tradeName && (
                      <p className="text-xs text-muted-foreground">{row.legalEntityName}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[row.status]}`}
                      data-testid={`status-${row.gymId}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-foreground">{row.noticesEmail}</p>
                    <p className="text-xs text-muted-foreground">{row.noticesPhone}</p>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                    {formatIstDateTime(row.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {needle && visible.length === 0 && rows.length > 0 && (
        <p className="text-sm text-muted-foreground" data-testid="admin-gyms-no-match">
          Nothing in the {rows.length} loaded {rows.length === 1 ? "gym" : "gyms"} matches
          “{filter.trim()}”.
        </p>
      )}

      {cursor && (
        <div className="mt-6">
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

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </th>
  );
}
