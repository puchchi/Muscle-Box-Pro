"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAdminGymList } from "@/lib/adminApi";
import type { AdminGymListRow } from "@shared/admin/gyms";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Card, ErrorPanel, Pill } from "./AdminUi";
import { Cell, Col, Head } from "./machines/MachinesUi";
import { formatIstDateTime, STATUS_CLASS, STATUS_LABEL } from "./adminFormat";
import {
  invitedSince,
  recentlyActive,
  stalledGyms,
  summariseFunnel,
  type FunnelSummary,
  type StalledGym,
} from "./adminFunnel";

/**
 * The overview: where every gym is, and which ones need chasing.
 *
 * ## It is still the session proof
 *
 * This page began as nothing but a `dl` of `GET /admin/me`, and that job has not gone away — login
 * succeeding only proves the password was right, while a cookie the browser refused to store and a
 * sandbox token that never reached the header both look like a successful login and then fail on the
 * first real request. The identity block now lives in `AdminShell`'s sidebar, beside the API host in
 * its footer, and those two are still the first things to read when the panel is mysteriously empty.
 *
 * ## Every number is counted client-side, and the page says so
 *
 * There is no count endpoint and no per-status index. `GET /admin/gyms` is one query over
 * `gsi4-gymlist`, so the funnel below is `summariseFunnel` over rows this page fetched. It asks for
 * the server's maximum page size and follows the cursor a bounded number of times; if a cursor
 * remains after that, `complete` is false and every figure is labelled a floor rather than a total.
 * See `adminFunnel.ts` on why that honesty is load-bearing rather than fussy.
 *
 * ## Onboarding is the only thing here with numbers in it, and that is stated rather than implied
 *
 * The obvious reading of a page like this is that it reports the business, so a page reporting only
 * onboarding invites the conclusion that onboarding *is* the business. It is not: gyms sell cups, and
 * none of that reaches us. `GET /gym/portal` answers `sales`, `adRevenue`, `electricity` and
 * `statements` with `not_implemented`, `AdminGymListRow` carries no money at all, and there is no
 * admin rollup route to ask. So `Trading` is on the page naming which figures do not exist, and
 * nothing here invents one — a plausible total on an overview is the number that gets quoted to a
 * partner or an investor.
 *
 * It sits *below* the funnel and the nudge list, where it used to sit above them. Naming the gap is
 * the job; occupying the best real estate on the page to do it is not. Those two panels are the only
 * things here anybody acts on, and a third of a screen of dashes above them put the to-do list below
 * the fold of a laptop.
 *
 * The money arithmetic is not what is missing. `shared/settlement/compute.ts` already turns cup
 * counts into each side's share; what is missing is the cup counts, and then a route that totals
 * them across gyms without this page fetching every gym to do it.
 */

/** The server's `MAX_LIMIT`. Asking for more is clamped, not refused. */
const PAGE_SIZE = 200;

/**
 * How many pages to follow before stopping and saying so.
 *
 * A thousand gyms is well past the point where §5 has this aggregation moving to the server, so this
 * is not a limit anyone should reach. It exists because the alternative — loop until the cursor runs
 * out — turns one slow morning into a page that never finishes loading and gives no reason.
 */
const MAX_PAGES = 5;

