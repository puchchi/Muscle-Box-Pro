# Machine roles and operator accounts: backend requirements

Status: ready for the backend, 2026-10-06. Who gets what was reviewed by Anurag on 2026-10-06 in
[machine-access-matrix.md](machine-access-matrix.md). That file is the source of truth for every
permission below. If the two disagree, the matrix wins.

Goal: franchise owners, gym owners and a new operator account use the machine console on their own
machines only, each with the access the matrix gives them. MBP admins keep everything.

## 1. Decisions already made

1. Four roles: `admin`, `franchise`, `gym`, `operator`. Admins keep every route on every machine.
2. A franchise, gym or operator only reaches machines in its scope (§3). A machine outside the scope
   answers `404`, the same as one that doesn't exist, so the IDs of other machines aren't leaked.
3. The backend enforces every permission. The dashboard only hides what the role can't use.
4. Operators are a new account type. Admins and franchise owners create them; gym owners can't.
   They sign in with email and password, set from an invite email, like the gym and franchise
   portals. One operator can be assigned many machines.
5. Ownership stays as built: onboarding owns it, and only admins move machines
   ([machine-ownership-backend-requirements.md](machine-ownership-backend-requirements.md)).

## 2. What exists today (for orientation)

| Fact | Where |
|---|---|
| Every machine-admin route is `adminRoute`, which only accepts an `admin` token signed with `adminSessionSecret` | `services/machine/src/admin/lib/route.ts:44-114` |
| machine-iot uses the same guard | `infra/lib/stacks/machine-iot-stack.ts:64-73` |
| shop-admin has its own copy of the guard | `services/shop/src/admin/route.ts`, `session.ts` |
| Handlers get only `adminEmail`; there is no role or scope | `route.ts:13` |
| Gym and franchise logins exist, with cookies `mbp_gym` and `mbp_franchise` | `services/onboarding/src/auth/cookie.ts` |
| All cookies are host-scoped to `api.muscleboxpro.com` with `Path=/`, so machine-admin already receives them | same file |
| `GYMUSER#<email>` has `gymId`; `FranchiseUser` has `franchiseId`; both have `status` | `repo/gymUsers.ts`, `repo/franchiseUsers.ts` |
| A machine's owner `{franchiseId, gymId}` is on `MACHINE#<sn>/PROFILE.owner` | `services/machine/src/repo/machines.ts:62-66` |
| Orders are stamped with `{gymId, franchiseId}` | `services/machine/src/domain/owner.ts:50-60` |
| `?gymId=` / `?franchiseId=` filters exist, but the caller chooses them | `handlers/machineIndex.ts:20` |
| Restock history records `by: {kind: "admin", email}` | `handlers/stock.ts:91` |
| No operator account exists. "Operator" today is only the PIN on the machine's screen | `admin/repo/machines.ts:155` |

## 3. Scope: which machines a caller reaches

| Role | Machines in scope |
|---|---|
| admin | All |
| franchise | `owner.franchiseId` equals the user's `franchiseId`: its gyms' machines and its unplaced ones |
| gym | `owner.gymId` equals the user's `gymId` |
| operator | Its assigned machines. For an operator created by a franchise, also only those still owned by that franchise |

- Scope is worked out from the current owner on every request. When an admin moves a machine away
  from a franchise, its franchise owner and operators lose it at once, with no clean-up step.
- Orders and statistics are scoped by the order's stamped owner, not the machine's current owner.
  A franchise keeps seeing the sales it made on a machine that has since moved, and doesn't see
  sales made before the machine came to it.
- A disabled user, a franchise that isn't `active`, or an offboarded gym gets `401`, checked on
  every request the way `requireAdmin` re-reads `ADMIN#` today.

## 4. Sessions

1. `adminRoute` becomes a guard that takes the allowed roles, e.g.
   `machineRoute(["admin", "franchise", "operator"], handler)`. It accepts any of `mbp_admin`,
   `mbp_franchise`, `mbp_gym` and the new `mbp_operator`. Each is checked with its own secret, so
   machine-admin, machine-iot and shop-admin need read access to the gym, franchise and operator
   session secrets.
2. If a browser holds more than one, use the first valid one in this order: admin, franchise,
   operator, gym.
