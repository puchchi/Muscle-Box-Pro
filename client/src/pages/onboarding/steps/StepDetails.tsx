"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { scrollIntoViewGently } from "@/lib/motion";
import { ENTITY_TYPE_LABELS, gymDetailsSchema } from "@shared/onboarding/schema";
import type { GymDetails } from "@shared/onboarding/types";
import { useDraftAutosave } from "../useDraftAutosave";
import DraftIndicator from "../DraftIndicator";
import type { StepViewProps } from "../types";

/**
 * Step 1 — Confirm your details.
 *
 * Details come first so the data is captured before anyone can drop off, and so
 * every screen after this can address the gym by its own name with its own terms.
 *
 * The one field worth being careful about is the legal entity name. It is rendered
 * into the agreement, and the signature hash covers that rendering — so a typo
 * caught here is free, and the same typo caught after signing needs an amendment.
 * That is what the preview panel is for.
 */
export default function StepDetails({ token, state, readOnly, isSubmitting, fieldErrors, actions }: StepViewProps) {
  const form = useForm<GymDetails>({
    resolver: zodResolver(gymDetailsSchema),
    // The draft wins over the submitted values: if there is a draft, it is by
    // definition more recent than whatever was last submitted.
    defaultValues: { ...state.details, ...(state.drafts.details ?? {}) },
    mode: "onBlur",
  });

  const values = form.watch();
  const draft = useDraftAutosave(token, "details", values, { enabled: !readOnly });

  /**
   * "The machine will stand at the registered address."
   *
   * Deliberately *not* a field on `GymDetails`, because it is not a fact about the gym — the
   * agreement has two addresses (§41 serves notices at one, Schedule A locates the machine at the
   * other) and they happen to coincide. Storing a "same" flag would make the wire carry a
   * question the contract does not ask, and would leave the two schemas to argue about which
   * field wins.
   *
   * So its initial state is *derived* instead: two identical, non-empty addresses is what having
   * ticked it looks like after a reload, which is the only thing a reopened draft needs it to
   * survive as.
   */
  const [sameAddress, setSameAddress] = useState(() => {
    const registered = (values.registeredAddress || "").trim();
    return registered !== "" && registered === (values.installationAddress || "").trim();
  });

  // Kept in sync while ticked, rather than copied once on tick: the gym may well tick this before
  // finishing the registered address, and a one-shot copy would leave the machine's location as
  // whatever half-sentence was in the box at that moment.
  useEffect(() => {
    if (!sameAddress || readOnly) return;
    form.setValue("installationAddress", values.registeredAddress, {
      // Without `shouldDirty` a mirrored address is not part of the values the autosave watches,
      // and a refresh would lose it.
      shouldDirty: true,
      // Only when there is already a message to clear. Validating on every keystroke would print
      // "include the full address where the machine will stand" under a field nobody is typing in,
      // while they are still typing the address above it.
      shouldValidate: form.getFieldState("installationAddress").error !== undefined,
    });
  }, [sameAddress, readOnly, values.registeredAddress, form]);

  // Server-side validation messages land on the same inputs as client-side ones.
  // Without this, a rule the client doesn't know about shows only in the summary
  // banner and the gym has to guess which field it meant.
  useEffect(() => {
    if (!fieldErrors) return;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field in state.details) form.setError(field as keyof GymDetails, { message });
    }
  }, [fieldErrors, form, state.details]);

  async function onSubmit(details: GymDetails) {
    // Flush before submitting so a rejected submit still leaves the typing saved.
    await draft.flush();
    await actions.submitDetails(details);
  }

  const legalName = form.watch("legalEntityName");

  /*
    Read here rather than inside `ErrorSummary`. `formState` is a proxy that records
    which slices a component uses in order to decide what to re-render, and it only
    tracks reads made by the component that called `useForm`. Reading `errors` in a
    child would subscribe nothing, and the summary would appear a render late or not
    at all.
  */
  const { errors, submitCount } = form.formState;

  return (
    <Form {...form}>
      {/*
        The introduction that used to sit here now renders in the shell, above the page
        heading rather than below it — see `showIntro` in OnboardingFlow. It was never
        part of the form, and it had to move to get the reading order right.
      */}
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/*
          Eleven fields over three cards is more than fits a screen, so a rejected
          submit has to name what is wrong at the top as well as marking it in place —
          otherwise the button appears to do nothing and the problem is two scrolls away.
        */}
        {/*
          This owns the scroll unconditionally, which it did not use to. A server-side
          rejection arrived as `fieldErrors` *and* as the shell's own banner directly
          above, both calling `scrollIntoView` in the same paint — so the summary sat out
          that case to stop the two animations racing. The shell now suppresses its banner
          whenever this summary is going to name the same fields (see
          `stepOwnsFieldErrors`), so there is one red box and one scroll, and the condition
          that used to be a prop here has nothing left to decide.
        */}
        <ErrorSummary
          errors={errors}
          submitCount={submitCount}
          onGoToField={(name) => form.setFocus(name)}
        />

        <Section title="The entity signing">
          <Field
            form={form}
            name="legalEntityName"
            label="Legal entity name"
            placeholder="Iron Temple Fitness Private Limited"
            description="Exactly as registered. This goes into the agreement."
            autoComplete="organization"
            disabled={readOnly}
          />

          <AgreementPreview legalName={legalName} />

          <FormField
            control={form.control}
            name="entityType"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-gray-700 text-sm font-semibold">Entity type</FormLabel>
                <FormControl>
                  {/*
                    A native select rather than the Radix one: it is a short list, and the native
                    control is what a phone renders best. The options come from
                    `ENTITY_TYPE_LABELS` in key order, so adding a member there adds it here.
                  */}
                  <select
                    {...field}
                    disabled={readOnly}
                    data-testid="select-entity-type"
                    className={`w-full min-h-11 rounded-xl border bg-gray-50 px-3 text-base sm:text-sm text-foreground transition-colors focus:border-primary focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700 ${
                      fieldState.error ? "border-red-400 bg-red-50" : "border-gray-200 cursor-pointer"
                    }`}
                  >
                    {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage className={ERROR_TEXT} />
              </FormItem>
            )}
          />

          <Field
            form={form}
            name="tradeName"
            label="Trade name"
            placeholder="Iron Temple Fitness"
            description="The name on the door, if it differs. Leave blank if it's the same."
            optional
            disabled={readOnly}
          />
          {/*
            Optional since 2026-08-24. It is an invoicing field, not a contractual one — the
            agreement never renders it (see `toAgreementFields`) — so a gym that is not registered,
            or does not have the certificate to hand, should not be stopped at step 1 by it. A
            number that *is* typed is still checked, because a transposed digit here bills the
            wrong entity for the whole term.

            No description: the placeholder shows the shape and "Optional" answers the only
            question a gym owner actually has about this field. A line explaining what a GSTIN is
            to the person who holds one is noise on a form that is already eleven fields long.
          */}
          <Field
            form={form}
            name="gstin"
            label="GSTIN"
            placeholder="29AABCU9603R1ZM"
            // Typed in lowercase more often than not, and the schema uppercases on
            // parse anyway — so the box may as well show what will be stored.
            uppercase
            optional
            disabled={readOnly}
          />
        </Section>

        <Section title="Addresses">
          <AreaField
            form={form}
            name="registeredAddress"
            label="Registered address"
            placeholder="Building, street, area, city, state, PIN"
            autoComplete="street-address"
            disabled={readOnly}
          />

          {/*
            Most single-site gyms install the machine at the address they are registered at, and
            re-typing a postal address is where a typo that reaches Schedule A comes from. Hidden
            on a revisit: there is nothing to tick when both fields are disabled anyway.
          */}
          {!readOnly && (
            <label
              htmlFor="same-address"
              // `py-2.5 -my-2.5` gets the pressable row to 44px without drawing a 44px
              // checkbox. The box stays 16px; the target around it does not.
              className="flex items-start gap-2.5 cursor-pointer py-2.5 -my-2.5"
            >
              <input
                id="same-address"
                type="checkbox"
                checked={sameAddress}
                onChange={(event) => setSameAddress(event.target.checked)}
                className="w-4 h-4 mt-0.5 flex-shrink-0 accent-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="checkbox-same-address"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                The machine will stand at the registered address
              </span>
            </label>
          )}

          <AreaField
            form={form}
            name="installationAddress"
            label="Installation address"
            placeholder="Building, street, area, city, state, PIN"
            description={
              sameAddress
                ? "Taken from the registered address. Untick above to enter a different one."
                : "Where the machine will actually stand."
            }
            // Disabled rather than hidden while ticked: the gym still has to be able to read the
            // address it is agreeing to, and this field is what Schedule A is built from.
            disabled={readOnly || sameAddress}
          />
        </Section>

        <Section title="Who signs, and where we write">
          <Field
            form={form}
            name="signatoryName"
            label="Signatory name"
            placeholder="Rohit Menon"
            // The clause number this used to carry (§32) is gone from the sentence, not the point
            // of it: step 3 asks this same person to tick that they are authorised to bind the
            // entity, so saying it here is what stops that tick being the first they hear of it.
            description="Who signs for the entity, and can bind it."
            autoComplete="name"
            disabled={readOnly}
          />
          <Field
            form={form}
            name="signatoryDesignation"
            label="Designation"
            placeholder="Director"
            description="Director, Partner, Proprietor: their title in the entity above."
            autoComplete="organization-title"
            disabled={readOnly}
          />
          <Field
            form={form}
            name="noticesEmail"
            label="Notices email"
            type="email"
            inputMode="email"
            placeholder="rohit@irontemple.in"
            autoComplete="email"
            disabled={readOnly}
          />
          <Field
            form={form}
            name="noticesPhone"
            label="Notices phone"
            type="tel"
            inputMode="tel"
            placeholder="+91 98765 43210"
            description="For the site survey and installation calls."
            autoComplete="tel"
            disabled={readOnly}
          />
        </Section>

        {!readOnly && (
          // Sticky, because Continue sits below eleven fields and the draft indicator
          // beside it is the only evidence a gym has that closing the tab is safe.
          // Both were only reachable by scrolling to the very bottom.
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-4 bg-gray-50/95 backdrop-blur border-t border-gray-200 space-y-2">
            {/* Says what the button does *not* do. Nobody fills in a GSTIN happily
                if they think Continue might be the thing that commits them. */}
            <p className="text-xs text-muted-foreground">
              Next you'll see your terms. There is nothing to sign until step 3.
            </p>
            <div className="flex items-center justify-between gap-4">
              <DraftIndicator status={draft.status} />
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-h-11 px-6 rounded-xl font-bold text-sm cursor-pointer"
                data-testid="button-continue"
              >
                {isSubmitting ? "Saving..." : "Continue"}
              </Button>
            </div>
          </div>
        )}
      </form>
    </Form>
  );
}

