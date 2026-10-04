"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteRedeemCode, fetchRedeemCode, fetchRedeemUses, setRedeemCodeDisabled, updateRedeemCode } from "@/lib/adminMachineApi";
import type { RedeemCode, RedeemUse } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card, Field, Fields, Pill, SuccessPanel } from "./AdminUi";
import { CodeForm } from "./machines/CodeForm";
import { setFlash, takeFlash } from "./machines/flash";
import { useGoodsAndMachines } from "./machines/usePromotionRefs";
import { CODE_SOURCE_LABEL, CODE_STATUS_LABEL, codeSavedNotice, isShopCode, validWindow } from "./machines/codeRules";
import {
  Cell,
  Col,
  ConfirmDialog,
  DataTable,
  formatIstStamp,
  Head,
  MachineLabel,
  MachinesHeader,
  NoData,
  problemOf,
  ProblemPanel,
  type Problem,
} from "./machines/MachinesUi";

export default function AdminMachineRedeemCodeDetail({ code }: { code: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <CodeDetail session={guard.session} codeId={code} />;
}

function CodeDetail({ session, codeId }: { session: AdminSession; codeId: string }) {
  const router = useRouter();
  const [code, setCode] = useState<RedeemCode | null>(null);
  const [uses, setUses] = useState<RedeemUse[] | null>(null);
  const [loadCount, setLoadCount] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const { goods, machines } = useGoodsAndMachines(setProblem);

  const load = useCallback(async () => {
    const [codeResult, usesResult] = await Promise.all([fetchRedeemCode(codeId), fetchRedeemUses(codeId)]);
    if (!codeResult.ok) {
      setProblem(problemOf(codeResult));
      return;
    }
    setProblem(usesResult.ok ? null : problemOf(usesResult));
    setCode(codeResult.data.code);
    if (usesResult.ok) setUses(usesResult.data.items);
    setLoadCount((n) => n + 1);
  }, [codeId]);

  useEffect(() => {
    const flash = takeFlash();
    if (flash) setNotice(flash.notice);
    void load();
  }, [load]);

  useEffect(() => {
    if (loadCount === 1 && window.location.hash === "#usage") {
      document.getElementById("usage")?.scrollIntoView({ block: "start" });
    }
  }, [loadCount]);

  async function toggleDisabled() {
    if (!code) return;
    setNotice(null);
    setBusy(true);
    const result = await setRedeemCodeDisabled(code.code, !code.disabled, code.version);
    setBusy(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setNotice(code.disabled ? codeSavedNotice(result.data.code, "Enabled.") : "Disabled. Machines refuse it from now on.");
    setCode(result.data.code);
    setLoadCount((n) => n + 1);
  }

  async function confirmDelete() {
    if (!code) return;
    setBusy(true);
    const result = await deleteRedeemCode(code.code);
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setFlash({ notice: `${code.code} deleted.` });
    router.push("/machines/redeem-codes");
  }

  const status = code ? CODE_STATUS_LABEL[code.status] : null;
  const shop = code !== null && isShopCode(code);

  return (
    <MachinesShell session={session} section="redeemCodes">
      <MachinesHeader
        title={code ? code.code : "Redeem code"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/machines/redeem-codes" className="text-primary hover:underline">
              Redeem codes
            </Link>
            {code && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono text-xs">{code.serialNo}</span>
                {status && (
                  <Pill className={status.className} testId="code-status">
                    {status.text}
                  </Pill>
                )}
                <span aria-hidden>·</span>
                <span className="tabular-nums">
                  {code.usedCount} of {code.usesAllowed} used
                </span>
              </>
            )}
          </span>
        }
        action={
          code &&
          !shop && (
            <span className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => void toggleDisabled()} disabled={busy} className="rounded-xl cursor-pointer" data-testid="button-disable-code">
                {code.disabled ? "Enable" : "Disable"}
              </Button>
              {code.canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirming(true)}
                  disabled={busy}
                  className="rounded-xl border-rose-400/40 text-rose-300 hover:bg-rose-400/10 cursor-pointer"
                  data-testid="button-delete-code"
                >
                  Delete
                </Button>
              )}
            </span>
          )
        }
      />

      <ProblemPanel problem={problem} testId="code-error" />
      {notice && (
        <div className="mb-4">
          <SuccessPanel testId="code-notice">{notice}</SuccessPanel>
        </div>
      )}

      {code && shop ? (
        <div className="space-y-5">
          <ShopCodeCard code={code} />
          <UsageCard uses={uses} />
        </div>
      ) : code && goods ? (
        <div className="space-y-5">
          <CodeForm
            key={loadCount}
            code={code}
            goods={goods}
            machines={machines}
            submitLabel="Save changes"
            onSubmit={(_, input) => {
              setNotice(null);
              return updateRedeemCode(code.code, input, code.version);
            }}
            onSaved={(saved) => {
              setNotice(codeSavedNotice(saved, "Saved."));
              setCode(saved);
            }}
            onReload={() => void load()}
          />
          <UsageCard uses={uses} />
        </div>
      ) : (
        !problem && <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      <ConfirmDialog
        open={confirming}
        title={code ? `Delete ${code.code}?` : "Delete code"}
        message="It has never been used. Deleting it can't be undone."
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setConfirming(false)}
        testId="delete-code"
      />
    </MachinesShell>
  );
}

