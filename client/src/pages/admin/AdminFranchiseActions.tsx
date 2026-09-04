"use client";

import { useState } from "react";
import { useForm, type FieldPath, type FieldValues, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  FRANCHISE_REVIEW_STATUSES,
  adminFranchiseApproveFormSchema,
  adminFranchiseDeclineFormSchema,
  adminFranchiseHoldFormSchema,
  adminFranchiseRefuseFormSchema,
  adminFranchiseVerifyFormSchema,
  splitOutstanding,
  toAdminFranchiseApproveBody,
  toAdminFranchiseDeclineBody,
  toAdminFranchiseHoldBody,
  toAdminFranchiseRefuseBody,
  toAdminFranchiseVerifyBody,
  VERIFY_FIELD_FOR_WIRE,
  type AdminFranchiseApproveForm,
  type AdminFranchiseDeclineForm,
  type AdminFranchiseHoldForm,
  type AdminFranchiseRefuseForm,
  type AdminFranchiseVerifyForm,
} from "@shared/admin/franchiseWrites";
import type { AdminFranchisePayment, AdminFranchiseView } from "@shared/admin/franchises";
import { FRANCHISE_TIERS } from "@shared/franchise/program";
import { franchiseTerritoryGrantDraft } from "@shared/franchise/onboarding/schema";
import {
  decideFranchise,
  refuseFranchisePayment,
  verifyFranchisePayment,
} from "@/lib/adminFranchiseApi";
import { Card, Empty, ErrorPanel, Field, Fields, Pill, Subhead, SuccessPanel } from "./AdminUi";
import { AreaField, NumberField, SelectField, TextField } from "./adminFields";
import { formatCalendarDate, formatIstDateTime, formatPaiseExact } from "./adminFormat";
import {
  APPROVAL_OUTCOME_LABEL,
  FRANCHISE_PAYMENT_STATE_CLASS,
  FRANCHISE_PAYMENT_STATE_LABEL,
  franchiseTierLabel,
} from "./adminFranchiseFormat";

/**
 * The two things an admin *does* to a franchise: decide step 4, and confirm step 8.
 *
 * They are one file because they are one fact about this flow. Every other step is the franchisee's,
 * and these two are the reason a franchise can sit still for a week with nobody at fault — the
 * wizard cannot complete either, by design (`FranchiseOnboardingApi`: *"a franchisee cannot complete
 * a step whose completion is our assertion"*).
 *
 * ## A button appears only when the server would accept it
 *
 * `AdminOffboardingSection`'s rule, for the same reason: the alternative is a button whose only
 * possible answer is a 409. The precondition is a stored status, so the server still enforces it and
 * this only decides what to offer.
 *
 * ## Nothing is prefilled from the proposal
 *
 * The granted territory arrives blank even when a proposal is on file. §3's case is granting three
 * suburbs of five, and a field holding what was asked for is a grant nobody made the moment somebody
 * clicks past it. There is a copy button instead, which is a decision rather than a default.
 */

