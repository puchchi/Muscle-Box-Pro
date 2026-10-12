"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchAllMachines } from "@/lib/adminMachineApi";
import type { AdminReadResult } from "@/lib/adminApi";
import {
  createOperator,
  fetchOperators,
  fetchSuggestedOperatorId,
  setOperatorDisabled,
  setOperatorPassword,
  updateOperator,
  type OperatorManager,
} from "@/lib/operatorsApi";
import type { MachineRow } from "@shared/admin/machinesSchema";
import {
  OPERATOR_ID_PATTERN,
  OPERATOR_MACHINES_MAX,
  OPERATOR_NAME_MAX,
  OPERATOR_PASSWORD_MAX,
  OPERATOR_PASSWORD_MIN,
  type Operator,
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
  active: { text: "Active", className: "bg-emerald-400/15 text-emerald-200" },
  disabled: { text: "Turned off", className: "bg-secondary text-muted-foreground" },
};

const problemFrom = <T,>(result: AdminReadResult<T>): Problem | null => (result.ok ? null : { message: result.error.message, issues: result.issues });

type Editing = { kind: "add" } | { kind: "edit"; operator: Operator } | { kind: "password"; operator: Operator } | null;
type Credentials = { name: string; operatorId: string; password: string; isNew: boolean };

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
  const [credentials, setCredentials] = useState<Credentials | null>(null);
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
  const takenIds = useMemo(() => new Set(operators.map((o) => o.operatorId)), [operators]);

  const replace = (next: Operator) =>
    setOperators((list) => list.map((o) => (o.operatorId === next.operatorId ? { ...next, franchiseName: next.franchiseName ?? o.franchiseName } : o)));

  function clearMessages() {
    setProblem(null);
    setNotice(null);
    setCredentials(null);
  }

  function open(next: Editing) {
    clearMessages();
    setEditing(next);
  }

  async function enable(operator: Operator) {
    clearMessages();
    setBusy(operator.operatorId);
    const result = await setOperatorDisabled(as, operator.operatorId, false);
    setBusy(null);
    if (!result.ok) return setProblem(problemFrom(result));
    replace(result.data);
    setNotice(`${result.data.name} can sign in again.`);
  }

  return (
    <MachinesShell session={session} section="operators">
      <MachinesHeader
        title="Operators"
        subtitle="People who restock and test machines. Each one sees only the machines you give them."
        action={
          canEdit && (
            <Button type="button" onClick={() => open({ kind: "add" })} className="rounded-xl cursor-pointer" data-testid="button-add-operator">
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
      {credentials && <CredentialsPanel credentials={credentials} onDone={() => setCredentials(null)} />}

      <DataTable testId="operators-table">
        <Head as={as} />
        <tbody className="divide-y divide-border/70">
          {operators.length === 0 ? (
            <NoData colSpan={as === "admin" ? 6 : 5} loading={loading} />
          ) : (
            operators.map((o) => {
              const status = OPERATOR_STATUS_LABEL[o.status];
              const id = o.operatorId;
              return (
                <tr key={id} className="hover:bg-secondary/40 transition-colors" data-testid={`row-operator-${id}`}>
                  <Cell>
                    <span className="block font-semibold text-foreground">{o.name}</span>
                    <span className="block font-mono text-xs text-foreground/80">{id}</span>
                    {o.email && <span className="block text-xs text-muted-foreground">{o.email}</span>}
                    {o.phone && <span className="block text-xs text-muted-foreground">{o.phone}</span>}
                    <span className="mt-1.5 block lg:hidden">
                      <MachineList sns={o.machines} label={label} />
                    </span>
                  </Cell>
                  {as === "admin" && <Cell className="whitespace-nowrap">{o.franchiseId ? (o.franchiseName ?? "A franchise") : "MBP"}</Cell>}
                  <Cell className="hidden min-w-[10rem] lg:table-cell">
                    <MachineList sns={o.machines} label={label} />
                  </Cell>
                  <Cell className="whitespace-nowrap">
                    <Pill className={status.className} testId={`operator-status-${id}`}>
                      {status.text}
                    </Pill>
                    {o.status === "disabled" && o.disabledReason && (
                      <span className="mt-1 block max-w-[14rem] whitespace-normal text-xs text-muted-foreground">{o.disabledReason}</span>
                    )}
                  </Cell>
                  <Cell className="min-w-[5.5rem] text-xs text-muted-foreground">
                    {o.lastLoginAt ? formatIstStamp(o.lastLoginAt) : "Never"}
                  </Cell>
                  <Cell align="right">
                    {canEdit && (
                      <span className="flex flex-col items-end gap-1.5 whitespace-nowrap lg:flex-row lg:gap-3">
                        <ActionLink onClick={() => open({ kind: "edit", operator: o })} testId={`edit-operator-${id}`}>
                          Edit
                        </ActionLink>
                        <ActionLink onClick={() => open({ kind: "password", operator: o })} testId={`password-operator-${id}`}>
                          Change password
                        </ActionLink>
                        {o.status === "disabled" ? (
                          <ActionLink onClick={() => void enable(o)} disabled={busy === id} testId={`enable-operator-${id}`}>
                            Turn on
                          </ActionLink>
                        ) : (
                          <ActionLink
                            onClick={() => {
                              clearMessages();
                              setDisabling(o);
                            }}
                            danger
                            testId={`disable-operator-${id}`}
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

      {(editing?.kind === "add" || editing?.kind === "edit") && (
        <OperatorDialog
          as={as}
          operator={editing.kind === "edit" ? editing.operator : null}
          machines={machines}
          takenIds={takenIds}
          onClose={() => setEditing(null)}
          onCreated={(created, password) => {
            setEditing(null);
            setOperators((list) => [created, ...list]);
            setCredentials({ name: created.name, operatorId: created.operatorId, password, isNew: true });
          }}
          onSaved={(saved) => {
            setEditing(null);
            replace(saved);
            setNotice(`${saved.name} is saved.`);
          }}
        />
      )}
      {editing?.kind === "password" && (
        <PasswordDialog
          as={as}
          operator={editing.operator}
          onClose={() => setEditing(null)}
          onDone={(saved, password) => {
            setEditing(null);
            replace(saved);
            setCredentials({ name: saved.name, operatorId: saved.operatorId, password, isNew: false });
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
        <Col className="hidden lg:table-cell">Machines</Col>
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
      {shown.map((name, i) => (
        <span key={name} className="whitespace-nowrap">
          {name}
          {i < shown.length - 1 && ", "}
        </span>
      ))}
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

const SIGN_IN_PATH = "/machines/sign-in";

function CredentialsPanel({ credentials, onDone }: { credentials: Credentials; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const { name, operatorId, password, isNew } = credentials;
  const signInAt = typeof window === "undefined" ? SIGN_IN_PATH : `${window.location.origin}${SIGN_IN_PATH}`;
  const text = `Operator ID: ${operatorId}\nPassword: ${password}\nSign in at ${signInAt}`;
  return (
    <div className="mb-4 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm" role="status" data-testid="operator-credentials">
      <p className="text-emerald-100">
        {isNew
          ? `${name} is added. Give them these details so they can sign in.`
          : `${name} has a new password and is signed out everywhere. Give them the new one.`}{" "}
        This is the only time the password is shown.
      </p>
      <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 font-mono text-sm">
        <dt className="text-muted-foreground">Operator ID</dt>
        <dd className="break-all text-foreground" data-testid="credentials-id">
          {operatorId}
        </dd>
        <dt className="text-muted-foreground">Password</dt>
        <dd className="break-all text-foreground" data-testid="credentials-password">
          {password}
        </dd>
      </dl>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(() => setCopied(true));
          }}
          className="rounded-lg cursor-pointer"
          data-testid="button-copy-credentials"
        >
          {copied ? "Copied" : "Copy details"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} className="rounded-lg cursor-pointer" data-testid="button-credentials-done">
          Done
        </Button>
      </div>
    </div>
  );
}

const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function makePassword(): string {
  const picked: string[] = [];
  const unbiasedBelow = 256 - (256 % PASSWORD_ALPHABET.length);
  while (picked.length < 12) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < unbiasedBelow && picked.length < 12) picked.push(PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]);
    }
  }
  return [0, 4, 8].map((i) => picked.slice(i, i + 4).join("")).join("-");
}

export function checkPassword(password: string): string | null {
  if (password.length < OPERATOR_PASSWORD_MIN) return `Use at least ${OPERATOR_PASSWORD_MIN} characters.`;
  if (password.length > OPERATOR_PASSWORD_MAX) return `Passwords are limited to ${OPERATOR_PASSWORD_MAX} characters.`;
  return null;
}

function PasswordField({
  id,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint: string;
}) {
  return (
    <FormRow label="Password" htmlFor={id} error={error} hint={hint}>
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <TextInput id={id} value={value} onChange={onChange} mono autoComplete="off" maxLength={OPERATOR_PASSWORD_MAX} />
        </div>
        <Button type="button" variant="outline" onClick={() => onChange(makePassword())} className="h-11 rounded-xl cursor-pointer" data-testid="button-make-password">
          Make one
        </Button>
      </div>
    </FormRow>
  );
}

type Values = { operatorId: string; password: string; name: string; email: string; phone: string; franchiseId: string; machines: string[] };

const looksLikeEmail = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

export function checkOperator(v: Values, adding: boolean, takenIds: ReadonlySet<string> = new Set()): Record<string, string> {
  const errors: Record<string, string> = {};
  const name = v.name.trim();
  if (!name) errors.name = "Enter the operator's name.";
  else if (name.length > OPERATOR_NAME_MAX) errors.name = `Up to ${OPERATOR_NAME_MAX} characters.`;
  if (adding) {
    const id = v.operatorId.trim();
    if (!OPERATOR_ID_PATTERN.test(id)) errors.operatorId = "Use 3 to 32 lowercase letters, numbers or _. Start with a letter.";
    else if (takenIds.has(id)) errors.operatorId = "That ID is already taken.";
    const password = checkPassword(v.password);
    if (password) errors.password = password;
  }
  if (v.email.trim() && !looksLikeEmail(v.email.trim())) errors.email = "Enter a valid email address, or leave it empty.";
  if (v.phone.trim() && !/^\+?[0-9 ()-]{8,20}$/.test(v.phone.trim())) errors.phone = "Use 8 to 20 digits. Spaces, brackets and a leading + are fine.";
  if (v.machines.length > OPERATOR_MACHINES_MAX) errors.machines = `Up to ${OPERATOR_MACHINES_MAX} machines.`;
  return errors;
}

export function operatorPatch(before: Operator, v: Values): OperatorPatch {
  const patch: OperatorPatch = {};
  const name = v.name.trim();
  const email = v.email.trim() || null;
  const phone = v.phone.trim() || null;
  if (name !== before.name) patch.name = name;
  if (email !== before.email) patch.email = email;
  if (phone !== before.phone) patch.phone = phone;
  const same = v.machines.length === before.machines.length && v.machines.every((sn) => before.machines.includes(sn));
  if (!same) patch.machines = v.machines;
  return patch;
}

function OperatorDialog({
  as,
  operator,
  machines,
  takenIds,
  onClose,
  onCreated,
  onSaved,
}: {
  as: OperatorManager;
  operator: Operator | null;
  machines: MachineRow[];
  takenIds: ReadonlySet<string>;
  onClose: () => void;
  onCreated: (operator: Operator, password: string) => void;
  onSaved: (operator: Operator) => void;
}) {
  const adding = operator === null;
  const [values, setValues] = useState<Values>(() => ({
    operatorId: "",
    password: "",
    name: operator?.name ?? "",
    email: operator?.email ?? "",
    phone: operator?.phone ?? "",
    franchiseId: operator?.franchiseId ?? "",
    machines: operator?.machines ?? [],
  }));
  const [idTyped, setIdTyped] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState<Problem | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Values>(key: K, value: Values[K]) => setValues((v) => ({ ...v, [key]: value }));
  const franchiseOf = adding ? values.franchiseId : (operator?.franchiseId ?? "");
  const pickable = as === "admin" && franchiseOf ? machines.filter((m) => m.owner?.franchiseId === franchiseOf) : machines;

  useEffect(() => {
    if (!adding || idTyped) return;
    let live = true;
    fetchSuggestedOperatorId(as, values.franchiseId || null).then((suggested) => {
      if (live && suggested) setValues((v) => ({ ...v, operatorId: suggested }));
    });
    return () => {
      live = false;
    };
  }, [adding, as, values.franchiseId, idTyped]);

  async function save() {
    const found = checkOperator(values, adding, takenIds);
    setErrors(found);
    setProblem(null);
    if (Object.keys(found).length > 0) return;
    const email = values.email.trim();
    const phone = values.phone.trim();
    if (!operator) {
      setSaving(true);
      const result = await createOperator(as, {
        operatorId: values.operatorId.trim(),
        password: values.password,
        name: values.name.trim(),
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        machines: values.machines,
        ...(as === "admin" ? { franchiseId: values.franchiseId || null } : {}),
      });
      setSaving(false);
      if (!result.ok) {
        setErrors(result.error.fieldErrors ?? {});
        return setProblem(problemFrom(result));
      }
      return onCreated(result.data, values.password);
    }
    const patch = operatorPatch(operator, values);
    if (Object.keys(patch).length === 0) return onClose();
    setSaving(true);
    const result = await updateOperator(as, operator.operatorId, patch);
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
          ? "They sign in with the operator ID and password you set here. Nothing is emailed to them. They see only the machines you tick."
          : `Operator ID ${operator.operatorId}. The ID can't be changed.`
      }
      testId="operator-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={saving} className="rounded-xl cursor-pointer" data-testid="button-save-operator">
            {saving ? "Saving…" : adding ? "Add operator" : "Save"}
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
          {as === "admin" && adding && (
            <FormRow label="Works for" htmlFor="operator-franchise" error={errors.franchiseId}>
              <FranchiseSelect
                value={values.franchiseId}
                onChange={(v) => setValues((current) => ({ ...current, franchiseId: v, machines: [] }))}
              />
            </FormRow>
          )}
        </div>
        {adding && (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormRow label="Operator ID" htmlFor="operator-id" error={errors.operatorId} hint="They sign in with this. It can't be changed later.">
              <TextInput
                id="operator-id"
                value={values.operatorId}
                onChange={(v) => {
                  const next = v.toLowerCase();
                  setIdTyped(next !== "");
                  set("operatorId", next);
                }}
                mono
                autoComplete="off"
                maxLength={32}
                placeholder="op_mbp_01"
              />
            </FormRow>
            <PasswordField
              id="operator-password"
              value={values.password}
              onChange={(v) => set("password", v)}
              error={errors.password}
              hint={`At least ${OPERATOR_PASSWORD_MIN} characters. You give it to them yourself.`}
            />
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormRow label="Email (optional)" htmlFor="operator-email" error={errors.email} hint="For reaching them. Not used to sign in.">
            <TextInput id="operator-email" value={values.email} onChange={(v) => set("email", v)} autoComplete="off" />
          </FormRow>
          <FormRow label="Mobile (optional)" htmlFor="operator-phone" error={errors.phone}>
            <TextInput id="operator-phone" value={values.phone} onChange={(v) => set("phone", v)} inputMode="numeric" autoComplete="off" />
          </FormRow>
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

function PasswordDialog({
  as,
  operator,
  onClose,
  onDone,
}: {
  as: OperatorManager;
  operator: Operator;
  onClose: () => void;
  onDone: (operator: Operator, password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    const found = checkPassword(password);
    setError(found ?? undefined);
    setProblem(null);
    if (found) return;
    setBusy(true);
    const result = await setOperatorPassword(as, operator.operatorId, password);
    setBusy(false);
    if (!result.ok) {
      const field = result.error.fieldErrors?.password;
      if (field) return setError(field);
      return setProblem(problemFrom(result));
    }
    onDone(result.data, password);
  }

  return (
    <MachineDialog
      open
      onClose={onClose}
      title={`New password for ${operator.name}`}
      description="They are signed out on every device and sign in again with the new password."
      testId="operator-password-dialog"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="rounded-xl cursor-pointer">
            Cancel
          </Button>
          <Button type="button" onClick={() => void save()} disabled={busy} className="rounded-xl cursor-pointer" data-testid="button-save-password">
            {busy ? "Saving…" : "Change password"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <ProblemPanel problem={problem} testId="operator-password-error" />
        <PasswordField
          id="operator-new-password"
          value={password}
          onChange={setPassword}
          error={error}
          hint={`At least ${OPERATOR_PASSWORD_MIN} characters. You give it to them yourself.`}
        />
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
    const result = await setOperatorDisabled(as, operator.operatorId, true, reason.trim() || undefined);
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
