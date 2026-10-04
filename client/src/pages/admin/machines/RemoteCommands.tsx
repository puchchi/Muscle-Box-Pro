"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cancelCommand, fetchCommand, sendCommand } from "@/lib/machineIotApi";
import type { MachineCall } from "@/lib/adminMachineApi";
import { isFinalState, type CommandArgs, type RemoteCommand } from "@shared/admin/remoteSchema";
import { Card, Pill } from "../AdminUi";
import { TextInput } from "./formBits";
import { ConfirmDialog, formatIstStamp, ProblemPanel, type Problem } from "./MachinesUi";
import { COMMAND_GROUPS, COMMAND_POLL_MS, COMMAND_STATE_LABEL, commandLabel, commandOutcome, type CommandSpec } from "./remoteRules";

const problemWithFields = <T,>(result: MachineCall<T>): Problem | null =>
  result.ok
    ? null
    : {
        message: result.error.message,
        issues: [...Object.entries(result.error.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v}`), ...result.issues],
      };

export function RemoteCommands({ sn }: { sn: string }) {
  const [current, setCurrent] = useState<RemoteCommand | null>(null);
  const [wasBusy, setWasBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState<CommandSpec | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [pollTick, setPollTick] = useState(0);
  const [times, setTimes] = useState("1");
  const [grounds, setGrounds] = useState(false);
  const [logDate, setLogDate] = useState("");

  const active = current !== null && !isFinalState(current.state);

  useEffect(() => {
    if (!current || isFinalState(current.state)) return;
    let stopped = false;
    const timer = setTimeout(async () => {
      const result = await fetchCommand(sn, current.id);
      if (stopped) return;
      if (result.ok) {
        setCurrent(result.data.command);
        setProblem(null);
      } else {
        setProblem(problemWithFields(result));
      }
      setPollTick((t) => t + 1);
    }, COMMAND_POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sn, current, pollTick]);

  function argsFor(spec: CommandSpec): CommandArgs | undefined {
    if (spec.name === "clean") return { times: Number(times), grounds };
    if (spec.name === "uploadLog") return logDate ? { date: logDate } : {};
    return undefined;
  }

  async function send(spec: CommandSpec) {
    setSending(true);
    setProblem(null);
    setWasBusy(false);
    const result = await sendCommand(sn, spec.name, argsFor(spec));
    setConfirm(null);
    if (result.ok) {
      setCurrent(result.data.command);
      setSending(false);
      return;
    }
    const runningId = result.error.code === "in_use" ? result.error.fieldErrors?.commandId : undefined;
    if (runningId) {
      const running = await fetchCommand(sn, runningId);
      if (running.ok) {
        setCurrent(running.data.command);
        setWasBusy(true);
        setSending(false);
        return;
      }
    }
    setProblem(problemWithFields(result));
    setSending(false);
  }

  async function cancel() {
    if (!current) return;
    setSending(true);
    const result = await cancelCommand(sn, current.id);
    if (result.ok) setCurrent(result.data.command);
    else {
      setProblem(problemWithFields(result));
      const latest = await fetchCommand(sn, current.id);
      if (latest.ok) setCurrent(latest.data.command);
    }
    setSending(false);
  }

  const press = (spec: CommandSpec) => (spec.confirm ? setConfirm(spec) : void send(spec));
  const disabled = sending || active;

  return (
    <Card title="Commands" note="One at a time. The machine runs a command only when it is idle, and says why when it can't." testId="card-remote-commands">
      <div className="space-y-5 px-4 py-4 sm:px-5">
        {current && (
          <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3" data-testid="remote-command" aria-live="polite">
            {wasBusy && (
              <p className="mb-2 text-xs text-amber-200" data-testid="remote-command-busy">
                Another command is still running on this machine. Wait for it to finish, or cancel it while it is waiting.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-foreground">{commandLabel(current)}</span>
              <Pill className={COMMAND_STATE_LABEL[current.state].className} testId="remote-command-state">
                {COMMAND_STATE_LABEL[current.state].text}
              </Pill>
              <span className="text-xs tabular-nums text-muted-foreground">
                by {current.by}, {formatIstStamp(current.createdAt)}
              </span>
            </div>
            <p className="mt-2 break-words text-sm text-muted-foreground" data-testid="remote-command-outcome">
              {commandOutcome(current)}
            </p>
            {current.state === "sent" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void cancel()}
                disabled={sending}
                className="mt-3 rounded-lg cursor-pointer"
                data-testid="button-command-cancel"
              >
                Cancel
              </Button>
            )}
          </div>
        )}
        <ProblemPanel problem={problem} testId="remote-command-error" />

        <div className="grid gap-5 sm:grid-cols-2">
          {COMMAND_GROUPS.map((group) => (
            <div key={group.title} role="group" aria-label={group.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</h3>
              {group.title === "Cleaning" && (
                <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                  <label className="flex items-center gap-2 text-muted-foreground">
                    Times
                    <select
                      value={times}
                      onChange={(e) => setTimes(e.target.value)}
                      className="h-9 rounded-lg border border-border bg-secondary/50 px-2 text-foreground cursor-pointer"
                      data-testid="input-clean-times"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={grounds} onChange={(e) => setGrounds(e.target.checked)} className="h-4 w-4 cursor-pointer" data-testid="input-clean-grounds" />
                    Also clean the grounds
                  </label>
                </div>
              )}
              {group.title === "App" && (
                <div className="mb-3 max-w-[14rem] text-sm">
                  <label htmlFor="log-date" className="mb-1 block text-muted-foreground">
                    Log date <span className="text-muted-foreground/70">(empty for today)</span>
                  </label>
                  <TextInput id="log-date" type="date" value={logDate} onChange={setLogDate} />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {group.commands.map((spec) => (
                  <Button
                    key={spec.name}
                    type="button"
                    size="sm"
                    variant={spec.confirm ? "destructive" : "outline"}
                    onClick={() => press(spec)}
                    disabled={disabled}
                    className="rounded-lg cursor-pointer"
                    data-testid={`button-command-${spec.name}`}
                  >
                    {spec.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.confirm?.title ?? ""}
        message={confirm?.confirm?.message ?? ""}
        confirmLabel={confirm?.confirm?.label ?? ""}
        danger
        busy={sending}
        onConfirm={() => confirm && void send(confirm)}
        onClose={() => setConfirm(null)}
        testId="dialog-command"
      />
    </Card>
  );
}
