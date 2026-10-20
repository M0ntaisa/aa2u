-- ============================================================
-- 2026-10-20 — project dossier (roadmap #14, data for #13/#15)
-- Fact sheet columns, chapter text, image layout fields, drawings,
-- materials, and the privacy split for coordinates + client name.
-- Safe to re-run. See docs/design/api-contract.md for the shapes.
-- ============================================================
--
-- Privacy model (identity-dossier.md §8.4–8.5):
--   project_private (admin-only RLS) holds the exact coordinates and the
--   real client name. The public columns on `projects` (lat, lng,
--   client_name_public) are DERIVED by a trigger and can't be written
--   with anything more precise than the public rule allows:
--     lat/lng            = round(exact, 2), or null when hide_location
--     client_name_public = real name only when client_mode = 'name'
--   The anon key can therefore never read an exact coordinate or a
--   hidden name, whichever REST query it sends.
-- ============================================================

begin;

-- ---------- enums ----------
do $$ begin
  create type build_status as enum ('concept', 'design', 'construction', 'completed', 'unbuilt');
exception when duplicate_object then null; end $$;

do $$ begin
  create type client_mode as enum ('name', 'alias', 'private');
exception when duplicate_object then null; end $$;

-- ---------- projects: fact sheet + public (derived) privacy columns ----------
alter table projects
  add column if not exists build_status       build_status,
  add column if not exists area_site_m2       numeric(10,1),
  add column if not exists area_built_m2      numeric(10,1),
  add column if not exists client_mode        client_mode not null default 'private',
  add column if not exists client_alias       jsonb,            -- i18n pseudonym, shown when mode = 'alias'
  add column if not exists client_name_public text,             -- DERIVED (trigger): real name iff mode = 'name'
  add column if not exists team               text[] not null default '{}',
  add column if not exists photographer       text,
  add column if not exists hide_location      bool not null default false,
  add column if not exists lat                double precision, -- DERIVED (trigger): rounded to 2 dp, null when hidden
  add column if not exists lng                double precision, -- DERIVED (trigger)
  add column if not exists chapter_text       jsonb not null default '{}'::jsonb;
                                            -- shape: { "site": {"id":"…","en":"…"}, "concept": {…}, … }

alter table projects drop constraint if exists projects_area_site_pos;
alter table projects add  constraint projects_area_site_pos  check (area_site_m2  > 0);
alter table projects drop constraint if exists projects_area_built_pos;
alter table projects add  constraint projects_area_built_pos check (area_built_m2 > 0);
alter table projects drop constraint if exists projects_lat_range;
alter table projects add  constraint projects_lat_range check (lat between -90 and 90);
alter table projects drop constraint if exists projects_lng_range;
alter table projects add  constraint projects_lng_range check (lng between -180 and 180);
alter table projects drop constraint if exists projects_chapter_text_obj;
alter table projects add  constraint projects_chapter_text_obj check (jsonb_typeof(chapter_text) = 'object');
alter table projects drop constraint if exists projects_photographer_len;
alter table projects add  constraint projects_photographer_len check (char_length(photographer) <= 200);

-- ---------- project_images: chapter + layout + intrinsic size + focal point ----------
alter table project_images
  add column if not exists chapter text,
  add column if not exists layout  text not null default 'auto',
  add column if not exists width   int,
  add column if not exists height  int,
  add column if not exists focal_x real,
  add column if not exists focal_y real;

alter table project_images drop constraint if exists project_images_chapter_allowed;
alter table project_images add  constraint project_images_chapter_allowed
  check (chapter in ('site', 'concept', 'plan', 'section', 'material', 'built'));
alter table project_images drop constraint if exists project_images_layout_allowed;
alter table project_images add  constraint project_images_layout_allowed
  check (layout in ('auto', 'full', 'wide', 'inset', 'pair', 'tall'));
alter table project_images drop constraint if exists project_images_size_pos;
alter table project_images add  constraint project_images_size_pos check (width > 0 and height > 0);
alter table project_images drop constraint if exists project_images_focal_range;
alter table project_images add  constraint project_images_focal_range
  check (focal_x between 0 and 1 and focal_y between 0 and 1);

-- ---------- project_drawings ----------
create table if not exists project_drawings (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  url         text not null,
  kind        text not null,
  caption     jsonb,                     -- i18n
  alt         jsonb,                     -- i18n
  scale       text,                      -- "1:200", display only
  level       text,                      -- "+3.20" / "Level 1"
  invert      bool not null default false, -- true for black-on-white CAD exports
  chapter     text,                      -- null = default by kind (see contract)
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint project_drawings_kind_allowed
    check (kind in ('site_plan', 'plan', 'section', 'elevation', 'diagram', 'axonometric')),
  constraint project_drawings_chapter_allowed
    check (chapter in ('site', 'concept', 'plan', 'section', 'material', 'built')),
  -- Only http(s) or site-relative URLs; never javascript:/data:.
  constraint project_drawings_url_scheme check (url ~* '^(https?://|/)'),
  constraint project_drawings_scale_len  check (char_length(scale) <= 40),
  constraint project_drawings_level_len  check (char_length(level) <= 40)
);
create index if not exists project_drawings_project_idx on project_drawings(project_id, sort_order);

-- ---------- project_materials ----------
create table if not exists project_materials (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        jsonb not null,            -- i18n
  image       text,                      -- macro photo, square crop
  note        jsonb,                     -- i18n: origin / finish
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint project_materials_image_scheme check (image ~* '^(https?://|/)')
);
create index if not exists project_materials_project_idx on project_materials(project_id, sort_order);

-- ---------- project_private (admin-only) ----------
create table if not exists project_private (
  project_id  uuid primary key references projects(id) on delete cascade,
  lat_exact   double precision,
  lng_exact   double precision,
  client_name text,                      -- real client name; public only when client_mode = 'name'
  updated_at  timestamptz not null default now(),
  constraint project_private_lat_range check (lat_exact between -90 and 90),
  constraint project_private_lng_range check (lng_exact between -180 and 180),
  constraint project_private_client_len check (char_length(client_name) <= 200)
);

-- ---------- derive the public columns ----------
-- BEFORE trigger on projects: whatever the writer sent for lat / lng /
-- client_name_public is replaced by the value derived from
-- project_private. security definer so the lookup works for any writer
-- (RLS on project_private would otherwise hide the row).
create or replace function projects_sync_public()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  priv project_private%rowtype;
begin
  select * into priv from project_private where project_id = new.id;

  if new.hide_location or priv.lat_exact is null or priv.lng_exact is null then
    new.lat := null;
    new.lng := null;
  else
    new.lat := round(priv.lat_exact::numeric, 2)::double precision;
    new.lng := round(priv.lng_exact::numeric, 2)::double precision;
  end if;

  new.client_name_public := case
    when new.client_mode = 'name' then nullif(btrim(priv.client_name), '')
    else null
  end;
  return new;
end;
$$;

drop trigger if exists trg_projects_sync_public on projects;
create trigger trg_projects_sync_public
  before insert or update on projects
  for each row execute function projects_sync_public();

-- AFTER trigger on project_private: touch the parent so the BEFORE
-- trigger above re-derives the public columns.
create or replace function project_private_touch()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    update projects set updated_at = now() where id = old.project_id;
  else
    update projects set updated_at = now() where id = new.project_id;
    if tg_op = 'UPDATE' and old.project_id <> new.project_id then
      update projects set updated_at = now() where id = old.project_id;
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_project_private_updated on project_private;
create trigger trg_project_private_updated
  before update on project_private
  for each row execute function set_updated_at();

drop trigger if exists trg_project_private_touch on project_private;
create trigger trg_project_private_touch
  after insert or update or delete on project_private
  for each row execute function project_private_touch();

-- ============================================================
-- ADMIN SAVE: one transaction for projects + project_private
-- The admin form calls supabase.rpc('save_project', …). Writing both
-- tables in one call means a failure can't leave a half-saved project,
-- and the public columns are derived from the NEW private row (no window
-- where a stale hidden name is public). p_slug null = create.
-- Only whitelisted columns are written; derived columns are ignored.
-- ============================================================
create or replace function save_project(p_slug text, p_project jsonb, p_private jsonb)
returns projects language plpgsql security definer set search_path = public as $$
declare
  v_id  uuid;
  r     projects;
  saved projects;
begin
  if not is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(p_project) is distinct from 'object' then
    raise exception 'p_project must be an object' using errcode = '22023';
  end if;
  if jsonb_typeof(p_private) is distinct from 'object' then
    raise exception 'p_private must be an object' using errcode = '22023';
  end if;

  r := jsonb_populate_record(null::projects, p_project);

  if p_slug is null then
    -- Minimal insert (client_mode defaults to 'private'), filled below.
    insert into projects (slug, title)
    values (r.slug, coalesce(r.title, '{}'::jsonb))
    returning id into v_id;
  else
    select id into v_id from projects where slug = p_slug for update;
    if v_id is null then
      raise exception 'project % not found', p_slug using errcode = 'P0002';
    end if;
  end if;

  -- Private first; the touch trigger re-derives, and the update below
  -- derives again with the new mode. Nothing is visible until commit.
  insert into project_private (project_id, lat_exact, lng_exact, client_name)
  values (
    v_id,
    (p_private->>'lat_exact')::double precision,
    (p_private->>'lng_exact')::double precision,
    nullif(btrim(p_private->>'client_name'), '')
  )
  on conflict (project_id) do update set
    lat_exact   = excluded.lat_exact,
    lng_exact   = excluded.lng_exact,
    client_name = excluded.client_name;

  update projects set
    slug               = r.slug,
    title              = r.title,
    year               = r.year,
    location           = r.location,
    category_id        = r.category_id,
    status             = coalesce(r.status, 'draft'),
    partners           = coalesce(r.partners, '{}'),
    description        = r.description,
    process_note       = r.process_note,
    services_performed = r.services_performed,
    cover_image        = r.cover_image,
    sort_order         = coalesce(r.sort_order, 0),
    is_featured        = coalesce(r.is_featured, false),
    seo_title          = r.seo_title,
    seo_description    = r.seo_description,
    build_status       = r.build_status,
    area_site_m2       = r.area_site_m2,
    area_built_m2      = r.area_built_m2,
    client_mode        = coalesce(r.client_mode, 'private'),
    client_alias       = r.client_alias,
    team               = coalesce(r.team, '{}'),
    photographer       = r.photographer,
    hide_location      = coalesce(r.hide_location, false),
    chapter_text       = coalesce(r.chapter_text, '{}'::jsonb)
  where id = v_id
  returning * into saved;

  return saved;
end;
$$;

revoke all on function save_project(text, jsonb, jsonb) from public, anon;
grant execute on function save_project(text, jsonb, jsonb) to authenticated;

-- ---------- RLS ----------
alter table project_drawings  enable row level security;
alter table project_materials enable row level security;
alter table project_private   enable row level security;

-- drawings / materials: same rules as project_images.
drop policy if exists "public_read_project_drawings" on project_drawings;
create policy "public_read_project_drawings" on project_drawings
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = project_id and p.status = 'published'
    )
  );
