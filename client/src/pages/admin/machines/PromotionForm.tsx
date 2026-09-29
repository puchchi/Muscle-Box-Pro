"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MachineCall } from "@/lib/adminMachineApi";
import type { PromotionInput } from "@shared/admin/machines";
import type { Good, MachineRow, Promotion, PromotionKind, PromotionSave } from "@shared/admin/machinesSchema";
import { Card } from "../AdminUi";
import { FormRow, inputClass, NativeSelect, TextInput } from "./formBits";
import { FieldError, MachineScopeField, TimeField } from "./scopeBits";
import { formatRupees, problemOf, ProblemPanel, type Problem } from "./MachinesUi";
import { blankItem, MAX_PROMOTION_ITEMS, PROMOTION_NAME_MAX, validatePromotion, valuesOf, type PromotionValues } from "./promotionRules";

export function PromotionForm({
  kind,
  promotion,
  goods,
  machines,
  submitLabel,
  onSubmit,
  onSaved,
  onReload,
}: {
  kind: PromotionKind;
  promotion: Promotion | null;
  goods: Good[];
  machines: MachineRow[];
  submitLabel: string;
  onSubmit: (input: PromotionInput) => Promise<MachineCall<PromotionSave>>;
  onSaved: (saved: PromotionSave) => void;
  onReload?: () => void;
}) {
  const [values, setValues] = useState<PromotionValues>(() => valuesOf(promotion));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const ended = promotion?.status === "ended";

  const set = <K extends keyof PromotionValues>(key: K, value: PromotionValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const updateItem = (key: string, patch: { goodsId?: string; price?: string }) =>
    setValues((v) => ({ ...v, items: v.items.map((row) => (row.key === key ? { ...row, ...patch } : row)) }));

  const byId = new Map(goods.map((g) => [g.goodsId, g]));
  const options = [
    { value: "", label: "Choose a good" },
    ...goods.map((g) => ({ value: g.goodsId, label: `${g.name} (${g.no || g.goodsId})` })),
    ...values.items
      .filter((row) => row.goodsId && !byId.has(row.goodsId))
      .map((row) => ({ value: row.goodsId, label: promotion?.items.find((i) => i.goodsId === row.goodsId)?.name ?? row.goodsId })),
  ];

  async function save() {
    const checked = validatePromotion(kind, values);
    setErrors(checked.errors);
    if (!checked.input) {
      setProblem({ message: "Some fields need fixing.", issues: [] });
      return;
    }
    setSaving(true);
    const result = await onSubmit(checked.input);
    setSaving(false);
    window.scrollTo({ top: 0 });
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem(problemOf(result));
      setStale(result.error.code === "stale_write");
      return;
    }
    setProblem(null);
    setStale(false);
    setValues(valuesOf(result.data.promotion));
    onSaved(result.data);
  }

  return (
    <div className="space-y-5">
      <ProblemPanel problem={problem} testId="promotion-form-error" />
      {stale && onReload && (
        <Button type="button" variant="outline" size="sm" onClick={onReload} className="rounded-xl cursor-pointer" data-testid="button-reload-promotion">
          Reload
        </Button>
      )}

      <Card title="Details" note="Times are India time." testId="card-promotion-details">
        <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3">
          <FormRow label="Name" htmlFor="promotion-name" error={errors.name} hint={`${values.name.trim().length} of ${PROMOTION_NAME_MAX} characters.`}>
            <TextInput id="promotion-name" value={values.name} onChange={(name) => set("name", name)} />
          </FormRow>
          <TimeField label="Start" value={values.start} onChange={(start) => set("start", start)} error={errors.start} testId="promotion-start" />
          <TimeField label="End" value={values.end} onChange={(end) => set("end", end)} error={errors.end} testId="promotion-end" />
        </div>
      </Card>

      <Card title="Where it applies" testId="card-promotion-machines">
        <div className="p-4 sm:p-5">
          <MachineScopeField
            name="promotion-machines"
            allMachines={values.allMachines}
            sns={values.sns}
            machines={machines}
            onChange={(scope) => setValues((v) => ({ ...v, ...scope }))}
            error={errors.sns}
            testId="promotion-scope"
          />
        </div>
      </Card>

      <Card
        title="Goods"
        note={
          kind === "discount"
            ? "Each discount price must be below the price in force on every machine it covers."
            : "These goods show the New badge on the menu while the promotion is active."
        }
        testId="card-promotion-goods"
      >
        <div className="space-y-3 p-4 sm:p-5">
          <FieldError error={errors.items} testId="error-items" />
          <ul className="space-y-3">
            {values.items.map((row, i) => {
              const good = byId.get(row.goodsId);
              return (
                <li
                  key={row.key}
                  className={`grid items-start gap-3 rounded-xl border border-border bg-secondary/20 p-3 ${
                    kind === "discount" ? "sm:grid-cols-[minmax(0,1fr)_10rem_auto]" : "sm:grid-cols-[minmax(0,1fr)_auto]"
                  }`}
                  data-testid={`promotion-item-${i}`}
                >
                  <div className="min-w-0 space-y-1.5">
                    <label htmlFor={`item-good-${i}`} className="block text-sm font-semibold text-muted-foreground">
                      Good
                    </label>
                    <NativeSelect id={`item-good-${i}`} value={row.goodsId} onChange={(goodsId) => updateItem(row.key, { goodsId })} options={options} className="text-sm" />
                    {good && kind === "discount" && !errors[`items.${i}.goodsId`] && (
                      <p className="text-xs text-muted-foreground">Library price {formatRupees(good.priceInr)}.</p>
                    )}
                    <FieldError error={errors[`items.${i}.goodsId`]} testId={`error-items.${i}.goodsId`} />
                  </div>
                  {kind === "discount" && (
                    <div className="space-y-1.5">
                      <label htmlFor={`item-price-${i}`} className="block text-sm font-semibold text-muted-foreground">
                        Discount price (₹)
                      </label>
                      <Input
                        id={`item-price-${i}`}
                        value={row.price}
                        onChange={(event) => updateItem(row.key, { price: event.target.value })}
                        inputMode="decimal"
                        className={`${inputClass} tabular-nums`}
                        data-testid={`input-item-price-${i}`}
                      />
                      <FieldError error={errors[`items.${i}.priceInr`]} testId={`error-items.${i}.priceInr`} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setValues((v) => ({ ...v, items: v.items.filter((r) => r.key !== row.key) }))}
                    className="inline-flex h-10 items-center gap-1 self-end rounded-lg px-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 cursor-pointer sm:mt-7 sm:self-start"
                    aria-label={`Remove ${good?.name ?? "this good"}`}
                    data-testid={`remove-item-${i}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setValues((v) => ({ ...v, items: [...v.items, blankItem()] }))}
            disabled={values.items.length >= MAX_PROMOTION_ITEMS}
            className="rounded-xl cursor-pointer"
            data-testid="button-add-item"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add good
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {ended && <p className="text-xs text-muted-foreground">This promotion has ended. Set a new end time to run it again.</p>}
        <Button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-promotion">
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
