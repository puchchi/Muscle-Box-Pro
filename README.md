# Muscle Box Pro

Next.js 15 (App Router) frontend deployed on Vercel. Backend runs on Supabase (Auth, Postgres,
Edge Functions). Transactional email via SMTP + nodemailer.

> **Read [docs/supabase-gotchas.md](docs/supabase-gotchas.md) before creating any table or
> touching auth.** Supabase's defaults are permissive and implicit — RLS is off by default for
> tables created via SQL migrations, and `user_metadata` is writable by the user. Both have
> already caused real problems here. Open work is tracked in [.claude/TODO.md](.claude/TODO.md).

## Setup

```bash
npm install
cp .env.example .env.local
```

Set your Supabase project values in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-key
```

Both are public by design — they ship in the client bundle. They are identifiers, not
credentials; see gotchas §3.

## Development

```bash
npm run dev          # http://localhost:3000  (Next + turbopack)
npm test             # vitest
npm run check        # tsc
```

## Deploy

**Frontend** — push to Vercel. Set `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel env vars.

Note: `next.config.mjs` sets a strict CSP whose `connect-src` hardcodes the Supabase project
URL. If the project ref changes, update it or **every form fails silently in production only**
(`next dev` does not apply these headers the same way).

**Edge Functions** — deploy via Supabase CLI:

```bash
supabase functions deploy demo-request campaign-request contact-request investor-request \
  auth-signup verify-email resend-verification forgot-password health
```

`send-email` also exists but is unused and slated for deletion — see TODO A3.

**Secrets** — set in Supabase. The `SUPABASE_` prefix is reserved by the platform, which is why
the service-role vars carry an `ENV_` prefix (gotchas §8):

```bash
supabase secrets set \
  ENV_SUPABASE_URL=... ENV_SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
  SMTP_HOST=... SMTP_PORT=465 SMTP_SECURE=true SMTP_USER=... SMTP_PASS=... \
  SMTP_FROM="Muscle Box Pro <no-reply@muscleboxpro.com>" \
  EMAIL_VERIFICATION_SECRET=... EMAIL_VERIFICATION_TTL_MINUTES=60 \
  EMAIL_VERIFICATION_URL_BASE=... FRONTEND_URL=... PASSWORD_RESET_REDIRECT_URL=...
```

See `supabase/functions/.env` for the full list, including the `*_REQUEST_CC` and IMAP vars used
by the local dashboard.

**Database** — apply migrations:

```bash
supabase db push
```

## Project Structure

```
app/                 Next.js App Router — route shells: metadata + JSON-LD only
client/src/
  pages/             the actual page components, rendered by app/*/page.tsx
  components/ui/     shadcn/ui + Radix
  lib/               supabase client, auth helpers, query client
shared/
  validation/        Zod schemas (shared between client + edge functions)
  email/             HTML email templates
lib/                 Edge function utilities (Supabase admin client, SMTP, env)
supabase/
  functions/         Supabase Edge Functions (Deno — not Node, see gotchas §10)
  migrations/        SQL migrations
local_dashboard/     Standalone Express app (on-prem): IMAP inbox tool + PhonePe bridge
docs/                Engineering notes
```

The `app/` ↔ `client/src/pages/` split is a leftover of a Vite→Next migration. `@` aliases to
`client/src`, `@shared` to `shared/` (configured in `next.config.mjs`).

## Setup Supabase CLI

```bash
supabase login
supabase link --project-ref esyfzbcoufjcnakloahc
supabase functions deploy
supabase db push
```

## Local dashboard

Separate CommonJS Express app, not part of the Next build:

```bash
cd local_dashboard && npm install && npm start   # http://localhost:4000
```

Provides an IMAP inbox/reply tool, a Supabase stats view, and the PhonePe payment bridge for
vending machines (`/order/*`), exposed via ngrok. The payment bridge is being rebuilt on AWS —
code and design now live in a separate repo, `mbp-backend`
(`~/github/mbp-backend` — see `docs/payment-api-design.md` there). Tasks in
[.claude/TODO.md](.claude/TODO.md) Track B.

> The `/order/*` routes verify the vendor's `key` / `key-md5` / `timestamp` headers
> (`lib/gsAuth.js`), but **`GS_AUTH_MODE` defaults to `observe` — failures are logged, not
> rejected**, until one real machine request confirms the digest construction. Set `GS_API_KEY` and
> `GS_API_SECRET` in `local_dashboard/.env`, then `GS_AUTH_MODE=enforce`. The refund endpoint is
> still a stub that refunds nothing. Do not point a production machine at this. See TODO A4.
