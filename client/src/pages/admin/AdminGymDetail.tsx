"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchAdminGymView } from "@/lib/adminApi";
import type { AdminGymView } from "@shared/admin/gyms";
import type { OnboardingTimestamps } from "@shared/onboarding/types";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { Card, Empty, ErrorPanel, Field, Fields, Pill } from "./AdminUi";
import { AdminGymDashboard } from "./AdminGymDashboard";
import { AdminTermsEditor } from "./AdminTermsEditor";
import { AdminMachineEditor } from "./AdminMachineEditor";
import { AdminOffboardingSection } from "./AdminOffboardingSection";
import {
  DEPOSIT_CHOICE_LABEL,
  DEPOSIT_STATUS_LABEL,
  ENTITY_TYPE_LABEL,
  OFFBOARDING_STATE_LABEL,
  STATUS_CLASS,
  STATUS_LABEL,
  STEP_LABEL,
  formatCalendarDate,
  formatIstDateTime,
  formatPaiseAsInr,
} from "./adminFormat";

/**
 * One gym, completely — the screen that answers **"why is this gym stuck?"**, and now the screen
 * that unsticks it.
 *
 * That question is the whole design brief, and it is why this page is wide rather than a tidy
 * summary. Every partial answer sends whoever asked to the DynamoDB console, which is the state this
 * panel exists to leave (§2.7: *"the one that needs to be genuinely complete"*).
 *
 * ## What is not obvious
 *
 * 1. **The timeline shows every stage, including the ones that have not happened.** A blank
 *    `signedAt` beside a filled `agreementViewedAt` is the answer to the question; a timeline that
 *    only listed what did happen would make the gap invisible.
 * 2. **Schema failures are shown with their field paths.** The audience is us, and
 *    `terms.securityDepositInr: Required` is the entire answer to "what changed on the backend?" —
 *    better on screen than in a console nobody has open.
 * 3. **Every write re-reads the whole gym rather than patching local state.** `reload` is what each
 *    editor calls on success. The alternative is a page that agrees with its own last request
 *    instead of with the database: terminating changes `loginsDisabled` and the offboarding state,
 *    replacing a machine writes a second row in the history table, and both are server decisions.
 *    A re-read is one request on a screen nobody opens in a loop.
 * 4. **The section nav is anchors, not tabs.** Everything stays mounted and Cmd-F still finds it,
 *    which matters more here than tidiness: this page is read by someone who does not yet know
 *    which section holds the answer.
 *
 * The write actions live in their own components — `AdminTermsEditor`, `AdminMachineEditor`,
 * `AdminOffboardingSection` — because each carries a rule about *when* it may be used, and those
 * rules are the interesting part. `AdminGymDashboard` is the gym's own view, mirrored, blanks
 * included.
 *
 * Invite resend/void and activation remain read-only here.
 */

