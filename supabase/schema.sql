-- ============================================================
-- aa2u — Architect studio website
-- Schema: multi-language (ID/EN) + custom admin panel
-- ============================================================
-- i18n convention: translatable fields use JSONB with shape
--   {"id": "Teks Indonesia", "en": "English text"}
-- Use the t(field, lang) helper to read with fallback to 'id'.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type project_status as enum ('draft', 'in_development', 'published');
create type build_status   as enum ('concept', 'design', 'construction', 'completed', 'unbuilt');
create type client_mode    as enum ('name', 'alias', 'private');

-- ============================================================
-- HELPERS
-- ============================================================
-- Extract translated text from an i18n JSONB column.
-- Falls back to 'id' if the requested language is missing.
create or replace function t(field jsonb, lang text default 'id')
returns text language sql immutable as $$
  select coalesce(field->>lang, field->>'id', '');
$$;

-- updated_at auto-touch
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- ============================================================
-- ADMIN AUTH
-- profiles extends auth.users with an is_admin flag.
-- The custom admin panel checks this to gate write access.
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  is_admin    bool not null default false,
  created_at  timestamptz not null default now()
);

-- Auto-create a profile row on every new auth.users insert.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Boolean helper: is the calling user an admin?
create or replace function is_admin() returns bool
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select is_admin from profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- CONTENT TABLES
-- ============================================================
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        jsonb not null,            -- i18n
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table projects (
  id                  uuid primary key default uuid_generate_v4(),
  slug                text not null unique,
  title               jsonb not null,    -- i18n
  year                int,
  location            jsonb,             -- i18n (place names sometimes differ)
  category_id         uuid references categories(id) on delete set null,
  status              project_status not null default 'draft',
  partners            text[] default '{}',
  description         jsonb,             -- i18n (long-form markdown)
  process_note        jsonb,             -- i18n
  services_performed  jsonb,             -- i18n: { "id": ["..."], "en": ["..."] }
  cover_image         text,
  sort_order          int  not null default 0,
  is_featured         bool not null default false,
  seo_title           jsonb,             -- i18n
  seo_description     jsonb,             -- i18n
  -- Dossier fact sheet (docs/design/api-contract.md)
  build_status        build_status,
  area_site_m2        numeric(10,1),
  area_built_m2       numeric(10,1),
  client_mode         client_mode not null default 'private',
  client_alias        jsonb,             -- i18n pseudonym, shown when mode = 'alias'
  client_name_public  text,              -- DERIVED (trigger): real name iff mode = 'name'
  team                text[] not null default '{}',
  photographer        text,
  hide_location       bool not null default false,
  lat                 double precision,  -- DERIVED (trigger): rounded to 2 dp, null when hidden
  lng                 double precision,  -- DERIVED (trigger)
  chapter_text        jsonb not null default '{}'::jsonb,
                                         -- shape: { "site": {"id":"…","en":"…"}, "concept": {…}, … }
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint projects_area_site_pos     check (area_site_m2  > 0),
  constraint projects_area_built_pos    check (area_built_m2 > 0),
  constraint projects_lat_range         check (lat between -90 and 90),
  constraint projects_lng_range         check (lng between -180 and 180),
  constraint projects_chapter_text_obj  check (jsonb_typeof(chapter_text) = 'object'),
  constraint projects_photographer_len  check (char_length(photographer) <= 200)
);
create index projects_status_idx   on projects(status);
create index projects_featured_idx on projects(is_featured) where is_featured = true;
create index projects_sort_idx     on projects(sort_order);

create table project_images (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  url         text not null,
  alt         jsonb,                     -- i18n
  caption     jsonb,                     -- i18n
  sort_order  int  not null default 0,
  chapter     text,                      -- null = 'built'
  layout      text not null default 'auto',
  width       int,                       -- intrinsic px (auto layout + CLS)
  height      int,
  focal_x     real,                      -- 0–1 object-position
  focal_y     real,
  created_at  timestamptz not null default now(),
  constraint project_images_chapter_allowed
    check (chapter in ('site', 'concept', 'plan', 'section', 'material', 'built')),
  constraint project_images_layout_allowed
    check (layout in ('auto', 'full', 'wide', 'inset', 'pair', 'tall')),
  constraint project_images_size_pos    check (width > 0 and height > 0),
  constraint project_images_focal_range check (focal_x between 0 and 1 and focal_y between 0 and 1)
);
create index project_images_project_idx on project_images(project_id, sort_order);

