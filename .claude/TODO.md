# MuscleBoxPro — Security Fixes & AWS Payment Service

Created 2026-08-15. Three tracks, in priority order.

**Strategy (decided 2026-08-15):** hybrid, not a full migration. Build the **payment service on
AWS** because it's greenfield — no migration tax. Leave the marketing site, lead forms, and
auth on Supabase + Vercel indefinitely. Full migration is deferred behind concrete triggers
(Track C).

- **Track A** — security fixes on current stack. Urgent, independent of everything else.
- **Track B** — payment service on AWS. The active build.
- **Track C** — full Supabase→AWS migration. Deferred. Do not start.

---

## Track A — Security fixes on current Supabase stack (do this week)

### A1. `investor_requests` is world-readable — CONFIRMED LIVE EXPOSURE

Verified 2026-08-15 by anonymous `HEAD` probe with the public `sb_publishable_…` key:

```
demo_requests       200  count 0    ← ambiguous (empty OR RLS-protected)
campaign_requests   200  count 0    ← ambiguous
investor_requests   200  count 19   ← EXPOSED, 19 records
```

19 investor records (`name`, `email`, `firm`, `investor_type`, `message`) are readable by
anyone. The publishable key ships in the JS bundle and is designed to be public — it relies
entirely on RLS, and there is no RLS. Repo has **zero** `enable row level security`,
`create policy`, or `grant` statements.

- [ ] Confirm which tables actually lack RLS:
      ```sql
      select relname, relrowsecurity from pg_class
      where relname in ('demo_requests','campaign_requests','investor_requests');
      ```
- [ ] Apply the fix:
      ```sql
      alter table public.investor_requests enable row level security;
      alter table public.demo_requests     enable row level security;
      alter table public.campaign_requests enable row level security;
      ```
      No policies needed. **Cannot break the site** — every legitimate writer uses
      `service_role`, which bypasses RLS: `supabase/functions/_shared/supabase.ts` (4 form
      functions) and `local_dashboard/server.js:213` (dashboard). The browser never queries
      these tables directly (no `.from()` calls anywhere in `client/src`).
- [ ] Commit the `alter table` statements as a new migration so this can't regress.
- [ ] Audit Supabase logs for unexpected `investor_requests` reads. Assume the 19 records
      are compromised.
- [ ] Supabase's default grants give `anon` ALL privileges on public-schema tables, so
      INSERT/UPDATE/DELETE were likely open too — someone could have wiped the pipeline.
      Not tested (would have written to prod). Enabling RLS closes reads and writes together.

### A2. Users can set their own `wallet_balance` — CLOSED 2026-08-22

`client/src/pages/Account.tsx:107-117` read `wallet_balance`, `monthly_shakes`,
`favorite_blend`, and a `transactions[]` array out of `user_metadata`.
`supabase.auth.updateUser({ data })` writes `user_metadata` with the *user's own* token,
so **a user could grant themselves money from the browser console.** Not a Supabase flaw —
`user_metadata` is documented as user-writable. Design mistake in this repo.

Closed by removing consumer auth outright: there are no member accounts any more, and the
vulnerable read left with the file. `Account.tsx` is at `client/src/pages/_archive/` and is
excluded from both `tsconfig.json` and `vitest.config.ts`, so it no longer compiles.

- [x] Vulnerable code path removed with the page (no `members` table needed — the feature is gone)
- [ ] **Constraint for the replacement:** the gym portal must keep business state in Postgres
      behind an authenticated endpoint. Identity only in the token. See
      `docs/gym-onboarding.md` §10 and the §17 checklist.

### A3. `send-email` is an open spam relay

`supabase/functions/send-email/index.ts` accepts arbitrary `to` + arbitrary `html` from any
authenticated user, sent from your domain. Torches sending reputation. **Zero callers.**

- [ ] Delete the function and undeploy it.

### A4. `/order/*` payment routes are unauthenticated

`local_dashboard/server.js:269` — `app.use("/order", machineRoutes)` has no `requireAuth`;
every other route has it. Exposed to the internet via ngrok. Strangers can mint PhonePe
payment URLs for arbitrary amounts on your merchant account.

