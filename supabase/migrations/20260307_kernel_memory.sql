-- GodLocal OS Memory Layer
-- Run in Supabase SQL Editor

-- Messages table
create table if not exists kernel_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  text not null,
  agent       text not null default 'godlocal',
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_kernel_messages_session
  on kernel_messages (session_id, created_at desc);

-- Sessions context table
create table if not exists kernel_sessions (
  session_id  text primary key,
  summary     text,
  last_agent  text,
  turn_count  integer default 0,
  updated_at  timestamptz not null default now()
);

-- RLS: allow anon read/write (adjust for production auth)
alter table kernel_messages enable row level security;
alter table kernel_sessions  enable row level security;

create policy "allow_all_messages" on kernel_messages for all using (true) with check (true);
create policy "allow_all_sessions" on kernel_sessions  for all using (true) with check (true);
