"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Cpu,
  FileCheck,
  IndianRupee,
  Info,
  Landmark,
  MapPin,
  Percent,
  RefreshCw,
  ScrollText,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import {
  FRANCHISE_PORTAL_QUERY_KEY,
  FranchisePortalRequestError,
  fetchFranchisePortalSnapshot,
} from "@/lib/franchisePortalApi";
import {
  FRANCHISE_SESSION_QUERY_KEY,
  fetchFranchiseSession,
  signOutOfFranchisePortal,
} from "@/lib/franchiseSession";
import { formatInr } from "@shared/partnership/summary";
import { formatAgreementDate } from "@shared/onboarding/agreementFields";
import { franchiseTier } from "@shared/franchise/program";
import type { FranchisePortalSnapshot, UnbuiltSection } from "@shared/franchise/portal";
import type {
  EsignSignType,
  FranchiseDocumentType,
  FranchiseOnboardingStatus,
  FranchisePayment,
} from "@shared/franchise/onboarding/types";
import { Card, Row, RowGroup, type CardProps } from "../gym/portalCards";
import { formatIstDate, formatIstDateTime } from "../gym/istDates";

/**
 * What a franchisee sees after signing in.
 *
 * [GymDashboard](../gym/GymDashboard.tsx) is the model, and the four habits worth naming are
 * carried over from it: the session is read from the cache rather than refetched, the figures
 * request is `enabled` only once there is one, every failure renders **inside** the chrome so
 * Sign out is always reachable, and signing out uses `removeQueries` rather than
 * `invalidateQueries` because the cached snapshot is this franchisee's money.
 *
 * ## What is on this page, and what is not
 *
 * The program document lists eighteen things a franchisee should see and ten of them wait on a
 * settlement pipeline that does not exist. `shared/franchise/portal.ts` types those as
 * `UnbuiltSection` and this page renders them as one panel that says so, because **absent is
 * not zero**: a card reading ₹0 payouts is a claim about the world, and the wrong one.
 *
 * What is here is the record itself, which is answerable today and is the reason someone signs
 * in: the terms that bind, the territory that was granted, the instalments as claimed and as
 * confirmed, and the executed agreement.
 *
 * **The protein share is never presented as a margin.** `program.ts` says of the 100% figure
 * that it "is a capital recovery mechanism, not a margin, and the page must not present it as a
 * permanent share." So it is a row inside the terms card with the after-recovery figure beside
 * it, and not one of the four numerals at the top of the page.
 */

/**
 * Is this failure "sign in again", or "we are broken"?
 *
 * The two get completely different screens, and the code is the only way to tell them apart.
 *
 * **A dead session arrives as `invalid_handle`, which is not the code the server sent.**
 * `requireFranchiseSession` throws `unauthenticated()`, whose code is `invalid_token` — the
 * gym flow's spelling, because it is the shared constructor. That string is not in
 * `franchiseApiRequest`'s allowlist, so the transport falls back to mapping the status, and
 * `franchiseCodeForStatus(401)` is `invalid_handle`. Checking for `invalid_token` here would
 * therefore never match, and the franchisee would sit on the amber panel pressing Try again
 * over an expired cookie.
 *
 * `network` must not be on this list: a dropped connection would then sign someone out of a
 * session that is perfectly alive.
 */
function isSessionGone(error: unknown): boolean {
  if (!(error instanceof FranchisePortalRequestError)) return false;
  return (
    error.code === "invalid_handle" ||
    error.code === "expired_handle" ||
    error.code === "revoked_handle"
  );
}

/**
 * The seventeen rungs in the second person.
 *
 * Not `FRANCHISE_STATUS_LABEL` from `pages/admin/`: that one is written for us reading a queue
 * ("Under review with us", "Instalment claimed"), and it would also pull the admin formatting
 * module into this route's bundle.
 *
 * Only the last three are reachable by anyone who can sign in, since the login is created at
 * the end of the application. The rest are here because the record is exhaustive and a status
 * we did not expect must still render as words rather than as `undefined`.
 */
