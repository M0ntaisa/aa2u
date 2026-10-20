-- ============================================================
-- 2026-10-20 — inquiries hardening
-- Safe to re-run on a database created from an older schema.sql.
-- ============================================================

begin;

-- Pin search_path on security definer functions so a caller can't
-- shadow `profiles` with an object in another schema.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create or replace function is_admin() returns bool
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- The contact form inserts via /api/inquiries with the service role.
-- A public insert policy let anyone with the anon key bypass validation.
drop policy if exists "anyone_insert_inquiries" on inquiries;

-- Without a delete policy, admin deletes silently affected 0 rows.
drop policy if exists "admins_delete_inquiries" on inquiries;
create policy "admins_delete_inquiries" on inquiries
  for delete using (is_admin());

-- Length caps mirroring server/api/inquiries.post.ts. `not valid` so
-- existing rows (if any exceed the caps) don't block the migration;
-- new inserts/updates are still checked. Run `validate constraint`
-- later once existing data is confirmed clean.
alter table inquiries drop constraint if exists inquiries_name_len;
alter table inquiries add  constraint inquiries_name_len
  check (char_length(name) <= 120) not valid;

alter table inquiries drop constraint if exists inquiries_email_len;
alter table inquiries add  constraint inquiries_email_len
  check (char_length(email) <= 254) not valid;

alter table inquiries drop constraint if exists inquiries_phone_len;
alter table inquiries add  constraint inquiries_phone_len
  check (char_length(phone) <= 40) not valid;

alter table inquiries drop constraint if exists inquiries_project_type_len;
alter table inquiries add  constraint inquiries_project_type_len
  check (char_length(project_type) <= 120) not valid;

alter table inquiries drop constraint if exists inquiries_message_len;
alter table inquiries add  constraint inquiries_message_len
  check (char_length(message) <= 5000) not valid;

alter table inquiries drop constraint if exists inquiries_locale_allowed;
alter table inquiries add  constraint inquiries_locale_allowed
  check (locale in ('id', 'en')) not valid;

commit;
