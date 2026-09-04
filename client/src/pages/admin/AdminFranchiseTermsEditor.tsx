"use client";

import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  adminFranchiseTermsFormSchema,
  franchiseTermsDiff,
  franchiseTermsFieldPath,
  franchiseTermsFormValues,
  FRANCHISE_PAYMENT_STAGES,
  type AdminFranchiseTermsForm,
} from "@shared/admin/franchiseWrites";
import type { AdminFranchiseView } from "@shared/admin/franchises";
import { patchFranchiseTerms } from "@/lib/adminFranchiseApi";
import { Card, ErrorPanel, Field, Fields, Subhead, SuccessPanel } from "./AdminUi";
import { NumberField, TextField } from "./adminFields";
import { formatIstDateTime, formatPaiseAsInr, formatPaiseExact } from "./adminFormat";
import { franchiseTierLabel } from "./adminFranchiseFormat";

/**
 * The franchise's own commercials, and changing them while that is still possible.
 *
 * `AdminTermsEditor.tsx` for the franchise side. Its two doctrines hold unchanged — signing closes
 * the form permanently, and only what changed is sent — and three things are different, all of them
 * consequences of the term sheet being a negotiated instrument rather than a filled-in template.
 *
 * ## The tier is shown and cannot be edited here
 *
 * §3 finalises the tier together with the territory, and the grant is recorded on the `TERRITORY`
 * row. A tier editable on this card would be free to disagree with the tier the franchise was
 * actually granted, which is the tier the term sheet names. The route answers a **field error** for
 * a body carrying `tier` rather than dropping it, so there is no input for it and the note says
 * where the tier is decided instead.
 *
 * ## Two figures can be cleared, and clearing them is a real decision
 *
 * `capitalRecoveryPaise` and `paymentSchedule` are the two fields that gate issuance, and null on
 * either means "not agreed" rather than "zero". `AdminTermsEditor`'s early-termination argument
 * applies exactly: a blank that prints as ₹0 on a signed document is how a placeholder becomes a
 * term nobody chose. So both offer clearing as an explicit choice, and the form says outright that
 * choosing it stops the term sheet being issued at all.
 *
 * ## Editing before signature is safe, and the form says so rather than warning about it
 *
 * A franchisee who has already read an older term sheet is not silently re-committed: the server
 * pins one row per issuance, so their click through to e-sign fails `content_mismatch` and they
 * re-read. The cost of an edit before signature is a re-read; the cost after it is a signature over
 * figures that no longer exist, which is why the route is refused then and this form is not offered.
 */
export function AdminFranchiseTermsEditor({
  franchise,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  // `timestamps.signedAt`, which is the field the server's own `ConditionCheck` reads. `status` also
  // says "signed", and it moves past that value at step 8, so a status check would unlock the form
  // for a franchise that has signed and then claimed its instalment.
  const locked = franchise.timestamps.signedAt !== null;

  return (
    <Card
      id="terms"
      title="Terms"
      note={
        locked
          ? "Signed. The signature covers a hash of these figures, so they can no longer be edited."
          : franchise.termsUpdatedByEmail
            ? `Last set by ${franchise.termsUpdatedByEmail}. The tier is set with the territory, not here.`
            : "The figures this franchise was created with. The tier is set with the territory, not here."
      }
      testId="card-terms"
      action={
        locked ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" aria-hidden />
            Locked
          </span>
        ) : editing ? null : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSaved(null);
              setEditing(true);
            }}
            className="rounded-xl cursor-pointer h-8"
            data-testid="button-edit-franchise-terms"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            Edit
          </Button>
        )
      }
    >
      {editing ? (
        <TermsForm
          franchise={franchise}
          onCancel={() => setEditing(false)}
          onSaved={(message) => {
            setSaved(message);
            setEditing(false);
            onSaved();
          }}
        />
      ) : (
        <>
          {saved && (
            <div className="px-4 sm:px-5 pt-4">
              <SuccessPanel testId="franchise-terms-saved">{saved}</SuccessPanel>
            </div>
          )}
          <TermsReadOnly franchise={franchise} />
        </>
      )}
    </Card>
  );
}

