# Inventory and cost of goods: backend requirements

Status: ready for the backend, 2026-10-13. Decisions in §1 were made by Anurag on 2026-10-13.

Goal: MBP admins know what consumables we hold, where, what each cost, and what every drink cost
to make. That gives the agreement's profit waterfall the protein, cup and consumable cost and the
wastage it deducts (Franchise Program §15, §16). Machines are tracked as equipment beside it.

Admins only for now. Franchise access (their own warehouse, their own machines' costs) is a later
phase, and nothing here should block it.

## 1. Decisions already made

1. Stock lives in two kinds of place: **MBP warehouses** and **machine canisters**. Franchise
   warehouses come with franchise access.
2. Costing is **moving average** per item. Every purchase updates the item's average cost per unit
   (per gram, per ml or per piece). A drink is costed at the average of what is in that machine.
   Batches are still recorded, for supplier and expiry, but they do not set the cost.
3. **Machines are assets, not COGS.** They carry a serial, purchase price and where they are. Their
   cost goes to capital recovery, never into a drink's cost.
4. **Every machine has a home warehouse.** Every refill, whether entered on the machine or in the
   console, takes that amount out of the home warehouse automatically. Nobody enters it twice.
5. Prices are recorded **excluding GST**, with the GST paid kept beside them. COGS is ex-GST.

## 2. What exists today (for orientation)

| Fact | Where |
|---|---|
| Canister level per machine and material, written by the machine and the console | `services/machine/src/repo/stock.ts`, `STOCK#` rows |
| Every refill is a `RESTOCK#` event: who, and `before / add / after` per slot | `repo/stock.ts#applyReplenish`, `admin/handlers/stock.ts#restockHandler` |
| Every dispensed order stores `materialExpendList`, and its deductions are applied in the same transaction | `repo/orders.ts#dispense`, `domain/dispense.ts#expendToDeductions` |
| A cup material loses 1 per drink; water is not tracked | `domain/dispense.ts`, `repo/stock.ts#replenishList` |
| Materials belong to a machine model, with `rawType` water, cup, powder, sugar or ice | `admin/handlers/materials.ts` |
| Orders carry the owner stamp, so costs can later be split by franchise and gym | `machine-ownership-backend-requirements.md` §6 |

Nothing upstream of the canister exists: no item catalogue, no warehouse, no purchase price.

## 3. Records

Suggested to live in the machine service, beside stock and orders, so a refill and its warehouse
movement can be one transaction. Keep the service's key conventions; names are suggestions.

### 3.1 Item

What we buy and stock. One item can fill materials on several machine models.

| Field | Type | Notes |
|---|---|---|
| `itemId` | string | `itm_` + random |
| `name` | string | "Whey protein, chocolate". 2 to 80 characters, unique among active items |
| `kind` | `protein` \| `powder` \| `cup` \| `other` | `powder` covers BCAA, creatine and the like |
| `unit` | `g` \| `ml` \| `pcs` | The unit stock and cost are kept in. Must equal the unit of every linked material |
| `packSize` | number > 0 | Units in one pack as bought: 1000 for a 1 kg bag, 50 for a sleeve of cups |
| `packLabel` | string | "1 kg bag", "Sleeve of 50" |
| `materialIds` | string[] | Machine materials this item fills. A material belongs to at most one active item |
| `reorderLevel` | number ≥ 0 | In units, summed over all warehouses. Below it the item shows as low |
| `active` | boolean | Inactive items keep their history and cannot be received |
| `avgCostInr` | number | Read-only. Rupees per unit, ex-GST, kept to 4 decimals |
| `version`, `updatedAt`, `updatedBy` | | Same optimistic-write rule as materials |

### 3.2 Warehouse

| Field | Type | Notes |
|---|---|---|
| `warehouseId` | string | `wh_` + random |
| `name` | string | "Pune central" |
| `address` | string | Optional |
| `active` | boolean | An inactive warehouse with stock in it cannot be made inactive |

### 3.3 Machine home warehouse

On the machine's inventory row: `homeWarehouseId`. A machine without one has its refills recorded
against **no** warehouse (`unsourced`), and they show on the Stock page as needing a home. The first
warehouse created becomes every machine's home until changed.

### 3.4 Stock balance

One row per (place, item), where a place is `warehouse:<id>` or `machine:<sn>`:
`qty` (units) and `avgCostInr` (rupees per unit at that place). A machine's balance per item is the
sum of its canisters for that item's materials, so it must stay equal to the `STOCK#` levels; it
holds the **cost**, the canisters hold the level.

`qty` at a warehouse **may go negative**. A refill happens on the machine whether or not the books
agree, and refusing it would break the machine. A negative balance shows as "count needed".

### 3.5 Batch

Written by each receipt: `batchId`, `itemId`, `warehouseId`, `supplier`, `batchCode` (from the
pack), `expiresOn` (YYYY-MM-DD, optional for cups), `qtyReceived`, `qtyLeft`. Outgoing movements
take `qtyLeft` from the oldest-expiring batch first. This only drives the expiry list, never cost.

### 3.6 Movement (the ledger)

Every change to any balance is one movement. Movements are **never edited or deleted**; a mistake
is put right by a new movement (`adjust` with a note).

| Field | Notes |
|---|---|
| `movementId`, `at`, `by` (actor, or `{kind:"machine"}`) | |
| `type` | see the table below |
| `itemId`, `qty` (always > 0), `unitCostInr` | cost per unit the movement moved at |
| `from`, `to` | places, or null for outside |
| `ref` | `{restockAt, sn}`, `{orderId}`, `{invoiceNo, supplier, batchId}` as relevant |
| `reason`, `note` | required for `write_off` and `adjust` |

| `type` | From → to | Cost | Created by |
|---|---|---|---|
| `receive` | outside → warehouse | invoice price, re-averages the warehouse | admin |
| `transfer` | warehouse → warehouse | sender's average | admin |
| `refill` | home warehouse → machine | warehouse average, re-averages the machine | any refill with `add > 0` |
| `unload` | machine → outside | machine average, counted as wastage | any refill with `add < 0` |
| `consume` | machine → outside | machine average. This is COGS | every dispensed order, per material |
| `write_off` | warehouse → outside | warehouse average, counted as wastage | admin: `expired`, `damaged`, `lost` |
| `adjust` | warehouse ↔ outside | warehouse average | admin stock count; signed by direction |

The refill and consume movements must be written in the **same transaction** as the `RESTOCK#`
event and the order's `DISPENSED` transition, so a refill or a drink moves cost exactly once. A
material that no active item links to (water, ice, an unlinked canister) writes no movement.

## 4. Costing rules

1. Receive `q` at price `p` into a place holding `Q` at average `A`:
   `A' = (Q·A + q·p) / (Q + q)`. If `Q ≤ 0`, `A' = p`, so a negative balance can't poison the average.
2. Every other movement moves at the sender's current average and does not change it.
3. A drink's cost is the sum of its `consume` movements. The order record stores it as `cogsInr`,
   so later reports never re-derive a price.
4. Money is rupees, rounded to 2 decimals only when displayed or totalled.
5. A material's first drink before any priced refill moves at 0 and is flagged `unpriced`, so the
   report can say so instead of quietly showing cheap drinks.

## 5. Machine assets

One record per physical machine, separate from the machine-service profile because a machine is
bought before it is ever enrolled.

| Field | Notes |
|---|---|
| `assetId` | `ast_` + random |
| `serialNo` | the OEM's serial, unique |
| `sn` | the machine-service `sn`, set once enrolled, unique, optional |
| `model` | free text, "GS805" |
| `supplier`, `invoiceNo`, `purchasedOn` | |
| `costInr`, `gstInr` | ex-GST price and GST paid |
| `landedCostInr` | freight, duty, installation |
| `status` | `in_warehouse`, `in_transit`, `deployed`, `repair`, `retired` |
| `warehouseId` | where it is when `in_warehouse` |
| `note` | |

When `sn` is set, `deployed` and the gym and franchise come from the ownership record, never typed
here. Retiring a machine needs a note.

## 6. Routes

All under the machine-admin API, admin session only for now. JSON bodies, the usual error envelope,
`409 stale` on a version mismatch. Lists are newest first and paginated with `cursor`.

| Route | Permission | |
|---|---|---|
| `GET /admin/inventory/items` | `inventory.view` | items with `avgCostInr`, `onHand` (warehouses), `inMachines`, `low` |
| `POST /admin/inventory/items`, `PUT /admin/inventory/items/{itemId}` | `inventory.edit` | §3.1 fields; `PUT` takes `version` |
| `GET /admin/inventory/warehouses` | `inventory.view` | with `machines` (count homed there) |
| `POST /admin/inventory/warehouses`, `PUT …/{warehouseId}` | `inventory.edit` | |
| `GET /admin/inventory/stock?warehouseId=` | `inventory.view` | balances per place and item, with value |
| `GET /admin/inventory/batches?expiringWithinDays=` | `inventory.view` | open batches (`qtyLeft > 0`) |
| `POST /admin/inventory/receipts` | `inventory.edit` | one invoice: `warehouseId, supplier, invoiceNo, receivedOn, lines[{itemId, qty, lineCostInr, gstInr, batchCode, expiresOn}]`; `qty` in units, `lineCostInr` ex-GST for the whole line |
| `POST /admin/inventory/transfers` | `inventory.edit` | `from, to, lines[{itemId, qty}]` |
| `POST /admin/inventory/write-offs` | `inventory.edit` | `warehouseId, reason, note, lines[{itemId, qty}]` |
| `POST /admin/inventory/counts` | `inventory.edit` | `warehouseId, lines[{itemId, counted}]`; writes an `adjust` per line that differs |
| `GET /admin/inventory/movements?itemId=&place=&type=&from=&to=` | `inventory.view` | the ledger |
| `PUT /admin/machines/{sn}/home-warehouse` | `inventory.edit` | `{warehouseId}` |
| `GET /admin/inventory/costs?month=YYYY-MM` | `inventory.view` | §7 |
| `GET /admin/assets`, `POST /admin/assets`, `PUT /admin/assets/{assetId}` | `assets.view`, `assets.edit` | §5 |

New permissions, appended to the end of `permissions.ts` (names are a wire contract):
`inventory.view`, `inventory.edit`, `assets.view`, `assets.edit`. Admin only; franchise, gym and
operator get none of them in this phase. The matrix gets two rows to match.

## 7. Cost report

`GET /admin/inventory/costs?month=2026-10` (IST month) returns:

```json
{
  "month": "2026-10",
  "totals": { "salesInr": 0, "drinks": 0, "cogsInr": 0, "wastageInr": 0, "unpricedDrinks": 0 },
  "byItem": [{ "itemId": "", "name": "", "unit": "g", "consumedQty": 0, "cogsInr": 0, "wastedQty": 0, "wastageInr": 0 }],
  "byMachine": [{ "sn": "", "machineName": "", "drinks": 0, "salesInr": 0, "cogsInr": 0, "wastageInr": 0 }]
}
```

`salesInr` and `drinks` use the same rule as `/stats/sales`, so the two never disagree. `wastageInr`
is `unload` plus `write_off`; `write_off` has no machine and only appears in `totals` and `byItem`.

## 8. Existing data

Refills and drinks before this ships have no cost. Do not backfill. The first receipt and first
refill after launch start the books, and each machine's current canister levels open at cost 0,
flagged `unpriced`, until they are used up.

## 9. Tests the backend should have

1. The averaging rule, including receiving into a negative balance.
2. A machine refill writes the `RESTOCK#` event and the `refill` movement together, or neither.
3. A dispensed order writes `consume` movements and `cogsInr` exactly once across retries.
4. A refill with no home warehouse is `unsourced` and still succeeds.
5. A count that matches writes nothing; one that differs writes one signed `adjust`.
6. A non-admin gets `403` on every route in §6.
