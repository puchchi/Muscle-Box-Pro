"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createRedeemCode } from "@/lib/adminMachineApi";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { CodeForm } from "./machines/CodeForm";
import { setFlash } from "./machines/flash";
import { codeSavedNotice } from "./machines/codeRules";
import { useGoodsAndMachines } from "./machines/usePromotionRefs";
import { MachinesHeader, ProblemPanel, type Problem } from "./machines/MachinesUi";

export default function AdminMachineRedeemCodeNew() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <NewCode session={guard.session} />;
}

function NewCode({ session }: { session: AdminSession }) {
  const router = useRouter();
  const [problem, setProblem] = useState<Problem | null>(null);
  const { goods, machines } = useGoodsAndMachines(setProblem);

  return (
    <MachinesShell session={session} section="redeemCodes">
      <MachinesHeader
        title="Add redeem code"
        subtitle={
          <Link href="/machines/redeem-codes" className="text-primary hover:underline">
            Redeem codes
          </Link>
        }
      />
      <ProblemPanel problem={problem} testId="code-refs-error" />
      {goods ? (
        <CodeForm
          code={null}
          goods={goods}
          machines={machines}
          submitLabel="Add code"
          onSubmit={createRedeemCode}
          onSaved={(saved) => {
            setFlash({ notice: codeSavedNotice(saved, `${saved.code} added.`) });
            router.push(`/machines/redeem-codes/${encodeURIComponent(saved.code)}`);
          }}
        />
      ) : (
        !problem && <p className="text-sm text-muted-foreground">Loading…</p>
      )}
    </MachinesShell>
  );
}