function TermsReadOnly({ franchise }: { franchise: AdminFranchiseView }) {
  const { terms } = franchise;
  return (
    <>
      <Fields>
        <Field label="Tier" value={franchiseTierLabel(terms.tier)} />
        <Field label="Investment" value={formatPaiseAsInr(terms.investmentPaise)} />
        <Field label="Machines to start" value={String(terms.machineAllocation)} />
        <Field
          label="Capital recovery threshold"
          value={
            terms.capitalRecoveryPaise === null ? null : formatPaiseAsInr(terms.capitalRecoveryPaise)
          }
          hint={terms.capitalRecoveryPaise === null ? "Agreement-specific" : undefined}
        />
        <Field
          label="Protein share"
          value={`${terms.proteinSharePctDuringRecovery}% until recovery, then ${terms.proteinSharePctAfterRecovery}%`}
        />
        <Field
          label="Advertising split"
          value={`${terms.advertisingFranchiseeSharePct}% them, ${terms.advertisingMbpSharePct}% us`}
        />
        <Field label="Terms last written" value={formatIstDateTime(franchise.termsUpdatedAt)} />
        <Field label="By" value={franchise.termsUpdatedByEmail} />
      </Fields>

      {terms.paymentSchedule ? (
        <>
          <Subhead>Instalment schedule</Subhead>
          <table className="w-full text-sm" data-testid="table-schedule">
            <tbody className="divide-y divide-gray-100">
              {terms.paymentSchedule.map((instalment, index) => (
                <tr key={`${instalment.pct}-${index}`}>
                  <td className="pl-4 sm:pl-5 py-2 whitespace-nowrap font-semibold tabular-nums">
                    {instalment.pct}%
                  </td>
                  {/* Derived from the two figures beside it rather than stored, which is why the
                      schedule holds percentages: an edited investment cannot leave a stale amount. */}
                  <td className="px-4 py-2 tabular-nums whitespace-nowrap">
                    {stageAmount(terms.investmentPaise / 100, instalment.pct)}
                  </td>
                  <td className="w-full pr-4 sm:pr-5 py-2 text-muted-foreground">
                    {instalment.trigger}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p
          className="border-t border-gray-100 px-4 sm:px-5 py-3.5 text-xs text-amber-800 leading-relaxed"
          data-testid="schedule-none"
        >
          No instalment schedule agreed, so the term sheet has unresolved figures in it and cannot be
          issued. Edit these terms to add one.
        </p>
      )}
    </>
  );
}

function TermsForm({
  franchise,
  onCancel,
  onSaved,
}: {
  franchise: AdminFranchiseView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  // Captured once, at mount, so the diff is against what the admin started from rather than against
  // a franchise prop a refetch could have replaced underneath them mid-edit.
  const [before] = useState<AdminFranchiseTermsForm>(() =>
    franchiseTermsFormValues(franchise.terms),
  );
  const form = useForm<AdminFranchiseTermsForm>({
    resolver: zodResolver(adminFranchiseTermsFormSchema),
    defaultValues: before,
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const recovery = useCapitalRecoveryChoice(form);
  const investmentInr = form.watch("investmentInr");

  async function onSubmit(values: AdminFranchiseTermsForm) {
    setProblem(null);
    const patch = franchiseTermsDiff(before, values);
    if (patch === null) {
      setProblem("Nothing changed, so nothing was sent.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await patchFranchiseTerms(franchise.franchiseId, patch);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [wireKey, message] of Object.entries(result.error.fieldErrors)) {
            const path = franchiseTermsFieldPath(wireKey);
            // Dropped rather than guessed when the key names nothing here. `tier` is the one this
            // happens to, and its message still shows in the panel below.
            if (path) form.setError(path as never, { message });
          }
        }
        // The server's own words. `already_signed` is one of several refusals sharing a code, so
        // the message is the only thing that distinguishes them.
        setProblem(result.error.message);
        return;
      }
      const { changed } = result.data;
      onSaved(
        `Saved. ${changed.length} ${changed.length === 1 ? "term" : "terms"} changed: ${changed.join(", ")}.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="border-t border-gray-100 p-4 sm:p-5 space-y-4"
      >
        {problem && <ErrorPanel message={problem} testId="franchise-terms-error" />}

        <div className="grid sm:grid-cols-2 gap-4">
          <NumberField
            control={form.control}
            name="investmentInr"
            label="Investment"
            prefix="₹"
            description={`Currently on the ${franchiseTierLabel(franchise.terms.tier)}. Every instalment is a percentage of this.`}
          />
          <NumberField
            control={form.control}
            name="machineAllocation"
            label="Machines to start"
          />
          <NumberField
            control={form.control}
            name="proteinSharePctDuringRecovery"
            label="Protein share until recovery (%)"
          />
          <NumberField
            control={form.control}
            name="proteinSharePctAfterRecovery"
            label="Protein share after recovery (%)"
          />
          <NumberField
            control={form.control}
            name="advertisingFranchiseeSharePct"
            label="Advertising, their share (%)"
          />
          <NumberField
            control={form.control}
            name="advertisingMbpSharePct"
            label="Advertising, our share (%)"
          />
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          {/* A plain heading rather than `FormLabel`, which reads error state off a `FormField`
              context: this sits above two radios and a conditionally rendered number field. */}
          <p className="text-gray-700 text-sm font-semibold">Capital recovery threshold</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">
            The protein share steps down once this much has been recovered. On the City tier §21
            leaves it to the definitive agreement, so "not agreed" is a real answer. It is not the
            same as zero, and no term sheet can be issued while it is unagreed.
          </p>
          <div className="space-y-2">
            <Radio
              name="capital-recovery-choice"
              checked={recovery.value === "amount"}
              onChange={() => recovery.choose("amount")}
              label="An agreed amount"
              testId="radio-recovery-amount"
            />
            {recovery.value === "amount" && (
              <div className="pl-6 max-w-[240px]">
                <NumberField
                  control={form.control}
                  name="capitalRecoveryInr"
                  label="Amount"
                  hideLabel
                  prefix="₹"
                />
              </div>
            )}
            <Radio
              name="capital-recovery-choice"
              checked={recovery.value === "unagreed"}
              onChange={() => recovery.choose("unagreed")}
              label="Not agreed yet"
              testId="radio-recovery-unagreed"
            />
          </div>
        </div>

        <ScheduleEditor form={form} investmentInr={investmentInr} />

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={isSaving}
            className="h-10 px-5 rounded-xl font-bold text-sm cursor-pointer"
            data-testid="button-save-franchise-terms"
          >
            {isSaving ? "Saving…" : "Save terms"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 px-5 rounded-xl cursor-pointer"
            data-testid="button-cancel-franchise-terms"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * The instalment schedule, as rows.
 *
 * A `useFieldArray` rather than the hold form's line-per-textarea, because a stage is two fields
 * with different types and the percentages have to add up — an admin editing four instalments needs
 * the running total in front of them, and a textarea cannot show it.
 *
 * The rupee figure beside each percentage is derived from the investment field being edited above
 * rather than from the stored terms, so an admin re-pricing the franchise sees the instalments move
 * as they type. That is the whole reason §6 states the schedule as percentages.
 */
function ScheduleEditor({
  form,
  investmentInr,
}: {
  form: ReturnType<typeof useForm<AdminFranchiseTermsForm>>;
  investmentInr: number | undefined;
}) {
  const stages = form.watch("paymentSchedule");
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "paymentSchedule",
  });

  // `stages` rather than `fields`: the total has to follow what is typed, and `fields` carries the
  // values as they were when the row was added.
  const total = (stages ?? []).reduce(
    (sum, stage) => sum + (typeof stage.pct === "number" && !Number.isNaN(stage.pct) ? stage.pct : 0),
    0,
  );
  // Under `root`, not on the array itself. `toNestErrors` moves any error whose path is a prefix of a
  // registered name there, and `paymentSchedule.0.pct` is registered — so the 100% refusal and the
  // empty-list refusal both land on `root` and reading `.message` alone shows nothing.
  const scheduleErrors = form.formState.errors.paymentSchedule;
  const message = scheduleErrors?.root?.message ?? scheduleErrors?.message;

  if (stages === null) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-gray-700 text-sm font-semibold">Instalment schedule</p>
        <p className="text-xs text-amber-800 mt-0.5 mb-3 leading-relaxed">
          No schedule agreed. The term sheet renders its instalment figures from this, so it cannot
          be issued at all until there is one.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            form.setValue("paymentSchedule", [{ pct: 100, trigger: "" }], { shouldValidate: false })
          }
          className="rounded-xl cursor-pointer h-8"
          data-testid="button-add-schedule"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Agree a schedule
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-gray-700 text-sm font-semibold">Instalment schedule</p>
        {/* The running total, coloured, because "adds up to 90%" is a refusal the admin can fix
            before submitting and 10% of the consideration is what it costs to miss it. */}
        <p
          className={`text-xs font-semibold tabular-nums ${
            total === 100 ? "text-green-700" : "text-amber-800"
          }`}
          data-testid="schedule-total"
        >
          {total}% across {fields.length} {fields.length === 1 ? "stage" : "stages"}
          {total === 100 || message ? "" : ", needs 100%"}
        </p>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">
        Percentages of the investment, not amounts, so re-pricing cannot leave a stale instalment
        behind. The rupee figures follow the investment above as you edit it.
      </p>

      {message && (
        <p className="text-xs font-medium text-destructive mb-3" data-testid="schedule-error">
          {message}
        </p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          // Wraps rather than shrinks. The trigger is a sentence, and at 390px a three-across row
          // leaves it 90px wide showing "At franchise re…", so it takes a line of its own there. The
          // `order` classes put it back between the percentage and the amount from `sm` up, which
          // keeps one instance of each field rather than a mobile copy and a desktop copy.
          <div key={field.id} className="flex flex-wrap items-start gap-2 sm:gap-2.5">
            <div className="w-[5.5rem] flex-shrink-0 order-1">
              <NumberField
                control={form.control}
                name={`paymentSchedule.${index}.pct`}
                label={`Stage ${index + 1} percentage`}
                hideLabel
              />
            </div>
            <div className="order-2 sm:order-3 ml-auto sm:ml-0 flex h-11 items-center gap-2">
              <span
                className="text-xs text-muted-foreground tabular-nums whitespace-nowrap"
                data-testid={`stage-amount-${index}`}
              >
                {stageAmount(investmentInr, stages[index]?.pct)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="h-9 w-9 flex-shrink-0 rounded-xl text-muted-foreground hover:text-destructive cursor-pointer"
                aria-label={`Remove stage ${index + 1}`}
                data-testid={`button-remove-stage-${index}`}
              >
                <Trash2 className="w-4 h-4" aria-hidden />
              </Button>
            </div>
            <div className="order-3 sm:order-2 w-full sm:w-auto min-w-0 sm:flex-1">
              <TextField
                control={form.control}
                name={`paymentSchedule.${index}.trigger`}
                label={`Stage ${index + 1} trigger`}
                hideLabel
                placeholder="What triggers this instalment"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= FRANCHISE_PAYMENT_STAGES.max}
          onClick={() => append({ pct: Math.max(0, 100 - total), trigger: "" })}
          className="rounded-xl cursor-pointer h-8"
          data-testid="button-add-stage"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden />
          Add a stage
        </Button>
        {/*
          Clearing the schedule is spelled as its own button rather than as removing the last row,
          because the two mean different things to the server: an empty list is refused, and null is
          "no schedule agreed". Removing rows down to zero would send the refused one.
        */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => form.setValue("paymentSchedule", null, { shouldValidate: false })}
          className="rounded-xl cursor-pointer h-8 text-muted-foreground"
          data-testid="button-clear-schedule"
        >
          Mark it not agreed
        </Button>
      </div>
    </div>
  );
}

/**
 * One stage in rupees, or nothing while either figure is mid-edit.
 *
 * Paise are shown only when there are any. A percentage of a rupee figure lands on a whole rupee
 * almost every time, and "₹12,50,000.00" beside four other amounts is two characters of noise on
 * each; but 33% of an odd investment really is ₹8,25,000.33 and an instalment that does not add back
 * up to the investment is the figure somebody has to reconcile.
 */
function stageAmount(investmentInr: number | undefined, pct: number | undefined): string {
  if (typeof investmentInr !== "number" || Number.isNaN(investmentInr)) return "";
  if (typeof pct !== "number" || Number.isNaN(pct)) return "";
  const paise = Math.round(investmentInr * pct);
  return paise % 100 === 0 ? formatPaiseAsInr(paise) : formatPaiseExact(paise);
}

/**
 * The two-way choice behind `capitalRecoveryInr`.
 *
 * `useEarlyTerminationChoice`'s problem, one branch smaller: the wire value is a number-or-null, but
 * "the admin picked an amount and has not typed a digit yet" is `undefined`, which is
 * indistinguishable from "nothing chosen" if the radio state were derived from the value alone. So
 * the amount branch is held as its own state, while `unagreed` stays derived from the field, which
 * is what lets a server field error — it sets the value, not this state — land on the right radio.
 */
function useCapitalRecoveryChoice(form: ReturnType<typeof useForm<AdminFranchiseTermsForm>>) {
  const value = form.watch("capitalRecoveryInr");
  const [pickedAmount, setPickedAmount] = useState(false);

  const current: "amount" | "unagreed" | "none" =
    value === null && !pickedAmount
      ? "unagreed"
      : pickedAmount || typeof value === "number"
        ? "amount"
        : "none";

  function choose(choice: "amount" | "unagreed") {
    if (choice === "unagreed") {
      setPickedAmount(false);
      form.setValue("capitalRecoveryInr", null, { shouldValidate: true });
    } else {
      setPickedAmount(true);
      // Left to whatever the admin types next. Clearing it here would erase a figure they are
      // part-way through re-entering after switching radios back and forth.
      if (current !== "amount") {
        form.setValue("capitalRecoveryInr", undefined as unknown as number, {
          shouldValidate: false,
        });
      }
    }
  }

  return { value: current, choose };
}

function Radio({
  name,
  checked,
  onChange,
  label,
  testId,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  testId: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-primary cursor-pointer"
        data-testid={testId}
      />
      {label}
    </label>
  );
}
