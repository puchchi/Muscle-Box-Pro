"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setMachinePin } from "@/lib/adminMachineApi";
import type { Machine } from "@shared/admin/machinesSchema";
import { Card, Field, Fields, SuccessPanel } from "../AdminUi";
import { FormRow, TextInput } from "./formBits";
import { formatIstStamp, ProblemPanel, type Problem } from "./MachinesUi";

const OPEN_PIN = "000000";

export function checkPin(pin: string, confirmPin: string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!/^\d{4,8}$/.test(pin)) errors.pin = "4 to 8 digits.";
  else if (pin === OPEN_PIN) errors.pin = "000000 opens the machine without a PIN. Choose another.";
  if (!confirmPin) errors.confirmPin = "Required.";
  else if (!errors.pin && pin !== confirmPin) errors.confirmPin = "The PINs don't match.";
  return errors;
}

export function MachinePinTab({ machine, onChanged }: { machine: Machine; onChanged: () => void }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setDone(false);
    const found = checkPin(pin, confirmPin);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    const result = await setMachinePin(machine.sn, pin, confirmPin);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem({ message: result.error.message, issues: result.issues });
      return;
    }
    setProblem(null);
    setPin("");
    setConfirmPin("");
    setDone(true);
    onChanged();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <Card title="Change operator PIN" note="The PIN opens the operator screens on the machine." testId="card-pin">
        <form onSubmit={submit} noValidate className="space-y-4 p-4 sm:p-5" data-testid="pin-form">
          <ProblemPanel problem={problem} testId="pin-error" />
          {done && <SuccessPanel testId="pin-saved">PIN changed. The machine asks for the new PIN from the next operator login.</SuccessPanel>}
          <FormRow label="New PIN" htmlFor="pin" error={errors.pin} hint="4 to 8 digits.">
            <TextInput id="pin" type="password" value={pin} onChange={setPin} inputMode="numeric" />
          </FormRow>
          <FormRow label="Confirm PIN" htmlFor="confirmPin" error={errors.confirmPin}>
            <TextInput id="confirmPin" type="password" value={confirmPin} onChange={setConfirmPin} inputMode="numeric" />
          </FormRow>
          <Button type="submit" disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-pin">
            {saving ? "Saving…" : "Change PIN"}
          </Button>
        </form>
      </Card>
      <Card title="Current PIN" testId="card-pin-state">
        <Fields>
          <Field
            label="PIN set"
            value={machine.hasPin ? "Yes" : "No. Operators can't open the operator screens until a PIN is set."}
            testId="pin-has"
          />
          <Field
            label="Last changed"
            value={
              machine.pinChangedAt
                ? `${formatIstStamp(machine.pinChangedAt)}${machine.pinChangedBy ? ` by ${machine.pinChangedBy}` : ""}`
                : null
            }
            testId="pin-changed"
          />
        </Fields>
      </Card>
    </div>
  );
}
