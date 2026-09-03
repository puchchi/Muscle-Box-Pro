"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Loader2,
  Paperclip,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ALLOWED_DOCUMENT_CONTENT_TYPES,
  MAX_DOCUMENT_BYTES,
  paymentClaimSchema,
} from "@shared/franchise/onboarding/schema";
import { formatInr } from "@shared/franchise/program";
import type {
  PaymentClaimInput,
  PaymentInstructions,
} from "@shared/franchise/onboarding/types";
import { formatIstDate } from "../../../gym/istDates";
import {
  ErrorSummary,
  Field,
  Form,
  Section,
  SubmitBar,
  useServerFieldErrors,
} from "../formKit";
import { useFranchiseDraftAutosave } from "../useFranchiseDraftAutosave";
import { useBackgroundPoll } from "../useBackgroundPoll";
import type { FranchiseStepViewProps } from "../types";

/**
 * Step 8 — The first instalment.
 *
 * A bank transfer we verify by hand, not a gateway. That was decided rather than defaulted:
 * ₹12,50,000 through a card gateway costs a percentage of ₹12,50,000 in fees for a payment that
 * settles perfectly well over NEFT, and a franchisee's bank will often refuse the amount anyway.
 * What it costs us is that nothing on this screen can confirm the money. An admin reads a
 * statement, and until they do, this step is a wait (§7.2, §7.3).
 *
 * Four states, and the distinction that matters is between the last two.
 *
 * *Instructions and a claim form.* Where to send it, what reference to put on it, and a box for
 * the UTR afterwards.
 *
 * *Claimed, with us.* Polled, because the thing that moves this step is an admin elsewhere. The
 * poll stops and says it has stopped rather than pretending to watch all afternoon.
 *
 * *Refused.* The claim did not match our statement. The form reopens with what they told us
 * still in it, because the usual cause is a mistyped UTR and retyping the rest is punishment for
 * our not being able to find it.
 *
 * *Verified.* What we actually received, which is **not** what they claimed. A shortfall is shown
 * as a shortfall, since a bank that deducted charges is the common case and a screen that rounds
 * it away leaves a franchisee thinking they are square with us when the record says otherwise.
 *
 * **The bank details come from `getPaymentInstructions`, not from `getState`.** They are needed on
 * one screen out of nine, and keeping them off every other state response keeps our account
 * number out of eight screens' worth of caches and logs.
 */

/**
 * One cadence, unlike step 7's two. There is no return trip to be straight back from: the event
 * this waits for is a person opening a bank statement, so five minutes of asking at a walk is the
 * honest amount, and then it says so and offers the email instead.
 */
const WATCH = { intervalMs: 10_000, maxPolls: 30 };

const FIELD_LABELS: Record<keyof PaymentClaimInput, string> = {
  utr: "UTR or reference",
  amountPaise: "Amount transferred",
  paidOn: "Date of transfer",
  proofDocId: "Transfer proof",
};

export default function StepInstalment({
  handle,
  state,
  isSubmitting,
  fieldErrors,
  goToStep,
  actions,
}: FranchiseStepViewProps) {
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [watching, setWatching] = useState(true);

  const payment = state.payments.find((p) => p.instalment === 1) ?? null;
  const isVerified = payment?.verifiedAt != null;
  const awaitingVerification = payment?.claim != null && !isVerified && payment.refusal == null;

  useEffect(() => {
    let cancelled = false;
    void actions.loadPaymentInstructions().then((loaded) => {
      if (!cancelled && loaded) setInstructions(loaded);
    });
    return () => {
      cancelled = true;
    };
    // Once per mount. `actions` is rebuilt on every render, and this is a read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onExhausted = useCallback(() => setWatching(false), []);
  useBackgroundPoll(awaitingVerification && watching, actions.refreshPaymentStatus, {
    ...WATCH,
    onExhausted,
  });

  const expectedPaise = payment?.expectedPaise ?? instructions?.expectedPaise ?? null;

  if (isVerified && payment) {
    return (
      <VerifiedPanel
        receivedPaise={payment.receivedPaise}
        expectedPaise={payment.expectedPaise}
        verifiedAt={payment.verifiedAt as string}
        canCarryOn={state.currentStep > 8}
        onCarryOn={() => goToStep(state.currentStep)}
      />
    );
  }

  if (awaitingVerification && payment?.claim) {
    return (
      <ClaimedPanel
        utr={payment.claim.utr}
        paidOn={payment.claim.paidOn}
        amountPaise={payment.claim.amountPaise}
        email={state.details.noticesEmail}
        watching={watching}
      />
    );
  }

  return (
    <div className="space-y-6">
      {payment?.refusal && <RefusalPanel refusal={payment.refusal} />}

      <InstructionsPanel instructions={instructions} expectedPaise={expectedPaise} />

      <ClaimForm
        handle={handle}
        state={state}
        expectedPaise={expectedPaise}
        isSubmitting={isSubmitting}
        fieldErrors={fieldErrors}
        actions={actions}
      />
    </div>
  );
}

// ── The instructions ────────────────────────────────────────────────────────

/**
 * Where to send the money.
 *
 * The reference is given the same weight as the account number, because it is what turns
 * reconciliation from an admin matching a name against a list of applicants into a lookup. A
 * transfer that arrives without it is a transfer we may take days to find (§7.2).
 */
function InstructionsPanel({
  instructions,
  expectedPaise,
}: {
  instructions: PaymentInstructions | null;
  expectedPaise: number | null;
}) {
  if (!instructions) {
    return (
      <section
        className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"
        role="status"
        data-testid="payment-instructions-loading"
      >
        <p className="text-sm text-muted-foreground">Getting your transfer details...</p>
      </section>
    );
  }

  const { bankAccount, reference } = instructions;

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 space-y-4"
      data-testid="payment-instructions"
    >
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-1">
          Amount due now
        </p>
        <p className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
          {expectedPaise !== null ? formatInr(expectedPaise / 100) : "—"}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-1.5">
          By NEFT, RTGS or IMPS. Not a card payment.
        </p>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3.5 py-3">
        <CopyRow label="Payment reference" value={reference} testId="payment-reference" />
        <p className="text-xs text-muted-foreground leading-relaxed mt-2">
          Put this in the narration or remarks field. Without it, a transfer can take days to match
          to you.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Building2 className="w-3 h-3" aria-hidden="true" />
          Our account
        </p>
        <CopyRow label="Account name" value={bankAccount.accountName} testId="bank-account-name" />
        <CopyRow label="Account number" value={bankAccount.accountNumber} testId="bank-account-number" />
        <CopyRow label="IFSC" value={bankAccount.ifsc} testId="bank-ifsc" />
        <CopyRow label="Bank" value={bankAccount.bankName} testId="bank-name" />
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        We never change these details by email or over the phone. If anyone asks you to send this
        money anywhere else, it is not us.
      </p>
    </section>
  );
}

/**
 * A detail with a copy button.
 *
 * Worth the code on this screen specifically: an account number and an IFSC retyped into a
 * banking app is where a ₹12,50,000 transfer goes to the wrong place, and a copy button removes
 * the retyping. The value stays selectable text so a browser without clipboard permission is no
 * worse off than before.
 */
function CopyRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground break-all" data-testid={testId}>
          {value}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={() => void copy()}
        className="min-h-11 w-11 rounded-lg flex-shrink-0 text-muted-foreground cursor-pointer"
        data-testid={`button-copy-${testId}`}
      >
        {copied ? (
          <Check className="w-4 h-4 text-primary-ink" aria-hidden="true" />
        ) : (
          <Copy className="w-4 h-4" aria-hidden="true" />
        )}
        <span className="sr-only">{copied ? `${label} copied` : `Copy ${label}`}</span>
      </Button>
    </div>
  );
}

// ── The claim ───────────────────────────────────────────────────────────────

/**
 * What they transferred, in their words.
 *
 * Every field here is a claim and none of it is evidence, which is why the amount is collected
 * at all rather than assumed from `expectedPaise`: the number that matters is what we receive,
 * and asking gives an admin something to reconcile against instead of a number we filled in
 * ourselves. It is prefilled with the amount due, because that is what it usually is.
 *
 * The UTR box is permissive on purpose. Banks format references differently and a regex tuned to
 * one of them rejects real transfers, so the check is "looks like a bank reference" and the real
 * validation is an admin finding it on a statement.
 */
function ClaimForm({
  handle,
  state,
  expectedPaise,
  isSubmitting,
  fieldErrors,
  actions,
}: Pick<FranchiseStepViewProps, "handle" | "state" | "isSubmitting" | "fieldErrors" | "actions"> & {
  expectedPaise: number | null;
}) {
  const existing = state.payments.find((p) => p.instalment === 1)?.claim ?? null;
  const proof = state.documents.find((doc) => doc.docType === "payment_proof") ?? null;

  const form = useForm<PaymentClaimInput>({
    resolver: zodResolver(paymentClaimSchema),
    defaultValues: {
      utr: existing?.utr ?? "",
      amountPaise: existing?.amountPaise ?? expectedPaise ?? Number.NaN,
      paidOn: existing?.paidOn ?? "",
      proofDocId: existing?.proofDocId ?? null,
      ...(state.drafts.paymentClaim ?? {}),
    },
    mode: "onBlur",
  });

  const values = form.watch();
  const draft = useFranchiseDraftAutosave(handle, "paymentClaim", values);

  useServerFieldErrors(form, fieldErrors, (field) => field in FIELD_LABELS);

  // The amount due can arrive after this form mounts, since the bank details are a separate
  // call. Prefilled only while the box is still empty, so it cannot overwrite a real figure.
  useEffect(() => {
    if (expectedPaise === null) return;
    if (!Number.isNaN(form.getValues("amountPaise"))) return;
    form.setValue("amountPaise", expectedPaise);
  }, [expectedPaise, form]);

  // The document is uploaded before the claim is submitted, so the id it produced is what the
  // claim has to carry. Kept in sync here rather than at the upload, because a proof removed
  // between two submits would otherwise leave a dead id on the claim.
  useEffect(() => {
    const current = form.getValues("proofDocId");
    const next = proof?.docId ?? null;
    if (current !== next) form.setValue("proofDocId", next);
  }, [proof, form]);

  async function onSubmit(claim: PaymentClaimInput) {
    await draft.flush();
    await actions.claimPayment(claim);
  }

  const { errors, submitCount } = form.formState;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        <ErrorSummary
          errors={errors}
          submitCount={submitCount}
          labels={FIELD_LABELS}
          onGoToField={(name) => form.setFocus(name)}
        />

        <Section title="Tell us about the transfer">
          <Field
            form={form}
            name="utr"
            label="UTR or reference"
            placeholder="SBIN123456789012"
            uppercase
            description="Your bank's reference for the transfer. Called UTR, RRN or transaction reference on most statements."
          />
          <Field
            form={form}
            name="amountPaise"
            label="Amount transferred"
            rupees
            placeholder={expectedPaise !== null ? String(expectedPaise / 100) : "1250000"}
            description="In rupees, as it left your account. The real figure, if your bank deducted charges."
          />
          <Field
            form={form}
            name="paidOn"
            label="Date of transfer"
            type="date"
            max={today}
            description="The date on your statement, not the date it reaches us."
          />
        </Section>

        <Section title="Proof of the transfer">
          <ProofUpload
            fileName={proof?.fileName ?? null}
            sizeBytes={proof?.sizeBytes ?? null}
            error={fieldErrors?.payment_proof ?? null}
            onUpload={(file) =>
              actions.uploadDocument({ docType: "payment_proof", fileName: file.name, file })
            }
            onRemove={() => (proof ? actions.removeDocument(proof.docId) : Promise.resolve(false))}
          />
        </Section>

        <SubmitBar
          nextHint="We check this against our bank statement, usually within a working day. Nothing else waits on it."
          draftStatus={draft.status}
          isSubmitting={isSubmitting}
          label="I've made the transfer"
          busyLabel="Sending..."
        />
      </form>
    </Form>
  );
}

/**
 * One optional file.
 *
 * `StepDocuments`' row without the list around it: the same local type and size checks so a bad
 * file is refused before it is uploaded rather than after, and the same rule that a held file
 * shows its name and never a link, because this handle travels in a URL.
 */
