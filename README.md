# Muscle Box Pro

React + Vite frontend deployed on Vercel. Backend runs on Supabase (Auth, Postgres, Edge Functions). Email delivery via Resend.

## Setup

```bash
npm install
cp .env.example .env
cp client/.env.example client/.env
```

Set your Supabase project values in `client/.env`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Development

```bash
npm run dev
```

Opens at `http://localhost:5000`.

## Deploy

**Frontend** — push to Vercel. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env vars.

**Edge Functions** — deploy via Supabase CLI:

```bash
supabase functions deploy demo-request campaign-request contact-request health send-email
```

**Secrets** — set in Supabase:

```bash
supabase secrets set ENV_SUPABASE_URL=... ENV_SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... RESEND_API_KEY=... EMAIL_FROM="Muscle Box Pro <no-reply@muscleboxpro.com>"
```

**Database** — apply migrations:

```bash
supabase db push
```

## Project Structure

```
client/          React frontend (Vite)
shared/
  validation/    Zod schemas (shared between client + edge functions)
  email/         HTML email templates
lib/             Edge function utilities (Supabase client, Resend, env)
supabase/
  functions/     Supabase Edge Functions (Deno)
  migrations/    SQL migrations
```