const STATUS_LABEL: Record<FranchiseOnboardingStatus, string> = {
  invited: "Invited",
  opened: "Application open",
  details_submitted: "Details submitted",
  territory_submitted: "Territory proposed",
  kyc_submitted: "Documents submitted",
  under_review: "With us for review",
  approved: "Approved",
  on_hold: "On hold",
  declined: "Not proceeding",
  franchise_ack: "Terms acknowledged",
  operations_submitted: "Operations submitted",
  termsheet_viewed: "Agreement viewed",
  esign_requested: "Out for signature",
  signed: "Agreement signed",
  payment_claimed: "Transfer reported",
  payment_verified: "First instalment confirmed",
  active: "Active franchise",
};

/** The dot beside that label. Colour is never the only carrier: the words are next to it. */
const STATUS_TONE: Record<FranchiseOnboardingStatus, string> = {
  invited: "bg-muted-foreground",
  opened: "bg-muted-foreground",
  details_submitted: "bg-muted-foreground",
  territory_submitted: "bg-muted-foreground",
  kyc_submitted: "bg-amber-400",
  under_review: "bg-amber-400",
  approved: "bg-emerald-400",
  on_hold: "bg-amber-400",
  declined: "bg-rose-400",
  franchise_ack: "bg-muted-foreground",
  operations_submitted: "bg-muted-foreground",
  termsheet_viewed: "bg-muted-foreground",
  esign_requested: "bg-amber-400",
  signed: "bg-emerald-400",
  payment_claimed: "bg-amber-400",
  payment_verified: "bg-emerald-400",
  active: "bg-emerald-400",
};

const DOC_LABEL: Record<FranchiseDocumentType, string> = {
  pan_card: "PAN card",
  entity_proof: "Entity proof",
  address_proof: "Address proof",
  signatory_id: "Signatory's photo ID",
  payment_proof: "Transfer proof",
};

/** In a franchisee's words, not the provider's. Nothing here names Leegality or a certificate store. */
const SIGN_TYPE_LABEL: Record<EsignSignType, string> = {
  aadhaar: "Aadhaar, with an OTP",
  electronic: "Electronically",
  dsc: "With a digital signature certificate",
};

const LOGISTICS_LABEL: Record<"own_vehicle" | "contracted" | "undecided", string> = {
  own_vehicle: "Your own vehicle",
  contracted: "A contracted carrier",
  undecided: "Not decided yet",
};

/**
 * The ten sections that wait on the settlement pipeline, in the order the program lists them.
 *
 * Written out against the snapshot rather than as a list of key names, so each entry is typed as
 * the section it names. A list of keys would need a cast at the point of reading, and the cast
 * would keep compiling on the day one of these stops being an `UnbuiltSection`.
 */
function unbuiltSections(
  snapshot: FranchisePortalSnapshot,
): { label: string; section: UnbuiltSection }[] {
  return [
    { label: "Sales across your territory", section: snapshot.sales },
    { label: "Protein and cup consumption", section: snapshot.consumption },
    { label: "Operating costs", section: snapshot.costs },
    { label: "Advertising income", section: snapshot.advertising },
    { label: "Distributable profit", section: snapshot.profit },
    { label: "Payouts to you", section: snapshot.payouts },
    { label: "Capital recovered so far", section: snapshot.capitalRecoveryProgress },
    { label: "Status of each machine", section: snapshot.machines },
    { label: "Monthly statements", section: snapshot.statements },
    { label: "Alerts", section: snapshot.alerts },
  ];
}

