# Muscle Box Pro - Local Run Guide

Small guide to run frontend and backend locally.

## 1) Install dependencies

```bash
npm install
```

## 2) Setup environment

Create backend env at project root:

```bash
cp .env.example .env
```

Create frontend env inside `client`:

```bash
cp client/.env.example client/.env
```

### Recommended for split mode (frontend 5000, backend 5001)

- In `.env`:
  - `PORT=5001`
  - `FRONTEND_URL=http://localhost:5000`
  - optional: `FRONTEND_URLS=http://localhost:5002,http://127.0.0.1:5000` (if you test from multiple local origins)
- In `client/.env`:
  - `VITE_API_BASE_URL=http://localhost:5001`

### Custom email verification (required for signup)

Set these values in root `.env`:

- `SUPABASE_SERVICE_ROLE_KEY`
- `EMAIL_VERIFICATION_SECRET`
- `PASSWORD_RESET_SECRET`
- `BACKEND_PUBLIC_URL` (e.g. `http://localhost:5001`)
- SMTP settings:
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM`

Signup now sends a custom verification email from backend, and login is blocked until email verification is complete.
Forgot password now also uses custom backend email templates and token-based reset flow.
Gym demo requests now call backend and send a confirmation email to the requester with CC to `contact@muscleboxpro.com` (configurable via `DEMO_REQUEST_CC`).

## 3) Run app

Open 2 terminals.

Terminal 1 (backend):

```bash
npm run dev
```

Terminal 2 (frontend):

```bash
npm run dev:client
```

Now open: `http://localhost:5000`

## Optional: single-process mode on port 5000

If you want backend + frontend from one command (`npm run dev`), set:

- `.env` -> `PORT=5000`
- `client/.env` -> `VITE_API_BASE_URL=http://localhost:5000`

Then run:

```bash
npm run dev
```
