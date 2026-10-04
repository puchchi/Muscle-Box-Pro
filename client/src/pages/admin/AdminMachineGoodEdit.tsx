"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchGood, fetchModels, updateGood } from "@/lib/adminMachineApi";
import type { Good, MachineModel } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { GoodEditor } from "./machines/GoodEditor";
import { formatIstStamp, MachinesHeader, problemOf, ProblemPanel, type Problem } from "./machines/MachinesUi";

export default function AdminMachineGoodEdit({ goodsId }: { goodsId: string }) {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <EditGood session={guard.session} goodsId={goodsId} />;
}

function EditGood({ session, goodsId }: { session: AdminSession; goodsId: string }) {
  const [good, setGood] = useState<Good | null>(null);
  const [models, setModels] = useState<MachineModel[] | null>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    const result = await fetchGood(goodsId);
    if (!result.ok) {
      setProblem(problemOf(result));
      return;
    }
    setProblem(null);
    setGood(result.data.good);
    setFormKey((k) => k + 1);
  }, [goodsId]);

  useEffect(() => {
    void load();
    fetchModels().then((result) => setModels(result.ok ? result.data.items : []));
  }, [load]);

  return (
    <MachinesShell session={session} section="goods">
      <MachinesHeader
        title={good ? good.name : "Goods"}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/machines/goods" className="text-primary hover:underline">
              Goods library
            </Link>
            {good && (
              <span className="text-xs">
                Listed on {good.machinesListed} machine{good.machinesListed === 1 ? "" : "s"}. Last edited{" "}
                {formatIstStamp(good.updatedAt)}
                {good.updatedBy ? ` by ${good.updatedBy}` : ""}.
              </span>
            )}
          </span>
        }
      />
      <ProblemPanel problem={problem} testId="good-load-error" />
      {good && models && (
        <GoodEditor
          key={formKey}
          good={good}
          models={models.some((m) => m.id === good.modelId) ? models : [...models, { id: good.modelId, name: good.modelId, protocol: "", versions: "" }]}
          onReload={load}
          onSubmit={async ({ modelId: _modelId, ...input }) => {
            const result = await updateGood(good.goodsId, input, good.version);
            if (result.ok) setGood(result.data.good);
            return result;
          }}
        />
      )}
    </MachinesShell>
  );
}
