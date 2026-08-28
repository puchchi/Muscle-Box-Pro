"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * The admin panel's form inputs, over react-hook-form.
 *
 * `AdminInviteGym.tsx` has the same four helpers written concretely against its own form type. These
 * are the generic version, because the write forms on the gym detail page are five separate small
 * forms rather than one long one, and five copies of `NumberField` would be five chances to lose the
 * `undefined`-for-empty behaviour its docstring exists to protect.
 *
 * They take `control` rather than the whole form so the generic parameter is inferred from the call
 * site with nothing threaded through.
 */

const inputClass =
  "bg-gray-50 border-gray-200 text-foreground placeholder:text-gray-400 focus:border-primary focus:bg-white transition-colors h-11 rounded-xl";

type Base<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  hideLabel?: boolean;
  placeholder?: string;
};

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  hideLabel,
  placeholder,
  mono,
}: Base<T> & { mono?: boolean }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {!hideLabel && (
            <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          )}
          <FormControl>
            <Input
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              placeholder={placeholder}
              className={`${inputClass} ${mono ? "font-mono text-sm" : ""}`}
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
 * A number input kept blank rather than `0` when the value is undefined.
 *
 * A visible `0` in an untouched deposit field reads as a decision nobody made. `valueAsNumber` on
 * change, and an empty string becomes `undefined` rather than `NaN`, so a cleared field goes back to
 * "nothing typed" instead of failing validation as "not a number" — which is why the schemas in
 * `shared/admin/writes.ts` deliberately do not use `z.coerce`.
 */
export function NumberField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  hideLabel,
  prefix,
}: Base<T> & { prefix?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {!hideLabel && (
            <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          )}
          <FormControl>
            <div className="relative">
              {prefix && (
                <span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none"
                  aria-hidden
                >
                  {prefix}
                </span>
              )}
              <Input
                ref={field.ref}
                name={field.name}
                onBlur={field.onBlur}
                type="number"
                inputMode="numeric"
                value={
                  typeof field.value === "number" && !Number.isNaN(field.value) ? field.value : ""
                }
                onChange={(event) => {
                  const raw = event.target.value;
                  field.onChange(raw === "" ? undefined : event.target.valueAsNumber);
                }}
                className={`${inputClass} tabular-nums ${prefix ? "pl-8" : ""}`}
                data-testid={`input-${name}`}
              />
            </div>
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function AreaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  rows = 3,
}: Base<T> & { rows?: number }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              rows={rows}
              placeholder={placeholder}
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
 * A calendar date.
 *
 * `type="date"` gives the browser's own picker, whose value is already `YYYY-MM-DD` — the exact
 * shape the wire wants, so nothing here parses or reformats. `max` is passed by the caller rather
 * than assumed, because the offboarding dates are bounded at today in **IST** and the machine's
 * installation date is legitimately in the future.
 */
export function DateField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  max,
}: Base<T> & { max?: string }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type="date"
              max={max}
              value={typeof field.value === "string" ? field.value : ""}
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

/**
 * A native `select`.
 *
 * Native rather than shadcn's `Select`, which renders a portalled listbox: these sit inside forms
 * that tests drive with `userEvent`, and a native select is one `selectOptions` call rather than a
 * popover to open first. It is also the control that already works with the keyboard.
 */
export function SelectField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  options,
}: Base<T> & { options: ReadonlyArray<{ value: string; label: string }> }) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-700 text-sm font-semibold">{label}</FormLabel>
          <FormControl>
            <select
              {...field}
              value={typeof field.value === "string" ? field.value : ""}
              className={`${inputClass} w-full px-3 cursor-pointer`}
              data-testid={`input-${name}`}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FormControl>
          {description && <FormDescription className="text-xs">{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