// ── Local helpers ───────────────────────────────────────────────────────────

/**
 * `text-destructive` is `#EF4444` — 3.8:1 on white, and it was the colour of every
 * validation message in this flow. `red-700` is 6.3:1 and reads as the same red.
 */
const ERROR_TEXT = "text-red-700 text-xs font-medium flex items-start gap-1.5";

const inputClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-500 focus:border-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors h-11 rounded-xl " +
  // A red message beside an untouched-looking grey box is colour-as-the-only-signal
  // twice over: the field itself has to show it is the one being complained about.
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50 " +
  // shadcn's `disabled:opacity-50` puts 44%-grey label text at 22% — unreadable, on
  // the exact screens a gym revisits to check what it typed. A locked field should
  // look locked and stay legible.
  "disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed";

const areaClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-500 focus:border-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors rounded-xl resize-none " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50 " +
  "disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed";

/**
 * A card of related fields.
 *
 * `<fieldset>`/`<legend>` for the grouping, which is what a screen reader needs — but
 * the legend is floated to a full-width block instead of being left to sit in the gap
 * a browser cuts for it in the top border, where it rendered as a label straddling the
 * card's edge.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      {/*
        An `h2` *inside* the legend — which the HTML spec allows, legend taking phrasing
        content optionally intermixed with heading content. The fieldset is what a screen
        reader needs to group eleven fields; the heading is what it needs to *navigate*
        them, and a legend is not a heading. Without it, the longest form in the flow was
        the one step with nothing between its `h1` and its inputs.
      */}
      <legend className="float-left w-full mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

