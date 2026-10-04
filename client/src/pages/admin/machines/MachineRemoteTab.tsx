"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { enrolMqtt, revokeMqtt } from "@/lib/machineIotApi";
import type { Machine } from "@shared/admin/machinesSchema";
import type { MachineMqtt } from "@shared/admin/remoteSchema";
import { Card, Field, Fields, Notice, Pill, SuccessPanel } from "../AdminUi";
import { ConfirmDialog, formatIstStamp, ProblemPanel, problemOf, type Problem } from "./MachinesUi";
import { formatCountdown, formatEnrolCode, MQTT_STATE_LABEL } from "./remoteRules";
import { RemoteCommands } from "./RemoteCommands";
import { RemoteLive } from "./RemoteLive";

const PENDING_RELOAD_MS = 10_000;

export function useNow(active: boolean, everyMs = 1_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), everyMs);
    return () => clearInterval(timer);
  }, [active, everyMs]);
  return now;
}

export function MachineRemoteTab({ machine, onReload }: { machine: Machine; onReload: () => Promise<Machine | null> }) {
  const mqtt = machine.mqtt;
  if (!mqtt) {
    return <Notice testId="remote-no-mqtt">This machine's details don't say whether MQTT is connected. The backend here is older than remote control.</Notice>;
  }
  return (
    <div className="space-y-5">
      <MqttCard sn={machine.sn} mqtt={mqtt} onReload={onReload} />
      {mqtt.state === "connected" ? (
        <>
          <RemoteCommands sn={machine.sn} />
          <RemoteLive sn={machine.sn} />
        </>
      ) : (
        <Notice testId="remote-needs-mqtt">Commands and live status appear here once the machine is connected over MQTT.</Notice>
      )}
    </div>
  );
}

type FreshCode = { code: string; until: number };

function MqttCard({ sn, mqtt, onReload }: { sn: string; mqtt: MachineMqtt; onReload: () => Promise<Machine | null> }) {
  const [fresh, setFresh] = useState<FreshCode | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const pendingUntil = fresh?.until ?? (mqtt.pendingCode ? Date.parse(mqtt.pendingCode.expiresAt) : null);
  const now = useNow(pendingUntil !== null);
  const left = pendingUntil === null || Number.isNaN(pendingUntil) ? 0 : pendingUntil - now;
  const pending = left > 0;

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void onReload(), PENDING_RELOAD_MS);
    return () => clearInterval(timer);
  }, [pending, onReload]);

  useEffect(() => {
    if (!fresh || mqtt.pendingCode) return;
    setFresh(null);
    if (mqtt.state === "connected") setDone("Connected. The tablet used the code.");
  }, [mqtt.pendingCode, mqtt.state]);

  async function connect() {
    setBusy(true);
    setProblem(null);
    setDone(null);
    const result = await enrolMqtt(sn);
    if (!result.ok) {
      setBusy(false);
      setProblem(problemOf(result));
      return;
    }
    await onReload();
    setFresh({ code: result.data.code, until: Date.now() + result.data.validForSeconds * 1000 });
    setBusy(false);
  }

  async function revoke() {
    setBusy(true);
    setProblem(null);
    setDone(null);
    const result = await revokeMqtt(sn);
    setConfirmRevoke(false);
    if (!result.ok) {
      setBusy(false);
      setProblem(problemOf(result));
      return;
    }
    setFresh(null);
    await onReload();
    setBusy(false);
    const n = result.data.retired;
    setDone(`Disconnected. ${n === 1 ? "1 certificate was" : `${n} certificates were`} turned off.`);
  }

  const label = MQTT_STATE_LABEL[mqtt.state];
  const cert = mqtt.certificate;
  const canRevoke = cert !== null || mqtt.state === "not_issued_to_this_tablet" || pending;

  return (
    <Card title="MQTT" testId="card-mqtt" action={<Pill className={label.className} testId="mqtt-state">{label.text}</Pill>}>
      {mqtt.state === "not_issued_to_this_tablet" && (
        <p className="border-b border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 sm:px-5" role="alert" data-testid="mqtt-unknown-cert">
          This machine is online over MQTT, but not with a certificate we issued. Press Connect MQTT and type the new code
          into the tablet. That turns the other certificate off.
        </p>
      )}
      <Fields>
        <Field label="Certificate" value={cert ? `Issued ${formatIstStamp(cert.issuedAt)}` : "None"} testId="mqtt-certificate" />
        {cert && <Field label="Code made by" value={cert.codeCreatedBy} />}
        {cert && <Field label="Tablet's address" value={cert.sourceIp} mono />}
        {cert && <Field label="Fingerprint" value={cert.fingerprint} mono />}
      </Fields>

      <div className="space-y-4 border-t border-border/70 px-4 py-4 sm:px-5">
        {pending && fresh && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-4" data-testid="mqtt-code" aria-live="polite">
            <p className="text-sm text-muted-foreground">Connection code</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.2em] text-foreground tabular-nums" data-testid="mqtt-code-value">
              {formatEnrolCode(fresh.code)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Type it into Factory Settings on the tablet, behind the factory PIN. It works once, and this page won't show it
              again.
            </p>
            <p className="mt-2 text-sm font-semibold tabular-nums text-amber-200" data-testid="mqtt-code-countdown">
              Expires in {formatCountdown(left)}
            </p>
          </div>
        )}
        {pending && !fresh && mqtt.pendingCode && (
          <p className="text-sm text-muted-foreground" data-testid="mqtt-code-open">
            A code made by {mqtt.pendingCode.createdBy} is open for{" "}
            <span className="font-semibold tabular-nums text-foreground">{formatCountdown(left)}</span> more. It can't be shown
            again. Press Connect MQTT for a new one.
          </p>
        )}
        {done && <SuccessPanel testId="mqtt-done">{done}</SuccessPanel>}
        <ProblemPanel problem={problem} testId="mqtt-error" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void connect()} disabled={busy} className="rounded-xl cursor-pointer" data-testid="button-mqtt-connect">
            {busy && !confirmRevoke ? "Working…" : "Connect MQTT"}
          </Button>
          {canRevoke && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmRevoke(true)}
              disabled={busy}
              className="rounded-xl cursor-pointer"
              data-testid="button-mqtt-revoke"
            >
              Disconnect MQTT
            </Button>
          )}
        </div>
        {pending && fresh && <p className="text-xs text-muted-foreground">Pressing Connect MQTT again replaces this code.</p>}
      </div>

      <ConfirmDialog
        open={confirmRevoke}
        title="Disconnect MQTT?"
        message="The machine's certificate is turned off, and any open code stops working. Remote control won't work until the machine is connected again with a new code. Selling drinks isn't affected."
        confirmLabel="Disconnect"
        danger
        busy={busy}
        onConfirm={() => void revoke()}
        onClose={() => setConfirmRevoke(false)}
        testId="dialog-mqtt-revoke"
      />
    </Card>
  );
}