export default function FranchiseDashboard() {
  const router = useRouter();

  // Through the cache: `FranchiseLogin` writes the login response here before it navigates, so
  // arriving from the form the portal paints on the first frame and the snapshot request starts
  // immediately. A bookmark or a refresh has nothing cached, and then this is the guard it
  // always was.
  const { data: session, isPending: isCheckingSession } = useQuery({
    queryKey: FRANCHISE_SESSION_QUERY_KEY,
    queryFn: fetchFranchiseSession,
  });
  const email = session?.email ?? null;
  const signedOut = !isCheckingSession && !session;

  useEffect(() => {
    if (signedOut) router.replace("/franchise/login");
  }, [signedOut, router]);

  async function handleSignOut() {
    // The result is not checked: only the server can expire an `HttpOnly` cookie, and someone
    // who has pressed Sign out must leave the screen either way.
    await signOutOfFranchisePortal();
    queryClient.removeQueries({ queryKey: FRANCHISE_PORTAL_QUERY_KEY });
    queryClient.removeQueries({ queryKey: FRANCHISE_SESSION_QUERY_KEY });
    router.replace("/franchise/login");
  }

  const {
    data: snapshot,
    isPending,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: FRANCHISE_PORTAL_QUERY_KEY,
    queryFn: fetchFranchisePortalSnapshot,
    enabled: session != null,
    // A rejected session is not transient, so retrying it only delays the redirect below by a
    // few seconds of backoff while a franchisee reads the wrong explanation.
    retry: (attempt, err) => !isSessionGone(err) && attempt < 2,
  });

  // The guard above proved there was a session; this covers it ending afterwards, on a tab left
  // open overnight or an account disabled while it was open.
  const sessionGone = isError && isSessionGone(error);
  useEffect(() => {
    if (sessionGone) router.replace("/franchise/login");
  }, [sessionGone, router]);

  // No chrome: there is no session, so there is no email to show and no meaningful Sign out.
  // Only a cold entry reaches this branch.
  if (isCheckingSession || signedOut || sessionGone) {
    return (
      <div className="dark theme-console flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading your portal...
      </div>
    );
  }

  if (isPending) {
    return (
      <PortalChrome email={email} onSignOut={handleSignOut}>
        <PortalLoading />
      </PortalChrome>
    );
  }

  if (isError || !snapshot) {
    return (
      <PortalChrome email={email} onSignOut={handleSignOut}>
        <PortalError error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      </PortalChrome>
    );
  }

  return (
    <PortalChrome email={email} onSignOut={handleSignOut}>
      <PortalContent snapshot={snapshot} />
    </PortalChrome>
  );
}

