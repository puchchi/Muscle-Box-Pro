"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPromotion } from "@/lib/adminMachineApi";
import type { PromotionKind } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { PromotionForm } from "./machines/PromotionForm";
import { setFlash } from "./machines/flash";
import { useGoodsAndMachines } from "./machines/usePromotionRefs";
import { KIND_COPY, overlapWarning, savedNotice } from "./machines/promotionRules";
import { MachinesHeader, ProblemPanel, type Problem } from "./machines/MachinesUi";

export default function AdminMachinePromotionNew({ kind }: { kind: PromotionKind }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <NewPromotion session={guard.session} kind={kind} />;
}

function NewPromotion({ session, kind }: { session: AdminSession; kind: PromotionKind }) {
  const copy = KIND_COPY[kind];
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const { goods, machines } = useGoodsAndMachines(setProblem);

  return (
    <MachinesShell session={session} section={copy.section}>
      <MachinesHeader
        title={`Add ${copy.one}`}
        subtitle={
          <Link href={copy.href} className="text-primary hover:underline">
            {copy.title}
          </Link>
        }
      />
      <ProblemPanel problem={problem} testId="promotion-refs-error" />
      {goods ? (
        <PromotionForm
          kind={kind}
          promotion={null}
          goods={goods}
          machines={machines}
          submitLabel={`Add ${copy.one}`}
          onSubmit={(input) => createPromotion(kind, input)}
          onSaved={(saved) => {
            setFlash({ notice: savedNotice(saved.promotion, `${saved.promotion.name} added.`), warning: overlapWarning(saved.overlaps) });
            router.push(`${copy.href}/${encodeURIComponent(saved.promotion.promoId)}`);
          }}
        />
      ) : (
        !problem && <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </MachinesShell>
  );
}