export default function AdminGymDetail({ gymId }: { gymId: string }) {
  const guard = useAdminGuard();
  const [gym, setGym] = useState<AdminGymView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [problem, setProblem] = useState<{ message: string; issues: string[] } | null>(null);

  const load = useCallback(async () => {
    const result = await fetchAdminGymView(gymId);
    if (result.ok) {
      setGym(result.data);
      setProblem(null);
    } else {
      setProblem({ message: result.error.message, issues: result.issues });
    }
  }, [gymId]);

  useEffect(() => {
    if (guard.state !== "ready") return;
    let cancelled = false;
    load().then(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [guard.state, load]);

  if (guard.state !== "ready") return <AdminChecking />;

  return (
    <AdminShell session={guard.session}>
      <Link
        href="/admin/gyms"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-5"
        data-testid="link-back-to-gyms"
      >
        <ArrowLeft className="w-3.5 h-3.5" aria-hidden />
        All gyms
      </Link>

      {isLoading && (
        <p className="text-sm text-muted-foreground" data-testid="gym-loading">
          Loading…
        </p>
      )}

      {problem && (
        <ErrorPanel
          message={problem.message}
          issues={problem.issues}
          testId="gym-error"
          issuesTestId="gym-issues"
        />
      )}

      {gym && <GymView gym={gym} onChanged={load} />}
    </AdminShell>
  );
}

const SECTIONS: Array<{ id: string; label: string }> = [
  { id: "progress", label: "Progress" },
  { id: "invite", label: "Link" },
  { id: "details", label: "Details" },
  { id: "terms", label: "Terms" },
  { id: "signature", label: "Signature" },
  { id: "deposit", label: "Deposit" },
  { id: "machine", label: "Machine" },
  { id: "activation", label: "Activation" },
  { id: "dashboard", label: "Dashboard" },
  { id: "offboarding", label: "Offboarding" },
];

function GymView({ gym, onChanged }: { gym: AdminGymView; onChanged: () => void }) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-1">
          <h1
            className="text-2xl font-display font-black text-foreground uppercase tracking-tight"
            data-testid="gym-heading"
          >
            {gym.details.tradeName || gym.details.legalEntityName || gym.slug}
          </h1>
          <Pill className={STATUS_CLASS[gym.status]} testId="gym-status">
            {STATUS_LABEL[gym.status]}
          </Pill>
        </div>
        <p className="text-sm text-muted-foreground">
          On step {gym.currentStep}: {STEP_LABEL[gym.currentStep]}
          {" · "}
          <span className="font-mono text-xs" data-testid="gym-id">
            {gym.gymId}
          </span>
        </p>
      </div>

      {/*
        At the top rather than only in its own section, because an admin who does not know the
        agreement has ended will spend the visit reading the onboarding sections as if it were live.
      */}
      {gym.offboarding && (
        <a
          href="#offboarding"
          className="block rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 hover:bg-red-100 transition-colors"
          data-testid="gym-ended"
        >
          <span className="font-semibold">
            Offboarding: {OFFBOARDING_STATE_LABEL[gym.offboarding.state].toLowerCase()}.
          </span>{" "}
          The onboarding sections below describe a relationship that is ending or over.
        </a>
      )}

      <nav
        className="sticky top-[3.4rem] z-10 -mx-1 flex gap-1 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 px-1.5 py-1.5 backdrop-blur supports-[backdrop-filter]:bg-white/80"
        aria-label="Sections of this gym"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-muted-foreground hover:bg-gray-100 hover:text-foreground transition-colors"
            data-testid={`jump-${section.id}`}
          >
            {section.label}
          </a>
        ))}
      </nav>

      <Card id="progress" title="Progress" testId="card-progress">
        {/*
          Every stage, including the empty ones — the gap is the diagnosis. `completedSteps` is
          shown alongside because the two can legitimately disagree: a timestamp records when
          something happened, `completedSteps` is what the server will let the gym do next.
        */}
        <Timeline timestamps={gym.timestamps} />
        <p className="px-4 sm:px-5 pb-4 text-xs text-muted-foreground">
          Steps completed: {gym.completedSteps.length > 0 ? gym.completedSteps.join(", ") : "none"}
        </p>
      </Card>

      <Card id="invite" title="Onboarding link" testId="card-invite">
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
            {gym.invite.revokedReason && <Field label="Reason" value={gym.invite.revokedReason} />}
            {gym.invite.supersededByTokenId && (
              <Field label="Superseded by" value={gym.invite.supersededByTokenId} mono />
            )}
          </Fields>
        ) : (
          <Empty testId="invite-none">
            No live link. Either none was issued or it was voided. Resending mints a new one.
          </Empty>
        )}
      </Card>

      <Card
        id="details"
        title="Details"
        testId="card-details"
        note={
          gym.details.legalEntityName === ""
            ? "Legal entity, entity type, GSTIN, both addresses and the signatory are pending. The gym hasn't reached step 1 of onboarding yet."
            : undefined
        }
      >
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

      <AdminTermsEditor gym={gym} onSaved={onChanged} />

      <Card id="signature" title="Signature" testId="card-signature">
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
            <p className="px-4 sm:px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Documents issued
            </p>
            <table className="w-full text-sm" data-testid="table-agreements">
              <tbody className="divide-y divide-gray-100">
                {gym.agreements.map((agreement) => (
                  <tr key={agreement.contentHash}>
                    <td className="px-4 sm:px-5 py-2.5 font-semibold">{agreement.version}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      Effective {formatCalendarDate(agreement.effectiveDate)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {agreement.contentHash.slice(0, 12)}… · {agreement.length} chars
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 text-muted-foreground whitespace-nowrap">
                      {agreement.viewedAt
                        ? `Viewed ${formatIstDateTime(agreement.viewedAt)}`
                        : "Not viewed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        id="deposit"
        title="Deposit"
        testId="card-deposit"
        note={gym.depositChoice ? DEPOSIT_CHOICE_LABEL[gym.depositChoice] : "No choice made yet"}
      >
        <Fields>
          <Field label="Status" value={DEPOSIT_STATUS_LABEL[gym.depositStatus]} />
        </Fields>

        {gym.depositWaiver && (
          <div
            className="mx-4 sm:mx-5 mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3"
            data-testid="deposit-waiver"
          >
            {/*
              A waived deposit and a deposit nobody chased look identical in `depositStatus`.
              This record is the difference, and it matters once the gym is already trading —
              which is why activation takes a reason and a name rather than a checkbox.
            */}
            <p className="text-xs font-semibold text-amber-800 mb-0.5">Deposit waived</p>
            <p className="text-xs text-amber-700">
              {gym.depositWaiver.reason}. By {gym.depositWaiver.byEmail},{" "}
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
                    <td className="px-4 sm:px-5 py-2.5 font-semibold">
                      {formatPaiseAsInr(deposit.amountPaise)}
                    </td>
                    <td className="px-4 py-2.5">{DEPOSIT_STATUS_LABEL[deposit.status]}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{deposit.method ?? "—"}</td>
                    {/* §2.7 asks for the link id by name: reconciling against Razorpay's own
                        dashboard is done on it, not on our deposit id. */}
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                      {deposit.receiptNo ?? deposit.linkId ?? deposit.depositId}
                    </td>
                    <td className="px-4 sm:px-5 py-2.5 text-muted-foreground whitespace-nowrap">
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

      <AdminMachineEditor gym={gym} onSaved={onChanged} />

      <Card id="activation" title="Activation" testId="card-activation">
        {gym.activatedAt ? (
          <Fields>
            <Field label="Activated" value={formatIstDateTime(gym.activatedAt)} />
            <Field label="By" value={gym.activatedByEmail} />
          </Fields>
        ) : (
          <Empty testId="activation-none">Not activated.</Empty>
        )}
      </Card>

      <AdminGymDashboard gym={gym} />

      <AdminOffboardingSection gym={gym} onSaved={onChanged} />
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
    <ol className="px-4 sm:px-5 py-4 space-y-2" data-testid="gym-timeline">
      {TIMELINE.map(({ key, label }) => {
        const at = timestamps[key];
        return (
          <li
            key={key}
            className="flex items-baseline gap-3 text-sm"
            data-testid={`timeline-${key}`}
          >
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
