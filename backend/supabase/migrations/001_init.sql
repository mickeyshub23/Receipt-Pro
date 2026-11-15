-- Receipt Pro initial schema
-- Run this in the Supabase SQL editor.

-- enable extensions
create extension if not exists pgcrypto;

-- tables
create table receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  style text not null check (style in ('business','invoice')),
  theme text not null,
  fingerprint text not null,
  slug text unique not null,
  store_name text not null,
  total numeric not null default 0,
  currency text not null,
  payload jsonb not null default '{}',
  image_path text,
  image_url text,
  status text not null default 'pending' check (status in ('pending','paid')),
  created_at timestamptz not null default now(),
  unique (user_id, fingerprint)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  receipt_id uuid references receipts(id) on delete cascade not null,
  reference text unique not null,
  amount_kobo integer not null,
  currency text not null,
  status text not null default 'pending' check (status in ('pending','success','failed','expired')),
  expires_at timestamptz not null,
  verified_at timestamptz,
  raw jsonb,
  created_at timestamptz not null default now()
);

create index idx_receipts_user_status on receipts(user_id, status);
create index idx_receipts_fingerprint on receipts(fingerprint);
create index idx_payments_receipt on payments(receipt_id);
create index idx_payments_reference on payments(reference);
create index idx_receipts_created_at on receipts(created_at desc);

-- enable RLS
alter table receipts enable row level security;
alter table payments enable row level security;

-- RLS policies: users only see their own rows
create policy receipts_select_own on receipts
  for select using (auth.uid() = user_id);

create policy payments_select_own on payments
  for select using (auth.uid() = user_id);

-- All writes are done by backend service-role key, so no INSERT/UPDATE policies needed for public.
-- (Service role bypasses RLS.)

-- storage bucket
insert into storage.buckets (id, name, public)
values ('receipt-images', 'receipt-images', false)
on conflict (id) do nothing;

-- storage RLS: user can read/write only inside their own {user_id}/ folder
create policy storage_select_own on storage.objects
  for select using (
    bucket_id = 'receipt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_insert_own on storage.objects
  for insert with check (
    bucket_id = 'receipt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_update_own on storage.objects
  for update using (
    bucket_id = 'receipt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy storage_delete_own on storage.objects
  for delete using (
    bucket_id = 'receipt-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );