"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { FieldErrors, FieldPath, FieldValues, UseFormReturn } from "react-hook-form";
import { AlertCircle, Check, ChevronDown, ChevronsUpDown, Search, X } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
 * - `border-gray-400` on a white field, not `border-gray-200`. The border is the only thing saying
 *   where to type, and WCAG 1.4.11 wants 3:1 for it: gray-200 on white is 1.24:1, gray-400 is
 *   2.61:1. Still short, and the nearest grey that clears it reads as a heavy outline on a form
 *   this long, so this is the closest that stays legible. Do not lighten it.
 * - `aria-[invalid=true]` styling on the input itself, plus the icon. A red message beside an
 *   untouched-looking grey box is colour as the only signal, twice.
 * - The error sits directly under the control, above the description. `FormItem`'s own order puts
 *   it last, which on the state field read as a box, a grey line about clearing districts, and only
 *   then the red line saying what was actually wrong. `aria-describedby` is composed by
 *   `FormControl` and is unaffected by the order these render in.
 * - The wrapper `div` sits *outside* `FormControl`. `FormControl` is a Radix `Slot` and clones
 *   its single child to attach the id, `aria-describedby` and `aria-invalid`; give it a div and
 *   all three land on the div and the field is silently unlabelled.
 * - `text-base sm:text-sm` on controls, because iOS zooms the page for anything under 16px.
 */

export { Form };

/** `text-destructive` is 3.8:1 on white. `red-700` is 6.3:1 and reads as the same red. */
const ERROR_TEXT = "text-red-700 text-xs font-medium flex items-start gap-1.5";

const inputClass =
  "bg-white border-gray-400 text-foreground placeholder:text-gray-500 focus:border-primary-fill focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors h-11 rounded-lg " +
  "aria-[invalid=true]:border-red-500 aria-[invalid=true]:bg-red-50 " +
  "disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed";

const areaClass =
  "bg-white border-gray-400 text-foreground placeholder:text-gray-500 focus:border-primary-fill focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors rounded-lg resize-none " +
  "aria-[invalid=true]:border-red-500 aria-[invalid=true]:bg-red-50 " +
  "disabled:opacity-100 disabled:bg-gray-100 disabled:text-gray-700 disabled:cursor-not-allowed";

/**
 * A card of related fields.
 *
 * `<fieldset>`/`<legend>` for the grouping a screen reader needs, with the legend floated to a
 * full-width block rather than left in the gap a browser cuts for it in the top border, and an
 * `h3` inside it because a legend groups but does not navigate.
 *
 * `h3` rather than `h2`: the step's own title is the `h2` the shell renders above these, and a
 * section of one form outranking the form is a heading order a screen reader reads as a new
 * subject.
 */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      <legend className="float-left w-full mb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </legend>
      <div className="clear-both space-y-5">{children}</div>
    </fieldset>
  );
}

/**
 * Two short fields side by side from `sm:` up, one column on a phone.
 *
 * For the fields whose answers are shorter than their labels — a PAN, a designation, four digits
 * of an Aadhaar. Given the shell's single column each of those was a full-width row, and step 1
 * was fourteen of them stacked. Only ever two: three columns at 768px leaves no room for the
 * descriptions, which are the part of these forms doing the work.
 */
export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 sm:gap-x-5">{children}</div>;
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
          <FormMessage className={ERROR_TEXT} />
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
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
          <FormMessage className={ERROR_TEXT} />
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
        </FormItem>
      )}
    />
  );
}

/**
 * One tick, for a question whose answers are yes and nothing.
 *
 * `CheckListField` below is an array of ticks and a different control. This is a single boolean,
 * so the label goes beside the box rather than above it and there is no `optional` chip: a
 * checkbox nobody ticked has already answered.
 *
 * `min-h-11` is on the `<label>` rather than the input, because the 44px target is the whole row
 * a thumb lands on and a 20px box with a sentence beside it is a 20px target.
 *
 * `onCheckedChange` is for the case this exists for: a box that governs other fields, whose
 * values have to be cleared when it is ticked.
 */
