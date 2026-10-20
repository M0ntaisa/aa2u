-- ============================================================
-- aa2u — Supabase Storage setup
-- Run this AFTER schema.sql, AFTER creating the three buckets:
--   project-images   (public)
--   team-photos      (public)
--   site-assets      (public)
--
-- Create them via dashboard or CLI. When creating, set:
--   - Public bucket: true
--   - File size limit: 5 MB (5242880 bytes)
--   - Allowed MIME types: image/jpeg, image/png, image/webp
--
-- The fourth bucket, project-drawings (plans/sections: PNG, JPG, WebP,
-- SVG up to 10 MB), is created by the insert below. SVGs are only ever
-- rendered through <img>, and the admin upload rejects SVGs containing
-- <script>, on*= handlers or javascript: URLs.
--
-- These bucket-level limits are the FIRST line of defense.
-- The policies below enforce row-level access on top of that.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-drawings', 'project-drawings', true, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read access for all four asset buckets so the live site
-- can render images without authentication.
create policy "public_read_aa2u_buckets" on storage.objects
  for select
  using (bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets'));

-- Only admins can upload / replace / delete. is_admin() is defined
-- in schema.sql and reads profiles.is_admin for the calling auth.uid().
create policy "admins_write_aa2u_buckets_insert" on storage.objects
  for insert
  with check (
    bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets')
    and is_admin()
  );

create policy "admins_write_aa2u_buckets_update" on storage.objects
  for update
  using (
    bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets')
    and is_admin()
  )
  with check (
    bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets')
    and is_admin()
  );

create policy "admins_write_aa2u_buckets_delete" on storage.objects
  for delete
  using (
    bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets')
    and is_admin()
  );
