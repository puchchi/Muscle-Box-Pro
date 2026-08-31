"use client";

import { useEffect, useRef } from "react";
import type { FieldErrors, FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { AlertCircle } from "lucide-react";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { scrollIntoViewGently } from "@/lib/motion";
import DraftIndicator from "../../onboarding/DraftIndicator";
import type { DraftStatus } from "../../onboarding/useDraftAutosave";

/**
 * The form parts, shared by the five franchise steps that submit a record.
 *
 * `steps/StepDetails.tsx` in the gym flow keeps this same set of helpers as file-local
 * functions, typed concretely to `GymDetails`, and that was the right call for one long form.
 * Here there are five: details, territory, operations, the payment claim and the password. Five
 * copies of `Field` is four places for an `aria-invalid` fix to be missed, so these are generic
 * over the form's own values instead and the price is react-hook-form's type parameters.
 *
 * Every class string and every decision in here is the gym flow's, carried over rather than
 * reasoned out again. The load-bearing ones, so they are not "tidied" back into bugs:
 *
 * - `disabled:opacity-100` with an explicit grey. shadcn's `opacity-50` puts 44%-grey label
 *   text at 22%, and the read-only view of a submitted step is exactly where someone goes to
 *   check what they typed.
 * - `aria-[invalid=true]` styling on the input itself, plus the icon. A red message beside an
 *   untouched-looking grey box is colour as the only signal, twice.
 * - The wrapper `div` sits *outside* `FormControl`. `FormControl` is a Radix `Slot` and clones
 *   its single child to attach the id, `aria-describedby` and `aria-invalid`; give it a div and
 *   all three land on the div and the field is silently unlabelled.
 * - `text-base sm:text-sm` on controls, because iOS zooms the page for anything under 16px.
 */

export { Form };

/** `text-destructive` is 3.8:1 on white. `red-700` is 6.3:1 and reads as the same red. */
const ERROR_TEXT = "text-red-700 text-xs font-medium flex items-start gap-1.5";

const inputClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-500 focus:border-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors h-11 rounded-xl " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50 " +
  "disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed";

const areaClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-500 focus:border-primary focus:bg-white focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors rounded-xl resize-none " +
  "aria-[invalid=true]:border-red-400 aria-[invalid=true]:bg-red-50 " +
  "disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed";

/**
 * A card of related fields.
 *
 * `<fieldset>`/`<legend>` for the grouping a screen reader needs, with the legend floated to a
 * full-width block rather than left in the gap a browser cuts for it in the top border, and an
 * `h2` inside it because a legend groups but does not navigate.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
      <legend className="float-left w-full mb-4">
        <h2 className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </legend>
      <div className="clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

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

type BaseFieldProps<T extends FieldValues> = {
  form: UseFormReturn<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  description?: string;
  /** Says so on the label. The schema is the truth; this stops it being a guess. */
  optional?: boolean;
  disabled?: boolean;
};

type FieldProps<T extends FieldValues> = BaseFieldProps<T> & {
  type?: string;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  /** Renders the value uppercase and stops a phone auto-capitalising the first letter only. */
  uppercase?: boolean;
  /**
   * Parses to a number rather than a string.
   *
   * Needed because two of these forms hold quantities: a warehouse area we compare against a
   * requirement, and money. `valueAsNumber` gives `NaN` for an empty box, which is what the
   * schemas' `invalid_type_error` messages are written for.
   */
  numeric?: boolean;
  /**
   * Holds paise and shows rupees.
   *
   * The record is integer paise everywhere in this flow, and nobody types a paise figure for a
   * bank transfer. Converting in the one control that has the problem keeps the field name, the
   * schema and the server's error key all on `amountPaise`, which is what a translation in the
   * submit handler would have quietly broken.
   */
  rupees?: boolean;
  /** A number for a numeric box, an ISO date for a `date` one. */
  max?: number | string;
};

/** What the input shows for a value the form holds. */
function toInput(value: unknown, numeric: boolean, rupees: boolean): string | number {
  if (!numeric && !rupees) return (value as string | undefined) ?? "";
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  return rupees ? value / 100 : value;
}

/** What the form holds for what was typed. `NaN` on an empty box is what the schemas expect. */
function fromInput(input: HTMLInputElement, numeric: boolean, rupees: boolean): string | number {
  if (!numeric && !rupees) return input.value;
  if (!rupees) return input.valueAsNumber;
  return Math.round(input.valueAsNumber * 100);
}

export function Field<T extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  description,
  type,
  autoComplete,
  inputMode,
  uppercase,
  numeric = false,
  rupees = false,
  max,
  optional,
  disabled,
}: FieldProps<T>) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <Label optional={optional}>{label}</Label>
          <div className="relative">
            <FormControl>
              <Input
                {...field}
                // A `NaN` from a cleared numeric box would render as the string "NaN" and be
                // impossible to delete.
                value={toInput(field.value, numeric, rupees)}
                onChange={(event) => field.onChange(fromInput(event.target, numeric, rupees))}
                type={numeric || rupees ? "number" : type}
                max={max}
                inputMode={numeric || rupees ? "numeric" : inputMode}
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

export function AreaField<T extends FieldValues>({
  form,
  name,
  label,
  placeholder,
  description,
  rows = 3,
  optional,
  disabled,
}: BaseFieldProps<T> & { rows?: number }) {
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
              rows={rows}
              placeholder={placeholder}
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

/**
 * A native `<select>`, rather than the Radix one, for the reason the gym flow's entity-type
 * field gives: these are short lists and the native control is what a phone renders best.
 *
 * The blank first option exists only where the schema has no default. An enum with no answer
 * yet must not read as though the first value was chosen, which is the whole point of
 * `temperatureControl` being `"yes" | "no"` rather than a boolean.
 */
export function SelectField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  options,
  placeholder,
  optional,
  disabled,
}: BaseFieldProps<T> & { options: readonly { value: string; label: string }[] }) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem>
          <Label optional={optional}>{label}</Label>
          <FormControl>
            <select
              {...field}
              value={field.value ?? ""}
              disabled={disabled}
              aria-required={!optional || undefined}
              data-testid={`select-${name}`}
              className={`w-full min-h-11 rounded-xl border bg-gray-50 px-3 text-base sm:text-sm text-foreground transition-colors focus:border-primary focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700 ${
                fieldState.error ? "border-red-400 bg-red-50" : "border-gray-200 cursor-pointer"
              }`}
            >
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage className={ERROR_TEXT} />
        </FormItem>
      )}
    />
  );
}

/**
 * What is wrong, at the top, with a way to each one.
 *
 * The gym flow's `ErrorSummary`, generic over the form. Its reasoning, unchanged: buttons that
 * call `setFocus` rather than anchors, because these ids come from `useId` and are not
 * addressable and moving focus is what helps a mouse, a keyboard and a screen reader alike;
 * `role="alert"` on a node that only exists once there is something to say; focus moved to the
 * container so those buttons are the next tab stops rather than leaving focus on a submit
 * button below the whole form; and announced once per submit, tracked by a ref rather than an
 * effect keyed on `submitCount`, because a server-side rejection arrives a render after the
 * count moves.
 *
 * `errors` and `submitCount` come in as values. `formState` is a proxy that only registers a
 * re-render subscription for the component that called `useForm`, so a child reading it goes
 * stale.
 */