- [x] ~~Add auth to `/order/*`~~ Done 2026-08-17: `local_dashboard/lib/gsAuth.js`, mounted via
      `router.use(gsAuth)` in `machineRoutes.js`. Verifies the credentials the machine was already
      sending and we were ignoring — `key`, `key-md5` = `MD5(key+secret+timestamp)`, `timestamp`
      (epoch ms), spec §3.2.1 — plus a ±5 min skew window and a single-use `(key, timestamp)`
      replay cache (the digest doesn't cover the body, so a captured triple would otherwise
      authenticate *any* body).
- [x] ~~Stop logging all request headers~~ Done — `redactHeaders()` masks `key` / `key-md5` /
      `authorization` / `cookie` / `x-dashboard-password`.
- [ ] **`GS_AUTH_MODE` is `observe`, so nothing is rejected yet — `/order/*` is still open.**
      Deliberate: the exact `key-md5` construction is unconfirmed (spec §3.3.1's example body
      matches no interface we implement), and enforcing a guess would 400 the machine server and
      stop live payments. `gsAuth` tries 8 candidate constructions and logs which matched. **To
      close A4: set `GS_API_KEY` / `GS_API_SECRET` in `local_dashboard/.env`, send one real machine
      request, read the `[GSAuth] verified — construction "…"` line, then set
      `GS_AUTH_MODE=enforce`.** Blocked on machine access.
- [ ] Validate `totalAmount` against a server-side price list — don't trust the caller. Still open,
      and load-bearing: the GS digest covers only the headers, never the body, so a valid signature
      says nothing about the amount.

---

## Track B — Payment service on AWS (active build)

**Code lives in a separate repo: `~/github/mbp-backend`** (created 2026-08-17). Named generically
because the rest of the backend may migrate there later; payments is one CDK stack inside it with its
own IAM roles and secrets, so its blast radius doesn't grow as other services arrive.
The design doc and vendor PDF stay in *this* repo — that's where the decision history is.

**B1 done** (2026-08-17): DynamoDB `mbp-orders` + `mbp-config` with the four sparse GSIs, REST API
with the `aws:SourceIp` resource policy, `/order/<name>` paths, `/health` MOCK route, and the pure
domain logic — state machine + `orderStatus` projection, paise/decimal money conversion, refund
eligibility, vendor time formatting, `orderNo`, GS header auth. **145 tests pass**; `cdk synth` is
clean. Nothing is deployed (no AWS credentials configured yet).

Two spec facts confirmed by test rather than by reading: the worked-example timestamps
`1733446562634` and `1752731459238` format to exactly `2024-12-06 08:56:02` and
`2025-07-17 13:50:59` at UTC+8 — so the header `timestamp` is **plain Unix epoch ms** with no
baked-in offset, and a normal skew check is correct.


**Full design: `~/github/mbp-backend/docs/payment-api-design.md`** — moved there 2026-08-17 with the
code it describes, so the two can't drift. (2026-08-16,
revised 2026-08-17) — wire format, endpoints, state machine, DynamoDB model, auth, reconciliation,
open questions. That doc is the spec; this section is the task tracker.

**Upstream spec:** `docs/Payment interface document-v2.0_20250712 (2).pdf` (Wuhan GS Technology,
`GSWYIT-OPEN-API-02` v2.0). Read it before implementing anything.

**Revised 2026-08-17:** provider is now **Razorpay** (behind a thin provider interface);
**admin API parked** (dashboard reads DynamoDB directly via AWS SDK); **`/refund` marks only** —
it never calls the provider, and machine-initiated refunds are limited to a 5-min window from
order creation.

**Corrected 2026-08-17 after reading the vendor spec** — three earlier conclusions were wrong:

- [ ] **Auth is header-based and mandatory:** `key`, `key-md5` = `MD5(key+secret+timestamp)`,
      `timestamp` (epoch ms). `api key`/`api secret` are on the console's *personal information*
      tab. **URL path tokens are unnecessary — dropped.** Digest does **not** cover the body, so
      server-side price validation is load-bearing.
- [ ] **The caller is the GS machine server, not the vending machines** — one cloud origin, so an
      IP allowlist is realistic. Ask GS for their egress range.
- [ ] **`orderStatus` is `0`–`6`**, not 1/2/3: `0` Cancel, `1` Pending, `2` Paid, `3` Failed,
      `4` Pending Refund, `5` Refund Completed, `6` Time Exceeded. Expiry must report `6`, and
      `4`/`5` make the mark-only refund model native to the protocol.
- [ ] **Response envelope field is `msg`, not `message`** — we've been returning the wrong name on
      every endpoint. Emit both during transition. Business errors are `400`; `500` is undefined.
