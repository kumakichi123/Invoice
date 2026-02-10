create extension if not exists pgcrypto;

create table if not exists public.invoice_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_file_name text,
  vendor text not null default '',
  invoice_number text not null default '',
  issue_date date,
  due_date date,
  currency text not null default 'JPY',
  subtotal numeric,
  tax_amount numeric,
  total numeric,
  raw_json jsonb,
  created_at timestamp with time zone not null default now()
);

alter table public.invoice_exports enable row level security;

drop policy if exists "Users can view own invoice exports" on public.invoice_exports;
create policy "Users can view own invoice exports"
  on public.invoice_exports
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own invoice exports" on public.invoice_exports;
create policy "Users can insert own invoice exports"
  on public.invoice_exports
  for insert
  with check (auth.uid() = user_id);
