create table if not exists investor_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  firm text,
  investor_type text,
  message text,
  created_at timestamptz not null default now()
);
