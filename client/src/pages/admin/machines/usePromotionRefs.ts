"use client";

import { useEffect, useState } from "react";
import { fetchAllGoods, fetchAllMachines } from "@/lib/adminMachineApi";
import type { Good, MachineRow } from "@shared/admin/machinesSchema";
import { problemOf, type Problem } from "./MachinesUi";

export function useGoodsAndMachines(onProblem: (problem: Problem | null) => void) {
  const [goods, setGoods] = useState<Good[] | null>(null);
  const [machines, setMachines] = useState<MachineRow[]>([]);

  useEffect(() => {
    fetchAllGoods().then((result) => {
      if (result.ok) setGoods(result.data);
      else onProblem(problemOf(result));
    });
    fetchAllMachines().then((result) => {
      if (result.ok) setMachines(result.data);
      else onProblem(problemOf(result));
    });
  }, [onProblem]);

  return { goods, machines };
}
