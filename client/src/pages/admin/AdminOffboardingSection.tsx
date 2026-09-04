"use client";

import { useState } from "react";
import {
  useFieldArray,
  useForm,
  type FieldPath,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  DEDUCTION_KINDS,
  TERMINATION_CAUSES,
  adminNoticeFormSchema,
  adminRecoveredFormSchema,
  adminSettlementFormSchema,
  adminTerminateFormSchema,
  terminationNeedsReason,
  toAdminTerminateBody,
  todayInIst,
  type AdminNoticeForm,
  type AdminRecoveredForm,
  type AdminSettlementForm,
  type AdminTerminateForm,
} from "@shared/admin/writes";
import {
  isPendingDeviceNo,
  type AdminGymView,
  type AdminOffboarding,
  type DeductionKind,
  type OffboardingState,
} from "@shared/admin/gyms";
import {
  recordMachineRecovered,
  recordOffboardingNotice,
  recordOffboardingSettlement,
  terminateGym,
} from "@/lib/adminApi";
import { Card, Empty, ErrorPanel, Field, Fields, Pill, SuccessPanel } from "./AdminUi";
import { AreaField, DateField, NumberField, SelectField, TextField } from "./adminFields";
import {
  DEDUCTION_KIND_LABEL,
  OFFBOARDING_STATE_CLASS,
  OFFBOARDING_STATE_LABEL,
  TERMINATION_CAUSE_LABEL,
  TERMINATION_CAUSE_NOTE,
  formatCalendarDate,
  formatInr,
  formatIstDateTime,
  formatPaiseExact,
} from "./adminFormat";

/**
 * Ending the relationship: the record, and the one action that can be taken next.
 *
 * ## One button, never four
 *
 * The ladder is forward-only — notice → terminate → machine-recovered → settlement — and the server
 * enforces it with a condition, answering a repeat with the stored state rather than an error. This
 * offers only the rung that is actually available, because the alternative is four buttons of which
 * three can only produce a 409, and a disabled button with a tooltip is a worse way of saying "not
 * yet" than not showing it.
 *
 * Notice is the one optional rung: a §36.1 notice may never have arrived (a breach, a mutual exit, an
 * expired term), so `terminate` is offered alongside it from the start.
 *
 * ## Nothing here is reversible, and nothing here moves money
 *
 * `settled` is genuinely terminal: unlike the onboarding ladder there is no step past it and no way
 * back down. Terminating also disables the gym's logins. So each form states what it is about to do
 * before its submit button, in the sentence a confirm dialog would have contained — a dialog would
 * put that sentence behind a click, which is the click people stop reading.
 *
 * The settlement is the sharpest case: it *records* a payable that a human then pays from the
 * Razorpay dashboard, since no code in the onboarding service has a refund path. `payoutStatus` comes
 * back as `"not_paid"` for exactly this reason and is rendered beside the figure, because the one
 * misreading that costs real money is a payable read as a payment already made.
 */