/**
 * The live preview, sitting directly under the field it previews.
 *
 * Seeing their own legal name land in the contract is what turns a form into a contract
 * negotiation, and it catches typos in the one field that is hardest to fix afterwards —
 * the signature hash covers the rendered name, so a typo found here is free and the same
 * typo found after signing needs an amendment.
 *
 * It used to be a card of its own above the whole form, which meant that on a phone the
 * sentence had scrolled off the top by the time anybody typed the name into it: the one
 * moment the panel exists for was the one moment it was not on screen. Cause and effect
 * now share a viewport at every width.
 *
 * Inset, tinted, and an `h3` rather than a fourth white card with a fake heading: it is
 * a consequence of the field above it, not a section alongside it. The tint is the same
 * `primary/5` on `primary/20` the deposit receipt uses, and deliberately not the
 * `gray-50` every input in this form is filled with — an inset grey box inside a form
 * card reads as another thing to type in.
 *
 * No live region. This rewrites on every keystroke of a company name, and
 * `aria-live="polite"` here would queue an announcement per character; the field's own
 * description already carries the point ("This goes into the agreement") to anyone who
 * cannot see the sentence change.
 */
function AgreementPreview({ legalName }: { legalName?: string }) {
  return (
    <div
      className="rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3"
      data-testid="agreement-preview"
    >
      <h3 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
        In your agreement
      </h3>
      <p className="text-sm text-foreground leading-relaxed max-w-[56ch]">
        This Agreement is between <strong>BlendBox Innovations LLP</strong> and{" "}
        {legalName?.trim() ? (
          <strong data-testid="preview-legal-name">{legalName.trim()}</strong>
        ) : (
          <span className="text-muted-foreground italic">your legal entity name</span>
        )}
        .
      </p>
    </div>
  );
}