export function CheckField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  disabled,
  onCheckedChange,
}: Omit<BaseFieldProps<T>, "placeholder" | "optional"> & {
  onCheckedChange?: (checked: boolean) => void;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <label className="flex min-h-11 items-start gap-3 py-1 cursor-pointer">
            <FormControl>
              <input
                type="checkbox"
                ref={field.ref}
                name={field.name}
                checked={field.value === true}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event.target.checked);
                  onCheckedChange?.(event.target.checked);
                }}
                disabled={disabled}
                className="mt-0.5 w-5 h-5 shrink-0 rounded border-gray-400 accent-primary cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid={`input-${name}`}
              />
            </FormControl>
            <span className="text-gray-700 text-sm font-semibold">{label}</span>
          </label>
          <FormMessage className={ERROR_TEXT} />
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
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
 * `temperatureControl` carrying `""` as a third case rather than being a boolean.
 *
 * `appearance-none` with a drawn chevron, because the platform's own arrow is a different shape,
 * size and colour on every OS and these sit in a column beside `Input`s that all match each other.
 * An unanswered select renders its placeholder grey, like a placeholder in a text box: `text-base`
 * black on a required field reads as an answer already given.
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
          <div className="relative">
            <FormControl>
              <select
                {...field}
                value={field.value ?? ""}
                disabled={disabled}
                aria-required={!optional || undefined}
                data-testid={`select-${name}`}
                className={`w-full h-11 appearance-none rounded-lg border bg-white pl-3 pr-10 text-base sm:text-sm transition-colors focus:border-primary-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700 [&>option]:text-foreground ${
                  field.value ? "text-foreground" : "text-gray-500"
                } ${
                  fieldState.error ? "border-red-500 bg-red-50" : "border-gray-400 cursor-pointer"
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
            <ChevronDown
              className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                fieldState.error ? "text-red-600" : "text-gray-500"
              }`}
              aria-hidden="true"
            />
          </div>
          <FormMessage className={ERROR_TEXT} />
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
        </FormItem>
      )}
    />
  );
}

/**
 * A searchable single-choice list: a button that opens a filtered list of options.
 *
 * `SelectField`'s native control stays the right answer for two to five options. It is the wrong one
 * for the 36 states and union territories, which is the field this exists for: a native list that
 * long opens as a scroll the height of the screen with nothing to type at, and Uttar Pradesh is
 * twenty-odd rows below the top with no way to get there but dragging.
 *
 * The closed control is a button rather than a text box. There is nothing to type into it until it
 * is open, and a text box that ignores typing is worse than a button that says it opens a list.
 *
 * Closing counts as leaving the field, so it calls `field.onBlur`. Under `mode: "onBlur"` that is
 * what makes opening the list and dismissing it without choosing report the field as unanswered,
 * which is the same thing tabbing out of an empty required text box does.
 *
 * `defaultValue` is the answer already given, and it is what makes reopening the list usable: cmdk
 * highlights the first row otherwise, so somebody coming back to change Uttar Pradesh opened a list
 * scrolled to Andaman with no sign of their own answer in it. Radix unmounts the content on close, so
 * this is re-read on every open and does not need to be controlled.
 *
 * The highlight is overridden off `bg-accent`. This theme sets `--accent` to the logo's magenta at
 * full saturation, which as a filled row is both louder than anything else on the screen and a
 * different red from the brand red beside it.
 */
