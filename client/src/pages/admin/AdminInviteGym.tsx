"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, Check, Copy } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PARTNERSHIP } from "@shared/partnership/summary";
import { adminInviteFormSchema, toAdminInviteBody, type AdminInviteFormInput, type AdminInviteResult } from "@shared/admin/invite";
import { createGym } from "@/lib/adminApi";
import { useAdminGuard } from "./useAdminGuard";
import { AdminChecking, AdminShell } from "./AdminShell";
import { formatIstDateTime } from "./adminFormat";

/**
 * Invite a gym — §2.7's `POST /admin/gyms`: one form, eighteen fields, submitted once.
 *
 * ## Eleven fields live here no longer
 *
 * Legal entity name, entity type, GSTIN, both addresses, signatory name and designation used
 * to be typed here and then typed again by the gym at onboarding step 1 — the admin's copy
 * never became the row of record, only labour. They are gone from this screen entirely; the
 * gym supplies them, for real, at step 1. `shared/admin/invite.ts`'s module docstring has the
 * server side of this (`validateInviteDetails`) and the one field dropped rather than deferred
 * (`fssaiLicenceNumber`, already optional). `tradeName`, `noticesEmail` and `noticesPhone` stay
 * here because nothing after this point supplies them.
 *
 * Device number, serial number, accessories and installation date left the Machine section the
 * same way, for a related but distinct reason: those describe the *physical unit and its
 * logistics*, which are decided later, while model and value describe the hardware itself and
 * rarely change gym to gym. `shared/admin/invite.ts`'s docstring on `adminInviteMachineSchema`
 * and `validateInviteMachineInput` server-side explain why `deviceNo` gets a placeholder rather
 * than travelling blank the way the seven detail fields do — it is a DynamoDB partition key and
 * cannot be empty on a written row.
 *
 * ## No autosave, and terms that start at the standard figures
 *
 * **No autosave**: a half-filled invite going nowhere is not a state worth resuming — unlike
 * the wizard, where a gym owner is expected to leave and come back, an admin filling this in is
 * expected to finish it in one sitting. **Every commercial figure starts at `PARTNERSHIP`'s
 * standard terms**, editable inline — see `shared/admin/invite.ts`'s *"Terms default to
 * `PARTNERSHIP`"* section for why this is not the preset button that was deliberately left out
 * earlier: nothing is hidden behind a click, and the number an admin needs to check is already
 * the one on screen.
 *
 * ## All or nothing, and what "nothing" looks like on this screen
 *
 * `createInvitedGym` on the server is one transaction — five items, all or nothing — so there
 * is no partial state to render here either: either the call returns a link, or the form is
 * still exactly as the admin left it and nothing was created. `fieldErrors` come back
 * namespaced (`details.gstin`, `terms.termMonths`, `machine.deviceNo`) because the server
 * validates all four blocks before reporting any of them, and this form maps every one onto
 * its input in the same pass — one round trip should surface everything wrong with a long
 * form, not one field per submit.
 *
 * ## The link is shown exactly once
 *
 * Only `sha256(handle)` is stored server-side, so this screen is the one and only place the
 * URL exists after the call returns. Losing it means minting a new one with `POST …/invite`
 * from the gym's detail page, not reloading this one.
 */
export default function AdminInviteGym() {
  const guard = useAdminGuard();
  const [result, setResult] = useState<AdminInviteResult | null>(null);

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

      {result ? <InviteCreated result={result} /> : <InviteForm onCreated={setResult} />}
    </AdminShell>
  );
}