export function ErrorSummary<T extends FieldValues>({
  errors,
  submitCount,
  labels,
  onGoToField,
}: {
  errors: FieldErrors<T>;
  submitCount: number;
  labels: Partial<Record<FieldPath<T>, string>>;
  onGoToField(name: FieldPath<T>): void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const names = Object.keys(errors) as FieldPath<T>[];
  const announced = useRef(0);

  useEffect(() => {
    if (submitCount === 0 || names.length === 0) return;
    if (announced.current === submitCount) return;
    announced.current = submitCount;
    scrollIntoViewGently(ref.current, { block: "start" });
    ref.current?.focus({ preventScroll: true });
  });

  // Only after a submit has been rejected. A summary that appears while someone is still
  // filling the form in is nagging rather than help.
  if (submitCount === 0 || names.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-2xl border border-red-300 bg-red-50 p-4 outline-none scroll-mt-[calc(var(--onboarding-chrome,0px)_+_1rem)]"
      data-testid="step-error-summary"
    >
      <p className="text-sm font-bold text-red-800 flex items-center gap-2">
        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        {names.length === 1
          ? "One field needs another look"
          : `${names.length} fields need another look`}
      </p>
      <ul role="list" className="mt-1.5">
        {names.map((name) => (
          <li key={name}>
            <button
              type="button"
              onClick={() => onGoToField(name)}
              className="py-1.5 text-sm text-red-800 underline decoration-red-400 hover:decoration-red-800 cursor-pointer text-left rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SummaryMessage
                label={labels[name] ?? String(name)}
                message={
                  // `errors[name]` is a `FieldError` whose `message` is typed loosely enough
                  // that TypeScript cannot narrow it through the index.
                  (errors[name] as { message?: string } | undefined)?.message
                }
              />
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
 * A message that already opens with its own label keeps its wording and just gets the label
 * emboldened, because server-side messages tend to lead with the field name and prepending it
 * again produced "GSTIN: GSTIN is required." Sliced rather than substituted, so the sentence
 * stays in the casing whoever wrote it chose.
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

/**
 * The sticky footer: what happens next, whether the draft is saved, and the button.
 *
 * Sticky for the gym flow's reason. Continue sits below a long form, and the draft indicator
 * beside it is the only evidence anyone has that closing the tab is safe; both were previously
 * reachable only by scrolling to the very bottom.
 *
 * `nextHint` is required rather than optional on purpose. Every one of these buttons is on a
 * screen where someone is deciding whether pressing it commits them to a ₹25 lakh programme,
 * and the answer belongs next to the button rather than in the step they land on.
 *
 * `onClick` makes it a plain button instead of a submit. Two of these steps have nothing to
 * validate client-side — a list of uploads, an acknowledgement — so they are not forms, and a
 * `type="submit"` button outside a form is a control that silently does nothing.
 */
export function SubmitBar({
  nextHint,
  draftStatus,
  isSubmitting,
  label = "Continue",
  busyLabel = "Saving...",
  disabled,
  onClick,
}: {
  nextHint: React.ReactNode;
  draftStatus?: DraftStatus;
  isSubmitting: boolean;
  label?: string;
  busyLabel?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-4 bg-gray-50/95 backdrop-blur border-t border-gray-200 space-y-2">
      <p className="text-xs text-muted-foreground">{nextHint}</p>
      <div className="flex items-center justify-between gap-4">
        {draftStatus ? <DraftIndicator status={draftStatus} /> : <span />}
        <Button
          type={onClick ? "button" : "submit"}
          onClick={onClick}
          disabled={isSubmitting || disabled}
          className="min-h-11 px-6 rounded-xl font-bold text-sm cursor-pointer"
          data-testid="button-continue"
        >
          {isSubmitting ? busyLabel : label}
        </Button>
      </div>
    </div>
  );
}

/**
 * Server-side validation messages, onto the same inputs as client-side ones.
 *
 * Without this a rule the client does not know about shows only in the shell's banner, and the
 * franchisee has to guess which of fourteen inputs it meant. Filtered by `owns` so a field
 * error for a different step's record is left to the banner rather than dropped.
 */
export function useServerFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldErrors: Record<string, string> | null,
  owns: (field: string) => boolean,
): void {
  useEffect(() => {
    if (!fieldErrors) return;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (owns(field)) form.setError(field as FieldPath<T>, { message });
    }
    // `owns` is a fresh closure on every render and is a pure predicate, so it is deliberately
    // not a dependency: including it would re-run this effect on every render and re-assert
    // errors the franchisee is in the middle of fixing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldErrors, form]);
}
