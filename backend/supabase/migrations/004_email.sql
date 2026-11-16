-- Receipt Pro migration 004: add email column to payments and receipts tables
-- Run this in the Supabase SQL editor.

alter table payments
add column if not exists email text;

alter table receipts
add column if not exists email text;

-- Index for fast lookups by email (optional, helps if you ever query by email)
create index if not exists payments_email_idx on payments (email);
create index if not exists receipts_email_idx on receipts (email);