export function ComboField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  options,
  placeholder,
  searchPlaceholder,
  asArray,
  optional,
  disabled,
}: BaseFieldProps<T> & {
  options: readonly { value: string; label: string }[];
  /** Shows the search box. Omit for a list short enough to read. */
  searchPlaceholder?: string;
  /**
   * Holds the one answer as a one-item array.
   *
   * For `proposedDistricts`, which is an array because a *granted* territory can be several
   * districts while an application asks for one. Adapting here keeps the field name, the schema
   * and the server's error key all on the array, rather than translating in the submit handler.
   */
  asArray?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const current = asArray
          ? Array.isArray(field.value)
            ? field.value[0]
            : undefined
          : field.value;
        const selected = options.find((option) => option.value === current);

        const choose = (value: string) => {
          field.onChange(asArray ? [value] : value);
          setOpen(false);
          // As in `CheckListField`: `mode: "onBlur"` does not revalidate on change, and picking
          // from a list is not a blur.
          if (fieldState.error) void form.trigger(name);
        };

        return (
          <FormItem>
            <Label optional={optional}>{label}</Label>
            <Popover
              open={open}
              onOpenChange={(next) => {
                setOpen(next);
                if (!next) field.onBlur();
              }}
            >
              <PopoverTrigger asChild>
                <FormControl>
                  <button
                    ref={field.ref}
                    type="button"
                    role="combobox"
                    disabled={disabled}
                    aria-required={!optional || undefined}
                    data-testid={`select-${name}`}
                    className={`w-full h-11 flex items-center justify-between gap-2 rounded-lg border bg-white pl-3 pr-3 text-base sm:text-sm text-left transition-colors focus:border-primary-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-700 ${
                      fieldState.error
                        ? "border-red-500 bg-red-50"
                        : "border-gray-400 cursor-pointer hover:border-gray-500"
                    }`}
                  >
                    <span className={`truncate ${selected ? "text-foreground" : "text-gray-500"}`}>
                      {selected?.label ?? placeholder ?? "Choose one"}
                    </span>
                    {fieldState.error ? (
                      <AlertCircle
                        className="w-4 h-4 text-red-600 flex-shrink-0"
                        aria-hidden="true"
                      />
                    ) : (
                      <ChevronsUpDown
                        className="w-4 h-4 text-gray-500 flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </FormControl>
              </PopoverTrigger>
              {/* The trigger's own width, so the open list is the control rather than a menu
                  floating beside it. `p-0`: the padding belongs to the rows, which are targets. */}
              <PopoverContent
                align="start"
                className="w-[var(--radix-popover-trigger-width)] p-0 rounded-lg"
                data-testid={`list-${name}`}
              >
                <Command defaultValue={selected?.label} loop>
                  {searchPlaceholder && (
                    <CommandInput placeholder={searchPlaceholder} className="text-base sm:text-sm" />
                  )}
                  <CommandList className="max-h-64">
                    <CommandEmpty className="px-3 py-6 text-xs text-muted-foreground text-left">
                      Nothing matches that.
                    </CommandEmpty>
                    <CommandGroup className="p-1.5">
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={option.label}
                          onSelect={() => choose(option.value)}
                          className="cursor-pointer gap-2.5 rounded-md px-2.5 py-2 min-h-11 sm:min-h-0 text-sm data-[selected=true]:bg-primary/10 data-[selected=true]:text-foreground"
                          data-testid={`option-${name}-${option.value}`}
                        >
                          <Check
                            className={`w-4 h-4 flex-shrink-0 text-primary-ink ${
                              option.value === current ? "opacity-100" : "opacity-0"
                            }`}
                            aria-hidden="true"
                          />
                          {option.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage className={ERROR_TEXT} />
            {description && <FormDescription className="text-xs">{description}</FormDescription>}
          </FormItem>
        );
      }}
    />
  );
}

/**
 * A short closed choice, as cards that say what each option means.
 *
 * For the franchise tier, and for anything else where the options are two or three and choosing
 * between them needs a fact about each. A dropdown of "Territory Franchise · ₹25 lakh · 5 machines"
 * hides the comparison behind a click and then needs a panel underneath explaining what was picked,
 * which is two controls' worth of screen to answer one question. Cards put both options and the
 * consequence of each in the space that panel took.
 *
 * Native radios inside the labels, so arrow keys move between the cards and one tab stop covers the
 * group, which is what a `div` full of buttons would have to reimplement. The whole card is the
 * label, so the target is the card rather than the 16px circle.
 */