/** What the admin sees once the gym exists — the link, and nothing to edit. */
function InviteCreated({ result }: { result: AdminInviteResult }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.onboardingUrl);
      setCopied(true);
    } catch {
      // No clipboard permission or no secure context. The URL is already selectable text on
      // screen, so the admin can still copy it by hand — this button is a convenience, not
      // the only way to get the value out.
    }
  }

  return (
    <div className="max-w-lg" data-testid="invite-created">
      <h1 className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1">
        Gym created
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        Send this link to the gym. There is no email sender yet (§8) — this is the delivery
        mechanism.
      </p>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
          Onboarding link
        </p>
        <div className="flex items-center gap-2">
          <code
            className="flex-1 text-xs bg-gray-50 rounded-lg px-3 py-2.5 break-all"
            data-testid="invite-url"
          >
            {result.onboardingUrl}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="rounded-xl cursor-pointer flex-shrink-0"
            data-testid="button-copy-invite-url"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
        {/*
          Said plainly rather than assumed: only `sha256(handle)` is stored, so this is not a
          value that can be looked up again later. Losing it means a resend, not a reload.
        */}
        <p className="text-xs text-muted-foreground mt-2">
          This is the only time this link will be shown. If it is lost, resend it from the
          gym's detail page rather than looking for it here again.
        </p>
      </div>

      <dl className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-100 mb-6">
        <Row label="Expires" value={formatIstDateTime(result.expiresAt)} />
      </dl>

      <div className="flex items-center gap-3">
        <Button asChild className="rounded-xl cursor-pointer font-bold">
          <Link href={`/admin/gyms/${result.gymId}`} data-testid="link-view-gym">
            View this gym
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-xl cursor-pointer">
          <Link href="/admin/gyms">Back to all gyms</Link>
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Blank rather than absent for the seven deferred fields, even though the form never renders an
 * input for them: `adminInviteFormSchema` still describes the whole wire shape, and `""` is what
 * `validateInviteDetails` reads as "the gym will supply this" — the same value `toAdminInviteBody`
 * would produce from an input the admin left empty, just skipping the step of rendering one.
 */
const EMPTY_VALUES: AdminInviteFormInput = {
  details: {
    legalEntityName: "",
    entityType: "",
    tradeName: "",
    gstin: "",
    registeredAddress: "",
    installationAddress: "",
    signatoryName: "",
    signatoryDesignation: "",
    noticesEmail: "",
    noticesPhone: "",
  },
  // `PARTNERSHIP` is the standard partnership terms — see the module docstring on why a
  // prefilled, editable value is not the preset button that was ruled out.
  terms: {
    securityDepositInr: PARTNERSHIP.securityDepositInr,
    termMonths: PARTNERSHIP.initialTermMonths,
    gymSharePctBeforeMilestone: PARTNERSHIP.gymNetProfitSharePct.beforeMilestone,
    gymSharePctAfterMilestone: PARTNERSHIP.gymNetProfitSharePct.afterMilestone,
    milestoneCups: PARTNERSHIP.milestone.cups,
    milestoneNetProfitInr: PARTNERSHIP.milestone.cumulativeNetProfitInr,
    advertisingGymSharePct: PARTNERSHIP.advertisingGymSharePct,
    electricityInrPerBlock: PARTNERSHIP.electricity.inrPerBlock,
    electricityCupsPerBlock: PARTNERSHIP.electricity.cupsPerBlock,
    electricityReviewWindowMonths: PARTNERSHIP.electricity.reviewWindowMonths,
    settlementDaysAfterMonthEnd: PARTNERSHIP.settlementDaysAfterMonthEnd,
    earlyTerminationChargeInr: PARTNERSHIP.earlyTerminationChargeInr,
  },
  machine: {
    model: "MuscleBoxPro MBP-1",
    // No single published source for this the way `PARTNERSHIP` is for the commercial terms —
    // the figure the mock API and every fixture in this codebase use for the hardware's book
    // value, kept here so an admin overwrites a plausible number rather than a blank one.
    valueInr: 450_000,
  },
  invitedByName: "",
};

function InviteForm({ onCreated }: { onCreated: (result: AdminInviteResult) => void }) {
  const router = useRouter();
  const form = useForm<AdminInviteFormInput>({
    resolver: zodResolver(adminInviteFormSchema),
    defaultValues: EMPTY_VALUES,
    mode: "onBlur",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const earlyChargeChoice = useEarlyTerminationChoice(form);

  async function onSubmit(values: AdminInviteFormInput) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const response = await createGym(toAdminInviteBody(values));
      if (!response.ok) {
        if (response.error.fieldErrors) {
          for (const [field, message] of Object.entries(response.error.fieldErrors)) {
            // `invitedByName` arrives bare; the three blocks arrive namespaced
            // (`details.gstin`, `terms.termMonths`, `machine.deviceNo`) — both are valid
            // paths on this form already, so no translation is needed here.
            form.setError(field as keyof AdminInviteFormInput, { message });
          }
        }
        setServerError(response.error.message);
        return;
      }
      onCreated(response.data);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1
        className="text-2xl font-display font-black text-foreground uppercase tracking-tight mb-1"
        data-testid="invite-heading"
      >
        Invite a gym
      </h1>
      <p className="text-muted-foreground text-sm mb-6">
        One form, submitted once. There is no autosave — finish it in one sitting.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {serverError && (
            <div
              className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5"
              data-testid="invite-error"
            >
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-600 leading-relaxed">{serverError}</p>
            </div>
          )}

          <div
            className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4"
            data-testid="deferred-fields-note"
          >
            <p className="text-sm text-foreground leading-relaxed">
              Legal entity name, entity type, GSTIN, both addresses and the signatory are
              collected from the gym directly at step 1 of onboarding — there's nothing to enter
              for them here.
            </p>
          </div>

          <Section title="Gym">
            <TextField
              form={form}
              name="details.tradeName"
              label="Trade name"
              placeholder="Iron Temple Fitness"
              description="Used to build the onboarding link. The gym confirms its legal name and everything else at step 1."
            />
          </Section>

          <Section title="Contact for notices">
            <TextField form={form} name="details.noticesEmail" label="Notices email" type="email" />
            <TextField form={form} name="details.noticesPhone" label="Notices phone" />
          </Section>

          <Section
            title="Commercial terms"
            note="Prefilled with the standard partnership terms — check they're right for this gym before creating it."
          >
            <NumberField form={form} name="terms.securityDepositInr" label="Security deposit (₹)" />
            <NumberField form={form} name="terms.termMonths" label="Term (months)" />
            <NumberField form={form} name="terms.gymSharePctBeforeMilestone" label="Gym share before milestone (%)" />
            <NumberField form={form} name="terms.gymSharePctAfterMilestone" label="Gym share after milestone (%)" />
            <NumberField form={form} name="terms.milestoneCups" label="Milestone (cups)" />
            <NumberField form={form} name="terms.milestoneNetProfitInr" label="Milestone (net profit, ₹)" description="§6.1's profit test: cumulative Net Profit, not gross sales." />
            <NumberField form={form} name="terms.advertisingGymSharePct" label="Advertising, gym share (%)" />
            <NumberField form={form} name="terms.electricityInrPerBlock" label="Electricity charge (₹ per block)" />
            <NumberField form={form} name="terms.electricityCupsPerBlock" label="Electricity block size (cups)" />
            <NumberField form={form} name="terms.electricityReviewWindowMonths" label="Electricity review window (months)" />
            <NumberField form={form} name="terms.settlementDaysAfterMonthEnd" label="Settlement (days after month end)" />

            <div>
              {/*
                A plain label, not `FormLabel` — that component reads error state off a
                `FormField` context via `useFormField`, and this heading sits above three
                radios and a conditionally-rendered number field rather than inside one field.
              */}
              <p className="text-gray-700 text-sm font-semibold mb-0">Early-termination charge</p>
              <p className="text-xs text-muted-foreground mb-2">
                §36.1: the standard term is nil if the gym gives 30 days' written notice. Zero and
                "not agreed" are different answers — a blank must not print as ₹0 in the agreement.
              </p>
              <div className="space-y-2">
                <RadioOption
                  name="early-termination-choice"
                  checked={earlyChargeChoice.value === "zero"}
                  onChange={() => earlyChargeChoice.choose("zero")}
                  label="Standard — nil, on 30 days' notice"
                  testId="radio-early-termination-zero"
                />
                <RadioOption
                  name="early-termination-choice"
                  checked={earlyChargeChoice.value === "amount"}
                  onChange={() => earlyChargeChoice.choose("amount")}
                  label="A different amount"
                  testId="radio-early-termination-amount"
                />
                {earlyChargeChoice.value === "amount" && (
                  <div className="pl-6">
                    <NumberField form={form} name="terms.earlyTerminationChargeInr" label="Amount (₹)" hideLabel />
                  </div>
                )}
                <RadioOption
                  name="early-termination-choice"
                  checked={earlyChargeChoice.value === "unagreed"}
                  onChange={() => earlyChargeChoice.choose("unagreed")}
                  label="Not agreed yet"
                  testId="radio-early-termination-unagreed"
                />
              </div>
            </div>
          </Section>

          <Section
            title="Machine"
            note="Device number, serial number, accessories and installation date are assigned later, once a physical unit is chosen."
          >
            <TextField form={form} name="machine.model" label="Model" />
            <NumberField form={form} name="machine.valueInr" label="Value (₹)" />
          </Section>

          <Section title="Invite">
            <TextField
              form={form}
              name="invitedByName"
              label="Invited by"
              description="Whose name the gym reads on the invite. Leave blank to use your own."
            />
          </Section>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-11 px-6 rounded-xl font-bold text-sm cursor-pointer"
              data-testid="button-create-gym"
            >
              {isSubmitting ? "Creating…" : "Create gym and get link"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 rounded-xl cursor-pointer"
              onClick={() => router.push("/admin/gyms")}
              data-testid="button-cancel-invite"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

/**
 * The three-way choice behind `earlyTerminationChargeInr`.
 *
 * The wire value alone cannot drive this: it is a number-or-null, but "the admin picked
 * 'a different amount' and has not typed a digit yet" is also `undefined` — indistinguishable
 * from "nothing chosen" if the radio state were derived from the field value the way `zero`
 * and `unagreed` are. So the "amount" branch is the one choice held as its own state
 * (`pickedAmount`), and it is what the conditionally-rendered number field's visibility
 * depends on; `zero` and `unagreed` stay derived straight from the field so a field error
 * from the server — which sets the value, not this state — still lands on the right radio
 * after a round trip.
 */
function useEarlyTerminationChoice(form: ReturnType<typeof useForm<AdminInviteFormInput>>) {
  const value = form.watch("terms.earlyTerminationChargeInr");
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
      form.setValue("terms.earlyTerminationChargeInr", 0, { shouldValidate: true });
    } else if (choice === "unagreed") {
      setPickedAmount(false);
      form.setValue("terms.earlyTerminationChargeInr", null, { shouldValidate: true });
    } else {
      setPickedAmount(true);
      // Leave the field to whatever the admin types next; clearing it here would erase a
      // value they are mid-way through re-entering after switching radios back and forth.
      if (current !== "amount") {
        form.setValue("terms.earlyTerminationChargeInr", undefined as unknown as number, {
          shouldValidate: false,
        });
      }
    }
  }

  return { value: current, choose };
}

// ── Local helpers ───────────────────────────────────────────────────────────

const inputClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl";

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 space-y-4">
      <legend className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground px-1">{title}</legend>
      {note && <p className="text-xs text-muted-foreground -mt-2">{note}</p>}
      {children}
    </fieldset>
  );
}

type FieldProps = {
  // Concretely typed to this one form, same reasoning as `StepDetails.tsx`'s `FieldProps`:
  // these helpers exist only inside this file, so `name` is checked against the real (dotted)
  // field list without threading react-hook-form's generics through every call site.
  form: ReturnType<typeof useForm<AdminInviteFormInput>>;
  name: FieldPath<AdminInviteFormInput>;
  label: string;
  placeholder?: string;
  description?: string;
  hideLabel?: boolean;
};

function TextField({ form, name, label, placeholder, description, hideLabel, type }: FieldProps & { type?: string }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {!hideLabel && <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>}
          <FormControl>
            <Input
              {...field}
              type={type}
              value={typeof field.value === "string" ? field.value : ""}
              placeholder={placeholder}
              className={inputClass}
              data-testid={`input-${name}`}
            />
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function AreaField({ form, name, label, description }: FieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              rows={3}
              className="bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors rounded-xl resize-none"
              data-testid={`input-${name}`}
            />
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * A number input over a react-hook-form field, kept blank rather than `0` when the value is
 * undefined — a visible `0` in an untouched deposit field reads as a decision nobody made.
 * `valueAsNumber` on change, and an empty string becomes `undefined` rather than `NaN`, so a
 * cleared field goes back to "nothing typed" instead of failing validation as "not a number".
 */
function NumberField({ form, name, label, description, hideLabel }: FieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {!hideLabel && <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>}
          <FormControl>
            <Input
              ref={field.ref}
              name={field.name}
              onBlur={field.onBlur}
              type="number"
              inputMode="numeric"
              value={typeof field.value === "number" && !Number.isNaN(field.value) ? field.value : ""}
              onChange={(event) => {
                const raw = event.target.value;
                field.onChange(raw === "" ? undefined : event.target.valueAsNumber);
              }}
              className={inputClass}
              data-testid={`input-${name}`}
            />
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function RadioOption({
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
