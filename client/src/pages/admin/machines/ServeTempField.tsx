import { Coffee, Snowflake } from "lucide-react";
import type { ServeTemp } from "@shared/admin/machines";

const OPTIONS: { value: ServeTemp | null; label: string; testId: string }[] = [
  { value: null, label: "Normal", testId: "serve-temp-normal" },
  { value: "chilled", label: "Chilled", testId: "serve-temp-chilled" },
  { value: "hot", label: "Hot", testId: "serve-temp-hot" },
];

export const SERVE_TEMP_LABEL: Record<ServeTemp, string> = { chilled: "Chilled", hot: "Hot" };

export function ServeTempField({
  value,
  onChange,
  error,
}: {
  value: ServeTemp | null;
  onChange: (value: ServeTemp | null) => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5" data-testid="field-serve-temp">
      <span id="serve-temp-label" className="block text-sm font-semibold text-muted-foreground">
        Served
      </span>
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="group" aria-labelledby="serve-temp-label">
          {OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => onChange(option.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                value === option.value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={option.testId}
            >
              {option.label}
            </button>
          ))}
        </div>
        {value && <ServeTempPill value={value} />}
      </div>
      {error ? (
        <p className="text-xs text-rose-300" data-testid="error-serveTemp" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Shows a Chilled or Hot sticker on the drink on the machine. Normal shows none.</p>
      )}
    </div>
  );
}

export function ServeTempPill({ value }: { value: ServeTemp }) {
  const Icon = value === "chilled" ? Snowflake : Coffee;
  const tone =
    value === "chilled" ? "border-[#A7D3F0] bg-[#D9EFFC] text-[#1A6399]" : "border-[#F2BD85] bg-[#FFE7CC] text-[#B24A08]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${tone}`} data-testid="serve-temp-pill">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {SERVE_TEMP_LABEL[value]}
    </span>
  );
}
