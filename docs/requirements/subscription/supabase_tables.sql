-- Supabase DDL (案5 + BAN列)

-- 1) user_profiles
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text,
  subscription_id text,
  plan text check (plan in ('blue','green','gold')),
  status text check (status in ('active','incomplete','past_due','canceled')),
  current_period_end timestamptz,
  cancel_at timestamptz,
  banned boolean not null default false,
  ban_reason text,
  ban_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.user_profiles (customer_id);
create index on public.user_profiles (subscription_id);

-- 2) usage_counts
create table public.usage_counts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_answers int not null default 0,
  free_answers_used int not null default 0,
  last_answer_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) checkout_sessions
create table public.checkout_sessions (
  session_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text check (plan in ('blue','green','gold')),
  status text check (status in ('open','complete','expired')),
  created_at timestamptz not null default now()
);
create index on public.checkout_sessions (user_id);
create index on public.checkout_sessions (status);

-- 4) webhook_events
create table public.webhook_events (
  id bigserial primary key,
  event_id text not null unique,
  type text not null,
  payload jsonb not null,
  signature_verified boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.webhook_events (type);