/** The loaded dashboard. Its own component so every derivation below runs against a real snapshot. */
function PortalContent({ snapshot }: { snapshot: FranchisePortalSnapshot }) {
  const { terms, payments, territory, agreement, operations, documents } = snapshot;

  const confirmed = payments.filter((payment) => payment.verifiedAt !== null);
  const confirmedPaise = confirmed.reduce(
    (total, payment) => total + (payment.receivedPaise ?? 0),
    0,
  );

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-foreground sm:text-3xl">
            {snapshot.franchiseDisplayName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {franchiseTier(terms.tier).name}
            {territory ? ` · ${territory.territory}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={snapshot.onboardingStatus} />
          <LastUpdated asOf={snapshot.asOf} />
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={IndianRupee} label="Investment agreed" testId="metric-investment">
          <Figure
            value={inr(terms.investmentPaise)}
            caption={`Your ${franchiseTier(terms.tier).shortName}, as signed`}
          />
        </MetricCard>

        {/* Accented, because it is the one figure a franchisee who has just transferred money
            signs in to check. A total of confirmed receipts is not a settlement figure: these
            are rows an admin read off a bank statement, so zero here is true rather than
            missing, and the caption says which of the instalments it covers. */}
        <MetricCard icon={BadgeCheck} label="Confirmed by us" testId="metric-confirmed" accent>
          <Figure
            value={inr(confirmedPaise)}
            caption={
              payments.length === 0
                ? "No instalment is due yet"
                : `${count(confirmed.length)} of ${count(payments.length)} ${
                    payments.length === 1 ? "instalment" : "instalments"
                  } confirmed against our bank`
            }
          />
        </MetricCard>

        <MetricCard icon={Cpu} label="Machines allocated" testId="metric-machines">
          <Figure
            value={count(terms.machineAllocation)}
            caption="Under your terms. Deployment is planned with you."
          />
        </MetricCard>

        <MetricCard icon={Wallet} label="Capital to recover" testId="metric-recovery">
          <Figure
            value={
              terms.capitalRecoveryPaise === null
                ? "Set in your agreement"
                : inr(terms.capitalRecoveryPaise)
            }
            caption="What comes back to you first, before the protein share changes"
            muted={terms.capitalRecoveryPaise === null}
            words={terms.capitalRecoveryPaise === null}
          />
        </MetricCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <PaymentsCard payments={payments} className="lg:col-span-2" />
        <TermsCard terms={terms} />
        {agreement && <AgreementCard agreement={agreement} />}
        {territory && <TerritoryCard territory={territory} />}
        {operations && <OperationsCard operations={operations} />}
        <DocumentsCard documents={documents} />
      </div>

      <ComingSoon snapshot={snapshot} />
    </>
  );
}

function PortalChrome({
  email,
  onSignOut,
  children,
}: {
  email: string | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="dark theme-console relative min-h-screen bg-background text-foreground">
      {/* No `overflow-hidden` above the header: an overflow ancestor makes `position: sticky`
          stick to a box that never scrolls. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(70%_100%_at_50%_0%,hsl(var(--primary)/0.10),transparent_72%)]"
      />

      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="flex-shrink-0 cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {/* The wordmark in `logo.png` is black, so it needs inverting on this surface. */}
              <img
                src="/assets/logo.png"
                alt="MuscleBoxPro"
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            <span aria-hidden="true" className="hidden h-5 w-px bg-border sm:block" />
            <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground sm:block">
              Franchise portal
            </span>
          </div>

          <div className="flex items-center gap-3">
            {email && (
              <span className="hidden items-center gap-2 rounded-full border border-border bg-secondary/50 py-1 pl-1 pr-3 sm:flex">
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-white"
                >
                  {email.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[180px] truncate text-xs font-medium text-muted-foreground lg:max-w-none">
                  {email}
                </span>
              </span>
            )}
            <Button
              variant="ghost"
              onClick={onSignOut}
              className="h-9 cursor-pointer rounded-xl border-border bg-secondary/50 px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              data-testid="button-signout"
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        {children}
      </main>
    </div>
  );
}

/** Placeholders in the shape of what is coming, rather than a spinner over a page this tall. */
function PortalLoading() {
  return (
    <div data-testid="portal-loading" aria-busy="true">
      <div className="border-b border-border pb-6">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-secondary" />
        <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-secondary/60" />
      </div>
      <p className="sr-only">Loading your franchise record</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-border bg-card p-5"
            aria-hidden="true"
          >
            <div className="mb-6 h-3 w-24 rounded bg-secondary/70" />
            <div className="mb-3 h-8 w-32 rounded bg-secondary" />
            <div className="h-3 w-full rounded bg-secondary/60" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-2xl border border-border bg-card p-5"
            aria-hidden="true"
          >
            <div className="mb-6 h-3 w-32 rounded bg-secondary/70" />
            <div className="mb-3 h-7 w-28 rounded bg-secondary" />
            <div className="h-3 w-4/5 rounded bg-secondary/60" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * What a franchisee sees when the record cannot be read.
 *
 * No field names and no exception text on screen; those go to the console for us. What they get
 * is the fact, a retry, and the one reassurance that does not depend on this page: the signed
 * agreement and every confirmed transfer are in our records rather than on this screen, so
 * nothing they hold is affected by a page that will not load.
 */
function PortalError({
  error,
  onRetry,
  isRetrying,
}: {
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  useEffect(() => {
    if (error) console.error("[FranchisePortal] snapshot unavailable:", error);
  }, [error]);

  return (
    <div
      className="max-w-2xl rounded-2xl border border-amber-400/25 bg-amber-400/[0.07] p-5 sm:p-6"
      data-testid="portal-error"
      role="alert"
    >
      <p className="flex items-center gap-2.5 text-sm font-bold text-amber-100">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" aria-hidden="true" />
        We can&apos;t show your franchise record right now
      </p>
      <p className="mt-2 text-sm leading-relaxed text-amber-100/70">
        This is a problem at our end, not with your franchise or your account. Your signed
        agreement, your territory and every payment we have confirmed are held in our records and
        are unaffected by this page.
      </p>
      <Button
        type="button"
        variant="ghost"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-5 h-10 cursor-pointer rounded-xl border-amber-400/30 bg-amber-400/10 px-5 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-400/20"
        data-testid="button-retry-snapshot"
      >
        {isRetrying ? "Trying again..." : "Try again"}
      </Button>
    </div>
  );
}

function StatusPill({ status }: { status: FranchiseOnboardingStatus }) {
  return (
    <span
      className="inline-flex flex-shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground"
      data-testid="franchise-status"
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_TONE[status]}`} />
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * When the record was read.
 *
 * "Updated" rather than the gym's "synced": nothing on this page comes from a feed, so the only
 * honest claim is when the response was composed. It is shown at all because a stale dashboard
 * about somebody's ₹12,50,000 lies.
 */
function LastUpdated({ asOf }: { asOf: string }) {
  return (
    <p
      className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-[13px] text-muted-foreground"
      data-testid="as-of"
    >
      <RefreshCw className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/80" aria-hidden="true" />
      <span className="text-muted-foreground">Updated</span>{" "}
      <span className="font-semibold tabular-nums text-foreground">
        {formatIstDateTime(asOf)} IST
      </span>
    </p>
  );
}

/** Label above, icon out to the right, numeral on its own line. `accent` is for the one that matters. */
function MetricCard({
  icon: Icon,
  label,
  testId,
  accent = false,
  children,
}: CardProps & { accent?: boolean }) {
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border bg-card p-5 ${
        accent ? "border-primary/25" : "border-border"
      }`}
      data-testid={testId}
    >
      {accent && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-accent to-primary"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/20 blur-3xl"
          />
        </>
      )}
      <div className="relative flex items-start justify-between gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </h3>
        <span
          className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg ring-1 ring-inset ${
            accent
              ? "bg-primary/10 text-primary ring-primary/25"
              : "bg-secondary/50 text-muted-foreground ring-border"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div className="relative mt-4 flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

function Figure({
  value,
  caption,
  muted = false,
  words = false,
}: {
  value: string;
  caption: string;
  muted?: boolean;
  /** Set where the slot holds a phrase rather than a numeral: at display size it wraps to three
   *  lines and pushes the card taller than the three beside it. */
  words?: boolean;
}) {
  return (
    <div>
      <p
        className={`font-display font-black leading-none tracking-tight tabular-nums ${
          words ? "text-[17px] leading-snug" : "text-[26px]"
        } ${muted ? "text-muted-foreground/70" : "text-foreground"}`}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{caption}</p>
    </div>
  );
}

/**
 * Every instalment, as claimed and as confirmed.
 *
 * The widest card on the page because it is the one with a state per row, and the only one a
 * franchisee may need to act on: a refused claim reopens the wizard's claim form.
 */
function PaymentsCard({
  payments,
  className,
}: {
  payments: FranchisePayment[];
  className?: string;
}) {
  return (
    <Card icon={Landmark} label="Your instalments" testId="card-payments" className={className}>
      {payments.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Nothing is due yet. Your instalments appear here as they fall due.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {payments.map((payment) => (
            <PaymentRow key={payment.instalment} payment={payment} />
          ))}
        </div>
      )}
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        We confirm a transfer against our bank statement, so the amount we record can differ from
        the amount you reported. Both are shown.
      </p>
    </Card>
  );
}

/**
 * One instalment.
 *
 * The precedence is confirmed, then refused, then reported, then not due, and it is
 * `StepInstalment`'s order rather than a new one: a refusal reopens the claim form, so a record
 * can hold both a claim and a refusal at once, and showing "we are checking" over a refusal
 * would hide the only thing on this card that needs doing.
 */
function PaymentRow({ payment }: { payment: FranchisePayment }) {
  const verifiedAt = payment.verifiedAt;

  return (
    <div
      className={`rounded-xl border p-3.5 ${
        verifiedAt
          ? "border-emerald-400/25 bg-emerald-400/[0.06]"
          : payment.refusal
            ? "border-amber-400/25 bg-amber-400/[0.06]"
            : "border-border bg-secondary/30"
      }`}
      data-testid={`payment-${payment.instalment}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[13px] font-semibold text-foreground">
          Instalment {payment.instalment}
        </p>
        <p className="text-[13px] font-semibold tabular-nums text-muted-foreground">
          {inr(payment.expectedPaise)} expected
        </p>
      </div>

      {verifiedAt ? (
        <p className="mt-2 flex items-start gap-2 text-[13px] font-semibold leading-relaxed text-emerald-200">
          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
          {inr(payment.receivedPaise ?? 0)} received, confirmed on {formatIstDate(verifiedAt)}
        </p>
      ) : payment.refusal ? (
        <>
          <p className="mt-2 flex items-start gap-2 text-[13px] font-semibold leading-relaxed text-amber-100">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
            We couldn&apos;t confirm this transfer
          </p>
          {/* Set apart under a label, and never run on from our sentence: this is typed by an
              admin in a hurry, and unlabelled it reads as product copy about somebody's
              ₹12,50,000. `StepInstalment`'s `RefusalPanel` does the same. */}
          <div className="mt-2 rounded-lg border border-amber-400/20 bg-background/40 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
              What we found
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-amber-100/90">{payment.refusal}</p>
          </div>
        </>
      ) : payment.claim ? (
        <p className="mt-2 flex items-start gap-2 text-[13px] leading-relaxed text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/80" aria-hidden="true" />
          You reported {inr(payment.claim.amountPaise)} on{" "}
          {formatAgreementDate(payment.claim.paidOn)}. We are checking it.
        </p>
      ) : (
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          Not transferred yet.
        </p>
      )}

      {payment.claim && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">
          Your bank reference {payment.claim.utr}
        </p>
      )}
    </div>
  );
}