function ShopCodeCard({ code }: { code: RedeemCode }) {
  return (
    <Card title="From the website shop" note="Only the shop changes this code, when it refunds or reissues the order." testId="card-shop-code">
      <Fields>
        <Field label="Source" value={CODE_SOURCE_LABEL[code.source].text} testId="shop-code-source" />
        <Field label="Shop order" value={code.shopOrderId} mono testId="shop-code-order" />
        <Field label="Goods" value={code.goods.map((g) => g.name).join(", ")} />
        <Field label="Machines" value={code.allMachines ? "All machines" : code.sns.join(", ")} mono={!code.allMachines} />
        <Field label="Valid" value={validWindow(code, formatIstStamp)} />
      </Fields>
    </Card>
  );
}

function UsageCard({ uses }: { uses: RedeemUse[] | null }) {
  return (
    <Card title="Usage" note="Each drink this code got. A use is given back when the machine fails to make the drink." id="usage" testId="card-code-usage">
      <div className="p-4 sm:p-5">
        <DataTable testId="code-uses-table">
          <Head>
            <Col>When</Col>
            <Col>Machine</Col>
            <Col>Good</Col>
            <Col>Order</Col>
            <Col>Result</Col>
          </Head>
          <tbody className="divide-y divide-border/70">
            {!uses || uses.length === 0 ? (
              <NoData colSpan={5} loading={uses === null} />
            ) : (
              uses.map((u) => (
                <tr key={u.orderId} data-testid={`use-${u.orderId}`}>
                  <Cell className="whitespace-nowrap text-xs tabular-nums">{formatIstStamp(u.at)}</Cell>
                  <Cell>
                    <MachineLabel deviceExtNo={u.deviceExtNo ?? ""} sn={u.sn} />
                  </Cell>
                  <Cell>{u.goodsName}</Cell>
                  <Cell>
                    <Link href={`/machines/orders/${encodeURIComponent(u.orderId)}`} className="font-mono text-xs text-primary hover:underline">
                      {u.orderId}
                    </Link>
                  </Cell>
                  <Cell className="text-xs">
                    {u.returned ? (
                      <>
                        <Pill className="bg-amber-400/15 text-amber-200">Given back</Pill>
                        <span className="mt-1 block whitespace-nowrap text-muted-foreground">{formatIstStamp(u.returnedAt)}</span>
                      </>
                    ) : (
                      <Pill className="bg-emerald-400/15 text-emerald-200">Used</Pill>
                    )}
                  </Cell>
                </tr>
              ))
            )}
          </tbody>
        </DataTable>
      </div>
    </Card>
  );
}