export function AdminOffboardingSection({
  gym,
  onSaved,
}: {
  gym: AdminGymView;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<Rung | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const record = gym.offboarding;
  const state = record?.state ?? null;
  const signed = gym.signature !== null;

  function done(message: string) {
    setSaved(message);
    setOpen(null);
    onSaved();
  }

  const forms: Record<Rung, React.ReactNode> = {
    notice: <NoticeForm gym={gym} onCancel={() => setOpen(null)} onSaved={done} />,
    terminate: <TerminateForm gym={gym} onCancel={() => setOpen(null)} onSaved={done} />,
    recovered: <RecoveredForm gym={gym} onCancel={() => setOpen(null)} onSaved={done} />,
    settlement: <SettlementForm gym={gym} onCancel={() => setOpen(null)} onSaved={done} />,
  };

  return (
    <Card
      id="offboarding"
      title="Offboarding"
      note={
        record
          ? "Forward-only. Nothing recorded here can be undone from this panel."
          : "No offboarding recorded, which is the ordinary state."
      }
      testId="card-offboarding"
      tone={record ? "alert" : "plain"}
      action={
        record && (
          <Pill className={OFFBOARDING_STATE_CLASS[record.state]} testId="offboarding-state">
            {OFFBOARDING_STATE_LABEL[record.state]}
          </Pill>
        )
      }
    >
      {saved && (
        <div className="px-4 sm:px-5 pt-4">
          <SuccessPanel testId="offboarding-saved">{saved}</SuccessPanel>
        </div>
      )}

      {record ? <OffboardingRecord record={record} /> : null}

      {!record && (
        <Empty testId="offboarding-none">
          {signed
            ? "The agreement is live. Recording a notice or a termination starts a ladder that cannot be walked back."
            : "Nothing to end. There is no signed agreement, so none of this applies yet."}
        </Empty>
      )}

      {open ? (
        forms[open]
      ) : (
        <Actions state={state} signed={signed} onOpen={setOpen} />
      )}
    </Card>
  );
}

type Rung = "notice" | "terminate" | "recovered" | "settlement";

/**
 * The rung that is available, as buttons.
 *
 * A settled offboarding gets no buttons and says so, rather than an empty footer that reads as a
 * loading state.
 */
function Actions({
  state,
  signed,
  onOpen,
}: {
  state: OffboardingState | null;
  signed: boolean;
  onOpen: (rung: Rung) => void;
}) {
  if (!signed) return null;

  if (state === "settled") {
    return (
      <p
        className="border-t border-rose-400/20 px-4 sm:px-5 py-3.5 text-xs text-muted-foreground"
        data-testid="offboarding-complete"
      >
        Settled. This is the end of the ladder, and of the relationship.
      </p>
    );
  }

  const rungs: Rung[] =
    state === null
      ? ["notice", "terminate"]
      : state === "notice_served"
        ? ["terminate"]
        : state === "terminated"
          ? ["recovered"]
          : ["settlement"];

  return (
    <div className="border-t border-border/70 px-4 sm:px-5 py-3.5 flex flex-wrap gap-2.5">
      {rungs.map((rung) => (
        <Button
          key={rung}
          variant="outline"
          size="sm"
          onClick={() => onOpen(rung)}
          className={`rounded-xl cursor-pointer h-9 ${
            rung === "terminate" ? "border-rose-400/25 text-rose-200 hover:bg-rose-400/10" : ""
          }`}
          data-testid={`button-open-${rung}`}
        >
          {RUNG_LABEL[rung]}
        </Button>
      ))}
    </div>
  );
}

const RUNG_LABEL: Record<Rung, string> = {
  notice: "Record a notice",
  terminate: "Terminate the agreement",
  recovered: "Record the machine as recovered",
  settlement: "Record the settlement",
};

function OffboardingRecord({ record }: { record: AdminOffboarding }) {
  return (
    <>
      {record.notice && (
        <Fields>
          <Field label="Notice received" value={formatIstDateTime(record.notice.receivedAt)} />
          <Field
            label="Notice effective"
            value={formatIstDateTime(record.notice.effectiveAt)}
            hint="§36.1's thirty days"
          />
          <Field label="Arrived by" value={record.notice.channel} />
          <Field label="Recorded by" value={record.notice.recordedByEmail} />
        </Fields>
      )}

      {record.terminatedAt && (
        <Fields>
          <Field
            label="Terminated"
            value={formatIstDateTime(record.terminatedAt)}
            hint={record.terminatedByEmail ?? undefined}
          />
          <Field
            label="Cause"
            value={record.cause ? TERMINATION_CAUSE_LABEL[record.cause] : null}
          />
          <Field label="Reason" value={record.reason} />
          {/* Stored rather than derived, and the thing §37.6 turns on. See `AdminOffboarding`. */}
          {record.earlyAgainstNotice !== null && (
            <Field
              label="Cut the notice short"
              value={record.earlyAgainstNotice ? "Yes" : "No"}
              hint={record.earlyAgainstNotice ? "§37.6 retrieval costs recoverable" : undefined}
            />
          )}
          {record.loginsDisabled !== null && (
            <Field
              label="Gym logins"
              value={record.loginsDisabled ? "Disabled" : "Still enabled"}
            />
          )}
        </Fields>
      )}

      {record.machineRecoveredAt && (
        <Fields>
          <Field
            label="Machine recovered"
            value={formatIstDateTime(record.machineRecoveredAt)}
            hint={record.machineRecoveredByEmail ?? undefined}
          />
          <Field label="Unit collected" value={record.recoveredDeviceNo} mono />
          <Field label="Condition" value={record.machineCondition} />
        </Fields>
      )}

      {record.settlement && <Settlement settlement={record.settlement} settledAt={record.settledAt} />}
    </>
  );
}

function Settlement({
  settlement,
  settledAt,
}: {
  settlement: NonNullable<AdminOffboarding["settlement"]>;
  settledAt: string | null;
}) {
  return (
    <>
      {settlement.deductions.length > 0 && (
        <table className="w-full text-sm border-t border-border/70" data-testid="table-deductions">
          <tbody className="divide-y divide-border/70">
            {settlement.deductions.map((line, index) => (
              <tr key={`${line.kind}-${index}`}>
                <td className="px-4 sm:px-5 py-2.5 whitespace-nowrap">
                  {DEDUCTION_KIND_LABEL[line.kind]}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{line.note}</td>
                <td className="px-4 sm:px-5 py-2.5 text-right tabular-nums whitespace-nowrap">
                  {formatPaiseExact(line.amountPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Fields>
        <Field label="Deposit held" value={formatPaiseExact(settlement.depositHeldPaise)} />
        <Field
          label="Deducted"
          value={formatPaiseExact(settlement.deductionsPaise)}
          hint={`${settlement.deductions.length} ${settlement.deductions.length === 1 ? "line" : "lines"}`}
        />
        {/*
          Payable and shortfall are two fields rather than one signed number, and are rendered as
          two: a negative payable is one sign flip away from paying a receivable.
        */}
        <Field label="Payable to the gym" value={formatPaiseExact(settlement.payableToGymPaise)} />
        {settlement.shortfallPaise > 0 && (
          <Field
            label="Shortfall owed to us"
            value={formatPaiseExact(settlement.shortfallPaise)}
            hint="Deductions exceeded the deposit"
          />
        )}
        <Field label="Due" value={formatIstDateTime(settlement.dueAt)} hint="30 days from retrieval" />
        <Field label="Recorded by" value={settlement.recordedByEmail} />
        <Field label="Recorded" value={formatIstDateTime(settledAt)} />
      </Fields>

      <p
        className="mx-4 sm:mx-5 mb-4 flex items-start gap-2.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-xs leading-relaxed text-amber-200"
        data-testid="settlement-not-paid"
      >
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
        <span>
          Recorded, not paid. Nothing in this service moves money, so somebody has to pay this from
          the Razorpay dashboard and it will not appear here when they do.
        </span>
      </p>
    </>
  );
}

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
    <form onSubmit={onSubmit} className="border-t border-border/70 p-4 sm:p-5 space-y-4">
      {problem && <ErrorPanel message={problem} testId={`${testId}-error`} />}
      {children}
      <p className="text-xs text-amber-200 bg-amber-400/10 border border-amber-400/25 rounded-xl px-4 py-3 leading-relaxed">
        {warning}
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

function NoticeForm({
  gym,
  onCancel,
  onSaved,
}: {
  gym: AdminGymView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminNoticeForm>({
    resolver: zodResolver(adminNoticeFormSchema),
    defaultValues: { receivedOn: "", channel: "" },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function onSubmit(values: AdminNoticeForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await recordOffboardingNotice(gym.gymId, values);
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      const effective = result.data.offboarding?.notice?.effectiveAt ?? null;
      onSaved(
        effective
          ? `Notice recorded. It runs out on ${formatIstDateTime(effective)}.`
          : "Notice recorded.",
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
        submitLabel="Record the notice"
        testId="notice"
        warning="Recording a notice starts §36.1's thirty days from 00:00 IST on the day it arrived. The date is the one on the letter, not today."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <DateField
            control={form.control}
            name="receivedOn"
            label="Received on"
            max={todayInIst()}
            description="The date it arrived. Bounded at today in IST, the same boundary the server uses."
          />
          <TextField
            control={form.control}
            name="channel"
            label="Arrived by"
            placeholder="Email to ops@, letter handed to the technician, WhatsApp"
            description="Free text. §41 does not close the set of ways a notice can arrive, so record what happened."
          />
        </div>
      </FormFrame>
    </Form>
  );
}

function TerminateForm({
  gym,
  onCancel,
  onSaved,
}: {
  gym: AdminGymView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminTerminateForm>({
    // No default cause. Picking the wrong one changes what may be deducted from money we hold.
    defaultValues: { reason: "" },
    resolver: zodResolver(adminTerminateFormSchema),
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const cause = form.watch("cause");
  const noticeEffectiveAt = gym.offboarding?.notice?.effectiveAt ?? null;
  const needsReason = cause
    ? terminationNeedsReason({ cause, noticeEffectiveAt })
    : false;

  async function onSubmit(values: AdminTerminateForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await terminateGym(gym.gymId, toAdminTerminateBody(values));
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      onSaved(
        result.data.loginsDisabled
          ? "Terminated. The gym's logins are disabled."
          : "Terminated.",
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
        submitLabel="Terminate"
        testId="terminate"
        warning="This ends the agreement and disables the gym's logins. There is no route back, and the terms and machine can no longer be edited afterwards."
      >
        <SelectField
          control={form.control}
          name="cause"
          label="Cause"
          options={CAUSE_OPTIONS}
          description={cause ? TERMINATION_CAUSE_NOTE[cause] : "Four causes, one per clause."}
        />
        <AreaField
          control={form.control}
          name="reason"
          label={needsReason ? "Reason (required)" : "Reason (optional)"}
          rows={3}
          description={
            needsReason
              ? cause === "gym_breach"
                ? "Name the §35 ground. This is a factual claim about the gym that also unlocks retrieval costs."
                : "The notice has not run out yet, so §36.2 needs the removal explained."
              : "Whether this is required depends on the cause and on a stored date, and the server decides. Say what happened either way."
          }
        />
      </FormFrame>
    </Form>
  );
}

const CAUSE_OPTIONS = [
  { value: "", label: "Choose a cause" },
  ...TERMINATION_CAUSES.map((value) => ({ value, label: TERMINATION_CAUSE_LABEL[value] })),
];

function RecoveredForm({
  gym,
  onCancel,
  onSaved,
}: {
  gym: AdminGymView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const current = gym.machine.deviceNo;
  const form = useForm<AdminRecoveredForm>({
    resolver: zodResolver(adminRecoveredFormSchema),
    defaultValues: {
      // The unit on file, unless it is the placeholder — which is not a unit anybody collected.
      deviceNo: current !== null && !isPendingDeviceNo(current) ? current : "",
      recoveredOn: "",
      condition: "",
    },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function onSubmit(values: AdminRecoveredForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await recordMachineRecovered(gym.gymId, values);
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      onSaved(
        result.data.settlementDueAt
          ? `Recovery recorded. The settlement is due by ${formatIstDateTime(result.data.settlementDueAt)}.`
          : "Recovery recorded.",
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
        submitLabel="Record the recovery"
        testId="recovered"
        warning="The settlement clock runs thirty days from this date, not from the termination. The condition written here is what a damage deduction will be read against."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <TextField
            control={form.control}
            name="deviceNo"
            label="Unit collected"
            mono
            description="The number on the unit that came back, which is not always the one on file."
          />
          <DateField
            control={form.control}
            name="recoveredOn"
            label="Recovered on"
            max={todayInIst()}
            description="The date on the collection note."
          />
        </div>
        <AreaField
          control={form.control}
          name="condition"
          label="Condition"
          rows={3}
          placeholder="Working, cosmetic scratches to the left panel, cup dispenser missing"
        />
      </FormFrame>
    </Form>
  );
}

/**
 * A new deduction line.
 *
 * `kind` starts blank and `amountInr` starts undefined, so neither a clause nor a figure is
 * prefilled: both are casts because the form type describes a *complete* line, and an incomplete one
 * is exactly what an unfilled row is. The resolver refuses both blanks with their own messages.
 */
function blankDeduction() {
  return {
    kind: "" as DeductionKind,
    amountInr: undefined as unknown as number,
    note: "",
  };
}

const KIND_OPTIONS = [
  { value: "", label: "Choose what this is" },
  ...DEDUCTION_KINDS.map((value) => ({ value, label: DEDUCTION_KIND_LABEL[value] })),
];

function SettlementForm({
  gym,
  onCancel,
  onSaved,
}: {
  gym: AdminGymView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const form = useForm<AdminSettlementForm>({
    resolver: zodResolver(adminSettlementFormSchema),
    defaultValues: { deductions: [] },
    mode: "onBlur",
  });
  const lines = useFieldArray({ control: form.control, name: "deductions" });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const typed = form.watch("deductions");
  const deducting = (typed ?? []).reduce(
    (total, line) => total + (typeof line?.amountInr === "number" ? line.amountInr : 0),
    0,
  );

  async function onSubmit(values: AdminSettlementForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await recordOffboardingSettlement(gym.gymId, {
        deductions: values.deductions.map((line) => ({
          kind: line.kind,
          amountInr: line.amountInr,
          note: line.note.trim(),
        })),
      });
      if (!result.ok) {
        applyFieldErrors(form, result.error.fieldErrors);
        setProblem(result.error.message);
        return;
      }
      const settlement = result.data.offboarding?.settlement ?? null;
      onSaved(
        settlement
          ? `Settled. ${formatPaiseExact(settlement.payableToGymPaise)} payable to the gym. ${result.data.payoutNote}`
          : `Settled. ${result.data.payoutNote}`,
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
        submitLabel="Record the settlement"
        testId="settlement"
        warning="This records the split and closes the offboarding. It does not pay anybody: the payable has to be paid from the Razorpay dashboard afterwards."
      >
        <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {/*
              There is no field for the deposit, and the note says why rather than leaving its
              absence to be read as an oversight.
            */}
            The deposit is not entered here. What we hold comes from what the gateway told us it
            captured, and the server does the arithmetic.{" "}
            {gym.depositWaiver
              ? "This gym's deposit was waived, so there may be nothing to return."
              : `The agreed figure is ${formatInr(gym.terms.securityDepositInr)}.`}
          </p>
        </div>

        {lines.fields.length === 0 ? (
          <p className="text-sm text-muted-foreground" data-testid="deductions-none">
            No deductions. That is the ordinary settlement: the whole deposit goes back.
          </p>
        ) : (
          <div className="space-y-3">
            {lines.fields.map((line, index) => (
              <div
                key={line.id}
                className="rounded-xl border border-border p-3.5"
                data-testid={`deduction-${index}`}
              >
                <div className="grid sm:grid-cols-[1fr_160px_auto] gap-3 items-start">
                  <SelectField
                    control={form.control}
                    name={`deductions.${index}.kind`}
                    label="Kind"
                    options={KIND_OPTIONS}
                  />
                  <NumberField
                    control={form.control}
                    name={`deductions.${index}.amountInr`}
                    label="Amount"
                    prefix="₹"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => lines.remove(index)}
                    className="mt-6 h-9 px-2.5 rounded-xl text-muted-foreground hover:text-rose-200 cursor-pointer"
                    aria-label={`Remove deduction ${index + 1}`}
                    data-testid={`button-remove-deduction-${index}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden />
                  </Button>
                </div>
                <div className="mt-3">
                  <AreaField
                    control={form.control}
                    name={`deductions.${index}.note`}
                    label="What this is"
                    rows={2}
                    placeholder="Cracked front panel, quoted at ₹8,500 by the service partner"
                    description="Justifies taking money out of the deposit, so a sentence rather than a word."
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => lines.append(blankDeduction())}
            disabled={lines.fields.length >= 20}
            className="rounded-xl cursor-pointer h-9"
            data-testid="button-add-deduction"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden />
            Add a deduction
          </Button>
          {deducting > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums" data-testid="deductions-total">
              Deducting {formatInr(deducting)} across {lines.fields.length}{" "}
              {lines.fields.length === 1 ? "line" : "lines"}.
            </p>
          )}
        </div>
      </FormFrame>
    </Form>
  );
}

/**
 * Server `fieldErrors` onto the form.
 *
 * Keys arrive in the wire's own shape, which for a settlement is `deductions.2.note` — already a
 * react-hook-form path, so nothing translates. A key that does not name a field is dropped rather
 * than invented, and the message still shows in the panel above.
 */
function applyFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors: Record<string, string> | undefined,
) {
  if (!fieldErrors) return;
  for (const [field, message] of Object.entries(fieldErrors)) {
    form.setError(field as FieldPath<T>, { message });
  }
}
