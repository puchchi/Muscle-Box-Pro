# Supabase Gotchas

Supabase's defaults are **implicit and permissive**. Nothing in this repo's code makes them
visible, which is how we shipped a live PII leak (see the case study at the bottom). This file
records every non-obvious behaviour we've hit or verified, so the next person doesn't rediscover
them the hard way.

Read the checklist at the end before adding any table.

---

## 1. RLS is OFF by default for tables created via SQL migrations

This is the big one.

| How you create a table | RLS state |
|---|---|
| Dashboard → Table Editor | **enabled** by default |
| `create table` in a SQL migration / SQL editor | **disabled** |

Every table in `supabase/migrations/` was created by raw SQL. None of them enabled RLS. The
repo contains **zero** `enable row level security`, `create policy`, or `grant` statements.

`supabase db push` will never fix this for you. Migrations must say it explicitly:

```sql
create table public.foo (...);
alter table public.foo enable row level security;   -- ← never omit this
```

## 2. Every public-schema table is an internet-facing REST API the moment it exists

Supabase auto-exposes the `public` schema through PostgREST at
`https://<ref>.supabase.co/rest/v1/<table>`, and default grants give the `anon` and
`authenticated` roles privileges on it.

Creating a table is publishing an API. RLS is the *only* thing standing in front of it. And
because default grants are broad, if reads are open then `INSERT` / `UPDATE` / `DELETE` almost
certainly are too — an exposed table isn't just readable, it's deletable.

If a table should never be client-reachable, either enable RLS with no policies, or move it out
of `public` into a schema that isn't exposed.

## 3. The anon / publishable key is not a secret

`NEXT_PUBLIC_SUPABASE_ANON_KEY` (currently an `sb_publishable_…` key) ships inside the
JavaScript bundle. Anyone can read it in about ten seconds via devtools.

It is an **identifier, not a credential**. It authorises nothing and protects nothing. Supabase
*designs* it to be public and expects RLS to do the actual work. Treating it as a secret is the
single most common Supabase security mistake.

## 4. RLS-with-no-policies returns `200` and an empty array — not an error

This is a nasty diagnostic trap. These two states are **indistinguishable** over the REST API:

- table is empty
- table is RLS-protected and you have no matching policy

Both give `HTTP 200` with `[]`. So "I queried it and got nothing back" is **not** evidence that
a table is secured.

The only reliable check is to ask Postgres directly:

```sql
select relname, relrowsecurity
from pg_class
where relnamespace = 'public'::regnamespace and relkind = 'r';
```

## 5. `service_role` bypasses RLS completely

`service_role` ignores every policy. It is effectively `postgres`. Consequences:

- It must **never** reach a browser, a client bundle, or a public repo.
- Because it bypasses RLS, enabling RLS **cannot break server-side code that uses it**. That's
  why the fix in the case study below was zero-risk: all writers use `service_role`
  (`supabase/functions/_shared/supabase.ts`, `local_dashboard/server.js:213`).
- It can't be scoped down. There is no "read-only service key". Rotating it means redeploying
  everything that holds it.

It currently lives in plaintext in `local_dashboard/.env` on a laptop. Anyone with that file
owns the database.

## 6. `user_metadata` is writable by the user; `app_metadata` is not

```js
supabase.auth.updateUser({ data: { anything: "at all" } })  // ← user's own token, succeeds
```

`user_metadata` (a.k.a. `raw_user_meta_data`) is **user-controlled by design**. Never store
anything trust-sensitive there.

This repo violates that: `client/src/pages/Account.tsx:107-117` reads `wallet_balance`,
`monthly_shakes`, `favorite_blend`, and a `transactions[]` array out of `user_metadata`. A user
can grant themselves money from the browser console. `updateUser` is already imported and used
at `client/src/pages/ForgotPassword.tsx:59`, so the capability is live, not theoretical.

Rules of thumb:
- `user_metadata` → display preferences the user is allowed to lie about
- `app_metadata` → server-set claims (roles, tiers). Not user-writable.
- Real business state (balances, ledgers, transactions) → **a table with RLS**

Also note metadata only refreshes on token refresh, so it's stale-by-default — wrong for
anything that changes.

## 7. "JWT verification" on Edge Functions is not authentication

Edge Functions verify a JWT by default, but **the public anon key satisfies that check**. So
"verify_jwt is on" does not mean "only logged-in users can call this". Anyone with the key —
i.e. anyone — can invoke your functions.

If a function must be restricted to real users, inspect the token's `sub` / role inside the
handler. Don't assume the gateway did it.