export default function AdminHome() {
  const guard = useAdminGuard();
  const [rows, setRows] = useState<AdminGymListRow[]>([]);
  const [complete, setComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);

  const load = useCallback(async () => {
    const collected: AdminGymListRow[] = [];
    let cursor: string | null = null;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await fetchAdminGymList(
        cursor ? { limit: PAGE_SIZE, cursor } : { limit: PAGE_SIZE },
      );
      if (!result.ok) {
        // Pages already collected are kept. A second page that failed still leaves the first
        // page's gyms worth looking at, and the banner says the totals are short.
        return { rows: collected, complete: false, problem: { message: result.error.message, issues: result.issues } };
      }
      collected.push(...result.data.gyms);
      cursor = result.data.nextCursor;
      if (!cursor) return { rows: collected, complete: true, problem: null };
    }
    return { rows: collected, complete: false, problem: null };
  }, []);

  useEffect(() => {
    if (guard.state !== "ready") return;
    let cancelled = false;
    load().then((outcome) => {
      if (cancelled) return;
      setRows(outcome.rows);
      setComplete(outcome.complete);
      setProblem(outcome.problem);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [guard.state, load]);

  if (guard.state !== "ready") return <AdminChecking />;
  const { session } = guard;

  // One clock for the whole render, so "3 days quiet" in the stalled list and "3 days" in the
  // recent list cannot disagree by the milliseconds between two calls.
  const now = Date.now();
  const funnel = summariseFunnel(rows, complete);
  const stalled = stalledGyms(rows, now);
  const recent = recentlyActive(rows);
  const newThisWeek = invitedSince(rows, now, 7);

  return (
    <AdminShell session={session}>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="mb-1 text-2xl font-display font-black tracking-tight text-foreground"
            data-testid="admin-home-heading"
          >
            Overview
          </h1>
          <p className="text-sm text-muted-foreground" data-testid="admin-home-scope">
            {isLoading
              ? "Counting gyms…"
              : complete
                ? `All ${funnel.counted} ${funnel.counted === 1 ? "gym" : "gyms"}.`
                : `First ${funnel.counted} gyms. Every figure below is a floor, not a total.`}
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
        <div className="mb-6">
          <ErrorPanel
            message={problem.message}
            issues={problem.issues}
            testId="admin-home-error"
            issuesTestId="admin-home-issues"
          />
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Active" value={funnel.active} tone="good" loading={isLoading} testId="stat-active" />
        <Tile label="Signed, not live" value={funnel.committed} tone="warn" loading={isLoading} testId="stat-committed" />
        <Tile
          label="In onboarding"
          value={funnel.counted - funnel.active - funnel.committed}
          loading={isLoading}
          testId="stat-onboarding"
        />
        <Tile label="Invited in the last 7 days" value={newThisWeek} loading={isLoading} testId="stat-invited-week" />
      </div>

      <div className="mb-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <Stalled gyms={stalled} isLoading={isLoading} counted={funnel.counted} />
        </div>
        <Funnel summary={funnel} isLoading={isLoading} />
      </div>

      <div className="mb-6">
        <Card
          title="Recent activity"
          note="Most recently changed first."
          testId="card-recent"
          action={
            <Link
              href="/admin/gyms"
              className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
              data-testid="link-all-gyms"
            >
              All gyms
              <ArrowRight className="w-3.5 h-3.5" aria-hidden />
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="px-5 py-4 text-sm text-muted-foreground" data-testid="recent-none">
              {isLoading ? "Loading…" : "No gyms yet. Inviting one is the first step of onboarding."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <Head>
                  <Col>Gym</Col>
                  <Col className="hidden sm:table-cell">Stage</Col>
                  <Col align="right">Last change</Col>
                </Head>
                <tbody className="divide-y divide-border/70" data-testid="list-recent">
                  {recent.map((row) => (
                    <GymRow key={row.gymId} row={row} testId={`recent-gym-${row.gymId}`}>
                      <Cell align="right" className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {formatIstDateTime(row.updatedAt)}
                      </Cell>
                    </GymRow>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Trading live={funnel.active} isLoading={isLoading} />
    </AdminShell>
  );
}

const TONE = {
  plain: "text-foreground",
  good: "text-emerald-300",
  warn: "text-amber-300",
} as const;

function Tile({
  label,
  value,
  tone = "plain",
  loading,
  testId,
}: {
  label: string;
  value: number;
  tone?: keyof typeof TONE;
  loading: boolean;
  testId: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-3.5 py-3" data-testid={testId}>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className={`block text-xl font-display font-black tabular-nums ${value ? TONE[tone] : "text-muted-foreground"}`}>
        {loading ? "—" : value}
      </span>
    </div>
  );
}

function GymRow({ row, testId, children }: { row: AdminGymListRow; testId: string; children: React.ReactNode }) {
  const router = useRouter();
  const href = `/admin/gyms/${row.gymId}`;
  return (
    <tr onClick={() => router.push(href)} className="cursor-pointer transition-colors hover:bg-secondary/40" data-testid={testId}>
      <Cell className="min-w-[10rem]">
        <Link href={href} className="font-semibold text-foreground hover:underline" onClick={(e) => e.stopPropagation()}>
          {row.tradeName || row.legalEntityName || row.slug}
        </Link>
        {row.noticesEmail && <span className="block truncate text-xs text-muted-foreground">{row.noticesEmail}</span>}
        <Pill className={`mt-1 sm:hidden ${STATUS_CLASS[row.status]}`}>{STATUS_LABEL[row.status]}</Pill>
      </Cell>
      <Cell className="hidden sm:table-cell">
        <Pill className={STATUS_CLASS[row.status]}>{STATUS_LABEL[row.status]}</Pill>
      </Cell>
      {children}
    </tr>
  );
}

/**
 * The sales this panel cannot show, named.
 *
 * Four figures because these are four pipelines that will arrive on four different days, which is the
 * same split `PortalSection` draws on the gym's side. A single "reporting coming soon" line would
 * lose that, and it is the part worth knowing: cup telemetry landing does not settle a statement.
 *
 * `live` is on screen because it is the one honest thing to say about the size of the gap. Whether
 * this section is hiding nothing or hiding a year of sales depends on how many gyms are trading, and
 * that number the page does have.
 */
function Trading({ live, isLoading }: { live: number; isLoading: boolean }) {
  return (
    <Card title="Trading" note="What the gyms sell. None of it reaches us yet." testId="card-trading">
      <div className="grid grid-cols-2 divide-border/70 lg:grid-cols-4 lg:divide-x">
        <Missing label="Cups sold" caption="no ingestion from the machines" testId="trading-cups" />
        <Missing label="Advertising revenue" caption="no ingestion" testId="trading-advertising" />
        <Missing label="Electricity" caption="no meter readings" testId="trading-electricity" />
        <Missing label="Settled statements" caption="no settlement job" testId="trading-statements" />
      </div>
      <p className="border-t border-border/70 px-4 py-3 text-xs leading-relaxed text-muted-foreground sm:px-5" data-testid="trading-notice">
        <span className="font-semibold text-foreground">
          {isLoading
            ? "Counting the gyms this would cover…"
            : live === 0
              ? "No gym is live yet, so there would be nothing to report even with the pipeline built."
              : `${live} ${live === 1 ? "gym is" : "gyms are"} live. We hold no sales figures for any of them.`}
        </span>{" "}
        These four are blanks rather than zeros, and a figure in any of them would be invented.
      </p>
    </Card>
  );
}

function Missing({ label, caption, testId }: { label: string; caption: string; testId: string }) {
  return (
    <div className="px-4 py-3 sm:px-5" data-testid={testId}>
      <span className="block text-xs text-muted-foreground">{label}</span>
      <span className="block text-sm text-muted-foreground" data-testid={`${testId}-unavailable`}>
        <span className="font-display font-black text-foreground/60">—</span> {caption}
      </span>
    </div>
  );
}

/**
 * The ladder, every rung, with the empty ones visible.
 *
 * A rung with nobody on it is the interesting one: eight gyms at `agreement_viewed` and none at
 * `signed` says the signing screen is where they stop. A chart that dropped zero rows would hide
 * exactly that.
 */
function Funnel({ summary, isLoading }: { summary: FunnelSummary; isLoading: boolean }) {
  return (
    <Card
      title="Onboarding funnel"
      note={
        summary.complete
          ? `${summary.counted} ${summary.counted === 1 ? "gym" : "gyms"}, counted on this page.`
          : "Counted over the gyms loaded here, not the whole table."
      }
      testId="card-funnel"
    >
      {isLoading ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>
      ) : summary.counted === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground" data-testid="funnel-none">
          Nothing to count yet.
        </p>
      ) : (
        <ol className="space-y-1.5 px-4 py-3 sm:px-5" data-testid="funnel">
          {summary.rows.map((row) => (
            <li key={row.status} className="text-sm" data-testid={`funnel-${row.status}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={row.count > 0 ? "text-foreground" : "text-muted-foreground"}>
                  {STATUS_LABEL[row.status]}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                  <span
                    className={`font-semibold ${row.count > 0 ? "text-foreground" : ""}`}
                  >
                    {row.count}
                  </span>{" "}
                  · {row.pct}%
                </span>
              </div>
              {/*
                A bar rather than a number alone, because the shape of the drop-off is the reading.
                `aria-hidden` with the figures already beside it: the same information twice is
                noise in a screen reader, and the numbers are the authoritative copy.
              */}
              <div className="mt-0.5 h-1 rounded-full bg-secondary overflow-hidden" aria-hidden>
                <div
                  className={`h-full rounded-full ${row.status === "active" ? "bg-emerald-400" : "bg-primary"}`}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/**
 * Gyms that have not moved. The one panel on this page that is a to-do list.
 *
 * "Not moved" is `updatedAt`, which is the row's last write of any kind rather than the gym's last
 * step. `stalledFor` explains why that overstates progress rather than inventing it.
 */
function Stalled({
  gyms,
  isLoading,
  counted,
}: {
  gyms: StalledGym[];
  isLoading: boolean;
  counted: number;
}) {
  return (
    <Card
      title="Needs a nudge"
      note="Not active, and nothing recorded for three days or more."
      testId="card-stalled"
      tone={gyms.length > 0 ? "alert" : "plain"}
    >
      {isLoading ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">Loading…</p>
      ) : gyms.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground" data-testid="stalled-none">
          {counted === 0
            ? "Nothing to chase yet."
            : "Nothing stalled. Every unfinished gym has moved in the last three days."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <Head>
              <Col>Gym</Col>
              <Col className="hidden sm:table-cell">Stage</Col>
              <Col align="right">Quiet for</Col>
            </Head>
            <tbody className="divide-y divide-border/70" data-testid="list-stalled">
              {gyms.map(({ row, days }) => (
                <GymRow key={row.gymId} row={row} testId={`stalled-gym-${row.gymId}`}>
                  <Cell align="right" className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {days} {days === 1 ? "day" : "days"}
                  </Cell>
                </GymRow>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
