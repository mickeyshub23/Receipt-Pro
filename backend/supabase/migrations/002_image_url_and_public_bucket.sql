-- Receipt Pro migration 002: add image_url column + public "receipts" bucket
-- Run this in the Supabase SQL editor.

-- 1. Add image_url column to receipts table
alter table receipts
add column if not exists image_url text;

-- 2. Make "receipts" bucket public (idempotent)
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', true)
on conflict (id) do update set public = true;

-- 3. Storage RLS policies for public "receipts" bucket
-- Anyone can READ (public bucket)
create policy if not exists "receipts public read" on storage.objects
  for select using (bucket_id = 'receipts');

-- Authenticated users can UPLOAD to their own folder: {user_id}/
create policy if not exists "receipts insert own" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can UPDATE their own files
create policy if not exists "receipts update own" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can DELETE their own files
create policy if not exists "receipts delete own" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );