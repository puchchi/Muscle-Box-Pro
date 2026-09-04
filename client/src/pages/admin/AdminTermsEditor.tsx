"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  adminTermsFormSchema,
  termsDiff,
  type AdminTermsForm,
} from "@shared/admin/writes";
import type { AdminGymView } from "@shared/admin/gyms";
import { patchGymTerms } from "@/lib/adminApi";
import { Card, ErrorPanel, Field, Fields, SuccessPanel } from "./AdminUi";
import { NumberField } from "./adminFields";
import { formatInr } from "./adminFormat";

/**
 * The commercial terms: what they are, and changing them while that is still possible.
 *
 * ## Signing closes this permanently
 *
 * The agreement embeds the commercials **and a content hash over them**. Re-pricing afterwards would
 * leave us holding a signature over terms that no longer exist, so `PATCH …/terms` is refused once
 * the gym has signed — by a `ConditionCheck` inside the server's transaction, not by an `if`.
 *
 * The form is therefore not offered to a signed gym, and the note says why. That is a statement of a
 * server rule, not a substitute for it: the race the condition exists for is an admin saving this
 * form while the gym is on the signing screen, and only the database can arbitrate that. When it
 * does, the refusal arrives as `already_signed` and this component prints **the server's own
 * message** rather than one of its own, because `conflict()` uses that code for several different
 * refusals and the message is the only thing that distinguishes them.
 *
 * ## It sends only what changed
 *
 * Every field is required on the form even though the route patches, because a blank means the admin
 * cleared a figure rather than left it alone. `termsDiff` then narrows the submission to the keys
 * that actually moved, and answers null when none did — which this turns into "nothing changed"
 * rather than letting the server's *"send at least one term"* refusal reach someone who pressed Save
 * on an untouched form.
 */
export function AdminTermsEditor({ gym, onSaved }: { gym: AdminGymView; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const locked = gym.signature !== null;

  return (
    <Card
      id="terms"
      title="Terms"
      note={
        locked
          ? "Signed. The signature covers a hash of these figures, so they can no longer be edited."
          : gym.termsUpdatedByEmail
            ? `Last set by ${gym.termsUpdatedByEmail}`
            : "Never edited. These are the values the gym was created with."
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
            data-testid="button-edit-terms"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            Edit
          </Button>
        )
      }
    >
      {editing ? (
        <TermsForm
          gym={gym}
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
              <SuccessPanel testId="terms-saved">{saved}</SuccessPanel>
            </div>
          )}
          <TermsReadOnly gym={gym} />
        </>
      )}
    </Card>
  );
}

function TermsReadOnly({ gym }: { gym: AdminGymView }) {
  const { terms } = gym;
  return (
    <Fields>
      <Field label="Security deposit" value={formatInr(terms.securityDepositInr)} />
      <Field label="Term" value={`${terms.termMonths} months`} />
      <Field
        label="Gym share, before milestone"
        value={`${terms.gymSharePctBeforeMilestone}%`}
      />
      <Field label="Gym share, after milestone" value={`${terms.gymSharePctAfterMilestone}%`} />
      <Field label="Milestone, cups" value={terms.milestoneCups.toLocaleString("en-IN")} />
      {/* §6.1's profit test is cumulative Net Profit, not gross sales — hence both figures. */}
      <Field label="Milestone, net profit" value={formatInr(terms.milestoneNetProfitInr)} />
      <Field label="Advertising, gym share" value={`${terms.advertisingGymSharePct}%`} />
      <Field
        label="Electricity"
        value={`${formatInr(terms.electricityInrPerBlock)} per ${terms.electricityCupsPerBlock.toLocaleString("en-IN")} cups`}
      />
      <Field label="Electricity review" value={`Every ${terms.electricityReviewWindowMonths} months`} />
      <Field label="Settlement" value={`${terms.settlementDaysAfterMonthEnd} days after month end`} />
      {/*
        Zero and null are different answers and are shown differently. Zero is the standard term
        and means the exit price is nil on 30 days' notice (§36.1); null means the charge is
        genuinely unagreed. A blank printing as "₹0" is how a placeholder becomes a term nobody
        chose.
      */}
      <Field
        label="Early termination charge"
        value={
          terms.earlyTerminationChargeInr === null
            ? "Not agreed"
            : formatInr(terms.earlyTerminationChargeInr)
        }
      />
    </Fields>
  );
}

