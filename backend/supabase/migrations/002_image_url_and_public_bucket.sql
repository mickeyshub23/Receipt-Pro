-- Receipt Pro migration 002 (fixed): add image_url column + public "receipts" bucket
-- Run this in the Supabase SQL editor.

-- 1. Add image_url column to receipts table (idempotent)
alter table receipts
add column if not exists image_url text;

-- 2. Make "receipts" bucket public (idempotent)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;

-- 3. Storage RLS policies for public "receipts" bucket (idempotent via DO blocks)
do $$
begin
  if not exists (select 1 from pg_policy where polname = 'receipts public read') then
    create policy "receipts public read" on storage.objects
      for select using (bucket_id = 'receipts');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'receipts insert own') then
    create policy "receipts insert own" on storage.objects
      for insert with check (
        bucket_id = 'receipts'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'receipts update own') then
    create policy "receipts update own" on storage.objects
      for update using (
        bucket_id = 'receipts'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policy where polname = 'receipts delete own') then
    create policy "receipts delete own" on storage.objects
      for delete using (
        bucket_id = 'receipts'
        and auth.role() = 'authenticated'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;
end $$;