- [ ] **Three unimplemented interfaces:** `POST /order/refundStatus` (refund query),
      outbound **payment notify** → `notifyUrl` (spec §3.2.6), outbound **refund notify** →
      `refundNotifyUrl` (spec §3.2.7). Both callback URLs are currently discarded. The payment
      notify channel means the machine need not poll to learn of payment.
- [ ] `POST /order/rcard` (card payment) also exists and is unimplemented. **Recommend leaving it
      out of phase 1** — different rail, and `cardNo` drags in PCI scope.

Greenfield. Not yet integrated into MuscleBoxPro; currently exists only as test code in
`local_dashboard/lib/machineRoutes.js` + `phonepe.js`. **No data to migrate, no users to cut
over, no tests to retarget** — which is exactly why this is the AWS work worth doing.

### Decisions locked

| Decision | Choice | Note |
|---|---|---|
| Compute | Lambda (Node 22, TypeScript) | |
| API | API Gateway **REST API** (not HTTP API) | see below |
| Database | DynamoDB on-demand | |
| Secrets | SSM Parameter Store SecureString | |
| Machine auth | **GS headers** `key` / `key-md5` / `timestamp`, spec §3.2.1 | shared secret, MD5, **digest excludes the body** → server-side price validation is mandatory; IP allowlist as defence in depth |
| **Repo** | **New standalone repo `mbp-payments`** (decided 2026-08-17) | see below |
| IaC | AWS CDK (TypeScript) | |
| **Provider** | **Razorpay**, behind a thin provider interface | must store `paymentId` — refunds key on it |
| **Refunds** | **`/refund` marks the order only, never pays** | 5-min window from `createdAt`; execution is a separate, manual step in phase 1 |
| **Admin API** | **Parked** — dashboard reads DynamoDB via AWS SDK | no HTTP admin surface to secure |
| Scope | payment/machine only. No Cognito, no lead forms, no frontend changes. | |

**Why a separate repo (`mbp-payments`), not a subdirectory:** this repo is a Vercel-deployed Next.js
app, so a CDK app inside it would drag root `tsconfig.json` (with `@` → `client/src` aliases),
`npm run check`, and vitest across two unrelated type systems, and would need `.vercelignore` plus
build excludes to stay out of frontend builds. More importantly the payment service holds **live
Razorpay keys and AWS deploy credentials** and wants its own protected branch, CI credentials, and
readable audit history. The two share **no code, no tables, and no callers** — no browser ever calls
the payment API — so the split costs nothing in duplication.

**Docs moved with the code (2026-08-17).** `payment-api-design.md` now lives only in
`mbp-backend/docs/` — a living document in two repos drifts, and it documents that repo's code. The
vendor PDF is duplicated into `mbp-backend/docs/GSWYIT-OPEN-API-02-v2.0-20250712.pdf`, which is safe
because a versioned PDF is immutable; `local_dashboard` still implements the same interface and needs
its copy. Decision/progress log for the payment service is `mbp-backend/.claude/`.

If the website ever shows a user their order history, that goes over an HTTP endpoint — **never a
shared import** — so it doesn't argue for merging the repos back.

**Why REST API, not HTTP API:** the machine can only send a URL, so an IP allowlist is the
primary compensating control. A REST API supports a **resource policy with `aws:SourceIp`
conditions natively and for free** — no CloudFront, no WAF needed. HTTP APIs can't attach WAF
directly (CloudFront/ALB/REST only), so they'd have forced an extra component in. REST API
costs $3.50/M vs $1.00/M requests — cents at this volume.

Note API Gateway **API keys / usage plans are unusable here** — they require an `x-api-key`
header, which the firmware can't send.

### Architecture

```
Vending machine ──HTTPS──► API GW REST API  (api-pay.muscleboxpro.com, ACM cert)
                             │
                             │ resource policy: deny all except machine source IPs
                             │                  on execute-api:/prod/POST/machine/*
                             ▼
                           Lambda ──► DynamoDB  mbp-orders
                                  ──► SSM       PhonePe creds (KMS-encrypted)
                                  ──► PhonePe   pay() / getOrderStatus()

PhonePe ──webhook──► API GW  /webhook/phonepe   (open route, basic-auth validated via SDK)
                             ▼
                           Lambda ──► DynamoDB UpdateItem   ◄── authoritative payment state
```

Two different access controls on one API: machine routes IP-restricted, webhook route open but
basic-auth validated. Resource policies support per-resource ARNs, so this is expressible in
one policy.

