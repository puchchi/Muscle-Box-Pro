# Machine ownership: backend requirements

Status: ready for the backend, 2026-09-30. Updated 2026-10-04: the frontend is built (81b84f2) and the
backend is in sandbox; production waits on `MbpMachine-prod`. All decisions below, including §9, were confirmed by Anurag on 2026-09-30.

Goal: every vending machine has a known owner (MBP stock, a franchise, or a gym), a gym can
belong to a franchise, and every order records who owned the machine when it was made. Only
MBP admins change any of this.

## 1. Decisions already made

1. A placed franchise machine is always at a gym that belongs to that franchise. A franchise can
   also hold machines that are not placed at any gym yet.
2. The onboarding service is the source of truth for ownership, including the new
   gym → franchise link. It copies the current owner onto the machine-service record, which is
   used for filtering and for stamping orders.
3. A gym keeps **one** live machine. The rule in `liveMachine` stays. A site that needs two
   machines is set up as two gyms.
4. Only MBP admin sessions can assign. Gym and franchise logins get read access in a later phase.

## 2. What exists today (for orientation)

| Fact | Where |
|---|---|
| Gym → machine contract record `GYM#<gymId>/MACHINE#<deviceNo>` (value, install date, status) | `services/onboarding/src/repo/machines.ts` |
| Uniqueness of `deviceNo` across gyms is a GSI read, not a guaranteed rule | `deviceNoHeldByAnotherGym` |
| Assign or replace a gym's unit | `PUT /admin/gyms/{gymId}/machine`, `handlers/adminMachinePut.ts` |
| Franchise only stores a machine **count** | `FRANCHISE#/TERMS.machineAllocation` |
| No gym ↔ franchise link anywhere | `repo/franchises.ts:257,352` |
| Machine record has no owner; `merchantId` is always `"1"` | `services/machine/src/admin/repo/machines.ts:16` |
| Orders carry `sn` only | `services/machine/src/repo/orders.ts`, `handlers/genOrder.ts` |
| Machine `sn` and onboarding `deviceNo` are never checked against each other | none |

## 3. Ownership model

A machine is identified by its machine-service `sn`. It is always in exactly one of four states:

| State | `franchiseId` | `gymId` |
|---|---|---|
| MBP stock (unassigned) | null | null |
| Franchise, not placed | set | null |
| At an MBP-direct gym | null | set |
| At a franchise gym | set, equal to the gym's franchise | set |

### Invariants (enforced by conditional writes, not by reads)

1. A machine has one current owner row.
2. A gym has at most one live machine (existing rule).
3. If `gymId` is set, the machine's `franchiseId` equals the gym's current `franchiseId`,
   and is null when the gym has none.
4. A gym belongs to at most one franchise at a time.
5. The `sn` must exist as `MACHINE#<sn>/PROFILE` in the machine service. From now on, this is
   what ties onboarding's `deviceNo` to a real machine.
6. The owner row and the gym's live `MACHINE#` row never disagree. When a machine is placed
   at gym G, G's live `MACHINE#` row has `deviceNo = sn`.

## 4. Records (onboarding service)

Names are suggestions. Keep the service's existing key conventions.

- **`DEVICE#<sn>/OWNER`**: the current owner. Fields: `sn`, `franchiseId|null`, `gymId|null`,
  `since`, `version`, `updatedBy`, `updatedAt`.
  - Because this is one item per device, it also enforces uniqueness for real. The
    `deviceNoHeldByAnotherGym` race goes away for any path that writes this row.
- **`DEVICE#<sn>/OWNERHIST#<since>`**: one row per past state, with `from`, `to`,
  `franchiseId`, `gymId`, `by` and `reason`. Rows are never deleted.
- **Gym → franchise**:
  - `franchiseId` on the gym `PROFILE`, plus a `GYM#<gymId>/FRANCHISEHIST#<since>` history row.
  - A listing item, or a GSI, so that "gyms of franchise F" is a single query. The franchise
    lives in `mbp-franchises-<env>`; a transaction can span both tables.
- A GSI, or listing items, that answers:
  - "machines owned by franchise F" (placed and not placed);
  - "machines in MBP stock".

## 5. Copy onto the machine service

- `MACHINE#<sn>/PROFILE` gains
  `owner: { franchiseId, franchiseName, gymId, gymName, since } | null`.
- It is written **in the same transaction** as the onboarding owner row. DynamoDB transactions
  can span tables, which needs a narrow write grant from onboarding onto the machine table.
  - If that grant isn't acceptable, a DynamoDB stream on the owner row is the fallback.
  - With a stream, the copy can lag, so orders made in that gap get stamped with the old owner.
    If you choose the stream, record that trade-off.
- Names are copied for display. A later rename of a gym or franchise must refresh the copy,
  or the machine-admin API must look the name up. Pick one, but don't leave the copy stale.

## 6. Order stamping

- When `genOrder` creates `ORDER#<orderId>`, it copies `owner.gymId`, `owner.franchiseId` and
  both names from the machine profile onto the order. **These values are never updated
  afterwards.** Moving a machine must not change who earned past sales.
- Orders created before this ships have no owner. Default: leave them null, and show them as
  "Not assigned". A backfill from the owner history is optional (see §10).

