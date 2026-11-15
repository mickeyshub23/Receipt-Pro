-- Receipt Pro migration 003 (fixed): add device_id column to receipts
-- Run this in the Supabase SQL editor.

-- 1. Add device_id column (idempotent)
alter table receipts
add column if not exists device_id text;

-- 2. Index for fast device-scoped history queries (idempotent)
create index if not exists receipts_device_id_idx on receipts (device_id);