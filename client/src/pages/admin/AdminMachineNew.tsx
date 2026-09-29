"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createMachine, fetchModels } from "@/lib/adminMachineApi";
import type { MachineCreateInput } from "@shared/admin/machines";
import type { MachineModel } from "@shared/admin/machinesSchema";
import type { AdminSession } from "@/lib/adminSession";
import { AdminChecking } from "./AdminShell";
import { MachinesShell } from "./machines/MachinesShell";
import { useAdminGuard } from "./useAdminGuard";
import { Card } from "./AdminUi";
import { MachineForm } from "./machines/MachineForm";
import {
  MachinesHeader,
  problemOf,
  ProblemPanel,
  type Problem,
} from "./machines/MachinesUi";

export default function AdminMachineNew() {
  const guard = useAdminGuard();
  if (guard.state === "checking") return <AdminChecking />;
  return <NewMachine session={guard.session} />;
}

function NewMachine({ session }: { session: AdminSession }) {
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
    <MachinesShell session={session} section="machines">
      <MachinesHeader
        title="Add machine"
        subtitle={
          <>
            Register a machine before it first calls in.{" "}
            <Link
              href="/machines"
              className="text-primary hover:underline"
            >
              Back to machines
            </Link>
          </>
        }
      />
      <ProblemPanel problem={problem} testId="new-machine-error" />
      {models && (
        <Card title="Machine" testId="card-new-machine">
          <div className="p-4 sm:p-5">
            <MachineForm
              machine={null}
              models={models}
              submitLabel="Add machine"
              onCancel={() => router.push("/machines")}
              onSubmit={async (input) => {
                const result = await createMachine(input as MachineCreateInput);
                if (result.ok)
                  router.push(
                    `/machines/${encodeURIComponent(result.data.machine.sn)}?tab=settings`,
                  );
                return result;
              }}
            />
          </div>
        </Card>
      )}
    </MachinesShell>
  );
}