export function FranchiseDecisionSection({
  franchise,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<Outcome | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const decidable = FRANCHISE_REVIEW_STATUSES.includes(franchise.status);
  const { territory, approval } = franchise;

  function done(message: string) {
    setSaved(message);
    setOpen(null);
    onSaved();
  }

  const forms: Record<Outcome, React.ReactNode> = {
    approved: (
      <ApproveForm franchise={franchise} onCancel={() => setOpen(null)} onSaved={done} />
    ),
    on_hold: <HoldForm franchise={franchise} onCancel={() => setOpen(null)} onSaved={done} />,
    declined: <DeclineForm franchise={franchise} onCancel={() => setOpen(null)} onSaved={done} />,
  };

  return (
    <Card
      id="decision"
      title="Territory and decision"
      note="Step 4 is ours. The franchisee cannot move past it."
      testId="card-decision"
      action={
        approval && (
          <Pill
            className={
              approval.outcome === "approved"
                ? "bg-green-50 text-green-700"
                : approval.outcome === "declined"
                  ? "bg-red-50 text-red-700"
                  : "bg-orange-50 text-orange-700"
            }
            testId="decision-outcome"
          >
            {APPROVAL_OUTCOME_LABEL[approval.outcome]}
          </Pill>
        )
      }
    >
      {saved && (
        <div className="px-4 sm:px-5 pt-4">
          <SuccessPanel testId="decision-saved">{saved}</SuccessPanel>
        </div>
      )}

      {territory ? (
        <Fields>
          <Field label="Tier proposed" value={franchiseTierLabel(territory.tier)} />
          {territory.proposedDistricts.length > 0 ? (
            <>
              <Field label="State proposed" value={territory.proposedState} />
              <Field
                label={
                  territory.proposedDistricts.length === 1
                    ? "District proposed"
                    : "Districts proposed"
                }
                value={territory.proposedDistricts.join(", ")}
                testId="territory-districts"
              />
            </>
          ) : (
            <Field label="Territory proposed" value={territory.proposedTerritory} />
          )}
          {territory.proposedPincodes.length > 0 && (
            <Field
              label="Pin codes"
              hint="They want part of a district, not all of it"
              value={territory.proposedPincodes.join(", ")}
              mono
              testId="territory-pincodes"
            />
          )}
          <Field
            label="Notes on the area"
            hint="Whatever the districts left unsaid"
            value={territory.proposedBoundary}
          />
          <Field label="Existing relationships" value={territory.existingRelationships} />
          <Field label="Proposed" value={formatIstDateTime(territory.submittedAt)} />
        </Fields>
      ) : (
        <Empty testId="territory-none">
          No territory proposed yet. Step 2 is where this comes from.
        </Empty>
      )}

      {/*
        Proposal and grant are two blocks rather than one, because the difference between them is the
        substance of the decision: three suburbs of five is invisible in a shape that shows only what
        was granted.
      */}
      {territory?.grantedAt && (
        <>
          <Subhead>Granted</Subhead>
          <Fields>
            <Field
              label="Tier"
              value={territory.grantedTier ? franchiseTierLabel(territory.grantedTier) : null}
            />
            <Field label="Territory" value={territory.grantedTerritory} />
            <Field label="Boundary" value={territory.grantedBoundary} />
            <Field
              label="Excluded"
              value={territory.grantedExclusions}
              hint="Carved out of the grant"
            />
            <Field label="Granted" value={formatIstDateTime(territory.grantedAt)} />
          </Fields>
        </>
      )}

      {approval && (
        <>
          {/* Its own heading, because without one "Decided by" reads as part of the grant above it. */}
          <Subhead>Decision</Subhead>
          <Fields>
            <Field label="Decided" value={formatIstDateTime(approval.decidedAt)} />
            <Field label="Decided by" value={approval.decidedByEmail} />
            {approval.approvedAt && (
              <Field
                label="Approved"
                value={formatIstDateTime(approval.approvedAt)}
                hint="The freeze point step 2 reads"
              />
            )}
            <Field
              label="Internal note"
              hint="Ours. The franchisee never sees this."
              value={approval.internalReason}
              testId="decision-internal-note"
            />
          </Fields>
        </>
      )}

      {open ? (
        forms[open]
      ) : decidable ? (
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3.5 flex flex-wrap gap-2.5">
          <Button
            size="sm"
            onClick={() => setOpen("approved")}
            className="h-9 rounded-xl cursor-pointer font-bold"
            data-testid="button-open-approve"
          >
            Approve a territory
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen("on_hold")}
            className="h-9 rounded-xl cursor-pointer"
            data-testid="button-open-hold"
          >
            Put on hold
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen("declined")}
            className="h-9 rounded-xl cursor-pointer border-red-200 text-red-700 hover:bg-red-50"
            data-testid="button-open-decline"
          >
            Decline
          </Button>
        </div>
      ) : (
        <p
          className="border-t border-gray-100 px-4 sm:px-5 py-3.5 text-xs text-muted-foreground leading-relaxed"
          data-testid="decision-unavailable"
        >
          {franchise.status === "on_hold"
            ? "On hold. When they send what is outstanding, this becomes a decision again."
            : franchise.status === "declined"
              ? "Declined, and that is terminal. Nothing here can reopen it."
              : approval
                ? "Already decided. This panel does not revisit a decision."
                : "Nothing to decide yet. There is no decision until KYC is in."}
        </p>
      )}
    </Card>
  );
}

type Outcome = "approved" | "on_hold" | "declined";

const TIER_OPTIONS = [
  { value: "", label: "Keep the tier they proposed" },
  ...FRANCHISE_TIERS.map((tier) => ({ value: tier.id, label: tier.shortName })),
];

