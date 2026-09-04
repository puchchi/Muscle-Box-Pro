"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import {
  MACHINE_STATUSES,
  adminMachineFormSchema,
  toAdminMachineBody,
  type AdminMachineForm,
} from "@shared/admin/writes";
import { isPendingDeviceNo, type AdminGymView } from "@shared/admin/gyms";
import { putGymMachine } from "@/lib/adminApi";
import { Card, Empty, ErrorPanel, Field, Fields, SuccessPanel } from "./AdminUi";
import { AreaField, DateField, NumberField, SelectField, TextField } from "./adminFields";
import {
  MACHINE_STATUS_LABEL,
  formatCalendarDate,
  formatInr,
  formatIstDateTime,
} from "./adminFormat";

/**
 * The unit, and the one form that assigns, edits or replaces it.
 *
 * ## Three jobs, one route
 *
 * `PUT …/machine` decides between them by reading the current row: a `deviceNo` this gym already
 * holds is a patch, a different one is a replacement, which writes a new item and marks the old one
 * `replaced` rather than deleting it. The response says which happened, and so does this card.
 *
 * That is why the form always sends a **whole machine** even to change an installation date: the same
 * submission has to be a valid replacement if the device number turns out to be new, and a partial
 * body naming an unknown `deviceNo` is refused server-side as a typo rather than treated as an
 * assignment.
 *
 * ## The placeholder is cleared rather than offered back
 *
 * A gym invited through `POST /admin/gyms` gets a machine row with a real model and value but a
 * `PENDING-`-prefixed `deviceNo`, because that field is a DynamoDB partition key and cannot be blank.
 * This is the only path to a real one. When the current device number is a placeholder the field
 * starts empty: prefilling it would make "save without noticing" produce a second pending row, and
 * the whole point of the visit is to type the number off the unit.
 *
 * ## Two refusals this form cannot pre-empt
 *
 * A `deviceNo` another live gym holds is refused, because it is §11's join key and a typo landing on
 * a real other unit repoints that gym's revenue. So is a partial body naming an unknown device. Both
 * depend on rows the server holds, so both arrive as messages rather than as validation here.
 */
export function AdminMachineEditor({ gym, onSaved }: { gym: AdminGymView; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  // The trap the type documents: `machineOf(null)` returns a zero-valued projection, so
  // "no unit allocated" is `machine.deviceNo === null` and never `machine === null`.
  const hasUnit = gym.machine.deviceNo !== null;
  // A second trap: `hasUnit` alone no longer means a real, physical unit is assigned.
  const isPending = hasUnit && isPendingDeviceNo(gym.machine.deviceNo);
  const unit = gym.machines.find((row) => row.deviceNo === gym.machine.deviceNo) ?? null;

  return (
    <Card
      id="machine"
      title="Machine"
      note={
        isPending
          ? "Model and value are set; the physical unit hasn't been chosen yet."
          : !hasUnit
            ? "Signing does not require a unit. Activation does."
            : undefined
      }
      testId="card-machine"
      action={
        editing ? null : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSaved(null);
              setEditing(true);
            }}
            className="rounded-xl cursor-pointer h-8"
            data-testid="button-edit-machine"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden />
            {hasUnit && !isPending ? "Edit or replace" : "Assign a unit"}
          </Button>
        )
      }
    >
      {editing ? (
        <MachineForm
          gym={gym}
          currentStatus={unit?.status ?? "allocated"}
          onCancel={() => setEditing(false)}
          onSaved={(message) => {
            setSaved(message);
            setEditing(false);
            onSaved();
          }}
        />
      ) : (
        <>
          {saved && (
            <div className="px-4 sm:px-5 pt-4">
              <SuccessPanel testId="machine-saved">{saved}</SuccessPanel>
            </div>
          )}
          {hasUnit ? (
            <Fields>
              <Field
                label="Device no."
                value={isPending ? "Pending, not yet chosen" : gym.machine.deviceNo}
                mono={!isPending}
              />
              <Field label="Model" value={gym.machine.model} />
              <Field label="Serial" value={gym.machine.serialNumber} mono />
              <Field label="Value" value={formatInr(gym.machine.valueInr)} />
              <Field label="Accessories" value={gym.machine.accessories} />
              {unit && <Field label="Status" value={MACHINE_STATUS_LABEL[unit.status]} />}
              {/* A contractual calendar date (§4.1), formatted as one — never through `Date`. */}
              <Field label="Installed" value={formatCalendarDate(gym.machine.installationDate)} />
            </Fields>
          ) : (
            <Empty testId="machine-none">
              No unit allocated. Signing does not require one; activation does.
            </Empty>
          )}
        </>
      )}

      {gym.machines.length > 0 && (
        <div className="border-t border-border/70">
          <p className="px-4 sm:px-5 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            All units, including replaced
          </p>
          <table className="w-full text-sm" data-testid="table-machines">
            <tbody className="divide-y divide-border/70">
              {gym.machines.map((row) => (
                <tr key={row.deviceNo}>
                  <td className="px-4 sm:px-5 py-2.5 font-mono text-xs">
                    {isPendingDeviceNo(row.deviceNo) ? (
                      <span className="font-sans text-muted-foreground italic">pending</span>
                    ) : (
                      row.deviceNo
                    )}
                  </td>
                  <td className="px-4 py-2.5">{row.model}</td>
                  <td className="px-4 py-2.5">{MACHINE_STATUS_LABEL[row.status]}</td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                    {formatCalendarDate(row.installationDate)}
                  </td>
                  <td className="px-4 sm:px-5 py-2.5 text-muted-foreground whitespace-nowrap">
                    {/* An ISO timestamp, not a date — truncating it in UTC dates a 01:00 IST
                        service call to the previous day. */}
                    {row.lastServiceAt ? `Serviced ${formatIstDateTime(row.lastServiceAt)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

const STATUS_OPTIONS = MACHINE_STATUSES.map((value) => ({
  value,
  label: MACHINE_STATUS_LABEL[value],
}));

function MachineForm({
  gym,
  currentStatus,
  onCancel,
  onSaved,
}: {
  gym: AdminGymView;
  currentStatus: AdminMachineForm["status"];
  onCancel: () => void;
  onSaved: (message: string) => void;
}) {
  const current = gym.machine;
  const pending = current.deviceNo !== null && isPendingDeviceNo(current.deviceNo);

  const form = useForm<AdminMachineForm>({
    resolver: zodResolver(adminMachineFormSchema),
    defaultValues: {
      // Empty for a placeholder, and empty for no row at all. See the module docstring.
      deviceNo: current.deviceNo === null || pending ? "" : current.deviceNo,
      model: current.model,
      serialNumber: current.serialNumber ?? "",
      valueInr: current.valueInr,
      accessories: current.accessories,
      installationDate: current.installationDate ?? "",
      status: currentStatus,
    },
    mode: "onBlur",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const typed = form.watch("deviceNo").trim();
  // A hint, not a decision. The server reads the row and picks; this only tells the admin which of
  // the two they are about to do, so a mistyped digit is caught before it creates a second unit.
  const willReplace =
    typed !== "" && current.deviceNo !== null && typed !== current.deviceNo && !pending;

  async function onSubmit(values: AdminMachineForm) {
    setProblem(null);
    setIsSaving(true);
    try {
      const result = await putGymMachine(gym.gymId, toAdminMachineBody(values));
      if (!result.ok) {
        if (result.error.fieldErrors) {
          for (const [field, message] of Object.entries(result.error.fieldErrors)) {
            form.setError(field as keyof AdminMachineForm, { message });
          }
        }
        setProblem(result.error.message);
        return;
      }
      onSaved(
        result.data.replaced
          ? `Replaced. ${result.data.deviceNo} is now this gym's unit and the previous one is marked replaced.`
          : `Saved. ${result.data.deviceNo} updated.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4 sm:p-5 space-y-4">
        {problem && <ErrorPanel message={problem} testId="machine-error" />}

        {willReplace && (
          <div
            className="rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3"
            data-testid="machine-replace-warning"
          >
            <p className="text-xs text-amber-200 leading-relaxed">
              This is a different device number to the one on file, so saving replaces the unit.{" "}
              <span className="font-mono">{current.deviceNo}</span> will be kept and marked replaced,
              because §4.1 dates the term from installation and which unit was here when has to stay
              readable.
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <TextField
            control={form.control}
            name="deviceNo"
            label="Device number"
            mono
            placeholder="MBP-000241"
            description="The number printed on the unit. It is the join key to payments, so a stray character is a gym with no revenue."
          />
          <SelectField
            control={form.control}
            name="status"
            label="Status"
            options={STATUS_OPTIONS}
          />
          <TextField control={form.control} name="model" label="Model" />
          <TextField
            control={form.control}
            name="serialNumber"
            label="Serial number"
            mono
            description="Optional. Leave blank if the unit has none recorded."
          />
          <NumberField control={form.control} name="valueInr" label="Value" prefix="₹" />
          <DateField
            control={form.control}
            name="installationDate"
            label="Installation date"
            description="§4.1 dates the term from this. A future date is allowed: an installation can be booked."
          />
        </div>

        <AreaField
          control={form.control}
          name="accessories"
          label="Accessories"
          rows={2}
          placeholder="Cup dispenser, water filter, base cabinet"
        />

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={isSaving}
            className="h-10 px-5 rounded-xl font-bold text-sm cursor-pointer"
            data-testid="button-save-machine"
          >
            {isSaving ? "Saving…" : willReplace ? "Replace unit" : "Save machine"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 px-5 rounded-xl cursor-pointer"
            data-testid="button-cancel-machine"
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