export function CardChoiceField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  options,
  disabled,
}: BaseFieldProps<T> & {
  options: readonly { value: string; title: string; headline: string; body: string }[];
}) {
  const labelId = useId();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <span id={labelId} className="text-gray-700 text-sm font-semibold block">
            {label}
          </span>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}

          <div
            role="radiogroup"
            aria-labelledby={labelId}
            className="grid gap-3 sm:grid-cols-2"
            data-testid={`cards-${name}`}
          >
            {options.map((option) => {
              const isChosen = field.value === option.value;
              return (
                <label
                  key={option.value}
                  className={`relative flex flex-col gap-1 rounded-lg border p-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-1 ${
                    disabled ? "cursor-not-allowed" : "cursor-pointer"
                  } ${
                    isChosen
                      ? "border-primary-fill bg-primary/5"
                      : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                  data-testid={`card-${name}-${option.value}`}
                >
                  <span className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name={String(name)}
                      value={option.value}
                      checked={isChosen}
                      onChange={() => field.onChange(option.value)}
                      onBlur={field.onBlur}
                      disabled={disabled}
                      className="w-4 h-4 flex-shrink-0 accent-primary focus-visible:outline-none disabled:cursor-not-allowed"
                      data-testid={`radio-${name}-${option.value}`}
                    />
                    <span className="text-sm font-semibold text-foreground">{option.title}</span>
                  </span>
                  <span className="text-sm font-semibold text-primary-ink tabular-nums pl-[26px]">
                    {option.headline}
                  </span>
                  <span className="text-xs text-muted-foreground leading-relaxed pl-[26px]">
                    {option.body}
                  </span>
                </label>
              );
            })}
          </div>

          <FormMessage className={ERROR_TEXT} />
        </FormItem>
      )}
    />
  );
}

/**
 * A searchable list of checkboxes, holding an array of the values that are ticked.
 *
 * For the district picker, where the list is 2 to 75 long depending on the state. A `<select multiple>`
 * is the one native control for this and it is also the one nobody can operate: on a phone it is a
 * scroll trap, and on a desktop ctrl-clicking to add a fourth district without losing the first three
 * is a thing people get wrong and do not notice.
 *
 * The ticked values are repeated as removable chips above the list, because the list scrolls and a
 * selection that has scrolled out of sight is a selection somebody submits without meaning to.
 *
 * No `FormControl`: it is a Radix `Slot` that clones one child to attach the id and `aria-invalid`,
 * and there is no single control here to attach them to. `field.ref` goes on the search box instead,
 * so `ErrorSummary`'s `setFocus` lands somewhere useful.
 */
export function CheckListField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  options,
  searchPlaceholder,
  emptyHint,
  optional,
  disabled,
}: BaseFieldProps<T> & {
  options: readonly string[];
  searchPlaceholder?: string;
  emptyHint?: string;
}) {
  const labelId = useId();
  const [query, setQuery] = useState("");

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const selected: string[] = Array.isArray(field.value) ? field.value : [];
        const needle = query.trim().toLowerCase();
        const shown = needle === "" ? options : options.filter((o) => o.toLowerCase().includes(needle));

        const toggle = (option: string) => {
          field.onChange(
            selected.includes(option)
              ? selected.filter((s) => s !== option)
              : [...selected, option].sort((a, b) => a.localeCompare(b)),
          );
          // `mode: "onBlur"` does not revalidate on change, and there is no blur in ticking a box.
          // Without this, "choose at least one district" stays red over a list with two ticks in it.
          if (fieldState.error) void form.trigger(name);
        };

        return (
          <FormItem>
            <span
              id={labelId}
              className="text-gray-700 text-sm font-semibold flex items-baseline gap-2"
            >
              {label}
              {optional && (
                <span className="text-[11px] font-medium text-muted-foreground">Optional</span>
              )}
              {selected.length > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                  {selected.length} selected
                </span>
              )}
            </span>

            {/* Above the list, not under it: this one says how to use the control rather than
                what the control means, and an instruction below a scrolling list of 75 districts
                is an instruction nobody reaches. */}
            {description && <FormDescription className="text-xs">{description}</FormDescription>}

            {selected.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" data-testid={`chips-${name}`}>
                {selected.map((value) => (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => toggle(value)}
                      disabled={disabled}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-primary/20 disabled:cursor-not-allowed disabled:hover:bg-primary/10 cursor-pointer"
                      data-testid={`chip-${name}-${value}`}
                    >
                      {value}
                      {!disabled && <X className="w-3 h-3" aria-hidden="true" />}
                      <span className="sr-only">Remove {value}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {options.length === 0 ? (
              // A box the size of the control that is coming, rather than a line of grey text
              // where a control should be. The gap is the answer to a question above it.
              <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3.5 py-4 text-xs text-muted-foreground">
                {emptyHint}
              </p>
            ) : (
              <>
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <Input
                    ref={field.ref}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onBlur={field.onBlur}
                    type="search"
                    placeholder={searchPlaceholder}
                    aria-label={searchPlaceholder ?? `Search ${label}`}
                    disabled={disabled}
                    className={`${inputClass} pl-9`}
                    data-testid={`search-${name}`}
                  />
                </div>

                <div
                  role="group"
                  aria-labelledby={labelId}
                  className={`max-h-60 overflow-y-auto rounded-lg border ${
                    fieldState.error ? "border-red-500 bg-red-50" : "border-gray-400 bg-white"
                  }`}
                  data-testid={`list-${name}`}
                >
                  {shown.length === 0 ? (
                    <p className="px-3 py-3 text-xs text-muted-foreground">
                      Nothing matches “{query.trim()}”.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-200/70">
                      {shown.map((option) => (
                        <li key={option}>
                          <label
                            className={`flex items-center gap-3 px-3 py-2.5 min-h-11 sm:min-h-0 text-sm ${
                              disabled ? "cursor-not-allowed text-gray-700" : "cursor-pointer hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected.includes(option)}
                              onChange={() => toggle(option)}
                              disabled={disabled}
                              className="w-4 h-4 rounded border-gray-300 text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                              data-testid={`check-${name}-${option}`}
                            />
                            {option}
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}

            <FormMessage className={ERROR_TEXT} />
          </FormItem>
        );
      }}
    />
  );
}