/** Field name → the words the summary uses. Keyed off the schema's own shape. */
const FIELD_LABELS: Record<keyof GymDetails, string> = {
  legalEntityName: "Legal entity name",
  entityType: "Entity type",
  tradeName: "Trade name",
  gstin: "GSTIN",
  // No input carries this any more (removed 2026-08-24), and the label stays because the record is
  // keyed off `GymDetails` — which still has the field so old values round-trip. If the server ever
  // returns a `fieldError` on it, the summary should name it in words rather than print the key,
  // even though the button next to it has nothing on screen to focus.
  fssaiLicenceNumber: "FSSAI licence number",
  registeredAddress: "Registered address",
  installationAddress: "Installation address",
  signatoryName: "Signatory name",
  signatoryDesignation: "Designation",
  noticesEmail: "Notices email",
  noticesPhone: "Notices phone",
};

/**
 * What is wrong, at the top, with a way to each one.
 *
 * The buttons call `setFocus` rather than linking to an anchor, because the ids on
 * these inputs come from `useId` and are not addressable — and moving focus is the
 * behaviour that actually helps, since it works the same for a mouse, a keyboard and a
 * screen reader.
 *
 * `role="alert"` on a node that only exists once there is something to say, so it is
 * announced when it appears rather than being a permanently-live region.
 *
 * Focus moves here on every rejection, which is the half that was missing: the page
 * scrolled to the summary while focus stayed on the Continue button at the bottom of
 * eleven fields, so the next Tab for a keyboard user started below everything the summary
 * had just offered them. Focusing the container makes those field buttons the immediately
 * following tab stops. (It is also why the container is focusable but not tabbable.)
 *
 * Takes `errors` and `submitCount` as values rather than reading them off the form:
 * `formState` only registers a re-render subscription for the component that called
 * `useForm`, so a child that reached into it would go stale.
 */
