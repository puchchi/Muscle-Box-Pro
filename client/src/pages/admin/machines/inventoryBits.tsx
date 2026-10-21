"use client";

import Link from "next/link";
import type { MachineCall } from "@/lib/adminMachineApi";
import { problemOf, type Problem } from "./MachinesUi";

const TABS = [
  { href: "/machines/inventory", label: "Stock", id: "stock" },
  { href: "/machines/inventory/items", label: "Items", id: "items" },
  { href: "/machines/inventory/warehouses", label: "Warehouses", id: "warehouses" },
  { href: "/machines/inventory/history", label: "History", id: "history" },
] as const;

export type InventoryTab = (typeof TABS)[number]["id"];

export function InventoryTabs({ current }: { current: InventoryTab }) {
  return (
    <nav aria-label="Inventory" className="mb-5 flex gap-1 overflow-x-auto border-b border-border" data-testid="inventory-tabs">
      {TABS.map((tab) => {
        const active = tab.id === current;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid={`inventory-tab-${tab.id}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export const INVENTORY_SUBTITLE =
  "Protein, other powders and cups: what we hold in our warehouses and in the machines, and what it cost.";

export const NOT_ON_SERVER = "This server doesn't keep inventory yet. These pages fill in as soon as it does.";

export function inventoryProblem<T>(result: MachineCall<T>): Problem | null {
  if (!result.ok && result.error.code === "not_found") return { message: NOT_ON_SERVER, issues: [] };
  return problemOf(result);
}