**No browser ever calls this API** — so no CORS config, no CSP change in `next.config.mjs`,
no `client/src` changes at all. That's the main simplification versus the full-migration plan.

### Endpoints

Preserve the vendor wire format **exactly** — `{ code, message, data }` with `orderStatus` as
the strings `"1"` (pending) / `"2"` (paid) / `"3"` (failed). The firmware can't be recompiled.

```
POST /machine/order/create     → { orderNo, thirdOrderNo, qrUrl, orderStatus:1, expireAt }
POST /machine/order/status     → { orderNo, thirdOrderNo, orderStatus, orderTime, payTime,
                                   totalAmount, channelUserId }
POST /machine/order/cancel     → { orderNo, thirdOrderNo, returnCode, returnMsg }
POST /machine/order/complete   → { orderNo, thirdOrderNo, returnCode, returnMsg }

POST /webhook/phonepe          ← NEW. PhonePe → us, basic-auth validated via SDK.
```

`create` accepts `orderNo` if supplied (current machine behaviour) and **generates one if
absent**, so the same endpoint later serves the website/app. Returns both our `orderNo` and
PhonePe's `orderId` as `thirdOrderNo`, plus the checkout URL as `qrUrl` for QR rendering.

### `mbp-orders` table (PK = `orderNo`)

```
orderNo, thirdOrderNo (PhonePe orderId), amount, subject, machineId, deviceInfo
state           PENDING | COMPLETED | FAILED | CANCELLED
orderStatus     "1" | "2" | "3"          ← vendor-facing projection
createdAt, updatedAt, lastPolledAt       ← epoch ms; replaces the in-memory Map
checkoutUrl, transactionId
dispensed       true | false | null      ← from /complete
refundState     null | PENDING | DONE
ttl                                      ← createdAt + 7d, auto-cleanup
```

### Webhook inverts the status model

`/status` becomes a **DynamoDB read**, not a PhonePe API call. At 2s polling for 5 minutes
that's ~150 requests per order, every one of which currently hits PhonePe and will eventually
get rate-limited. Only poll PhonePe when state is `PENDING` **and** `lastPolledAt` is stale
(>3s), then write back.

### Defects the rewrite must fix

- [ ] **The 5-minute hard-fail can eat a customer's money.**
      `machineRoutes.js:98-113` returns `orderStatus:"3"` (FAILED) **without calling PhonePe**
      once an order is >5 min old. Pay at 4:59, machine polls at 5:01 → you keep the money and
      dispense nothing. New rule: **never transition out of `COMPLETED`** (DynamoDB conditional
      write); the timeout applies only when PhonePe itself still reports PENDING.
- [ ] **Restart silently disables both failsafes.** `getOrderAgeMs` returns `null` on an empty
      `Map` (`phonepe.js:103-106`) and `null` skips the check. Mandatory fix on Lambda, where
      every invocation may be a cold container. → `mbp-orders.createdAt`.
- [ ] **Idempotent create** — conditional `PutItem` on `orderNo` so a retried request can't
      mint a second PhonePe order.
- [ ] **Validate `totalAmount` server-side** against a price list. Never trust the caller —
      this is what makes A4 exploitable today.
- [ ] **URL token will land in API Gateway access logs.** Disable request-path/query logging
      for `/machine/*`, use per-machine tokens so one unit can be revoked alone, and rotate.
- [ ] **Re-ask the vendor whether custom headers are supported.** Header-based HMAC
      (`X-MBP-Signature` = `hmac_sha256(secret, timestamp + "." + rawBody)`, ±5 min skew for
      replay protection) is meaningfully stronger than a URL token. If firmware gains header
      support later, the Lambda authorizer can accept both.

### Open question — blocks the IP allowlist

- [ ] **Do the machines have static IPs?** IP allowlisting is the primary defense given
      URL-only auth. If units are on mobile/dynamic connections it won't hold, and the fallback
      is a long high-entropy per-machine path token + tight per-route throttling + alerting on
      anomalous create volume. Confirm before building the resource policy.

### Accepted gaps — must close before live customers

- [ ] `/refund` returns fake `refundStatus:"success"` with an invented `thirdRefundNo` and
      never calls PhonePe (`machineRoutes.js:154-167`). **Nothing is refunded.**
- [ ] `/complete` discards the dispense outcome (`machineRoutes.js:191`) — paid-but-not-
      dispensed is exactly the case that must trigger a refund, and it's dropped.