function ErrorSummary({
  errors,
  submitCount,
  onGoToField,
}: {
  errors: FieldErrors<GymDetails>;
  submitCount: number;
  onGoToField(name: keyof GymDetails): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const names = Object.keys(errors) as (keyof GymDetails)[];

  /**
   * The last submit this announced itself for.
   *
   * Not a `useEffect` keyed on `submitCount`, because the two ways a submit gets rejected
   * arrive on different renders. A client-side rejection has the errors in place on the
   * render that bumped `submitCount`; a server-side one bumps `submitCount` first and gets
   * its messages a round trip later, from the `setError` loop above — at which point an
   * effect keyed on the count has already run and found `ref.current` still null. So the
   * trigger is "there is now something to announce, and it belongs to a submit we have not
   * announced yet", which covers both.
   *
   * The ref is what keeps it to once per submit. Re-scrolling as each field is fixed would
   * yank the page away from the field being fixed.
   */
  const announced = useRef(0);

  useEffect(() => {
    if (submitCount === 0 || names.length === 0) return;
    if (announced.current === submitCount) return;
    announced.current = submitCount;
    // `start` rather than `center`, so the `scroll-mt` below — which exists to clear the
    // sticky rail — is applied to the edge it names.
    scrollIntoViewGently(ref.current, { block: "start" });
    // The scroll is already handled, and letting focus scroll again would fight it.
    ref.current?.focus({ preventScroll: true });
  });

  // Only after a submit has actually been rejected. On-blur errors mark their own
  // field; a summary that appears while somebody is still filling the form in is
  // nagging rather than help.
  if (submitCount === 0 || names.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-2xl border border-red-300 bg-red-50 p-4 outline-none scroll-mt-[calc(var(--onboarding-chrome,0px)_+_1rem)]"
      data-testid="details-error-summary"
    >
      <p className="text-sm font-bold text-red-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        {names.length === 1
          ? "One field needs another look"
          : `${names.length} fields need another look`}
      </p>
      {/*
        `text-sm` and a padded row, where this was 12px text on 4px gaps. These are the
        recovery affordance on a form that has just refused to submit, and they were both
        the smallest type on the screen and stacked targets under SC 2.5.8's 24px — on a
        phone, two red lines a thumb-width apart. `py-1.5` on an inline-block gets the row
        to 26px without drawing a button.
      */}
      <ul role="list" className="mt-1.5">
        {names.map((name) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => onGoToField(name)}
              className="py-1.5 text-sm text-red-800 underline decoration-red-400 hover:decoration-red-800 cursor-pointer text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SummaryMessage label={FIELD_LABELS[name]} message={errors[name]?.message} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One line of the summary: which field, and what is wrong with it.
 *
 * The field name is prepended because a message on its own ("Enter the full registered
 * name of the entity signing") does not say which of eleven inputs it belongs to. But
 * server-side messages tend to lead with the field name already, and prepending it then
 * produced "GSTIN — GSTIN is required." — a stutter that reads as a bug in the page rather
 * than a problem with the form. So a message that already opens with its own label keeps
 * its wording and just gets the label emboldened, which is what the em dash was doing.
 *
 * Sliced out of `message` rather than substituted, so the sentence stays in the casing
 * whoever wrote it chose.
 */
function SummaryMessage({ label, message }: { label: string; message?: string }) {
  if (!message) return <span className="font-semibold">{label}</span>;
  if (message.toLowerCase().startsWith(label.toLowerCase())) {
    return (
      <>
        <span className="font-semibold">{message.slice(0, label.length)}</span>
        {message.slice(label.length)}
      </>
    );
  }
  return (
    <>
      <span className="font-semibold">{label}</span>: {message}
    </>
  );
}

type FieldProps = {
  // Concretely typed to this one form rather than generic over any form: these
  // helpers exist only inside this file, so `name` gets checked against the real
  // field list without threading react-hook-form's generics through them.
  form: ReturnType<typeof useForm<GymDetails>>;
  name: keyof GymDetails;
  label: string;
  placeholder?: string;
  description?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  /** Renders the value uppercase and stops a phone auto-capitalising the first letter only. */
  uppercase?: boolean;
  /** Says so on the label. The schema is the truth; this stops it being a guess. */
  optional?: boolean;
  disabled?: boolean;
};

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <FormLabel className="text-gray-700 text-sm font-semibold flex items-baseline gap-2">
      {children}
      {optional && (
        <span className="text-[11px] font-medium normal-case text-muted-foreground">Optional</span>
      )}
    </FormLabel>
  );
}

function Field({
  form,
  name,
  label,
  placeholder,
  description,
  type,
  autoComplete,
  inputMode,
  uppercase,
  optional,
  disabled,
}: FieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <Label optional={optional}>{label}</Label>
          {/*
            The wrapper sits *outside* `FormControl` on purpose. `FormControl` is a Radix
            `Slot`: it clones its single child to attach the id, `aria-describedby` and
            `aria-invalid`. Give it a `<div>` and every one of those lands on the div
            instead of the input, silently unlabelling the field.
          */}
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                type={type}
                inputMode={inputMode}
                autoComplete={autoComplete}
                autoCapitalize={uppercase ? "characters" : undefined}
                spellCheck={uppercase ? false : undefined}
                aria-required={!optional || undefined}
                placeholder={placeholder}
                disabled={disabled}
                className={`${inputClass} ${uppercase ? "uppercase placeholder:normal-case" : ""} ${
                  fieldState.error ? "pr-10" : ""
                }`}
                data-testid={`input-${name}`}
              />
            </FormControl>
            {/* The non-colour half of the invalid signal, on the field itself. */}
            {fieldState.error && (
              <AlertCircle
                className="w-4 h-4 text-red-600 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            )}
          </div>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage className={ERROR_TEXT} />
        </FormItem>
      )}
    />
  );
}

function AreaField({
  form,
  name,
  label,
  placeholder,
  description,
  autoComplete,
  optional,
  disabled,
}: Omit<FieldProps, "type" | "inputMode" | "uppercase">) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <Label optional={optional}>{label}</Label>
          <FormControl>
            <Textarea
              {...field}
              rows={3}
              placeholder={placeholder}
              autoComplete={autoComplete}
              aria-required={!optional || undefined}
              disabled={disabled}
              className={areaClass}
              data-testid={`input-${name}`}
            />
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage className={ERROR_TEXT} />
        </FormItem>
      )}
    />
  );
}
