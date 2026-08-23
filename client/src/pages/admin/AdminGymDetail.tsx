"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { fetchAdminGymView } from "@/lib/adminApi";
import type { AdminGymView } from "@shared/admin/gyms";
import type { OnboardingTimestamps } from "@shared/onboarding/types";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import {
  DEPOSIT_CHOICE_LABEL,
  DEPOSIT_STATUS_LABEL,
  ENTITY_TYPE_LABEL,
  MACHINE_STATUS_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  STEP_LABEL,
  formatCalendarDate,
  formatInr,
  formatIstDateTime,
  formatPaiseAsInr,
} from "./adminFormat";

/**
 * One gym, read-only — the screen that answers **"why is this gym stuck?"**
 *
 * That question is the whole design brief, and it is why this page is wide rather than a tidy
 * summary. Every partial answer sends whoever asked to the DynamoDB console, which is the state
 * this panel exists to leave (§2.7: *"the one that needs to be genuinely complete"*).
 *
 * Three things here are not obvious:
 *
 * 1. **"No unit allocated" is `machine.deviceNo === null`, never `machine === null`.**
 *    `machineOf(null)` returns a zero-valued projection, so the wrong check shows a gym with no
 *    machine a ₹0 unit called "". See `AdminGymView.machine`.
 * 2. **The timeline shows every stage, including the ones that have not happened.** A blank
 *    `signedAt` beside a filled `agreementViewedAt` is the answer to the question; a timeline
 *    that only listed what did happen would make the gap invisible.
 * 3. **Schema failures are shown with their field paths.** The audience is us, and
 *    `terms.securityDepositInr: Required` is the entire answer to "what changed on the
 *    backend?" — better on screen than in a console nobody has open.
 *
 * Nothing here writes. The six write actions (resend, void, terms, machine, activate,
 * set-password-link) land on this page next; the read screen exists first so each one has
 * something to be verified against.
 */