function TermsForm({
  gym,
  onCancel,
  onSaved,
}: {
  gym: AdminGymView;
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  // Captured once, at mount, so the diff is against what the admin started from rather than
  // against a gym prop that a refetch could have replaced underneath them mid-edit.
  const [before] = useState<AdminTermsForm>(() => ({ ...gym.terms }));
  const form = useForm<AdminTermsForm>({
    resolver: zodResolver(adminTermsFormSchema),
    defaultValues: before,
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const earlyCharge = useEarlyTerminationChoice(form);

  async function onSubmit(values: AdminTermsForm) {
    setProblem(null);
    const patch = termsDiff(before, values);
    if (patch === null) {
      setProblem("Nothing changed, so nothing was sent.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await patchGymTerms(gym.gymId, patch);
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            form.setError(field as keyof AdminTermsForm, { message });
          }
        }
        // The server's own words. See the module docstring on why nothing here rewrites them.
        setProblem(result.error.message);
        return;
      }
      const changed = result.data.changed ?? Object.keys(patch);
      onSaved(
        `Saved. ${changed.length} ${changed.length === 1 ? "term" : "terms"} changed: ${changed.join(", ")}.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-5 space-y-4">
        {problem && <ErrorPanel message={problem} testId="terms-error" />}

        <div className="grid sm:grid-cols-2 gap-4">
          <NumberField control={form.control} name="securityDepositInr" label="Security deposit" prefix="₹" />
          <NumberField control={form.control} name="termMonths" label="Term (months)" />
          <NumberField
            control={form.control}
            name="gymSharePctBeforeMilestone"
            label="Gym share before milestone (%)"
          />
          <NumberField
            control={form.control}
            name="gymSharePctAfterMilestone"
            label="Gym share after milestone (%)"
          />
          <NumberField control={form.control} name="milestoneCups" label="Milestone (cups)" />
          <NumberField
            control={form.control}
            name="milestoneNetProfitInr"
            label="Milestone (net profit)"
            prefix="₹"
            description="§6.1's profit test: cumulative Net Profit, not gross sales."
          />
          <NumberField
            control={form.control}
            name="advertisingGymSharePct"
            label="Advertising, gym share (%)"
          />
          <NumberField
            control={form.control}
            name="electricityInrPerBlock"
            label="Electricity charge, per block"
            prefix="₹"
          />
          <NumberField
            control={form.control}
            name="electricityCupsPerBlock"
            label="Electricity block size (cups)"
          />
          <NumberField
            control={form.control}
            name="electricityReviewWindowMonths"
            label="Electricity review window (months)"
          />
          <NumberField
            control={form.control}
            name="settlementDaysAfterMonthEnd"
            label="Settlement (days after month end)"
          />
        </div>

        <div className="rounded-xl border border-border bg-secondary/50 p-4">
          {/*
            A plain heading, not `FormLabel` — that component reads error state off a `FormField`
            context via `useFormField`, and this sits above three radios and a conditionally
            rendered number field rather than inside one field.
          */}
          <p className="text-muted-foreground text-sm font-semibold">Early-termination charge</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2.5">
            §36.1: the standard term is nil if the gym gives 30 days' written notice. Zero and "not
            agreed" are different answers. A blank must not print as ₹0 in the agreement.
          </p>
          <div className="space-y-2">
            <Radio
              checked={earlyCharge.value === "zero"}
              onChange={() => earlyCharge.choose("zero")}
              label="Standard: nil, on 30 days' notice"
              testId="radio-early-termination-zero"
            />
            <Radio
              checked={earlyCharge.value === "amount"}
              onChange={() => earlyCharge.choose("amount")}
              label="A different amount"
              testId="radio-early-termination-amount"
            />
            {earlyCharge.value === "amount" && (
              <div className="pl-6 max-w-[220px]">
                <NumberField
                  control={form.control}
                  name="earlyTerminationChargeInr"
                  label="Amount"
                  hideLabel
                  prefix="₹"
                />
              </div>
            )}
            <Radio
              checked={earlyCharge.value === "unagreed"}
              onChange={() => earlyCharge.choose("unagreed")}
              label="Not agreed yet"
              testId="radio-early-termination-unagreed"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={isSaving}
            className="h-10 px-5 rounded-xl font-bold text-sm cursor-pointer"
            data-testid="button-save-terms"
          >
            {isSaving ? "Saving…" : "Save terms"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 px-5 rounded-xl cursor-pointer"
            data-testid="button-cancel-terms"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}

/**
 * The three-way choice behind `earlyTerminationChargeInr`.
 *
 * The wire value alone cannot drive this: it is a number-or-null, but "the admin picked 'a different
 * amount' and has not typed a digit yet" is also `undefined` — indistinguishable from "nothing
 * chosen" if the radio state were derived from the field value the way `zero` and `unagreed` are. So
 * the "amount" branch is the one choice held as its own state, and it is what the conditionally
 * rendered number field's visibility depends on; `zero` and `unagreed` stay derived straight from the
 * field so a field error from the server — which sets the value, not this state — still lands on the
 * right radio after a round trip. Same shape as `AdminInviteGym`'s copy, over a different form.
 */
function useEarlyTerminationChoice(form: ReturnType<typeof useForm<AdminTermsForm>>) {
  const value = form.watch("earlyTerminationChargeInr");
  const [pickedAmount, setPickedAmount] = useState(false);

  const current: "zero" | "amount" | "unagreed" | "none" =
    value === 0 && !pickedAmount
      ? "zero"
      : value === null
        ? "unagreed"
        : pickedAmount || typeof value === "number"
          ? "amount"
          : "none";

  function choose(choice: "zero" | "amount" | "unagreed") {
    if (choice === "zero") {
      setPickedAmount(false);
      form.setValue("earlyTerminationChargeInr", 0, { shouldValidate: true });
    } else if (choice === "unagreed") {
      setPickedAmount(false);
      form.setValue("earlyTerminationChargeInr", null, { shouldValidate: true });
    } else {
      setPickedAmount(true);
      // Leave the field to whatever the admin types next; clearing it here would erase a value
      // they are mid-way through re-entering after switching radios back and forth.
      if (current !== "amount") {
        form.setValue("earlyTerminationChargeInr", undefined as unknown as number, {
          shouldValidate: false,
        });
      }
    }
  }

  return { value: current, choose };
}

function Radio({
  checked,
  onChange,
  label,
  testId,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  testId: string;
}) {
  return (
    <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
      <input
        type="radio"
        name="early-termination-choice"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-primary cursor-pointer"
        data-testid={testId}
      />
      {label}
    </label>
  );
}
