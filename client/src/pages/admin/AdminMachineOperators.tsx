"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAllMachines } from "@/lib/adminMachineApi";
import type { AdminReadResult } from "@/lib/adminApi";
import {
  createOperator,
  fetchOperators,
  resendOperatorInvite,
  setOperatorDisabled,
  updateOperator,
  type OperatorManager,
} from "@/lib/operatorsApi";
import type { MachineRow } from "@shared/admin/machinesSchema";
import {
  OPERATOR_MACHINES_MAX,
  OPERATOR_NAME_MAX,
  type Operator,
  type OperatorInvite,
  type OperatorPatch,
  type OperatorStatus,
} from "@shared/admin/operatorsSchema";
import type { MachineViewer } from "@shared/admin/viewerSchema";
import { AdminChecking } from "./AdminShell";
import { Pill, SuccessPanel } from "./AdminUi";
import { MachinesShell } from "./machines/MachinesShell";
import { useMachineGuard } from "./machines/viewer";
import { FormRow, NativeSelect, TextInput } from "./machines/formBits";
import { FieldError, MachinePicker } from "./machines/scopeBits";
import { useOwnerChoices } from "./machines/ownerBits";
import { Cell, Col, DataTable, formatIstStamp, MachineDialog, MachinesHeader, NoData, ProblemPanel, type Problem } from "./machines/MachinesUi";

export default function AdminMachineOperators() {
  const guard = useMachineGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <OperatorsPage session={guard.session} />;
}

export const OPERATOR_STATUS_LABEL: Record<OperatorStatus, { text: string; className: string }> = {
  invited: { text: "Invite sent", className: "bg-amber-400/15 text-amber-200" },
  active: { text: "Active", className: "bg-emerald-400/15 text-emerald-200" },
  disabled: { text: "Turned off", className: "bg-secondary text-muted-foreground" },
};

const problemFrom = <T,>(result: AdminReadResult<T>): Problem | null => (result.ok ? null : { message: result.error.message, issues: result.issues });

type Editing = { kind: "add" } | { kind: "edit"; operator: Operator } | null;