/**
 * The terms that bind, from that franchise's own record.
 *
 * The protein share is two rows rather than one figure, and the during-recovery row says what it
 * is for. 100% is how the investment comes back, and a portal that printed it alone would be
 * describing a permanent margin that does not exist.
 */
function TermsCard({ terms }: { terms: FranchisePortalSnapshot["terms"] }) {
  const tier = franchiseTier(terms.tier);

  return (
    <Card icon={Percent} label="Your terms" testId="card-terms">
      <p className="text-sm font-semibold text-foreground">{tier.shortName}</p>
      <RowGroup>
        <Row label="Market rights" value={tier.marketRights} />
        <Row
          label="Protein share while recovering"
          value={`${terms.proteinSharePctDuringRecovery}%`}
        />
        <Row
          label="Protein share after recovery"
          value={`${terms.proteinSharePctAfterRecovery}%`}
        />
        <Row
          label="Advertising split"
          value={`${terms.advertisingFranchiseeSharePct}% you, ${terms.advertisingMbpSharePct}% us`}
        />
        <Row
          label="Instalments"
          value={
            terms.paymentSchedule === null
              ? "As agreed in writing"
              : terms.paymentSchedule.map((stage) => `${stage.pct}%`).join(" + ")
          }
        />
      </RowGroup>
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        The higher protein share is how your investment comes back to you. It moves to{" "}
        {terms.proteinSharePctAfterRecovery}% once it has. Advertising income is separate and
        never counts towards recovery.
      </p>
    </Card>
  );
}