Porting these as stubs was a deliberate decision to keep scope down. **Build a real refund
path (PhonePe refund API + auto-refund on dispense failure) before any paying customer touches
this.** Track the `refundState` column from day one so the data is there when it's wired up.

### Also

- [ ] `local_dashboard` reads `mbp-orders` via AWS SDK for an order/payment view.
- [ ] Once deployed, `local_dashboard` no longer needs ngrok for payments — the machine points
      at API Gateway directly. Keep the tunnel only for the inbox dashboard.
- [ ] Delete `local_dashboard/lib/phonepe copy.js` — 185-line dead pre-SDK implementation.
- [ ] CloudWatch alarms: Lambda errors, PhonePe 5xx rate, orders stuck `PENDING` >10 min,
      any `COMPLETED` order with `dispensed=false`.

### Phases

| # | Scope |
|---|---|
| B1 | ~~CDK skeleton: `mbp-orders`, REST API + resource policy~~ **DONE** — plus the full domain layer and 145 tests. Custom domain/ACM deferred: needs credentials + DNS, and sandbox runs fine on the execute-api URL |
| B2 | `/order/qr` + `/order/status` Lambdas against the **Razorpay** sandbox; `repo/orders.ts` conditional writes; provider interface impl. **Blocked on Q1** (UPI QR API vs Payment Link) — decide before writing `createOrder` |
| B3 | Razorpay webhook + conditional-write guards; `cancel` + `complete`; the two outbound callbacks (`notifyUrl`, `refundNotifyUrl`) |
| B4 | Point the test machine at API Gateway; end-to-end sandbox run. **Low risk** — vendor console *personal information → pay setting* holds five free-text URL fields plus an `enable` toggle, so cutover and rollback are form edits, no firmware flash |
| B5 | Production PhonePe creds, alarms, log-redaction, per-machine token rotation |

---

## Track C — Full Supabase→AWS migration (DEFERRED — do not start)

Assessed 2026-08-15 and explicitly deprioritized. The marketing site, lead forms, and auth
gain nothing from moving and would **lose** RLS (DB-layer authorization, strictly stronger than
app-layer checks) and GoTrue (materially nicer than Cognito for these flows). Savings are
~$15–20/mo against weeks of work plus retargeting ~10 test files.

**Revisit only when one of these is concretely true:**

- [ ] Fleet exceeds ~20 machines needing telemetry or remote config
- [ ] Supabase bill crosses ~$100/mo
- [ ] VPC-private networking or a compliance/audit requirement lands
- [ ] Enough already runs on AWS that the split is itself the annoyance

Full analysis if it's ever revived: Cognito absorbs `auth-signup`, `verify-email`,
`resend-verification`, `forgot-password` (4 functions deleted, plus `send-email` per A3);
4 lead functions port to Lambda; `client/src/lib/api.ts` shim mirroring
`supabase.functions.invoke()`'s `{ data, error }` contract keeps page diffs to one line each;
`queryClient.ts`'s `invokeEdgeFunction`/`apiRequest`/`getQueryFn` are **all dead code with no
callers** and can be deleted regardless; `auth.ts:9-12` hand-parses Supabase's
`sb-<ref>-auth-token` localStorage key and would need rewriting; `next.config.mjs:99` CSP
hardcodes the Supabase URL and would silently break every form in production only.

---

## Housekeeping

- [x] ~~`README.md` said "React + Vite", referenced `client/.env` + `VITE_*` vars, port 5000,
      and Resend.~~ Rewritten 2026-08-15: correct stack, real env var names from
      `supabase/functions/.env`, accurate function list, `local_dashboard` documented, and
      linked to `docs/supabase-gotchas.md`.
- [ ] `client/.env` and `client/.env.example` are now dead (Vite-era, `VITE_*` names). Delete
      once confirmed nothing reads them.
- [ ] Verify `.env`, `.env.local`, `client/.env`, `local_dashboard/.env`,
      `supabase/functions/.env` are all gitignored.
- [ ] `next.config.mjs` `IndexNowPlugin` pings a hardcoded URL list on every prod build and
      is `webpack`-only — it will **not** run under `--turbopack` (which `npm run dev` uses).
- [ ] Apply for **AWS Activate** credits — DPIIT-recognised startups commonly get $5k–$100k.
      Takes time to land; worth starting now since Track B will run on AWS regardless.