/**
 * An array of short codes, typed or pasted, held as removable chips.
 *
 * For the pin codes. A picker would need India Post's directory, which is 150,000 rows for the
 * benefit of somebody who already knows the six digits they mean.
 *
 * **A value that does not match `pattern` is refused at the point of typing and left in the box**,
 * rather than being added and flagged afterwards. An array item's error has a path the field's own
 * `FormMessage` never renders, so the alternative is a chip that is silently wrong until submit.
 */
export function CodeListField<T extends FieldValues>({
  form,
  name,
  label,
  description,
  placeholder,
  pattern,
  invalidMessage,
  optional,
  disabled,
}: BaseFieldProps<T> & { pattern: RegExp; invalidMessage: string }) {
  const labelId = useId();
  const [draft, setDraft] = useState("");
  const [rejected, setRejected] = useState<string | null>(null);

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field, fieldState }) => {
        const values: string[] = Array.isArray(field.value) ? field.value : [];

        /** Returns what could not be added, so the box keeps it for fixing. */
        const commit = (raw: string): string => {
          const tokens = raw.split(/[^0-9A-Za-z]+/).filter((t) => t !== "");
          const good: string[] = [];
          const bad: string[] = [];
          for (const token of tokens) (pattern.test(token) ? good : bad).push(token);
          if (good.length > 0) {
            field.onChange([...new Set([...values, ...good])].sort());
            // As in `CheckListField`: adding a chip is a change, and `mode: "onBlur"` ignores those.
            if (fieldState.error) void form.trigger(name);
          }
          setRejected(bad[0] ?? null);
          return bad.join(" ");
        };

        return (
          <FormItem>
            <span
              id={labelId}
              className="text-gray-700 text-sm font-semibold flex items-baseline gap-2"
            >
              {label}
              {optional && (
                <span className="text-[11px] font-medium text-muted-foreground">Optional</span>
              )}
              {values.length > 0 && (
                <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
                  {values.length} added
                </span>
              )}
            </span>

            {values.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" data-testid={`chips-${name}`}>
                {values.map((value) => (
                  <li key={value}>
                    <button
                      type="button"
                      onClick={() => field.onChange(values.filter((v) => v !== value))}
                      disabled={disabled}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground hover:bg-primary/20 disabled:cursor-not-allowed disabled:hover:bg-primary/10 cursor-pointer"
                      data-testid={`chip-${name}-${value}`}
                    >
                      {value}
                      {!disabled && <X className="w-3 h-3" aria-hidden="true" />}
                      <span className="sr-only">Remove {value}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Input
              ref={field.ref}
              value={draft}
              onChange={(event) => {
                // A separator is how somebody says "that one is finished", whether they typed it
                // or pasted a comma-separated list out of a spreadsheet.
                if (/[^0-9A-Za-z]/.test(event.target.value)) setDraft(commit(event.target.value));
                else {
                  setDraft(event.target.value);
                  setRejected(null);
                }
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  // Otherwise the first pin code submits the step.
                  event.preventDefault();
                  setDraft(commit(draft));
                } else if (event.key === "Backspace" && draft === "" && values.length > 0) {
                  field.onChange(values.slice(0, -1));
                }
              }}
              onPaste={(event) => {
                // A column copied out of a spreadsheet arrives newline-separated, and a single-line
                // input keeps only the first line of it.
                const pasted = event.clipboardData.getData("text");
                if (!/[\r\n]/.test(pasted)) return;
                event.preventDefault();
                setDraft(commit(`${draft} ${pasted}`));
              }}
              onBlur={() => {
                setDraft(commit(draft));
                field.onBlur();
              }}
              inputMode="numeric"
              aria-labelledby={labelId}
              aria-invalid={!!fieldState.error || rejected !== null}
              placeholder={placeholder}
              disabled={disabled}
              className={inputClass}
              data-testid={`input-${name}`}
            />

            {rejected !== null && (
              <p className={ERROR_TEXT} data-testid={`rejected-${name}`}>
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
                {invalidMessage}
              </p>
            )}
            <FormMessage className={ERROR_TEXT} />
            {description && <FormDescription className="text-xs">{description}</FormDescription>}
          </FormItem>
        );
      }}
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
      className="rounded-xl border border-red-300 bg-red-50 p-4 outline-none scroll-mt-[calc(var(--onboarding-chrome,0px)_+_1rem)]"
      data-testid="step-error-summary"
    >
      <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
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
 *
 * Two shapes, because a band and a card mean different things. On a phone it spans the screen and
 * a `border-t` reads as the bottom of the window; the `-mx-5` that bleeds it to the edge is the
 * shell's own `PAGE` padding cancelled, so the two have to stay in step. At `COLUMN`'s measure it
 * is a reading column inside a wider viewport, where the same `border-t` reads as a rule drawn
 * across the middle of the page, so from `sm:` up it lifts off the bottom and closes into a card.
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
    <div
      className={[
        "sticky bottom-0 -mx-5 px-5 pt-3 pb-4 border-t border-gray-200",
        "sm:bottom-4 sm:mx-0 sm:px-5 sm:py-4 sm:rounded-xl sm:border sm:shadow-sm",
        "bg-gray-50/95 sm:bg-white/95 backdrop-blur space-y-2",
      ].join(" ")}
    >
      <p className="text-xs text-muted-foreground leading-relaxed">{nextHint}</p>
      <div className="flex items-center justify-between gap-4">
        {draftStatus ? <DraftIndicator status={draftStatus} /> : <span />}
        <Button
          type={onClick ? "button" : "submit"}
          onClick={onClick}
          disabled={isSubmitting || disabled}
          className="min-h-11 px-6 rounded-lg font-semibold text-sm cursor-pointer"
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
