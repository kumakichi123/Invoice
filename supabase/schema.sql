create extension if not exists pgcrypto;

create table if not exists public.invoice_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_file_name text,
  vendor text not null default '',
  vendor_registration_number text,
  invoice_number text not null default '',
  issue_date date,
  issue_time text,
  due_date date,
  currency text not null default 'JPY',
  subtotal numeric,
  tax_amount numeric,
  total numeric,
  total_amount_tax_inc numeric,
  tax10_target_amount numeric,
  tax10_amount numeric,
  tax8_target_amount numeric,
  tax8_amount numeric,
  payment_method text,
  document_type text,
  notes text,
  raw_json jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.feedback_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  needs_reply boolean not null default false,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  stripe_subscription_status text,
  stripe_base_price_id text,
  stripe_usage_subscription_item_id text,
  early_bird_applied boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.billing_customers add column if not exists stripe_customer_id text;
alter table public.billing_customers add column if not exists stripe_subscription_id text;
alter table public.billing_customers add column if not exists stripe_subscription_status text;
alter table public.billing_customers add column if not exists stripe_base_price_id text;
alter table public.billing_customers add column if not exists stripe_usage_subscription_item_id text;
alter table public.billing_customers add column if not exists early_bird_applied boolean not null default false;
alter table public.billing_customers add column if not exists created_at timestamp with time zone not null default now();
alter table public.billing_customers add column if not exists updated_at timestamp with time zone not null default now();

create unique index if not exists billing_customers_stripe_customer_id_idx
  on public.billing_customers (stripe_customer_id)
  where stripe_customer_id is not null;

alter table public.invoice_exports add column if not exists vendor_registration_number text;
alter table public.invoice_exports add column if not exists issue_time text;
alter table public.invoice_exports add column if not exists total_amount_tax_inc numeric;
alter table public.invoice_exports add column if not exists tax10_target_amount numeric;
alter table public.invoice_exports add column if not exists tax10_amount numeric;
alter table public.invoice_exports add column if not exists tax8_target_amount numeric;
alter table public.invoice_exports add column if not exists tax8_amount numeric;
alter table public.invoice_exports add column if not exists payment_method text;
alter table public.invoice_exports add column if not exists document_type text;
alter table public.invoice_exports add column if not exists notes text;

alter table public.invoice_exports enable row level security;
alter table public.feedback_messages enable row level security;
alter table public.billing_customers enable row level security;

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

drop policy if exists "Users can delete own invoice exports" on public.invoice_exports;
create policy "Users can delete own invoice exports"
  on public.invoice_exports
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can update own invoice exports" on public.invoice_exports;
create policy "Users can update own invoice exports"
  on public.invoice_exports
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can insert own feedback messages" on public.feedback_messages;
create policy "Users can insert own feedback messages"
  on public.feedback_messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own feedback messages" on public.feedback_messages;
create policy "Users can view own feedback messages"
  on public.feedback_messages
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can view own billing profile" on public.billing_customers;
create policy "Users can view own billing profile"
  on public.billing_customers
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own billing profile" on public.billing_customers;
create policy "Users can insert own billing profile"
  on public.billing_customers
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own billing profile" on public.billing_customers;
create policy "Users can update own billing profile"
  on public.billing_customers
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