function OperatorsPage({ session }: { session: MachineViewer }) {
  const as: OperatorManager = session.role === "admin" ? "admin" : "franchise";
  const canEdit = session.can.has("operators.edit");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [machines, setMachines] = useState<MachineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [disabling, setDisabling] = useState<Operator | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [invite, setInvite] = useState<OperatorInvite | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchOperators(as);
    setLoading(false);
    setProblem(problemFrom(result));
    if (result.ok) setOperators(result.data);
  }, [as]);

  useEffect(() => {
    void load();
    fetchAllMachines().then((result) => result.ok && setMachines(result.data));
  }, [load]);

  const label = useMemo(() => new Map(machines.map((m) => [m.sn, m.deviceExtNo || m.name || m.sn])), [machines]);

  const replace = (next: Operator) => setOperators((list) => list.map((o) => (o.email === next.email ? next : o)));

  function clearMessages() {
    setProblem(null);
    setNotice(null);
    setInvite(null);
  }

  async function resend(operator: Operator) {
    clearMessages();
    setBusy(operator.email);
    const result = await resendOperatorInvite(as, operator.email);
    setBusy(null);
    if (!result.ok) return setProblem(problemFrom(result));
    replace(result.data.operator);
    setInvite(result.data);
  }

  async function enable(operator: Operator) {
    clearMessages();
    setBusy(operator.email);
    const result = await setOperatorDisabled(as, operator.email, false);
    setBusy(null);
    if (!result.ok) return setProblem(problemFrom(result));
    replace(result.data);
    setNotice(
      result.data.status === "invited"
        ? `${result.data.name} is turned on again. They never set a password, so send the invite again.`
        : `${result.data.name} can sign in again.`,
    );
  }

  return (
    <MachinesShell session={session} section="operators">
      <MachinesHeader
        title="Operators"
        subtitle="People who restock and test machines. Each one sees only the machines you give them."
        action={
          canEdit && (
            <Button
              type="button"
              onClick={() => {
                clearMessages();
                setEditing({ kind: "add" });
              }}
              className="rounded-xl cursor-pointer"
              data-testid="button-add-operator"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add operator
            </Button>
          )
        }
      />

      <ProblemPanel problem={problem} testId="operators-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="operators-notice">{notice}</SuccessPanel>
        </div>
      )}
      {invite && <InvitePanel invite={invite} />}

      <DataTable testId="operators-table">
        <Head as={as} />
        <tbody className="divide-y divide-border/70">
          {operators.length === 0 ? (
            <NoData colSpan={as === "admin" ? 6 : 5} loading={loading} />
          ) : (
            operators.map((o) => {
              const status = OPERATOR_STATUS_LABEL[o.status];
              return (
                <tr key={o.email} className="hover:bg-secondary/40 transition-colors" data-testid={`row-operator-${o.email}`}>
                  <Cell>
                    <span className="block font-semibold text-foreground">{o.name}</span>
                    <span className="block text-xs text-muted-foreground">{o.email}</span>
                    {o.phone && <span className="block text-xs text-muted-foreground">{o.phone}</span>}
                  </Cell>
                  {as === "admin" && <Cell className="whitespace-nowrap">{o.franchiseId ? (o.franchiseName ?? "A franchise") : "MBP"}</Cell>}
                  <Cell className="min-w-[10rem]">
                    <MachineList sns={o.machines} label={label} />
                  </Cell>
                  <Cell className="whitespace-nowrap">
                    <Pill className={status.className} testId={`operator-status-${o.email}`}>
                      {status.text}
                    </Pill>
                    {o.status === "disabled" && o.disabledReason && (
                      <span className="mt-1 block max-w-[14rem] whitespace-normal text-xs text-muted-foreground">{o.disabledReason}</span>
                    )}
                  </Cell>
                  <Cell className="whitespace-nowrap text-xs text-muted-foreground">
                    {o.lastLoginAt ? formatIstStamp(o.lastLoginAt) : "Never"}
                  </Cell>
                  <Cell align="right">
                    {canEdit && (
                      <span className="flex flex-wrap justify-end gap-3 whitespace-nowrap">
                        <ActionLink
                          onClick={() => {
                            clearMessages();
                            setEditing({ kind: "edit", operator: o });
                          }}
                          testId={`edit-operator-${o.email}`}
                        >
                          Edit
                        </ActionLink>
                        {o.status === "invited" && (
                          <ActionLink onClick={() => void resend(o)} disabled={busy === o.email} testId={`resend-operator-${o.email}`}>
                            Send invite again
                          </ActionLink>
                        )}
                        {o.status === "disabled" ? (
                          <ActionLink onClick={() => void enable(o)} disabled={busy === o.email} testId={`enable-operator-${o.email}`}>
                            Turn on
                          </ActionLink>
                        ) : (
                          <ActionLink
                            onClick={() => {
                              clearMessages();
                              setDisabling(o);
                            }}
                            danger
                            testId={`disable-operator-${o.email}`}
                          >
                            Turn off
                          </ActionLink>
                        )}
                      </span>
                    )}
                  </Cell>
                </tr>
              );
            })
          )}
        </tbody>
      </DataTable>

      {editing && (
        <OperatorDialog
          as={as}
          operator={editing.kind === "edit" ? editing.operator : null}
          machines={machines}
          onClose={() => setEditing(null)}
          onCreated={(created) => {
            setEditing(null);
            setOperators((list) => [created.operator, ...list]);
            setInvite(created);
          }}
          onSaved={(saved) => {
            setEditing(null);
            replace(saved);
            setNotice(`${saved.name} is saved.`);
          }}
        />
      )}
      {disabling && (
        <DisableDialog
          as={as}
          operator={disabling}
          onClose={() => setDisabling(null)}
          onDone={(saved) => {
            setDisabling(null);
            replace(saved);
            setNotice(`${saved.name} is turned off and signed out.`);
          }}
        />
      )}
    </MachinesShell>
  );
}

function Head({ as }: { as: OperatorManager }) {
  return (
    <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
      <tr>
        <Col>Operator</Col>
        {as === "admin" && <Col>Franchise</Col>}
        <Col>Machines</Col>
        <Col>Status</Col>
        <Col>Last signed in</Col>
        <Col align="right">
          <span className="sr-only">Actions</span>
        </Col>
      </tr>
    </thead>
  );
}