function ApproveForm({
  franchise,
  onCancel,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminFranchiseApproveForm>({
    resolver: zodResolver(adminFranchiseApproveFormSchema),
    defaultValues: {
      grantedTerritory: "",
      grantedBoundary: "",
      grantedExclusions: "",
      grantedTier: "",
      internalReason: "",
    },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const proposal = franchise.territory;

  function copyProposal() {
    if (!proposal) return;
    form.setValue("grantedTerritory", proposal.proposedTerritory, { shouldValidate: true });
    // The districts written out as the sentence a grant needs. Still theirs to edit before saving.
    form.setValue("grantedBoundary", franchiseTerritoryGrantDraft(proposal), {
      shouldValidate: true,
    });
  }

  async function onSubmit(values: AdminFranchiseApproveForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await decideFranchise(
        franchise.franchiseId,
        toAdminFranchiseApproveBody(values),
      );
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      onSaved("Approved. Step 5 is open to them, and the term sheet will render this territory.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <FormFrame
        problem={problem}
        isSaving={isSaving}
        onSubmit={form.handleSubmit(onSubmit)}
        onCancel={onCancel}
        submitLabel="Approve"
        testId="approve"
        warning="The territory is granted exactly as written here, not as it was proposed. This is the text the term sheet renders and the grant we are bound to."
      >
        {proposal && proposal.proposedTerritory !== "" && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              They asked for{" "}
              <span className="font-semibold text-foreground">{proposal.proposedTerritory}</span>.
              The fields below start blank on purpose. Granting less than was asked for is the
              ordinary case, so copying the proposal is a click rather than a default.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyProposal}
              className="mt-2.5 h-8 rounded-xl cursor-pointer"
              data-testid="button-copy-proposal"
            >
              <ClipboardCopy className="w-3.5 h-3.5" aria-hidden />
              Copy the proposal
            </Button>
          </div>
        )}

        <AreaField
          control={form.control}
          name="grantedTerritory"
          label="Territory granted"
          rows={2}
          placeholder="North Bengaluru: Hebbal, Yelahanka, Jakkur"
        />
        <AreaField
          control={form.control}
          name="grantedBoundary"
          label="Boundary"
          rows={3}
          description="How far it runs, in words. Rendered into the term sheet as written."
        />
        <AreaField
          control={form.control}
          name="grantedExclusions"
          label="Excluded from the grant"
          rows={2}
          description="Leave blank if nothing is carved out. Blank is a real answer here."
        />
        <SelectField
          control={form.control}
          name="grantedTier"
          label="Tier granted"
          options={TIER_OPTIONS}
          description="Changing this changes the investment and the machine allocation on the terms."
        />
        <AreaField
          control={form.control}
          name="internalReason"
          label="Internal note"
          rows={3}
          description="Ours alone. Write what the next person needs when the franchisee asks why the territory came back smaller."
        />
      </FormFrame>
    </Form>
  );
}

function HoldForm({
  franchise,
  onCancel,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminFranchiseHoldForm>({
    resolver: zodResolver(adminFranchiseHoldFormSchema),
    defaultValues: { outstanding: "", contactName: "", internalReason: "" },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const items = splitOutstanding(form.watch("outstanding") ?? "");

  async function onSubmit(values: AdminFranchiseHoldForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await decideFranchise(franchise.franchiseId, toAdminFranchiseHoldBody(values));
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      onSaved(
        `On hold, with ${items.length} ${items.length === 1 ? "item" : "items"} outstanding. They can see the list.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <FormFrame
        problem={problem}
        isSaving={isSaving}
        onSubmit={form.handleSubmit(onSubmit)}
        onCancel={onCancel}
        submitLabel="Put on hold"
        testId="hold"
        warning="A hold is not a refusal. The franchisee reads this list on their own screen and can send what is missing, which brings the decision back here."
      >
        <AreaField
          control={form.control}
          name="outstanding"
          label="What is outstanding"
          rows={4}
          placeholder={"Bank statements for the last six months\nA clearer scan of the signatory's PAN"}
          description="One per line, in their terms rather than ours. Shown to them verbatim."
        />
        {items.length > 0 && (
          <p className="text-xs text-muted-foreground" data-testid="outstanding-count">
            {items.length} {items.length === 1 ? "item" : "items"} will be listed on their screen.
          </p>
        )}
        <TextField
          control={form.control}
          name="contactName"
          label="Who is in touch"
          placeholder="Priya from partnerships"
          description="So their screen is not a dead end."
        />
        <AreaField
          control={form.control}
          name="internalReason"
          label="Internal note"
          rows={3}
          description="Ours alone, and not the same as the list above. Say what actually worries us."
        />
      </FormFrame>
    </Form>
  );
}

function DeclineForm({
  franchise,
  onCancel,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminFranchiseDeclineForm>({
    resolver: zodResolver(adminFranchiseDeclineFormSchema),
    defaultValues: { internalReason: "" },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function onSubmit(values: AdminFranchiseDeclineForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await decideFranchise(
        franchise.franchiseId,
        toAdminFranchiseDeclineBody(values),
      );
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      onSaved("Declined. Their screen says so and gives no reason.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <FormFrame
        problem={problem}
        isSaving={isSaving}
        onSubmit={form.handleSubmit(onSubmit)}
        onCancel={onCancel}
        submitLabel="Decline"
        testId="decline"
        warning="Declining is the end. It cannot be undone from this panel, the franchisee is shown no reason at all, and their link stops being useful. Put them on hold instead if there is any chance of a yes."
      >
        <AreaField
          control={form.control}
          name="internalReason"
          label="Internal note"
          rows={3}
          description="Ours alone, and the only record of why. Territory availability is often the real reason and is not ours to publish."
        />
      </FormFrame>
    </Form>
  );
}

// ── Step 8 ──────────────────────────────────────────────────────────────────

/**
 * The instalments, and the bank check that completes step 8.
 *
 * A claim is the franchisee typing a UTR into a form, and it is not money. Everything on this card
 * is arranged around that gap: the claimed figure, the expected figure and the figure that actually
 * arrived are three separate numbers, rendered to the paise because they are read against a bank
 * statement rather than skimmed.
 */
export function FranchiseInstalmentsSection({
  franchise,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<{ instalmentNo: number; action: "verify" | "refuse" } | null>(
    null,
  );
  const [saved, setSaved] = useState<string | null>(null);

  function done(message: string) {
    setSaved(message);
    setOpen(null);
    onSaved();
  }

  return (
    <Card
      id="instalments"
      title="Instalments"
      note="Bank transfer, confirmed by us. Nothing in this service moves money."
      testId="card-instalments"
    >
      {saved && (
        <div className="px-4 sm:px-5 pt-4">
          <SuccessPanel testId="instalment-saved">{saved}</SuccessPanel>
        </div>
      )}

      {franchise.payments.length === 0 ? (
        <Empty testId="instalments-none">
          No instalment yet. The first one is created when the term sheet is signed.
        </Empty>
      ) : (
        franchise.payments.map((payment) => (
          <Instalment
            key={payment.instalmentNo}
            franchise={franchise}
            payment={payment}
            open={open?.instalmentNo === payment.instalmentNo ? open.action : null}
            onOpen={(action) => setOpen({ instalmentNo: payment.instalmentNo, action })}
            onCancel={() => setOpen(null)}
            onSaved={done}
          />
        ))
      )}
    </Card>
  );
}

function Instalment({
  franchise,
  payment,
  open,
  onOpen,
  onCancel,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  payment: AdminFranchisePayment;
  open: "verify" | "refuse" | null;
  onOpen: (action: "verify" | "refuse") => void;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const claim = payment.claim;

  return (
    <div className="border-t border-gray-100 first:border-t-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 sm:px-5 pt-4 pb-1">
        <p className="text-sm font-semibold text-foreground">Instalment {payment.instalmentNo}</p>
        <Pill
          className={FRANCHISE_PAYMENT_STATE_CLASS[payment.state]}
          testId={`payment-state-${payment.instalmentNo}`}
        >
          {FRANCHISE_PAYMENT_STATE_LABEL[payment.state]}
        </Pill>
      </div>

      <Fields>
        <Field
          label="Expected"
          value={formatPaiseExact(payment.expectedPaise)}
          testId={`payment-expected-${payment.instalmentNo}`}
        />
        <Field
          label="Reference"
          value={payment.reference}
          mono
          hint="What they were told to quote on the transfer"
        />
        {claim ? (
          <>
            <Field label="UTR they gave" value={claim.utr} mono />
            {/* The same arithmetic as the confirmed figure below, said here too: this is the number
                on screen when somebody decides whether to confirm, and a 590-rupee shortfall is
                invisible if it has to be worked out against a row two lines up. */}
            <Field
              label="Claimed"
              value={formatPaiseExact(claim.amountPaise)}
              hint={differenceHint(claim.amountPaise, payment.expectedPaise)}
            />
            <Field label="Paid on" value={formatCalendarDate(claim.paidOn)} hint="Their date" />
            <Field label="Claimed at" value={formatIstDateTime(claim.claimedAt)} />
            {/* Only when there is one. Step 8 stopped asking for a proof, so on every claim made
                since then this row would say "No" and read as a franchisee who skipped something. */}
            {claim.proofDocId && <Field label="Proof attached" value="Yes, under documents" />}
          </>
        ) : null}
        {payment.receivedPaise !== null && (
          <Field
            label="Received"
            value={formatPaiseExact(payment.receivedPaise)}
            hint={differenceHint(payment.receivedPaise, payment.expectedPaise)}
            testId={`payment-received-${payment.instalmentNo}`}
          />
        )}
        {payment.verifiedAt && (
          <Field
            label="Confirmed"
            value={formatIstDateTime(payment.verifiedAt)}
            hint={payment.verifiedByEmail ?? undefined}
          />
        )}
        {payment.rejectedAt && (
          <>
            <Field label="Refused" value={formatIstDateTime(payment.rejectedAt)} />
            <Field
              label="Reason given"
              hint="Shown to the franchisee verbatim"
              value={payment.reason}
              testId={`payment-reason-${payment.instalmentNo}`}
            />
          </>
        )}
      </Fields>

      {open === "verify" ? (
        <VerifyForm
          franchise={franchise}
          payment={payment}
          onCancel={onCancel}
          onSaved={onSaved}
        />
      ) : open === "refuse" ? (
        <RefuseForm
          franchise={franchise}
          payment={payment}
          onCancel={onCancel}
          onSaved={onSaved}
        />
      ) : payment.state === "verified" ? (
        <p
          className="px-4 sm:px-5 pb-4 text-xs text-muted-foreground"
          data-testid={`payment-done-${payment.instalmentNo}`}
        >
          Confirmed. Step 8 is complete and this panel cannot unwind it.
        </p>
      ) : !claim ? (
        <p
          className="px-4 sm:px-5 pb-4 text-xs text-muted-foreground"
          data-testid={`payment-unclaimed-${payment.instalmentNo}`}
        >
          Nothing claimed yet. There is nothing to check against the bank until they tell us they
          have sent it.
        </p>
      ) : (
        <div className="px-4 sm:px-5 pb-4 flex flex-wrap gap-2.5">
          <Button
            size="sm"
            onClick={() => onOpen("verify")}
            className="h-9 rounded-xl cursor-pointer font-bold"
            data-testid={`button-open-verify-${payment.instalmentNo}`}
          >
            Confirm the transfer
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpen("refuse")}
            className="h-9 rounded-xl cursor-pointer border-red-200 text-red-700 hover:bg-red-50"
            data-testid={`button-open-refuse-${payment.instalmentNo}`}
          >
            Refuse the claim
          </Button>
        </div>
      )}
    </div>
  );
}

/** "₹1,180 short of the expected figure", or nothing when the two agree. */
function differenceHint(amountPaise: number, expectedPaise: number): string {
  const difference = amountPaise - expectedPaise;
  if (difference === 0) return "Exactly as expected";
  return difference < 0
    ? `${formatPaiseExact(-difference)} short of the expected figure`
    : `${formatPaiseExact(difference)} more than expected`;
}

function VerifyForm({
  franchise,
  payment,
  onCancel,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  payment: AdminFranchisePayment;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminFranchiseVerifyForm>({
    resolver: zodResolver(adminFranchiseVerifyFormSchema),
    // The expected figure, because it is right most of the time and the interesting case is the
    // admin changing it. Rounded to rupees: the field takes whole rupees only.
    defaultValues: { receivedInr: Math.round(payment.expectedPaise / 100) },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const typed = form.watch("receivedInr");
  const difference =
    typeof typed === "number" && Number.isFinite(typed) ? typed * 100 - payment.expectedPaise : 0;

  async function onSubmit(values: AdminFranchiseVerifyForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await verifyFranchisePayment(
        franchise.franchiseId,
        payment.instalmentNo,
        toAdminFranchiseVerifyBody(values),
      );
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors, VERIFY_FIELD_FOR_WIRE);
        setProblem(result.error.message);
        return;
      }
      onSaved("Confirmed. Step 8 is complete, and step 9 is open to them.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <FormFrame
        problem={problem}
        isSaving={isSaving}
        onSubmit={form.handleSubmit(onSubmit)}
        onCancel={onCancel}
        submitLabel="Confirm the transfer"
        testId="verify"
        warning="Confirm this only against the bank statement, not against the UTR they typed. It completes step 8 and cannot be unwound from this panel."
      >
        <NumberField
          control={form.control}
          name="receivedInr"
          label="Amount that arrived"
          prefix="₹"
          description="What the statement shows, in whole rupees. Not what they claimed, and not what we expected."
        />
        {difference !== 0 && (
          <p
            className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
            data-testid="verify-difference"
          >
            {difference < 0
              ? `${formatPaiseExact(-difference)} short of the expected ${formatPaiseExact(payment.expectedPaise)}. A shortfall of a few hundred rupees is usually the sending bank's charges. Recording it is not the same as waiving it.`
              : `${formatPaiseExact(difference)} more than the expected ${formatPaiseExact(payment.expectedPaise)}. Check the digits before confirming.`}
          </p>
        )}
      </FormFrame>
    </Form>
  );
}

function RefuseForm({
  franchise,
  payment,
  onCancel,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  payment: AdminFranchisePayment;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminFranchiseRefuseForm>({
    resolver: zodResolver(adminFranchiseRefuseFormSchema),
    defaultValues: { reason: "" },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function onSubmit(values: AdminFranchiseRefuseForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await refuseFranchisePayment(
        franchise.franchiseId,
        payment.instalmentNo,
        toAdminFranchiseRefuseBody(values),
      );
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      onSaved("Claim refused. They can send us a corrected one.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <FormFrame
        problem={problem}
        isSaving={isSaving}
        onSubmit={form.handleSubmit(onSubmit)}
        onCancel={onCancel}
        submitLabel="Refuse the claim"
        testId="refuse"
        warning="This does not move the franchise backwards. It returns them to the claim form with your reason on it, so write something they can act on."
      >
        <AreaField
          control={form.control}
          name="reason"
          label="Why"
          rows={3}
          placeholder="We could not find that UTR on our statement for 14 August. Please check the reference and send us the bank's receipt."
          description="The one reason on this screen the franchisee reads. It is about the transfer, not about them."
        />
      </FormFrame>
    </Form>
  );
}

// ── Shared bits ─────────────────────────────────────────────────────────────

function FormFrame({
  children,
  warning,
  problem,
  submitLabel,
  isSaving,
  onSubmit,
  onCancel,
  testId,
}: {
  children: React.ReactNode;
  warning: string;
  problem: string | null;
  submitLabel: string;
  isSaving: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  testId: string;
}) {
  return (
    <form onSubmit={onSubmit} className="border-t border-gray-100 p-4 sm:p-5 space-y-4">
      {problem && <ErrorPanel message={problem} testId={`${testId}-error`} />}
      {children}
      <p className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 leading-relaxed">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
        <span>{warning}</span>
      </p>
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={isSaving}
          className="h-10 px-5 rounded-xl font-bold text-sm cursor-pointer"
          data-testid={`button-save-${testId}`}
        >
          {isSaving ? "Recording…" : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-10 px-5 rounded-xl cursor-pointer"
          data-testid={`button-cancel-${testId}`}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Server `fieldErrors` onto the form.
 *
 * `AdminOffboardingSection`'s helper plus a rename map, because two of these wire fields are named
 * in paise and the forms are in rupees. A key that names nothing is dropped rather than invented;
 * the message still shows in the panel above.
 */
function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors: Record<string, string> | undefined,
  rename: Record<string, string> = {},
) {
  if (!fieldErrors) return;
  for (const [field, message] of Object.entries(fieldErrors)) {
    form.setError((rename[field] ?? field) as FieldPath<T>, { message });
  }
}