/**
 * The signed agreement, read as an accomplishment rather than as a file record.
 *
 * A franchisee opening this has executed a binding instrument and transferred a large sum, and
 * the first line should say that plainly. The lapse date is still on it: the term sheet expires
 * if the definitive agreement is not executed, and a card that only congratulated would be
 * hiding the one date on it that has a deadline attached.
 *
 * "Agreement", never "Term Sheet", although the PDF is titled the latter. The reference is
 * twelve characters with the whole value in `title`, and it is never called a hash.
 */
function AgreementCard({ agreement }: { agreement: NonNullable<FranchisePortalSnapshot["agreement"]> }) {
  return (
    <Card icon={FileCheck} label="Your agreement" testId="card-agreement">
      <p className="flex items-start gap-2 text-sm font-semibold leading-relaxed text-emerald-200">
        <BadgeCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" aria-hidden="true" />
        Signed and on the record
      </p>
      <RowGroup>
        <Row label="Signed by" value={agreement.signerName} />
        <Row label="Signed on" value={formatIstDate(agreement.signedAt)} />
        <Row label="How" value={SIGN_TYPE_LABEL[agreement.signType]} />
        <Row label="In effect from" value={formatAgreementDate(agreement.effectiveDate)} />
        <Row label="Valid until" value={formatAgreementDate(agreement.validUntil)} />
        <Row label="Version" value={agreement.version} />
      </RowGroup>
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        Reference{" "}
        <span className="font-semibold tracking-wide text-foreground" title={agreement.contentHash}>
          {agreement.contentHash.slice(0, 12)}
        </span>
        . Quote it if you write to us about your agreement.
      </p>
    </Card>
  );
}

function TerritoryCard({
  territory,
}: {
  territory: NonNullable<FranchisePortalSnapshot["territory"]>;
}) {
  return (
    <Card icon={MapPin} label="Your territory" testId="card-territory">
      <p className="text-sm font-semibold text-foreground">{territory.territory}</p>
      <p className="text-[13px] leading-relaxed text-muted-foreground">
        {territory.territoryBoundary}
      </p>
      <RowGroup className="mt-auto">
        <Row label="Granted on" value={formatIstDate(territory.decidedAt)} />
      </RowGroup>
    </Card>
  );
}

