"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { setFactoryPin, setMachinePin, type MachineCall } from "@/lib/adminMachineApi";
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

type PinCardProps = {
  id: string;
  title: string;
  note: string;
  savedNote: string;
  unsetNote: string;
  isSet: boolean;
  changedAt: string | null;
  changedBy: string | null;
  save: (pin: string, confirmPin: string) => Promise<MachineCall<unknown>>;
  onChanged: () => void;
};

export function MachinePinTab({ machine, onChanged }: { machine: Machine; onChanged: () => void }) {
  return (
    <div className="space-y-5">
      <PinCard
        id="pin"
        title="Operator PIN"
        note="The PIN opens the operator screens on the machine."
        savedNote="PIN changed. The machine asks for the new PIN from the next operator login."
        unsetNote="No. Operators can't open the operator screens until a PIN is set."
        isSet={machine.hasPin}
        changedAt={machine.pinChangedAt}
        changedBy={machine.pinChangedBy}
        save={(pin, confirmPin) => setMachinePin(machine.sn, pin, confirmPin)}
        onChanged={onChanged}
      />
      <PinCard
        id="factory-pin"
        title="Factory PIN"
        note="Opens Factory Settings on the machine (serial ports, server, payment mode). Give it only to technicians. Until one is set, Factory Settings can't be opened."
        savedNote="Factory PIN changed. It works on the machine straight away."
        unsetNote="No. Factory Settings can't be opened until a factory PIN is set."
        isSet={machine.hasFactoryPin}
        changedAt={machine.factoryPinChangedAt}
        changedBy={machine.factoryPinChangedBy}
        save={(pin, confirmPin) => setFactoryPin(machine.sn, pin, confirmPin)}
        onChanged={onChanged}
      />
    </div>
  );
}

function PinCard({ id, title, note, savedNote, unsetNote, isSet, changedAt, changedBy, save, onChanged }: PinCardProps) {
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
    const result = await save(pin, confirmPin);
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
      <Card title={`Change ${title.toLowerCase()}`} note={note} testId={`card-${id}`}>
        <form onSubmit={submit} noValidate className="space-y-4 p-4 sm:p-5" data-testid={`${id}-form`}>
          <ProblemPanel problem={problem} testId={`${id}-error`} />
          {done && <SuccessPanel testId={`${id}-saved`}>{savedNote}</SuccessPanel>}
          <FormRow label="New PIN" htmlFor={`${id}-new`} error={errors.pin} hint="4 to 8 digits.">
            <TextInput id={`${id}-new`} type="password" value={pin} onChange={setPin} inputMode="numeric" />
          </FormRow>
          <FormRow label="Confirm PIN" htmlFor={`${id}-confirm`} error={errors.confirmPin}>
            <TextInput id={`${id}-confirm`} type="password" value={confirmPin} onChange={setConfirmPin} inputMode="numeric" />
          </FormRow>
          <Button type="submit" disabled={saving} className="rounded-xl cursor-pointer" data-testid={`button-save-${id}`}>
            {saving ? "Saving…" : "Change PIN"}
          </Button>
        </form>
      </Card>
      <Card title={`Current ${title.toLowerCase()}`} testId={`card-${id}-state`}>
        <Fields>
          <Field label="PIN set" value={isSet ? "Yes" : unsetNote} testId={`${id}-has`} />
          <Field
            label="Last changed"
            value={changedAt ? `${formatIstStamp(changedAt)}${changedBy ? ` by ${changedBy}` : ""}` : null}
            testId={`${id}-changed`}
          />
        </Fields>
      </Card>
    </div>
  );
}
