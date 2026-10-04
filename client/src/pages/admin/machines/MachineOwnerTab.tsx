"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchMachineOwner } from "@/lib/adminOwnershipApi";
import type { Machine } from "@shared/admin/machinesSchema";
import type { MachineOwner, MachineMove } from "@shared/admin/ownership";
import { Card, Empty, SuccessPanel } from "../AdminUi";
import { WarningPanel } from "./WarningPanel";
import { Cell, Col, formatIstStamp, Head, ProblemPanel, type Problem } from "./MachinesUi";
import { MoveMachineDialog } from "./MoveMachineDialog";
import { FranchiseLink, GymLink, OwnerCellText, OwnerPill } from "./ownerBits";
import { ownerLine, OWNER_REASON_LABEL } from "./ownerRules";

export function MachineOwnerTab({ machine, onChanged }: { machine: Machine; onChanged: () => void }) {
  const [data, setData] = useState<MachineOwner | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [moving, setMoving] = useState(false);
  const [moved, setMoved] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await fetchMachineOwner(machine.sn);
    if (!result.ok) {
      setProblem({ message: result.error.message, issues: result.issues });
      return;
    }
    setProblem(null);
    setData(result.data);
  }, [machine.sn]);

  useEffect(() => {
    void load();
  }, [load]);

  function done(result: MachineMove) {
    setMoving(false);
    setMoved(result.changed ? `Moved. The machine is now with ${ownerLine(result.owner)}.` : "Nothing changed. The machine was already there.");
    void load();
    onChanged();
  }

  const owner = data?.owner ?? null;

  return (
    <div className="space-y-5">
      <ProblemPanel problem={problem} testId="owner-error" />
      {moved && <SuccessPanel testId="owner-moved">{moved}</SuccessPanel>}
      {data && !data.migrated && (
        <WarningPanel testId="owner-unmigrated">
          This machine is at {owner?.gymName ?? "a gym"} but has no ownership record yet, so it can't be moved. It can be moved once
          the ownership migration has run.
        </WarningPanel>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <Card
          title="Current owner"
          note="Orders are credited to the owner at the time of the order."
          testId="card-owner"
          action={
            <Button
              size="sm"
              onClick={() => {
                setMoved(null);
                setMoving(true);
              }}
              disabled={!data || !data.migrated}
              className="h-8 rounded-xl cursor-pointer"
              data-testid="button-open-move"
            >
              Move machine
            </Button>
          }
        >
          {owner ? (
            <dl className="divide-y divide-border/60 py-1">
              <Row label="Status">
                <OwnerPill state={owner.ownerState} testId="owner-state" />
              </Row>
              <Row label="Gym" testId="owner-gym">
                {owner.gymId ? <GymLink gymId={owner.gymId} name={owner.gymName} className="text-foreground" /> : "Not placed"}
              </Row>
              <Row label="Franchise" testId="owner-franchise">
                {owner.franchiseId ? (
                  <FranchiseLink franchiseId={owner.franchiseId} name={owner.franchiseName} className="text-foreground" />
                ) : owner.gymId ? (
                  "None. The gym is MBP-direct."
                ) : (
                  "None"
                )}
              </Row>
              <Row label="Since" testId="owner-since">
                {formatIstStamp(owner.since)}
              </Row>
            </dl>
          ) : (
            <Empty testId="owner-loading">{problem ? "Couldn't load the owner." : "Loading…"}</Empty>
          )}
        </Card>

        <Card title="History" note="Newest first." testId="card-owner-history">
          {data && data.history.length === 0 ? (
            <Empty testId="owner-history-empty">This machine hasn't been moved yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-owner-history">
                <Head>
                  <Col>When</Col>
                  <Col>From</Col>
                  <Col>
                    <span className="sr-only">to</span>
                  </Col>
                  <Col>To</Col>
                  <Col>Why</Col>
                </Head>
                <tbody className="divide-y divide-border/70">
                  {(data?.history ?? []).map((row) => (
                    <tr key={row.version} data-testid={`owner-history-${row.version}`}>
                      <Cell className="whitespace-nowrap text-muted-foreground">{formatIstStamp(row.at)}</Cell>
                      <Cell>
                        <OwnerCellText owner={row.from} />
                      </Cell>
                      <Cell className="w-4 px-0 text-muted-foreground">
                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                      </Cell>
                      <Cell>
                        <OwnerCellText owner={row.to} />
                      </Cell>
                      <Cell>
                        <span className="block">{OWNER_REASON_LABEL[row.reason] ?? row.reason}</span>
                        <span className="block text-xs text-muted-foreground">{row.by}</span>
                      </Cell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {owner && (
        <MoveMachineDialog
          open={moving}
          sn={machine.sn}
          owner={owner}
          defaultModel={machine.modelName}
          onClose={() => setMoving(false)}
          onMoved={done}
          onStale={() => {
            setMoving(false);
            void load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function Row({ label, testId, children }: { label: string; testId?: string; children: React.ReactNode }) {
  return (
    <div className="grid items-baseline gap-x-4 px-4 py-2 sm:grid-cols-[8rem_minmax(0,1fr)] sm:px-5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-foreground" data-testid={testId}>
        {children}
      </dd>
    </div>
  );
}