function ProofUpload({
  fileName,
  sizeBytes,
  error,
  onUpload,
  onRemove,
}: {
  fileName: string | null;
  sizeBytes: number | null;
  error: string | null;
  onUpload(file: File): Promise<boolean>;
  onRemove(): Promise<boolean>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setLocalError(null);
    if (!ALLOWED_DOCUMENT_CONTENT_TYPES.includes(file.type)) {
      setLocalError("That file type isn't accepted. Send a PDF, a JPEG or a PNG.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setLocalError(
        `That file is over the ${Math.round(MAX_DOCUMENT_BYTES / (1024 * 1024))} MB limit, so a screenshot may need resizing.`,
      );
      return;
    }

    setBusy(true);
    try {
      await onUpload(file);
    } finally {
      setBusy(false);
    }
  }

  const message = localError ?? error;

  return (
    <div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        A screenshot or PDF of the transfer, if you have one to hand.
      </p>
      {message && (
        <p className="text-xs text-red-700 font-medium mt-2 flex items-start gap-1.5" role="alert">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-px" aria-hidden="true" />
          {message}
        </p>
      )}
      <div className="flex items-center gap-2 mt-3">
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={ALLOWED_DOCUMENT_CONTENT_TYPES.join(",")}
          aria-label={fileName ? "Replace the transfer proof" : "Upload the transfer proof"}
          onChange={(event) => void onPick(event)}
          data-testid="input-file-payment_proof"
        />
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="min-h-11 rounded-lg text-xs font-semibold cursor-pointer"
          data-testid="button-upload-payment_proof"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span className="ml-1.5">{fileName ? "Replace" : "Attach"}</span>
        </Button>
        {fileName && (
          <>
            <p className="text-xs text-muted-foreground truncate" data-testid="payment-proof-name">
              {fileName}
              {sizeBytes !== null ? ` · ${Math.max(1, Math.round(sizeBytes / 1024))} KB` : ""}
            </p>
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => void onRemove()}
              className="min-h-11 w-11 rounded-lg text-muted-foreground hover:text-red-700 cursor-pointer flex-shrink-0"
              data-testid="button-remove-payment_proof"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
              <span className="sr-only">Remove the transfer proof</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Waiting, refused, done ──────────────────────────────────────────────────

function ClaimedPanel({
  utr,
  paidOn,
  amountPaise,
  email,
  watching,
}: {
  utr: string;
  paidOn: string;
  amountPaise: number;
  email: string;
  watching: boolean;
}) {
  return (
    <section
      className="rounded-xl border border-amber-200 bg-amber-50 p-5 sm:p-6 space-y-4"
      data-testid="payment-claimed"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Clock className="w-5 h-5 text-amber-700" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-amber-900">
            Checking this against our statement
          </h3>
          <p className="text-sm text-amber-900 leading-relaxed mt-1" role="status">
            {/* Their transfer date rather than the moment they told us. It is the one figure here
                they can check against their own statement. */}
            You told us you sent {formatInr(amountPaise / 100)} on {formatIstDate(paidOn)},
            reference {utr}. A person confirms it against our statement, usually within a working
            day.
          </p>
        </div>
      </div>
      <p className="text-xs text-amber-900 leading-relaxed">
        {watching
          ? `This page updates on its own when it is confirmed, and we email ${email || "you"} either way.`
          : `We've stopped checking on this page. Reload it to look again, or leave it: we email ${email || "you"} when it is confirmed.`}
      </p>
      <p className="text-xs text-amber-900 leading-relaxed">
        Nothing is on hold while we check. Your portal account can be set up now.
      </p>
    </section>
  );
}

/**
 * We could not find the money.
 *
 * Says what to do and does not accuse: the common causes are a mistyped reference and a transfer
 * that has not settled yet, and the franchisee is the one person who can tell the difference. It
 * appears above a reopened form rather than replacing it.
 */
function RefusalPanel({ refusal }: { refusal: string }) {
  return (
    <section
      className="rounded-xl border border-red-300 bg-red-50 p-4 sm:p-5"
      data-testid="payment-refused"
    >
      <h3 className="text-base font-semibold text-red-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        We couldn't confirm that transfer
      </h3>
      <p className="text-sm text-red-800 leading-relaxed mt-1">{refusal}</p>
      <p className="text-sm text-red-800 leading-relaxed mt-2">
        Check the reference against your statement and send it to us again below. If you are sure of
        the details, reply to our email and we will look again ourselves. Do not send the money
        twice.
      </p>
    </section>
  );
}

/**
 * Received.
 *
 * A shortfall is stated as one. `receivedPaise` is what an admin read off the statement and
 * `expectedPaise` is what the term sheet says, and where a bank has deducted charges those differ
 * by a few hundred rupees. Showing only the first would leave someone believing they had paid in
 * full against a record that says otherwise, and the difference is small enough that nobody would
 * find it later.
 */
function VerifiedPanel({
  receivedPaise,
  expectedPaise,
  verifiedAt,
  canCarryOn,
  onCarryOn,
}: {
  receivedPaise: number | null;
  expectedPaise: number;
  verifiedAt: string;
  canCarryOn: boolean;
  onCarryOn(): void;
}) {
  const shortfall = receivedPaise !== null ? expectedPaise - receivedPaise : 0;

  return (
    <section
      className="rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6 space-y-4"
      data-testid="payment-verified"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-primary-ink" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">
            {receivedPaise !== null ? formatInr(receivedPaise / 100) : "Your transfer"} received
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            Confirmed against our statement on {formatIstDate(verifiedAt)}. Procurement can start.
          </p>
        </div>
      </div>

      {shortfall > 0 && (
        <p
          className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 leading-relaxed"
          data-testid="payment-shortfall"
        >
          That is {formatInr(shortfall / 100)} less than the {formatInr(expectedPaise / 100)} due,
          which usually means your bank deducted charges. It stays outstanding against this
          instalment, and we will raise it with you before the next one.
        </p>
      )}

      {canCarryOn && (
        <Button
          onClick={onCarryOn}
          className="min-h-11 rounded-lg font-semibold text-sm cursor-pointer"
          data-testid="button-continue-from-payment"
        >
          Carry on
          <ArrowRight className="w-4 h-4 ml-1.5" aria-hidden="true" />
        </Button>
      )}
    </section>
  );
}
