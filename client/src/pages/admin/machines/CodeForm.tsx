"use client";

import { useState } from "react";
import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MachineCall } from "@/lib/adminMachineApi";
import type { RedeemCodeInput } from "@shared/admin/machines";
import type { Good, MachineRow, RedeemCode } from "@shared/admin/machinesSchema";
import { Card } from "../AdminUi";
import { FormRow, TextInput } from "./formBits";
import { FieldError, GoodsPicker, MachineScopeField, TimeField } from "./scopeBits";
import { problemOf, ProblemPanel, type Problem } from "./MachinesUi";
import { codeValuesOf, generateCode, MAX_USES, THEME_MAX, validateCode, type CodeValues } from "./codeRules";

export function CodeForm({
  code,
  goods,
  machines,
  submitLabel,
  onSubmit,
  onSaved,
  onReload,
}: {
  code: RedeemCode | null;
  goods: Good[];
  machines: MachineRow[];
  submitLabel: string;
  onSubmit: (code: string, input: RedeemCodeInput) => Promise<MachineCall<{ code: RedeemCode }>>;
  onSaved: (saved: RedeemCode) => void;
  onReload?: () => void;
}) {
  const isNew = code === null;
  const [values, setValues] = useState<CodeValues>(() => codeValuesOf(code));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof CodeValues>(key: K, value: CodeValues[K]) => setValues((v) => ({ ...v, [key]: value }));

  const known = new Set(goods.map((g) => g.goodsId));
  const pickable = [
    ...goods,
    ...(code?.goods ?? []).filter((g) => !known.has(g.goodsId)).map((g) => ({ goodsId: g.goodsId, no: "", name: g.name })),
  ];

  async function save() {
    const checked = validateCode(values, { isNew, usedCount: code?.usedCount ?? 0 });
    setErrors(checked.errors);
    if (!checked.input) {
      setProblem({ message: "Some fields need fixing.", issues: [] });
      return;
    }
    setSaving(true);
    const result = await onSubmit(checked.code, checked.input);
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
    setValues(codeValuesOf(result.data.code));
    onSaved(result.data.code);
  }

  return (
    <div className="space-y-5">
      <ProblemPanel problem={problem} testId="code-form-error" />
      {stale && onReload && (
        <Button type="button" variant="outline" size="sm" onClick={onReload} className="rounded-xl cursor-pointer" data-testid="button-reload-code">
          Reload
        </Button>
      )}

      <Card title="Code" note="Times are India time. Leave a time empty for no limit." testId="card-code-details">
        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2">
          {isNew ? (
            <FormRow label="Code" htmlFor="code" error={errors.code} hint="4 to 20 letters or digits. Customers type it on the machine.">
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <TextInput id="code" value={values.code} onChange={(c) => set("code", c.toUpperCase())} mono />
                </div>
                <Button type="button" variant="outline" onClick={() => set("code", generateCode())} className="h-10 rounded-xl cursor-pointer" data-testid="button-generate-code">
                  <Dices className="h-4 w-4" aria-hidden />
                  Generate
                </Button>
              </div>
            </FormRow>
          ) : (
            <div className="space-y-1.5">
              <p className="text-sm font-semibold text-muted-foreground">Code</p>
              <p className="flex h-10 items-center font-mono text-base font-semibold tracking-wider text-foreground" data-testid="code-value">
                {code.code}
              </p>
            </div>
          )}
          <FormRow label="Theme" htmlFor="code-theme" error={errors.theme} hint={`What the code is for, such as a campaign. ${values.theme.trim().length} of ${THEME_MAX} characters.`}>
            <TextInput id="code-theme" value={values.theme} onChange={(theme) => set("theme", theme)} />
          </FormRow>
        </div>
        <div className="grid gap-4 px-4 pb-4 sm:px-5 sm:pb-5 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <FormRow
              label="Uses allowed"
              htmlFor="code-uses"
              error={errors.usesAllowed}
              hint={code && code.usedCount > 0 ? `Used ${code.usedCount} times so far.` : `How many drinks this code gives in total, up to ${MAX_USES.toLocaleString("en-IN")}.`}
            >
              <TextInput id="code-uses" value={values.usesAllowed} onChange={(u) => set("usesAllowed", u)} inputMode="numeric" />
            </FormRow>
          </div>
          <TimeField label="Valid from" value={values.validFrom} onChange={(t) => set("validFrom", t)} error={errors.validFrom} testId="code-valid-from" />
          <TimeField label="Valid to" value={values.validTo} onChange={(t) => set("validTo", t)} error={errors.validTo} testId="code-valid-to" />
        </div>
      </Card>

      <Card title="Goods" note={`The drinks this code can get. ${values.goodsIds.length} chosen.`} testId="card-code-goods">
        <div className="space-y-2 p-4 sm:p-5">
          <GoodsPicker goods={pickable} chosen={values.goodsIds} onChange={(ids) => set("goodsIds", ids)} testId="code-goods" />
          <FieldError error={errors.goodsIds} testId="error-goodsIds" />
        </div>
      </Card>

      <Card title="Where it works" testId="card-code-machines">
        <div className="p-4 sm:p-5">
          <MachineScopeField
            name="code-machines"
            allMachines={values.allMachines}
            sns={values.sns}
            machines={machines}
            onChange={(scope) => setValues((v) => ({ ...v, ...scope }))}
            error={errors.sns}
            testId="code-scope"
          />
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-code">
          {saving ? "Saving…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