create table project_drawings (
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
create index project_drawings_project_idx on project_drawings(project_id, sort_order);

create table project_materials (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        jsonb not null,            -- i18n
  image       text,                      -- macro photo, square crop
  note        jsonb,                     -- i18n: origin / finish
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint project_materials_image_scheme check (image ~* '^(https?://|/)')
);
create index project_materials_project_idx on project_materials(project_id, sort_order);

-- Admin-only: exact coordinates and the real client name. The public
-- columns projects.lat / lng / client_name_public are derived from this
-- by trigger (see PRIVACY below), so the anon key never sees exact values.
create table project_private (
  project_id  uuid primary key references projects(id) on delete cascade,
  lat_exact   double precision,
  lng_exact   double precision,
  client_name text,                      -- public only when client_mode = 'name'
  updated_at  timestamptz not null default now(),
  constraint project_private_lat_range  check (lat_exact between -90 and 90),
  constraint project_private_lng_range  check (lng_exact between -180 and 180),
  constraint project_private_client_len check (char_length(client_name) <= 200)
);

create table team_members (
  id                uuid primary key default uuid_generate_v4(),
  name              text not null,       -- proper names don't translate
  role              jsonb not null,      -- i18n
  bio               jsonb,               -- i18n
  photo_url         text,
  social_linkedin   text,
  social_instagram  text,
  sort_order        int  not null default 0,
  is_active         bool not null default true,
  created_at        timestamptz not null default now()
);

create table studio_principles (
  id          uuid primary key default uuid_generate_v4(),
  title       jsonb not null,            -- i18n
  description jsonb,                     -- i18n
  sort_order  int  not null default 0
);

create table pages (
  id              uuid primary key default uuid_generate_v4(),
  slug            text not null unique,  -- 'about' | 'services' | 'contact'
  title           jsonb not null,        -- i18n
  sections        jsonb not null default '[]'::jsonb,
                                         -- shape: [{ "number": "001",
                                         --           "heading": {"id":"…","en":"…"},
                                         --           "body":    {"id":"…","en":"…"} }]
  seo_title       jsonb,
  seo_description jsonb,
  updated_at      timestamptz not null default now()
);

create table site_settings (
  id            int primary key default 1 check (id = 1),  -- singleton row
  studio_name   text not null,
  tagline       jsonb,                   -- i18n
  manifesto     jsonb,                   -- i18n
  contact_email text,
  contact_phone text,
  address       jsonb,                   -- i18n
  socials       jsonb not null default '{}'::jsonb,
                                         -- shape: { "instagram":"...", "linkedin":"...", ... }
  updated_at    timestamptz not null default now()
);

create table inquiries (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  email        text not null,
  phone        text,
  project_type text,
  message      text not null,
  locale       text default 'id',        -- which language the form was submitted in
  is_read      bool not null default false,
  created_at   timestamptz not null default now(),
  -- Mirror the caps enforced by server/api/inquiries.post.ts.
  constraint inquiries_name_len         check (char_length(name) <= 120),
  constraint inquiries_email_len        check (char_length(email) <= 254),
  constraint inquiries_phone_len        check (char_length(phone) <= 40),
  constraint inquiries_project_type_len check (char_length(project_type) <= 120),
  constraint inquiries_message_len      check (char_length(message) <= 5000),
  constraint inquiries_locale_allowed   check (locale in ('id', 'en'))
);

-- ============================================================
-- TRIGGERS
-- ============================================================
create trigger trg_projects_updated      before update on projects      for each row execute function set_updated_at();
create trigger trg_pages_updated         before update on pages         for each row execute function set_updated_at();
create trigger trg_site_settings_updated before update on site_settings for each row execute function set_updated_at();
create trigger trg_project_private_updated before update on project_private for each row execute function set_updated_at();

-- ============================================================
-- PRIVACY: derive public location / client columns
-- Whatever a writer sends for projects.lat / lng / client_name_public is
-- replaced by the value derived from project_private:
--   lat/lng            = round(exact, 2), or null when hide_location
--   client_name_public = real name only when client_mode = 'name'
-- security definer so the lookup works regardless of the caller's RLS.
-- ============================================================
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

create trigger trg_projects_sync_public
  before insert or update on projects
  for each row execute function projects_sync_public();

-- Touch the parent project so the trigger above re-derives.
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

-- ============================================================
-- ROW LEVEL SECURITY
-- Public can read published content; only admins can write.
-- ============================================================
alter table profiles          enable row level security;
alter table projects          enable row level security;
alter table project_images    enable row level security;
alter table project_drawings  enable row level security;
alter table project_materials enable row level security;
alter table project_private   enable row level security;
alter table categories        enable row level security;
alter table team_members      enable row level security;
alter table studio_principles enable row level security;
alter table pages             enable row level security;
alter table site_settings     enable row level security;
alter table inquiries         enable row level security;

-- ---------- profiles ----------
create policy "users_read_own_profile" on profiles
  for select using (auth.uid() = id or is_admin());
create policy "admins_update_profiles" on profiles
  for update using (is_admin());

-- ---------- projects ----------
create policy "public_read_published_projects" on projects
  for select using (status = 'published' or is_admin());
create policy "admins_write_projects" on projects
  for all using (is_admin()) with check (is_admin());

-- ---------- project_images ----------
create policy "public_read_project_images" on project_images
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = project_id and p.status = 'published'
    )
  );