3. The handler gets an actor, not `adminEmail`:
   `{role, email, name, franchiseId?, gymId?, operatorId?}`, plus a helper that answers "is `sn` in
   scope?" and one that returns the scope filter for list queries.
4. Every write records the actor. `by` everywhere (restock history, commands, live sessions,
   feedback, the operations log) becomes `{kind: role, email, name}`. The dashboard shows the name
   and role, e.g. "Ravi (operator)".

## 5. `GET /machine-admin/me` (new)

This tells the dashboard who is signed in and what to show.

```json
{
  "role": "franchise",
  "name": "Ravi Kumar",
  "email": "ravi@example.com",
  "franchiseId": "…",
  "gymId": null,
  "can": ["machines.view", "machines.settings.basic", "stock.restock", "commands.send", "..."]
}
```

`can` is a flat list of permission names, one per row of the matrix that the role has. The
dashboard never works out permissions itself.

## 6. Route by route

Rules that apply to every route below:

- `—` means `403 forbidden`.
- "own" means scoped by §3: lists are filtered, and a single item outside the scope gets `404`.
- Anything not in this table, or marked admin, stays admin-only.

### machine-admin

| Route | franchise | gym | operator |
|---|---|---|---|
| GET `summary` | own | own | own, without the orders and sales totals |
| GET `machines`, GET `machines/{sn}` | own | own | own |
| PATCH `machines/{sn}` | only `name`, `servicePhone`, `address`, `lat`, `lng`, the four water temperatures, `enabled` | — | only `enabled` |
| PUT `machines/{sn}/pin` | own | — | — |
| GET `machines/{sn}/goods`, `goods/available` | own | own (GET `goods` only) | own |
| POST `machines/{sn}/goods` | own | — | — |
| PATCH `machines/{sn}/goods` | `sort`, `price`, `listed` | — | only `listed` |
| GET `machines/{sn}/stock` | own | own | own |
| POST `machines/{sn}/stock/restock` | own | — | own |
| GET `machines/{sn}/stock/history` | own | — | own |
| GET/PUT `machines/{sn}/voices` | own | — | — |
| GET `logs/equipment`, `logs/operations` | own | — | own |
| GET `orders`, `orders/{orderId}`, `stats/*` | own (by stamp) | own (by stamp) | — |
| GET `feedback`, `feedback/{id}` | own | — | — |
| PATCH `feedback/{id}` | state and note | — | — |
| GET `redeem-codes`, `redeem-codes/{code}`, `…/uses` | codes that work on an own machine, including all-machines codes; uses only from own machines | — | — |
| GET `goods`, `goods/{goodsId}` | read | — | — |
| GET `promotions`, `promotions/{promoId}` | promotions that apply to an own machine, including all-machines ones | — | — |
| GET `models`, `models/{modelId}/materials` | read, needed by the Stock tab | read | read |
| POST `uploads`, `uploads/{id}/complete` | voice prompt files only, for an own machine | — | — |

- A PATCH that carries a field the role can't change is refused with `403` and
  `fieldErrors: {<field>: "You can't change this."}`. The other fields aren't saved either.
- The responses to franchise, gym and operator callers leave out:
  - `owner` history entries' admin emails (keep the names);
  - factory PIN metadata;
  - MQTT certificate details (fingerprint, source IP).
- Feedback returned to a franchise keeps the customer's email and phone: the matrix gives
  franchises feedback, and they need it to reply.

### machine-iot

| Route | franchise | gym | operator |
|---|---|---|---|
| POST `machines/{sn}/commands` | own, every command except `uploadLog` | — | same as franchise |
| GET/DELETE `machines/{sn}/commands/{id}` | own | — | own |
| POST/DELETE `machines/{sn}/session`, GET `machines/{sn}/live` | own | — | own |
| `mqtt/enrol`, `mqtt/revoke` | — | — | — |

### shop-admin

| Route | franchise | gym | operator |
|---|---|---|---|
| Shop order list and detail | own machines, read only | — | — |
| Refund, reissue, customers, balances | — | — | — |

Shop orders returned to a franchise leave out the customer's email, phone and customer ID. The
matrix keeps customers admin-only, and a franchise doesn't need them to see its sales.

## 7. Operator accounts (onboarding service)

### Record

`OPERATOR#<emailLower>/PROFILE` in the gyms table, next to `ADMIN#` and `GYMUSER#`:

```
{ email, name, phone?, passwordHash, status: "invited" | "active" | "disabled",
  franchiseId: string | null,          // null when an MBP admin created it for MBP's own machines
  machines: string[],                  // assigned SNs
  createdBy: {kind: "admin" | "franchise", email}, createdAt, lastLoginAt?, disabledAt?, disabledReason? }
```

Add an index on `franchiseId` so a franchise can list its operators.

### Rules

1. A franchise can only create operators with its own `franchiseId`, and only assign machines in
   its scope at the time of the write.
2. An operator's scope is still re-checked against ownership on every request (§3). Assigning a
   machine doesn't grant it forever.
3. An email can't be an operator and also an admin, gym or franchise login. That keeps a
   multi-cookie browser unambiguous.
4. Disabling an operator ends their sessions on the next request.
5. An operator never sees money. That means no orders, no stats, and no sales totals in `summary`.

### Endpoints

Admin endpoints are under `/admin`, and franchise endpoints under the franchise portal's base path.

| Endpoint | Who |
|---|---|
| GET/POST `operators` | admin (all), franchise (own) |
| GET/PATCH `operators/{email}` (name, phone, machines) | admin, franchise (own) |
| PUT `operators/{email}/disabled` | admin, franchise (own) |
| POST `operators/{email}/invite` (send again) | admin, franchise (own) |
| POST `/operator/login`, `/operator/logout`, GET `/operator/session` | the operator |
| POST `/operator/forgot-password`, `/operator/set-password` | the operator, from the email link |

- Invite, set-password and forgot-password work the way the gym portal's do, with the same token
  lifetime and the same email look. The email says who added them, and links to
  `https://www.muscleboxpro.com/operator/set-password`.
- The operator cookie is `mbp_operator`, with its own secret, `HttpOnly; Secure; SameSite=Lax;
  Path=/`, and no `Domain`. That's the same as the others.

## 8. Acceptance scenarios

1. Franchise F owns machines A and B. Gym G (in F) has A. MBP stock has C.
   - F lists machines and sees A and B.
   - G sees A.
   - Both get `404` on C.
2. F PATCHes `name` on A: `200`. F PATCHes `freeVend` on A: `403` with `fieldErrors.freeVend`, and
   `name` in the same request isn't saved.
3. F creates operator O with machines A and B.
   - O restocks A: `200`, and the history shows O's name with role operator.
   - O GETs `orders`: `403`.
4. An admin moves B to MBP stock. On the next request:
   - O and F get `404` on B;
   - O's `machines` still lists B, and that's harmless.
5. O sends `clean` to A: `200`. O sends `uploadLog`: `403`. O calls `mqtt/enrol`: `403`.
6. F disables O. O's next request gets `401`.
7. A sale is made on A while A is at G. A then moves to another franchise. F still sees that sale
   in `orders` and `stats`; the new franchise doesn't.
8. G calls PATCH `machines/A`, `stock/restock` or any `commands` route, and gets `403`.
9. A redeem code scoped to all machines shows in F's list; F's PATCH on it gets `403`.
10. A browser with both `mbp_admin` and `mbp_franchise` calls `/me` and gets `role: "admin"`.

## 9. What the dashboard needs back

- `/me`, exactly as in §5. The permission names are listed in the matrix order, and each name is
  fixed once the dashboard ships.
- The actor `{kind, name}` on every `by` field.
- `403` uses `{error: {code: "forbidden", message, fieldErrors?}}`, like the other errors.

## 10. Order of work

1. Backend: §4 to §6 for franchise and gym, plus `/me`. Deploy to sandbox.
2. Dashboard: the console reads `/me`. Franchise and gym owners reach it from their portals.
3. Backend: §7, operators. Deploy to sandbox.
4. Dashboard: operator sign-in pages, and an Operators page for admins and franchise owners.
5. Production after both pass on sandbox.

## 11. Out of scope

- Franchise-owned goods, recipes, ads, voice defaults or QR settings. They stay fleet-wide and
  admin-only.
- Franchise-created redeem codes and discounts. Both are view only, per the matrix.
- Staff roles inside a franchise or gym beyond the owner.
- Operators using the on-machine PIN screens with their own account. The PIN stays shared per
  machine and is set by the franchise.
