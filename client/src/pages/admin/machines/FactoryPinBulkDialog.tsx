"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { fetchAllMachines, setFactoryPinBulk } from "@/lib/adminMachineApi";
import type { MachineRow } from "@shared/admin/machinesSchema";
import { SuccessPanel } from "../AdminUi";
import { FormRow, TextInput } from "./formBits";
import { checkPin } from "./MachinePinTab";
import { MachineDialog, ProblemPanel, type Problem } from "./MachinesUi";
import { FieldError, MachinePicker } from "./scopeBits";

export const MAX_BULK_PINS = 100;

export function FactoryPinBulkDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [sns, setSns] = useState<string[]>([]);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);
  const [updated, setUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setSns([]);
    setPin("");
    setConfirmPin("");
    setErrors({});
    setProblem(null);
    setUpdated(null);
    fetchAllMachines().then((result) => {
      if (result.ok) setMachines(result.data);
      else setProblem({ message: result.error.message, issues: result.issues });
    });
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const found = checkPin(pin, confirmPin);
    if (sns.length === 0) found.sns = "Choose at least one machine.";
    else if (sns.length > MAX_BULK_PINS) found.sns = `Up to ${MAX_BULK_PINS} machines at a time.`;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    const result = await setFactoryPinBulk(sns, pin, confirmPin);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      setProblem({ message: result.error.message, issues: result.issues });
      return;
    }
    setProblem(null);
    setPin("");
    setConfirmPin("");
    setUpdated(result.data.updated);
    onDone();
  }

  const withoutPin = machines.filter((m) => !m.hasFactoryPin).map((m) => m.sn);

  return (
    <MachineDialog
      open={open}
      onClose={onClose}
      title="Set factory PIN"
      description="Sets the same factory PIN on every machine you choose. If any machine can't take it, none are changed."
      testId="dialog-factory-pin-bulk"
    >
      <form onSubmit={submit} noValidate className="space-y-4" data-testid="factory-pin-bulk-form">
        <ProblemPanel problem={problem} testId="factory-pin-bulk-error" />
        {updated !== null && (
          <SuccessPanel testId="factory-pin-bulk-saved">
            Factory PIN set on {updated} machine{updated === 1 ? "" : "s"}. It works straight away.
          </SuccessPanel>
        )}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Machines ({sns.length} chosen)</span>
            {withoutPin.length > 0 && (
              <button
                type="button"
                onClick={() => setSns(withoutPin)}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                data-testid="button-choose-without-pin"
              >
                Choose all without one ({withoutPin.length})
              </button>
            )}
          </div>
          <MachinePicker machines={machines} chosen={sns} onChange={setSns} testId="factory-pin-bulk-machines" />
          <FieldError error={errors.sns} testId="error-factory-pin-bulk-sns" />
        </div>
        <FormRow label="New PIN" htmlFor="bulk-factory-pin" error={errors.pin} hint="4 to 8 digits.">
          <TextInput id="bulk-factory-pin" type="password" value={pin} onChange={setPin} inputMode="numeric" />
        </FormRow>
        <FormRow label="Confirm PIN" htmlFor="bulk-factory-confirm" error={errors.confirmPin}>
          <TextInput id="bulk-factory-confirm" type="password" value={confirmPin} onChange={setConfirmPin} inputMode="numeric" />
        </FormRow>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Close
          </Button>
          <Button type="submit" disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-factory-pin-bulk">
            {saving ? "Saving…" : "Set factory PIN"}
          </Button>
        </div>
      </form>
    </MachineDialog>
  );
}