Consequence in this repo: `supabase/functions/send-email/index.ts` only checks that an
`authorization` header *exists*, then sends arbitrary `html` to an arbitrary `to`. That's an
open spam relay under our sending domain.

## 8. The `SUPABASE_` env prefix is reserved

Supabase auto-injects `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and
`SUPABASE_DB_URL` into every Edge Function, and **refuses to let you set secrets with that
prefix**.

That's why this repo uses the otherwise-baffling `ENV_SUPABASE_URL` and
`ENV_SUPABASE_SERVICE_ROLE_KEY` (see `supabase/functions/_shared/supabase.ts`). It isn't a
naming quirk — it's a workaround. Don't "tidy" it.

## 9. CORS is entirely your problem

There's no gateway-level CORS config. Every function must emit the headers itself and handle
`OPTIONS` — hence `supabase/functions/_shared/cors.ts`, which currently uses
`Access-Control-Allow-Origin: *`.

Worth knowing: CORS is **not** a security control. It constrains browsers only; `curl` ignores
it. `*` here mainly means any website can invoke our functions.

## 10. Edge Functions are Deno, not Node

Not portable without edits:

- `Deno.env.get()` instead of `process.env` (`lib/env.ts`)
- `npm:` import specifiers (`npm:@supabase/supabase-js@2.98.0`)
- `.ts` extensions required on relative imports (`../../../emailTemplate.ts`)

All three break under esbuild/Node bundling. Budget for it if functions ever move.

## 11. Dashboard changes don't land in migrations

Anything created or altered through the dashboard is invisible to `supabase/migrations/`. The
schema in `main` is not a reliable description of production.

Treat the dashboard as read-only for schema. If you must use it, write the equivalent migration
immediately.

## 12. Two parallel email systems

Supabase Auth sends its own templated emails (confirmation, recovery). This repo mostly bypasses
that: `supabase/functions/_shared/verificationEmail.ts` mints custom `jose` HS256 tokens and
sends via our own SMTP. But `forgot-password` *does* use Supabase's
`admin.generateLink({ type: "recovery" })` and then mails the link itself.

So there are two flows with different token lifetimes and different failure modes. Know which
one you're debugging.

---

## Checklist: adding a new table

- [ ] `alter table public.<name> enable row level security;` in the **same migration**
- [ ] Either write explicit policies, or confirm no client access is intended (RLS + no
      policies = server-only via `service_role`)
- [ ] Verify with the `pg_class` query in §4 — not by querying the REST endpoint (§4 explains why)
- [ ] If it holds money, balances, or ledgers: it goes in a table, not in `user_metadata` (§6)
- [ ] Confirm nothing needed to change in the browser — `client/src` should contain no
      `.from()` calls at all

## Verifying exposure from outside

Read-only, and returns a **count only** — no PII in your terminal or logs:

```bash
KEY=$(grep -hoE "NEXT_PUBLIC_SUPABASE_ANON_KEY=.*" .env | head -1 | cut -d= -f2-)
URL="https://esyfzbcoufjcnakloahc.supabase.co"
for t in demo_requests campaign_requests investor_requests; do
  printf "\n== %s ==\n" "$t"
  curl -s -o /dev/null -D - -X HEAD "$URL/rest/v1/$t?select=id" \
    -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
    -H "Range: 0-0" -H "Prefer: count=exact" \
    | grep -iE "^HTTP/|^content-range:"
done
```

`content-range: */0` is **ambiguous** (§4). A non-zero count is definitive exposure.

---

## Case study — `investor_requests`, 2026-08-15

Probed anonymously with the public publishable key:

```
demo_requests       200  count 0      ← ambiguous (empty OR RLS-protected)
campaign_requests   200  count 0      ← ambiguous
investor_requests   200  count 19     ← EXPOSED, 19 records
```

19 investor records — `name`, `email`, `firm`, `investor_type`, `message` — readable by anyone
on the internet. Commercially sensitive as well as PII.

**Cause:** §1 + §2 + §3 compounding. `investor_requests` was created by raw SQL migration
(`20260419000000_create_investor_requests.sql`), so RLS defaulted to off; the table was
therefore auto-published via PostgREST; and the key needed to read it ships in our JS bundle.

Notably `demo_requests` and `campaign_requests` came from an earlier migration and returned
count 0, so they may well be protected — meaning this was a *regression* introduced by the
April migration, and nothing in CI or review caught it. That's the real lesson: there is no
guardrail here except this document and the checklist above.

**Fix:** `alter table public.investor_requests enable row level security;` — zero risk to the
app, because all writers use `service_role` (§5).

Tracked in `.claude/TODO.md` → Track A1.