drop policy if exists "admins_write_project_drawings" on project_drawings;
create policy "admins_write_project_drawings" on project_drawings
  for all using (is_admin()) with check (is_admin());

drop policy if exists "public_read_project_materials" on project_materials;
create policy "public_read_project_materials" on project_materials
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = project_id and p.status = 'published'
    )
  );
drop policy if exists "admins_write_project_materials" on project_materials;
create policy "admins_write_project_materials" on project_materials
  for all using (is_admin()) with check (is_admin());

-- private: admins only, no public policy at all. The revoke is a second
-- layer: anon has no table privilege even if a policy is added by mistake.
drop policy if exists "admins_all_project_private" on project_private;
create policy "admins_all_project_private" on project_private
  for all using (is_admin()) with check (is_admin());
revoke all on table project_private from anon;

-- Backfill on re-run: re-derive public columns wherever a private row
-- already exists (none on the first run).
update projects p set updated_at = p.updated_at
where exists (select 1 from project_private pp where pp.project_id = p.id);

-- ---------- storage: drawings bucket ----------
-- PNG / JPG / WebP / SVG up to 10 MB. Photos stay in project-images (5 MB,
-- no SVG). SVGs are only ever rendered through <img>, and the admin
-- upload rejects files containing <script>, on*= handlers or javascript:.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-drawings', 'project-drawings', true, 10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public_read_aa2u_buckets" on storage.objects;
create policy "public_read_aa2u_buckets" on storage.objects
  for select
  using (bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets'));

drop policy if exists "admins_write_aa2u_buckets_insert" on storage.objects;
create policy "admins_write_aa2u_buckets_insert" on storage.objects
  for insert
  with check (
    bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets')
    and is_admin()
  );

drop policy if exists "admins_write_aa2u_buckets_update" on storage.objects;
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

drop policy if exists "admins_write_aa2u_buckets_delete" on storage.objects;
create policy "admins_write_aa2u_buckets_delete" on storage.objects
  for delete
  using (
    bucket_id in ('project-images', 'project-drawings', 'team-photos', 'site-assets')
    and is_admin()
  );

commit;
