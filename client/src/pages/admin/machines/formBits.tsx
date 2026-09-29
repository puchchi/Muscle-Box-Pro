"use client";

import { Input } from "@/components/ui/input";

export const inputClass =
  "bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:bg-card h-10 rounded-xl";

export function FormRow({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs text-rose-300" data-testid={`error-${htmlFor}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  mono,
  type = "text",
  inputMode,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  mono?: boolean;
  type?: "text" | "password";
  inputMode?: "numeric" | "decimal" | "text";
}) {
  return (
    <Input
      id={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      inputMode={inputMode}
      className={`${inputClass} ${mono ? "font-mono text-sm" : ""}`}
      data-testid={`input-${id}`}
    />
  );
}

export function NativeSelect({
  id,
  value,
  onChange,
  options,
  disabled,
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      className={`${inputClass} w-full border px-3 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      data-testid={`input-${id}`}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function hasTwoDecimalsAtMost(n: number): boolean {
  return Math.abs(Math.round(n * 100) - n * 100) < 1e-6;
}