## 7. Endpoints (MBP admin only)

These are onboarding admin routes. Put them on the stack that has room; `franchise-admin-stack`
exists for exactly that reason. Every write takes `expectedVersion` and records the admin's email
as `updatedBy`.

1. **`PUT /admin/machines/{sn}/owner`**: the single path for moving a machine. The body is one of:
   - `{ to: "stock" }`
   - `{ to: "franchise", franchiseId }`
   - `{ to: "gym", gymId, model, serialNumber, valueInr, accessories, installationDate }`.
     The gym fields are there because placing a machine writes the gym's contract row.

   Rules:
   - Placing at a gym that already has a live machine is refused. The admin moves the old one
     first. Otherwise the endpoint would be doing a replacement without saying so.
   - Moving a machine off a gym marks that gym's `MACHINE#` row `removed`. It is never deleted.
   - `to: "gym"` sets `franchiseId` from the gym (invariant 3). The client never sends it.
   - `PUT /admin/gyms/{gymId}/machine` must go through the same code, so the two routes can't
     disagree. Its patch path, which updates install or service dates, stays as it is.
2. **`PUT /admin/gyms/{gymId}/franchise`**: body `{ franchiseId | null, expectedVersion }`.
   - In one transaction it moves the gym **and** its live machine's `franchiseId`, and writes
     history for both.
   - Removing a gym from a franchise turns its machine into an MBP-direct machine; the machine
     stays placed at the gym.
3. **`GET /admin/machines/{sn}/owner`**: the current owner plus history, newest first.
4. **`GET /admin/franchises/{id}/network`**, or the same fields added to the existing franchise
   GET, returns:
   - the franchise's gyms, each with its live machine;
   - its unplaced machines;
   - `machineAllocation` next to the actual count.
5. **Additions to existing responses**:
   - Gym list and detail: `franchiseId` and `franchiseName`.
   - Franchise list: `gymCount` and `machineCount`.
6. **Picker data for the assign form**:
   - Machines in stock.
   - Machines held by franchise F.
   - Gyms that have no live machine, filterable by franchise.

## 8. Machine-admin API changes (machine service)

- Machine list and detail DTOs gain `owner` (see §5).
- The machines list takes `gymId`, `franchiseId` and `ownerState`
  (`stock|franchise_unplaced|placed`) filters. These use the **current** owner.
- The orders list, the orders CSV export and the order, sales and ad stats take `gymId` and
  `franchiseId` filters. These use the **stamped** owner (§6), not the current one.
- The order DTO gains `gymId`, `gymName`, `franchiseId` and `franchiseName`.

## 9. Eligibility rules (decided)

- A franchise can receive gyms or machines only when its status is `active`.
- A gym can be linked to a franchise, or receive a machine, unless it is offboarded.
- A franchise holding more machines than `machineAllocation` is allowed. The response carries
  an `overAllocated` flag and the UI warns.
- There is no territory check. Territory is stored as text, not a map area.

## 10. Migration

1. For every existing live gym `MACHINE#` row whose `deviceNo` matches a real `MACHINE#<sn>`,
   create the `DEVICE#<sn>/OWNER` row and the machine-service `owner` copy.
2. List and report, without changing, the rows that don't match: `PENDING-*` placeholders,
   typos, and machines that were never registered. An admin fixes them through §7.1.
3. Machines in the machine service that no gym claims become MBP stock.
4. Optional: backfill past orders' owner from `OWNERHIST` by order time. Only worth doing if
   settlement for earlier periods will be computed from these orders.

## 11. Acceptance scenarios

1. Stock → franchise F: F's network lists the machine as not placed.
2. F's unplaced machine → F's gym G: owner is `{F, G}`. The gym's `MACHINE#` row is created
   with `deviceNo = sn`.
3. Placing it at a gym that is **not** in F: allowed, and the owner becomes `{null, G}`. This
   is invariant 3. The UI must say the machine is leaving the franchise.
4. Placing a machine at a gym that already has a live machine: refused.
5. Two admins place the same `sn` at the same time: exactly one succeeds.
6. Gym G (with machine M) is added to franchise F: M's owner becomes `{F, G}` in the same
   write. Orders from before the move keep `franchiseId = null`.
7. Gym G is removed from F: M becomes `{null, G}`.
8. Machine moved from gym A to gym B: A's row is `removed` and B's row is created. Orders from
   before the move still filter under A.
9. A franchise that isn't `active` is refused as a target.
10. A gym or franchise session calling any of these routes gets 401 or 403.

## 12. What the dashboard needs back

The dashboard work starts once these routes are deployed to sandbox. When you finish, report:

- The final route paths and which stack serves each one.
- The request and response shape of every route in §7 and §8, including the error codes and
  `fieldErrors` keys for each refusal (occupied gym, inactive franchise, offboarded gym, stale
  `expectedVersion`, unknown `sn`).
- Anything in this spec you changed, and why.

## 13. Out of scope for this phase

Settlement statements and franchise-side maths, payout (beneficiary) accounts, per-owner QR and
logo branding, and gym or franchise portal views of machines and sales. All of them read the
records defined here, so nothing here should need reshaping for them.
