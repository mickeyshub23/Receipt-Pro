-- Receipt Pro migration 006: add device_id column to payments
-- Run this in the Supabase SQL editor.

alter table payments
add column if not exists device_id text;

create index if not exists payments_device_id_idx on payments (device_id);