function MachineList({ sns, label }: { sns: string[]; label: ReadonlyMap<string, string> }) {
  if (sns.length === 0) return <span className="text-muted-foreground">None yet</span>;
  const shown = sns.slice(0, 3).map((sn) => label.get(sn) ?? sn);
  return (
    <span className="text-sm">
      {shown.join(", ")}
      {sns.length > 3 && <span className="text-muted-foreground"> and {sns.length - 3} more</span>}
    </span>
  );
}

function ActionLink({
  onClick,
  disabled,
  danger,
  testId,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-semibold hover:underline cursor-pointer disabled:opacity-60 ${danger ? "text-rose-300" : "text-primary"}`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function InvitePanel({ invite }: { invite: OperatorInvite }) {
  const [copied, setCopied] = useState(false);
  const until = invite.inviteExpiresAt ? ` The link works until ${formatIstStamp(invite.inviteExpiresAt)} IST.` : "";
  if (invite.emailed) {
    return (
      <div className="mb-4">
        <SuccessPanel testId="operator-invite-sent">
          We emailed {invite.operator.name} a link to set their password.{until}
        </SuccessPanel>
      </div>
    );
  }
  return (
    <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm" data-testid="operator-invite-link">
      <p className="text-amber-100">
        The email to {invite.operator.name} didn&apos;t go out. Send them this link yourself.{until}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          readOnly
          value={invite.inviteUrl}
          onFocus={(event) => event.target.select()}
          aria-label="Invite link"
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-secondary/50 px-3 font-mono text-xs text-foreground"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard?.writeText(invite.inviteUrl).then(() => setCopied(true));
          }}
          className="rounded-lg cursor-pointer"
          data-testid="button-copy-invite"
        >
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    </div>
  );
}

type Values = { name: string; email: string; phone: string; franchiseId: string; machines: string[] };

const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export function checkOperator(v: Values, adding: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = v.name.trim();
  if (!name) errors.name = "Enter the operator's name.";
  else if (name.length > OPERATOR_NAME_MAX) errors.name = `Up to ${OPERATOR_NAME_MAX} characters.`;
  if (adding && !looksLikeEmail(v.email.trim())) errors.email = "Enter a valid email address.";
  if (v.phone.trim() && !/^[0-9+ ]{6,20}$/.test(v.phone.trim())) errors.phone = "Digits, + and spaces only.";
  if (v.machines.length > OPERATOR_MACHINES_MAX) errors.machines = `Up to ${OPERATOR_MACHINES_MAX} machines.`;
  return errors;
}

export function operatorPatch(before: Operator, v: Values): OperatorPatch {
  const patch: OperatorPatch = {};
  const name = v.name.trim();
  const phone = v.phone.trim() || null;
  if (name !== before.name) patch.name = name;
  if (phone !== before.phone) patch.phone = phone;
  const same = v.machines.length === before.machines.length && v.machines.every((sn) => before.machines.includes(sn));
  if (!same) patch.machines = v.machines;
  return patch;
}

function OperatorDialog({
  as,
  operator,
  machines,
  onClose,
  onCreated,
  onSaved,
}: {
  as: OperatorManager;
  operator: Operator | null;
  machines: MachineRow[];
  onClose: () => void;
  onCreated: (invite: OperatorInvite) => void;
  onSaved: (operator: Operator) => void;
}) {
  const adding = operator === null;
  const [values, setValues] = useState<Values>(() => ({
    name: operator?.name ?? "",
    email: operator?.email ?? "",
    phone: operator?.phone ?? "",
    franchiseId: operator?.franchiseId ?? "",
    machines: operator?.machines ?? [],
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const franchiseOf = adding ? values.franchiseId : (operator?.franchiseId ?? "");
  const pickable = as === "admin" && franchiseOf ? machines.filter((m) => m.owner?.franchiseId === franchiseOf) : machines;

  async function save() {
    const found = checkOperator(values, adding);
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length > 0) return;
    if (!operator) {
      setSaving(true);
      const result = await createOperator(as, {
        email: values.email.trim(),
        name: values.name.trim(),
        phone: values.phone.trim() || null,
        machines: values.machines,
        ...(as === "admin" ? { franchiseId: values.franchiseId || null } : {}),
      });
      setSaving(false);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        return setProblem(problemFrom(result));
      }
      return onCreated(result.data);
    }
    const patch = operatorPatch(operator, values);
    if (Object.keys(patch).length === 0) return onClose();
    setSaving(true);
    const result = await updateOperator(as, operator.email, patch);
    setSaving(false);
    if (!result.ok) {
      setErrors(result.error.fieldErrors ?? {});
      return setProblem(problemFrom(result));
    }
    onSaved(result.data);
  }

  return (
    <MachineDialog
      open
      onClose={onClose}
      wide
      title={adding ? "Add operator" : `Edit ${operator.name}`}
      description={
        adding
          ? "We email them a link to set a password. They sign in at the operator sign-in page and see only the machines you tick."
          : operator.email
      }
      testId="operator-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-operator">
            {saving ? "Saving…" : adding ? "Add and send invite" : "Save"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ProblemPanel problem={problem} testId="operator-dialog-error" />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Name" htmlFor="operator-name" error={errors.name}>
            <TextInput id="operator-name" value={values.name} onChange={(v) => set("name", v)} maxLength={OPERATOR_NAME_MAX} />
          </FormRow>
          {adding && (
            <FormRow label="Email" htmlFor="operator-email" error={errors.email} hint="They sign in with this.">
              <TextInput id="operator-email" value={values.email} onChange={(v) => set("email", v)} />
            </FormRow>
          )}
          <FormRow label="Phone (optional)" htmlFor="operator-phone" error={errors.phone}>
            <TextInput id="operator-phone" value={values.phone} onChange={(v) => set("phone", v)} inputMode="numeric" />
          </FormRow>
          {as === "admin" && adding && (
            <FormRow label="Works for" htmlFor="operator-franchise" error={errors.franchiseId}>
              <FranchiseSelect
                value={values.franchiseId}
                onChange={(v) => setValues((current) => ({ ...current, franchiseId: v, machines: [] }))}
              />
            </FormRow>
          )}
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-muted-foreground">
            Machines <span className="font-normal">({values.machines.length} chosen)</span>
          </p>
          {pickable.length === 0 ? (
            <p className="text-sm text-muted-foreground">There are no machines to give yet.</p>
          ) : (
            <MachinePicker machines={pickable} chosen={values.machines} onChange={(sns) => set("machines", sns)} testId="operator-machines" />
          )}
          <FieldError error={errors.machines} testId="error-operator-machines" />
        </div>
      </div>
    </MachineDialog>
  );
}

function FranchiseSelect({ value, onChange }: { value: string; onChange: (franchiseId: string) => void }) {
  const choices = useOwnerChoices();
  return (
    <NativeSelect
      id="operator-franchise"
      value={value}
      onChange={onChange}
      options={[{ value: "", label: "MBP" }, ...(choices?.franchises ?? []).map((f) => ({ value: f.franchiseId, label: f.name }))]}
    />
  );
}

const REASON_MAX = 200;

function DisableDialog({
  as,
  operator,
  onClose,
  onDone,
}: {
  as: OperatorManager;
  operator: Operator;
  onClose: () => void;
  onDone: (operator: Operator) => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);

  async function confirm() {
    setBusy(true);
    setProblem(null);
    const result = await setOperatorDisabled(as, operator.email, true, reason.trim() || undefined);
    setBusy(false);
    if (!result.ok) return setProblem(problemFrom(result));
    onDone(result.data);
  }

  return (
    <MachineDialog
      open
      onClose={onClose}
      title={`Turn off ${operator.name}?`}
      description="They are signed out at once and can't sign in until you turn them on again. Their machines stay as they are."
      testId="operator-disable-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => void confirm()} disabled={busy} className="rounded-xl cursor-pointer" data-testid="button-confirm-disable">
            {busy ? "Working…" : "Turn off"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <ProblemPanel problem={problem} testId="operator-disable-error" />
        <FormRow label="Reason (optional)" htmlFor="operator-reason" hint={`Shown on this page only. ${reason.length} of ${REASON_MAX}.`}>
          <TextInput id="operator-reason" value={reason} onChange={setReason} maxLength={REASON_MAX} />
        </FormRow>
      </div>
    </MachineDialog>
  );
}
