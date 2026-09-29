"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deletePromotion, fetchPromotion, setPromotionPaused, updatePromotion } from "@/lib/adminMachineApi";
import type { Promotion, PromotionKind } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Pill, SuccessPanel } from "./AdminUi";
import { PromotionForm } from "./machines/PromotionForm";
import { WarningPanel } from "./machines/WarningPanel";
import { setFlash, takeFlash } from "./machines/flash";
import { useGoodsAndMachines } from "./machines/usePromotionRefs";
import { KIND_COPY, overlapWarning, PROMOTION_STATUS_LABEL, savedNotice } from "./machines/promotionRules";
import { ConfirmDialog, formatIstStamp, MachinesHeader, problemOf, ProblemPanel, REFRESH_NOTE, type Problem } from "./machines/MachinesUi";

export default function AdminMachinePromotionDetail({ kind, promoId }: { kind: PromotionKind; promoId: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <PromotionDetail session={guard.session} kind={kind} promoId={promoId} />;
}

function PromotionDetail({ session, kind, promoId }: { session: AdminSession; kind: PromotionKind; promoId: string }) {
  const copy = KIND_COPY[kind];
  const router = useRouter();
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [loadCount, setLoadCount] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const { goods, machines } = useGoodsAndMachines(setProblem);

  const load = useCallback(async () => {
    const result = await fetchPromotion(promoId);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setPromotion(result.data.promotion);
    setLoadCount((n) => n + 1);
  }, [promoId]);

  useEffect(() => {
    const flash = takeFlash();
    if (flash) {
      setNotice(flash.notice);
      setWarning(flash.warning ?? null);
    }
    void load();
  }, [load]);

  async function togglePaused() {
    if (!promotion) return;
    setNotice(null);
    setWarning(null);
    setBusy(true);
    const result = await setPromotionPaused(promotion.promoId, !promotion.paused, promotion.version);
    setBusy(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setNotice(savedNotice(result.data.promotion, promotion.paused ? "Resumed." : "Paused.", promotion.status === "active"));
    setWarning(overlapWarning(result.data.overlaps));
    setPromotion(result.data.promotion);
    setLoadCount((n) => n + 1);
  }

  async function confirmDelete() {
    if (!promotion) return;
    setBusy(true);
    const result = await deletePromotion(promotion.promoId);
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setFlash({ notice: promotion.status === "active" ? `${promotion.name} deleted. ${REFRESH_NOTE}` : `${promotion.name} deleted.` });
    router.push(copy.href);
  }

  const status = promotion ? PROMOTION_STATUS_LABEL[promotion.status] : null;

  return (
    <MachinesShell session={session} section={copy.section}>
      <MachinesHeader
        title={promotion ? promotion.name : copy.title}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href={copy.href} className="text-primary hover:underline">
              {copy.title}
            </Link>
            {promotion && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono text-xs">{promotion.no}</span>
                {status && (
                  <Pill className={status.className} testId="promotion-status">
                    {status.text}
                  </Pill>
                )}
                <span aria-hidden>·</span>
                <span>
                  Saved {formatIstStamp(promotion.updatedAt)}
                  {promotion.updatedBy ? ` by ${promotion.updatedBy}` : ""}
                </span>
              </>
            )}
          </span>
        }
        action={
          promotion && (
            <span className="flex gap-2">
              {promotion.status !== "ended" && (
                <Button type="button" variant="outline" onClick={() => void togglePaused()} disabled={busy} className="rounded-xl cursor-pointer" data-testid="button-pause-promotion">
                  {promotion.paused ? "Resume" : "Pause"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirming(true)}
                disabled={busy}
                className="rounded-xl border-rose-400/40 text-rose-300 hover:bg-rose-400/10 cursor-pointer"
                data-testid="button-delete-promotion"
              >
                Delete
              </Button>
            </span>
          )
        }
      />

      <ProblemPanel problem={problem} testId="promotion-error" />
      {(notice || warning) && (
        <div className="mb-4 space-y-3">
          {notice && <SuccessPanel testId="promotion-notice">{notice}</SuccessPanel>}
          {warning && <WarningPanel testId="promotion-overlap">{warning}</WarningPanel>}
        </div>
      )}

      {promotion && goods ? (
        <PromotionForm
          key={loadCount}
          kind={kind}
          promotion={promotion}
          goods={goods}
          machines={machines}
          submitLabel="Save changes"
          onSubmit={(input) => {
            setNotice(null);
            setWarning(null);
            return updatePromotion(promotion.promoId, input, promotion.version);
          }}
          onSaved={(saved) => {
            setNotice(savedNotice(saved.promotion, "Saved.", promotion.status === "active"));
            setWarning(overlapWarning(saved.overlaps));
            setPromotion(saved.promotion);
          }}
          onReload={() => void load()}
        />
      ) : (
        !problem && <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      <ConfirmDialog
        open={confirming}
        title={promotion ? `Delete ${promotion.name}?` : `Delete ${copy.one}`}
        message={promotion?.status === "active" ? `It is active now. Deleting it ends it at once. ${REFRESH_NOTE}` : "This can't be undone."}
        confirmLabel="Delete"
        danger
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onClose={() => setConfirming(false)}
        testId="delete-promotion"
      />
    </MachinesShell>
  );
}