export default function AdminGymDetail({ gymId }: { gymId: string }) {
  const guard = useAdminGuard();
  const [gym, setGym] = useState<AdminGymView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);

  useEffect(() => {
    if (guard.state !== "ready") return;
    let cancelled = false;
    fetchAdminGymView(gymId).then((result) => {
      if (cancelled) return;
      if (result.ok) setGym(result.data);
      else setProblem({ message: result.error.message, issues: result.issues });
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [guard.state, gymId]);

  if (guard.state !== "ready") return <AdminChecking />;

  return (
    <AdminShell session={guard.session}>
      <Link
        href="/admin/gyms"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        data-testid="link-back-to-gyms"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        All gyms
      </Link>

      {isLoading && (
        <p className="text-sm text-muted-foreground" data-testid="gym-loading">
          Loading…
        </p>
      )}

      {problem && (
        <div
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
          data-testid="gym-error"
        >
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-600 leading-relaxed">{problem.message}</p>
            {problem.issues.length > 0 && (
              <ul className="mt-2 space-y-0.5" data-testid="gym-issues">
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

      {gym && <GymView gym={gym} />}
    </AdminShell>
  );
}

function GymView({ gym }: { gym: AdminGymView }) {
  // The trap, spelled out once so no section below has to remember it.
  const hasUnit = gym.machine.deviceNo !== null;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight"
            data-testid="gym-heading"
          >
            {gym.details.tradeName || gym.details.legalEntityName || gym.slug}
          </h1>
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[gym.status]}`}
            data-testid="gym-status"
          >
            {STATUS_LABEL[gym.status]}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          On step {gym.currentStep} — {STEP_LABEL[gym.currentStep]}
          {" · "}
          <span className="font-mono text-xs" data-testid="gym-id">
            {gym.gymId}
          </span>
        </p>
      </div>

      <Card title="Progress" testId="card-progress">
        {/*
          Every stage, including the empty ones — the gap is the diagnosis. `completedSteps` is
          shown alongside because the two can legitimately disagree: a timestamp records when
          something happened, `completedSteps` is what the server will let the gym do next.
        */}
        <Timeline timestamps={gym.timestamps} />
        <p className="px-5 pb-4 text-xs text-muted-foreground">
          Steps completed: {gym.completedSteps.length > 0 ? gym.completedSteps.join(", ") : "none"}
        </p>
      </Card>

      <Card title="Onboarding link" testId="card-invite">
        {gym.invite ? (
          <Fields>
            <Field label="Token" value={gym.invite.tokenId} mono />
            <Field label="Type" value={gym.invite.typ} />
            <Field label="Invited by" value={gym.invite.invitedByName} />
            <Field label="Issued by" value={gym.invite.issuedByEmail} />
            <Field label="Created" value={formatIstDateTime(gym.invite.createdAt)} />
            <Field label="Expires" value={formatIstDateTime(gym.invite.expiresAt)} />
            {/*
              The link itself is not here and cannot be: only `sha256(handle)` is stored, so a
              handle is recoverable exactly once, in the response that minted it. Resending is
              the only way to get a working link — not a lookup.
            */}
            {gym.invite.revokedAt && (
              <Field label="Revoked" value={formatIstDateTime(gym.invite.revokedAt)} />
            )}
            {gym.invite.revokedReason && (
              <Field label="Reason" value={gym.invite.revokedReason} />
            )}
            {gym.invite.supersededByTokenId && (
              <Field label="Superseded by" value={gym.invite.supersededByTokenId} mono />
            )}
          </Fields>
        ) : (
          <Empty testId="invite-none">
            No live link. Either none was issued or it was voided — resending mints a new one.
          </Empty>
        )}
      </Card>

      <Card title="Details" testId="card-details">
        <Fields>
          <Field label="Legal entity" value={gym.details.legalEntityName} />
          <Field label="Entity type" value={ENTITY_TYPE_LABEL[gym.details.entityType]} />
          <Field label="Trade name" value={gym.details.tradeName} />
          <Field label="GSTIN" value={gym.details.gstin} mono />
          <Field label="FSSAI licence" value={gym.details.fssaiLicenceNumber} mono />
          <Field label="Registered address" value={gym.details.registeredAddress} />
          <Field label="Installation address" value={gym.details.installationAddress} />
          <Field label="Signatory" value={gym.details.signatoryName} />
          <Field label="Designation" value={gym.details.signatoryDesignation} />
          {/* §41's notices block — the address a legal notice is served to, not a contact form. */}
          <Field label="Notices email" value={gym.details.noticesEmail} />
          <Field label="Notices phone" value={gym.details.noticesPhone} />
        </Fields>
      </Card>

      <Card
        title="Terms"
        testId="card-terms"
        note={
          gym.termsUpdatedByEmail
            ? `Last set by ${gym.termsUpdatedByEmail}`
            : "Never edited — these are the values the gym was created with."
        }
      >
        <Fields>
          <Field label="Security deposit" value={formatInr(gym.terms.securityDepositInr)} />
          <Field label="Term" value={`${gym.terms.termMonths} months`} />
          <Field
            label="Gym share, before milestone"
            value={`${gym.terms.gymSharePctBeforeMilestone}%`}
          />
          <Field
            label="Gym share, after milestone"
            value={`${gym.terms.gymSharePctAfterMilestone}%`}
          />
          <Field label="Milestone, cups" value={gym.terms.milestoneCups.toLocaleString("en-IN")} />
          {/* §6.1's profit test is cumulative Net Profit, not gross sales — hence both figures. */}
          <Field
            label="Milestone, net profit"
            value={formatInr(gym.terms.milestoneNetProfitInr)}
          />
          <Field label="Advertising, gym share" value={`${gym.terms.advertisingGymSharePct}%`} />
          <Field
            label="Electricity"
            value={`${formatInr(gym.terms.electricityInrPerBlock)} per ${gym.terms.electricityCupsPerBlock.toLocaleString("en-IN")} cups`}
          />
          <Field
            label="Electricity review"
            value={`Every ${gym.terms.electricityReviewWindowMonths} months`}
          />
          <Field
            label="Settlement"
            value={`${gym.terms.settlementDaysAfterMonthEnd} days after month end`}
          />
          {/*
            Zero and null are different answers and are shown differently. Zero is the standard
            term and means the exit price is nil on 30 days' notice (§36.1); null means the
            charge is genuinely unagreed. A blank printing as "₹0" is how a placeholder becomes
            a term nobody chose.
          */}
          <Field
            label="Early termination charge"
            value={
              gym.terms.earlyTerminationChargeInr === null
                ? "Not agreed"
                : formatInr(gym.terms.earlyTerminationChargeInr)
            }
          />
        </Fields>
      </Card>

      <Card title="Machine" testId="card-machine">
        {hasUnit ? (
          <Fields>
            <Field label="Device no." value={gym.machine.deviceNo} mono />
            <Field label="Model" value={gym.machine.model} />
            <Field label="Serial" value={gym.machine.serialNumber} mono />
            <Field label="Value" value={formatInr(gym.machine.valueInr)} />
            <Field label="Accessories" value={gym.machine.accessories} />
            {/* A contractual calendar date (§4.1), formatted as one — never through `Date`. */}
            <Field
              label="Installed"
              value={formatCalendarDate(gym.machine.installationDate)}
            />
          </Fields>
        ) : (
          <Empty testId="machine-none">
            No unit allocated. Signing does not require one; activation does.
          </Empty>
        )}

        {gym.machines.length > 0 && (
          <div className="border-t border-gray-100">
            <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              All units, including replaced
            </p>
            <table className="w-full text-sm" data-testid="table-machines">
              <tbody className="divide-y divide-gray-100">
                {gym.machines.map((unit) => (
                  <tr key={unit.deviceNo}>
                    <td className="px-5 py-3 font-mono text-xs">{unit.deviceNo}</td>
                    <td className="px-5 py-3">{unit.model}</td>
                    <td className="px-5 py-3">{MACHINE_STATUS_LABEL[unit.status]}</td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {formatCalendarDate(unit.installationDate)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {/* An ISO timestamp, not a date — truncating it in UTC dates a 01:00 IST
                          service call to the previous day. */}
                      {unit.lastServiceAt ? `Serviced ${formatIstDateTime(unit.lastServiceAt)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="Deposit"
        testId="card-deposit"
        note={
          gym.depositChoice ? DEPOSIT_CHOICE_LABEL[gym.depositChoice] : "No choice made yet"
        }
      >
        <Fields>
          <Field label="Status" value={DEPOSIT_STATUS_LABEL[gym.depositStatus]} />
        </Fields>

        {gym.depositWaiver && (
          <div className="mx-5 mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3" data-testid="deposit-waiver">
            {/*
              A waived deposit and a deposit nobody chased look identical in `depositStatus`.
              This record is the difference, and it matters once the gym is already trading —
              which is why activation takes a reason and a name rather than a checkbox.
            */}
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Deposit waived</p>
            <p className="text-xs text-amber-700">
              {gym.depositWaiver.reason} — {gym.depositWaiver.byEmail},{" "}
              {formatIstDateTime(gym.depositWaiver.at)}
            </p>
          </div>
        )}

        {gym.deposits.length > 0 ? (
          <div className="border-t border-gray-100">
            <table className="w-full text-sm" data-testid="table-deposits">
              <tbody className="divide-y divide-gray-100">
                {gym.deposits.map((deposit) => (
                  <tr key={deposit.depositId}>
                    <td className="px-5 py-3 font-semibold">{formatPaiseAsInr(deposit.amountPaise)}</td>
                    <td className="px-5 py-3">{DEPOSIT_STATUS_LABEL[deposit.status]}</td>
                    <td className="px-5 py-3 text-muted-foreground">{deposit.method ?? "—"}</td>
                    {/* §2.7 asks for the link id by name: reconciling against Razorpay's own
                        dashboard is done on it, not on our deposit id. */}
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {deposit.receiptNo ?? deposit.linkId ?? deposit.depositId}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {deposit.paidAt
                        ? formatIstDateTime(deposit.paidAt)
                        : deposit.linkExpiresAt
                          ? `Link expires ${formatIstDateTime(deposit.linkExpiresAt)}`
                          : formatIstDateTime(deposit.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty testId="deposits-none">No deposit records.</Empty>
        )}
      </Card>

      <Card title="Signature" testId="card-signature">
        {gym.signature ? (
          <Fields>
            <Field label="Signed" value={formatIstDateTime(gym.signature.signedAt)} />
            <Field label="Signatory" value={gym.signature.signatoryName} />
            <Field label="Designation" value={gym.signature.signatoryDesignation} />
            <Field label="Agreement version" value={gym.signature.agreementVersion} />
            {/*
              Signing carries no OTP today (§2.5), so what makes this a real e-signature record
              is the evidence bundle: a typed name, two explicit consents, a server timestamp,
              and the hash of the exact text that was on screen. All of it is shown for that
              reason, not for completeness.
            */}
            <Field label="Content hash" value={gym.signature.contentHash} mono />
            <Field
              label="Consents"
              value={[
                gym.signature.agreedToAgreement ? "Read and agreed" : "Did not agree",
                gym.signature.authorisedToBind ? "authorised to bind" : "not authorised to bind",
              ].join(", ")}
            />
            <Field label="IP" value={gym.signature.ip} mono />
            <Field label="User agent" value={gym.signature.userAgent} />
          </Fields>
        ) : (
          <Empty testId="signature-none">Not signed.</Empty>
        )}

        {gym.agreements.length > 0 && (
          <div className="border-t border-gray-100">
            <p className="px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documents issued
            </p>
            <table className="w-full text-sm" data-testid="table-agreements">
              <tbody className="divide-y divide-gray-100">
                {gym.agreements.map((agreement) => (
                  <tr key={agreement.contentHash}>
                    <td className="px-5 py-3 font-semibold">{agreement.version}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      Effective {formatCalendarDate(agreement.effectiveDate)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {agreement.contentHash.slice(0, 12)}… · {agreement.length} chars
                    </td>
                    <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                      {agreement.viewedAt ? `Viewed ${formatIstDateTime(agreement.viewedAt)}` : "Not viewed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Activation" testId="card-activation">
        {gym.activatedAt ? (
          <Fields>
            <Field label="Activated" value={formatIstDateTime(gym.activatedAt)} />
            <Field label="By" value={gym.activatedByEmail} />
          </Fields>
        ) : (
          <Empty testId="activation-none">Not activated.</Empty>
        )}
      </Card>
    </div>
  );
}

/**
 * The funnel, in order, with the gaps left visible.
 *
 * One row per transition (§4: *"one per transition, so the admin funnel comes for free"*), and
 * the order is the ladder's order rather than the order the fields happen to be declared in.
 */
const TIMELINE: Array<{ key: keyof OnboardingTimestamps; label: string }> = [
  { key: "invitedAt", label: "Invited" },
  { key: "firstOpenedAt", label: "Opened the link" },
  { key: "detailsSubmittedAt", label: "Submitted details" },
  { key: "partnershipAckAt", label: "Acknowledged the partnership" },
  { key: "agreementViewedAt", label: "Viewed the agreement" },
  { key: "signedAt", label: "Signed" },
  { key: "depositInitiatedAt", label: "Started the deposit" },
  { key: "depositPaidAt", label: "Paid the deposit" },
  { key: "accountCreatedAt", label: "Created a portal account" },
];

function Timeline({ timestamps }: { timestamps: OnboardingTimestamps }) {
  return (
    <ol className="px-5 py-4 space-y-2" data-testid="gym-timeline">
      {TIMELINE.map(({ key, label }) => {
        const at = timestamps[key];
        return (
          <li key={key} className="flex items-baseline gap-3 text-sm" data-testid={`timeline-${key}`}>
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${at ? "bg-green-500" : "bg-gray-300"}`}
              aria-hidden
            />
            <span className={at ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
              {formatIstDateTime(at)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Card({
  title,
  note,
  testId,
  children,
}: {
  title: string;
  note?: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white overflow-hidden" data-testid={testId}>
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function Fields({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-gray-100">{children}</dl>;
}

/**
 * One label/value pair.
 *
 * An empty string renders as an em dash rather than as nothing, because a row with no value is
 * information — "this gym has no FSSAI number" — and a row that collapses to whitespace looks
 * like a rendering bug. Optional fields on `GymDetails` arrive as `""`, not as null.
 */
function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  const shown = value === null || value.trim().length === 0 ? "—" : value;
  return (
    <div className="flex items-baseline justify-between gap-6 px-5 py-3">
      <dt className="text-sm text-muted-foreground flex-shrink-0">{label}</dt>
      <dd className={`text-sm text-foreground text-right break-words ${mono ? "font-mono text-xs" : ""}`}>
        {shown}
      </dd>
    </div>
  );
}

function Empty({ children, testId }: { children: React.ReactNode; testId: string }) {
  return (
    <p className="px-5 py-4 text-sm text-muted-foreground" data-testid={testId}>
      {children}
    </p>
  );
}