/** Step 6 as it was submitted: what we hold, so a franchisee can see it is what they said. */
function OperationsCard({
  operations,
}: {
  operations: NonNullable<FranchisePortalSnapshot["operations"]>;
}) {
  const temperature =
    operations.temperatureControl === "yes"
      ? "Yes"
      : operations.temperatureControl === "no"
        ? "No"
        : "Not asked yet";

  return (
    <Card icon={operations.warehouseNotIdentified ? Truck : Landmark} label="Your operations" testId="card-operations">
      <RowGroup>
        <Row
          label="Warehouse"
          value={
            operations.warehouseNotIdentified
              ? "Not identified yet"
              : operations.warehouseAddress || "Not recorded"
          }
        />
        {operations.warehouseAreaSqft !== null && (
          <Row label="Area" value={`${count(operations.warehouseAreaSqft)} sq ft`} />
        )}
        <Row label="Temperature controlled" value={temperature} />
        <Row
          label="Operations contact"
          value={operations.operationsContactName || "Not recorded"}
        />
        <Row label="Phone" value={operations.operationsContactPhone || "Not recorded"} />
        <Row label="Deliveries" value={LOGISTICS_LABEL[operations.logisticsArrangement]} />
      </RowGroup>
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        Anything here that has changed: write to us and we will update the record.
      </p>
    </Card>
  );
}

/**
 * That a file arrived, and nothing else.
 *
 * **No links, and there must not be any.** `UploadedDocument` carries no URL by design, and a
 * portal that offered to re-download somebody's identity documents would be a wider blast
 * radius than the one thing this card exists to answer: did you get it?
 */
function DocumentsCard({ documents }: { documents: FranchisePortalSnapshot["documents"] }) {
  return (
    <Card icon={ScrollText} label="Documents you sent us" testId="card-documents">
      {documents.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Nothing on file yet.
        </p>
      ) : (
        <RowGroup>
          {documents.map((document) => (
            <Row
              key={document.docId}
              label={DOC_LABEL[document.docType]}
              value={formatIstDate(document.uploadedAt)}
            />
          ))}
        </RowGroup>
      )}
      <p className="mt-auto text-[13px] leading-relaxed text-muted-foreground">
        Received and held with your record. Files aren&apos;t downloadable from here.
      </p>
    </Card>
  );
}

/**
 * The ten sections that have no answer yet, in one panel.
 *
 * **Not ten cards.** `GymDashboard` renders an `UnavailableCard` per absent section, and that is
 * right there because it is three or four cards among nine that carry figures, so the empty one
 * teaches that the figure exists and is coming. Ten empty cards and six full ones is a different
 * page: it reads as a broken dashboard, and every one of the ten would be the identical
 * placeholder, since `UnbuiltSection` is `PortalSection<never>` and none of them can carry data
 * until someone changes the type.
 *
 * The reason is read per section rather than assumed, because `no_data_yet` and
 * `not_implemented` are opposite claims: one says the pipeline works and there is nothing to
 * report, the other says we have not built it.
 */
function ComingSoon({ snapshot }: { snapshot: FranchisePortalSnapshot }) {
  const sections = unbuiltSections(snapshot).filter((entry) => !entry.section.available);

  if (sections.length === 0) return null;

  return (
    <section
      className="mt-4 rounded-2xl border border-border bg-secondary/30 p-5"
      data-testid="coming-soon"
    >
      <p className="flex items-start gap-2.5 text-sm font-semibold text-foreground">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground/80" aria-hidden="true" />
        Not on this page yet
      </p>
      <p className="mt-2 max-w-[80ch] text-[13px] leading-relaxed text-muted-foreground">
        The trading side of this page is still being built. Rather than show you a zero, we show
        you nothing: none of these is a figure we can state today, and none of them affects what
        your agreement entitles you to.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((entry) => (
          <li
            key={entry.label}
            className="flex items-baseline justify-between gap-3 rounded-xl border border-border/70 bg-card/50 px-3.5 py-2.5 text-[13px]"
          >
            <span className="text-muted-foreground">{entry.label}</span>
            <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              {!entry.section.available && entry.section.reason === "no_data_yet"
                ? "None yet"
                : "Coming"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Paise in, rupees out. `formatInr` takes rupees, and every amount on the record is paise. */
function inr(paise: number): string {
  return formatInr(paise / 100);
}

/** 15000 → "15,000". Indian grouping, matching `formatInr`. */
function count(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
