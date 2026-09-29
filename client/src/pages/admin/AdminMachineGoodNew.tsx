"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createGood, fetchModels } from "@/lib/adminMachineApi";
import type { MachineModel } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { GoodEditor } from "./machines/GoodEditor";
import { MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";

export default function AdminMachineGoodNew() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <NewGood session={guard.session} />;
}

function NewGood({ session }: { session: AdminSession }) {
  const router = useRouter();
  const [models, setModels] = useState<MachineModel[] | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);

  useEffect(() => {
    fetchModels().then((result) => {
      if (result.ok) setModels(result.data.items);
      else setProblem(problemOf(result));
    });
  }, []);

  return (
    <MachinesShell session={session} section="goods">
      <MachinesHeader
        title="New goods"
        subtitle={
          <Link href="/machines/goods" className="text-primary hover:underline">
            Back to the goods library
          </Link>
        }
      />
      <ProblemPanel problem={problem} testId="new-good-error" />
      {models && (
        <GoodEditor
          good={null}
          models={models}
          onSubmit={async (input) => {
            const result = await createGood(input);
            if (result.ok) router.push(`/machines/goods/${encodeURIComponent(result.data.good.goodsId)}`);
            return result;
          }}
        />
      )}
    </MachinesShell>
  );
}
