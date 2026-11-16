-- Receipt Pro migration 005: add paid_at column to receipts
-- Run this in the Supabase SQL editor.

alter table receipts
add column if not exists paid_at timestamptz;

create index if not exists receipts_paid_at_idx on receipts (paid_at);
