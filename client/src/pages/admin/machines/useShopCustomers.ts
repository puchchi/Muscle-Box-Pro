import { useEffect, useRef, useState } from "react";
import type { ShopCustomerDetail } from "@shared/admin/shopAdminSchema";
import { fetchShopCustomer } from "@/lib/shopAdminApi";

export function useShopCustomers(ids: readonly (string | null | undefined)[]): ReadonlyMap<string, ShopCustomerDetail | null> {
  const [known, setKnown] = useState<ReadonlyMap<string, ShopCustomerDetail | null>>(() => new Map());
  const asked = useRef(new Set<string>());
  const key = [...new Set(ids.filter((id): id is string => !!id))].sort().join(" ");

  useEffect(() => {
    for (const id of key ? key.split(" ") : []) {
      if (asked.current.has(id)) continue;
      asked.current.add(id);
      void fetchShopCustomer(id).then((r) => {
        setKnown((m) => new Map(m).set(id, r.ok ? r.data : null));
      });
    }
  }, [key]);

  return known;
}