create policy "admins_write_project_images" on project_images
  for all using (is_admin()) with check (is_admin());

-- ---------- project_drawings / project_materials (same as images) ----------
create policy "public_read_project_drawings" on project_drawings
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = project_id and p.status = 'published'
    )
  );
create policy "admins_write_project_drawings" on project_drawings
  for all using (is_admin()) with check (is_admin());

create policy "public_read_project_materials" on project_materials
  for select using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = project_id and p.status = 'published'
    )
  );
create policy "admins_write_project_materials" on project_materials
  for all using (is_admin()) with check (is_admin());

-- ---------- project_private ----------
-- Admins only; no public policy. The revoke is a second layer so anon has
-- no table privilege even if a policy is added by mistake later.
create policy "admins_all_project_private" on project_private
  for all using (is_admin()) with check (is_admin());
revoke all on table project_private from anon;

-- ---------- categories ----------
create policy "public_read_categories" on categories for select using (true);
create policy "admins_write_categories" on categories
  for all using (is_admin()) with check (is_admin());

-- ---------- team_members ----------
create policy "public_read_active_team" on team_members
  for select using (is_active = true or is_admin());
create policy "admins_write_team" on team_members
  for all using (is_admin()) with check (is_admin());

-- ---------- studio_principles ----------
create policy "public_read_principles" on studio_principles for select using (true);
create policy "admins_write_principles" on studio_principles
  for all using (is_admin()) with check (is_admin());

-- ---------- pages ----------
create policy "public_read_pages" on pages for select using (true);
create policy "admins_write_pages" on pages
  for all using (is_admin()) with check (is_admin());

-- ---------- site_settings ----------
create policy "public_read_site_settings" on site_settings for select using (true);
create policy "admins_write_site_settings" on site_settings
  for all using (is_admin()) with check (is_admin());

-- ---------- inquiries ----------
-- No public insert policy: the contact form posts to /api/inquiries,
-- which validates input and inserts with the service role (bypasses RLS).
create policy "admins_read_inquiries" on inquiries
  for select using (is_admin());
create policy "admins_update_inquiries" on inquiries
  for update using (is_admin()) with check (is_admin());
create policy "admins_delete_inquiries" on inquiries
  for delete using (is_admin());
