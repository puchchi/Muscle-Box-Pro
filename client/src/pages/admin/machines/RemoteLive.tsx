"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { endSession, fetchLive, openSession } from "@/lib/machineIotApi";
import type { MachineLive, RemoteSession } from "@shared/admin/remoteSchema";
import { Card, Field, Fields, Pill } from "../AdminUi";
import { formatIstStamp, ProblemPanel, problemOf, type Problem } from "./MachinesUi";
import { useNow } from "./MachineRemoteTab";
import { formatCountdown, LIVE_POLL_MS, liveRows, SESSION_LENGTHS, statusIsStale } from "./remoteRules";

const MAX_SECONDS = 600;
const lengthLabel = (seconds: number) => (seconds === 60 ? "1 minute" : `${seconds / 60} minutes`);
const epochStamp = (ms: number) => formatIstStamp(new Date(ms).toISOString());

export function RemoteLive({ sn }: { sn: string }) {
  const [session, setSession] = useState<RemoteSession | null>(null);
  const [until, setUntil] = useState<number | null>(null);
  const [live, setLive] = useState<MachineLive | null>(null);
  const [length, setLength] = useState(String(MAX_SECONDS));
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [ended, setEnded] = useState(false);
  const ownsSession = useRef(false);
  const sessionRef = useRef<RemoteSession | null>(null);

  const track = useCallback((next: RemoteSession | null) => {
    sessionRef.current = next;
    setSession(next);
    setUntil(next ? Date.now() + next.secondsLeft * 1000 : null);
    if (!next) ownsSession.current = false;
  }, []);

  const read = useCallback(async () => {
    const result = await fetchLive(sn);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setLive(result.data);
    if (sessionRef.current && !result.data.session) setEnded(true);
    track(result.data.session);
  }, [sn, track]);

  useEffect(() => {
    void read();
  }, [read]);

  const open = session !== null;

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => void read(), LIVE_POLL_MS);
    return () => clearInterval(timer);
  }, [open, read]);

  useEffect(
    () => () => {
      if (ownsSession.current) void endSession(sn);
    },
    [sn],
  );

  const now = useNow(open);
  const left = until === null ? 0 : until - now;

  async function start(seconds: number) {
    setBusy(true);
    setProblem(null);
    setEnded(false);
    const result = await openSession(sn, seconds);
    setBusy(false);
    if (!result.ok) {
      setProblem(
        result.error.code === "conflict"
          ? { message: "The machine couldn't be reached over MQTT. Nothing was opened. Try again in a moment.", issues: [] }
          : problemOf(result),
      );
      return;
    }
    ownsSession.current = result.data.session !== null;
    track(result.data.session);
    void read();
  }

  async function stop() {
    setBusy(true);
    const result = await endSession(sn);
    setBusy(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    track(null);
  }

  const status = live?.status ?? null;
  const stale = statusIsStale(live?.statusAgeSeconds ?? null);

  return (
    <Card
      title="Live status"
      note="While you watch, the machine reports every 5 seconds."
      testId="card-remote-live"
      action={
        open && (
          <Pill className="bg-emerald-400/15 text-emerald-200 tabular-nums" testId="live-countdown">
            Live {formatCountdown(left)}
          </Pill>
        )
      }
    >
      <div className="space-y-4 px-4 py-4 sm:px-5">
        <ProblemPanel problem={problem} testId="live-error" />
        {ended && !open && (
          <p className="text-sm text-muted-foreground" data-testid="live-ended">
            The live view ended.
          </p>
        )}
        {open ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => void start(MAX_SECONDS)} disabled={busy} className="rounded-lg cursor-pointer" data-testid="button-live-extend">
              Keep watching for 10 more minutes
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void stop()} disabled={busy} className="rounded-lg cursor-pointer" data-testid="button-live-stop">
              Stop watching
            </Button>
            {session && <span className="text-xs text-muted-foreground">Opened by {session.by}</span>}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              For
              <select
                value={length}
                onChange={(e) => setLength(e.target.value)}
                className="h-9 rounded-lg border border-border bg-secondary/50 px-2 text-foreground cursor-pointer"
                data-testid="input-live-length"
              >
                {SESSION_LENGTHS.map((s) => (
                  <option key={s} value={s}>
                    {lengthLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" size="sm" onClick={() => void start(Number(length))} disabled={busy} className="rounded-lg cursor-pointer" data-testid="button-live-open">
              {busy ? "Opening…" : "Watch live"}
            </Button>
          </div>
        )}
        {live && !live.mqttOnline && <p className="text-sm text-amber-200">MQTT is down on this machine right now.</p>}
      </div>

      {status ? (
        <div className={`border-t border-border/70 transition-opacity ${stale ? "opacity-50" : ""}`} data-testid="live-status" data-stale={stale}>
          <p className="px-4 pt-3 text-xs tabular-nums text-muted-foreground sm:px-5" data-testid="live-age">
            {live?.statusAgeSeconds === null || live?.statusAgeSeconds === undefined
              ? "Last report: time unknown"
              : `Last report ${live.statusAgeSeconds} s ago${stale ? ". The machine may have stopped reporting." : ""}`}
          </p>
          <Fields>
            <div className="grid items-baseline gap-x-4 px-4 py-2 sm:grid-cols-[14rem_minmax(0,1fr)] sm:px-5">
              <dt className="text-sm text-muted-foreground">Faults</dt>
              <dd className="flex flex-wrap gap-1.5 text-sm" data-testid="live-faults">
                {status.faults.length === 0
                  ? "None"
                  : status.faults.map((f) => (
                      <Pill key={f.code} className="bg-rose-400/15 text-rose-200">
                        {f.code} {f.text}
                      </Pill>
                    ))}
              </dd>
            </div>
            {liveRows(status, epochStamp).map((row) => (
              <Field key={row.label} label={row.label} value={row.value ?? "Not reported"} />
            ))}
          </Fields>
        </div>
      ) : (
        open && (
          <p className="border-t border-border/70 px-4 py-4 text-sm text-muted-foreground sm:px-5" data-testid="live-waiting">
            Waiting for the first report…
          </p>
        )
      )}
    </Card>
  );
}
