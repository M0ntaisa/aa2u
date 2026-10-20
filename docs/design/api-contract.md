# API contract: project dossier (roadmap #14, data for #13 / #15)

Status: implemented (be). Source of truth for types: `types/content.ts`.
Mapper: `utils/project-mapper.ts` (`mapProjectRow`), used by `useProject`, `useProjects` and `data/projects.ts`.
Migration: `supabase/migrations/2026-10-20_project_dossier.sql` (also folded into `schema.sql` / `storage.sql`).

This document overrides `identity-dossier.md` §5.1 where they differ (see "Changes vs §5").

---

## 1. Public `Project` (what pages and components consume)

All new fields are optional. A project with none of them (dummy: `kafe-bandung`) must render the fallback layout from §3.7.

```ts
type BuildStatus = 'concept' | 'design' | 'construction' | 'completed' | 'unbuilt'
type Chapter     = 'site' | 'concept' | 'plan' | 'section' | 'material' | 'built'
type ImageLayout = 'auto' | 'full' | 'wide' | 'inset' | 'pair' | 'tall'
type DrawingKind = 'site_plan' | 'plan' | 'section' | 'elevation' | 'diagram' | 'axonometric'

interface Project {
  // existing fields: unchanged
  slug, title, year?, location?, category?, status, partners?, description?,
  process_note?, services_performed?, cover_image, is_featured?, sort_order, images?

  build_status?: BuildStatus            // public "Status". `status` stays the CMS publish state
  area_site_m2?: number                 // > 0, one decimal at most
  area_built_m2?: number
  client_label?: I18nField              // ALREADY RESOLVED, see §1.2
  team?: string[]                       // absent when empty
  photographer?: string
  lat?: number                          // WGS84, ALREADY rounded to 2 dp (~1.1 km)
  lng?: number                          // both absent when the location is hidden or unknown
  chapter_text?: Partial<Record<Chapter, I18nField>>   // only chapters with text
  drawings?: ProjectDrawing[]           // sorted by sort_order
  materials?: ProjectMaterial[]         // sorted by sort_order
}

interface ProjectImage {
  url: string
  alt?: I18nField
  caption?: I18nField
  chapter?: Chapter       // always set by the mapper; default 'built'
  layout?: ImageLayout    // always set by the mapper; default 'auto'
  width?: number          // intrinsic px; may be missing on older uploads
  height?: number
  focal_x?: number        // 0–1; treat missing as .5
  focal_y?: number
}

interface ProjectDrawing {
  url: string             // PNG/JPG/WebP/SVG. Render with <img> ONLY (never inline SVG)
  kind: DrawingKind
  caption?: I18nField
  alt?: I18nField
  scale?: string          // "1:200", display only
  level?: string          // "Level 1" / "+3.20"
  invert?: boolean        // always set (false default). true: filter invert(1) hue-rotate(180deg) + mix-blend-mode screen
  chapter?: Chapter       // always set by the mapper: admin override, else by kind (below)
  sort_order: number
}

interface ProjectMaterial {
  name: I18nField         // never empty (mapper drops nameless rows)
  image?: string          // square macro photo
  note?: I18nField
  sort_order: number
}
```

### 1.1 Rules the mapper already applies (do not re-implement)
- Coordinates are rounded to 2 decimals and removed when `hide_location` is on. Format them with the rounded value as-is (DMS, map plotting, OSM link, JSON-LD). Missing `lat`/`lng` means "Not mapped".
- `chapter` on drawings defaults by kind: `plan`/`site_plan` → `plan`, `section`/`elevation` → `section`, `diagram`/`axonometric` → `concept`.
- `area_*` are converted from Postgres `numeric` to `number`; zero/invalid values are dropped.
- `team`, `photographer`, `chapter_text` are omitted when empty, so "no data → no row" holds.

### 1.2 `client_label`
| `client_mode` (admin) | `client_label` |
|---|---|
| `private` (default) | `{ id: 'Klien pribadi', en: 'Private client' }` |
| `alias` | the alias the admin typed (I18n; EN falls back to ID) |
| `name` | the real name, same in both locales |
| not set (dummy fallback project only) | absent |

The frontend never sees the mode, the alias source or the real name separately.

### 1.3 List vs detail
- `useProject(slug)` returns everything above.
- `useProjects()` (lists: home, /work index/atlas/map) returns all scalar fields **including `lat`, `lng`, `build_status`, `area_*`, `client_label`** and `images`, but **not** `chapter_text`, `drawings` or `materials` (they are `undefined` there). Don't use those three in list views. Placeholder mode happens to return them; don't rely on it.

---

## 2. Privacy (identity-dossier §8.4–8.5)

Requirement: the exact coordinates and a hidden client name must not be readable with the anon key, which can call the REST API directly. Rounding in the client or in a Nuxt mapper is not enough.

### Design
```
projects (public RLS: published rows)          project_private (RLS: is_admin() only; anon has no grant)
  hide_location   bool  default false            project_id   pk → projects(id) on delete cascade
  client_mode     enum  default 'private'        lat_exact    double precision
  client_alias    jsonb (i18n)                   lng_exact    double precision
  lat, lng        DERIVED                        client_name  text
  client_name_public  DERIVED
```
- `trg_projects_sync_public` (BEFORE INSERT/UPDATE on `projects`, `security definer`) overwrites the derived columns on every write:
  - `lat/lng = round(exact, 2)`, or `null` when `hide_location` is on or no exact value exists;
  - `client_name_public = client_name` only when `client_mode = 'name'`, otherwise `null`.
  Whatever a writer sends for those three columns is discarded, so even an admin mistake (or a future code path) can't put an exact value in a public column.
- `trg_project_private_touch` (AFTER INSERT/UPDATE/DELETE on `project_private`) touches the parent row, which re-runs the derivation.
- `revoke all on project_private from anon` is a second layer on top of RLS.

Why this instead of a view or column grants: PostgREST exposes tables as-is, and per-column grants are easy to undo with a later `grant all`. A separate table with admin-only RLS makes "exact values are not public" a property of the table. Public reads stay plain `select` on `projects`, with no RPC.

**Single write path: `save_project(p_slug text, p_project jsonb, p_private jsonb) returns projects`.** It is `security definer`, uses `search_path = public`, raises `42501` unless `is_admin()`, and has execute revoked from `anon`/`public`. In one transaction it:
1. creates the row (`p_slug` null) or locks the existing one by slug (`P0002` if missing);
2. upserts `project_private` (`lat_exact`, `lng_exact`, `client_name`);
3. updates the whitelisted `projects` columns from `p_project` (derived columns are ignored), which re-derives `lat`/`lng`/`client_name_public` from the new private row;
4. returns the saved row.

Any failure (check constraint, duplicate slug `23505`, bad latitude) rolls back both tables, so there is no partial save. In particular, a hidden name can't stay public because the private write failed after the project write. Before this, the admin form made two separate writes.

Verified with PGlite (real Postgres in WASM, including 17 checks for `save_project`: admin create/update, non-admin and anon rejected, a private→name switch only ever exposes the new name, rollback on project and on private constraint failures, slug rename and duplicate handling, smuggled derived columns ignored) running `schema.sql` + migrations as the `anon`, non-admin `authenticated` and admin roles: anon gets `permission denied` on `project_private`; a full `select *` on `projects` as anon contains no exact digits or hidden names; direct writes of exact values to `projects.lat` are rounded away; toggling `hide_location`/`client_mode` re-derives; the migration re-runs cleanly.

### Placeholder (dummy) mode
`data/projects.ts` stores rows in the same public shape (`ProjectRow`): `lat/lng` already rounded, `null` for the hidden project, and `client_name_public` only for `name`-mode projects. No exact coordinate or private client name exists anywhere in the dummy data or the JS bundle. Rows go through the same `mapProjectRow`.

---

## 3. Admin-side shapes

`ProjectRow` (types/content.ts) is the public row as selected from `projects` (+ embeds). The admin form additionally reads and writes:

| Form field | Stored in | Notes |
|---|---|---|
| build_status, area_site_m2, area_built_m2 | `projects` | areas `numeric(10,1)`, `> 0` |
| client_mode, client_alias | `projects` | alias required when mode = alias |
| client_name | `project_private.client_name` | required when mode = name; ≤ 200 chars |
| team (`text[]`), photographer | `projects` | |
| hide_location | `projects` | |
| lat, lng (exact) | `project_private.lat_exact/lng_exact` | both or neither; never written to `projects` |
| chapter_text | `projects` | jsonb object; only filled chapters are saved |
| gallery: chapter, layout, width, height, focal_x, focal_y | `project_images` | width/height read on upload |
| drawings | `project_drawings` | see §4 |
| materials | `project_materials` | name required |

Save: `supabase.rpc('save_project', { p_slug: isNew ? null : currentSlug, p_project: {...whitelisted columns}, p_private: { lat_exact, lng_exact, client_name } })`. It is all-or-nothing (see §2). On success the form navigates to the returned `slug`; on failure nothing changed and the form keeps what the user typed.

`ProjectPrivate` = `{ project_id, lat_exact, lng_exact, client_name }`.

## 4. Tables and storage

- `project_images` + `chapter` (check list), `layout` (default `'auto'`), `width`, `height` (> 0), `focal_x`, `focal_y` (0–1).
- `project_drawings(id, project_id, url, kind, caption, alt, scale, level, invert, chapter, sort_order)`. `url` must be `http(s)://` or site-relative.
- `project_materials(id, project_id, name, image, note, sort_order)`.
- RLS on both new tables mirrors `project_images`: public read when the parent is published, admin write.
- Storage: a new public bucket **`project-drawings`** (10 MB; PNG, JPEG, WebP, SVG), created by the migration and `storage.sql` and added to the existing bucket policies. Photos stay in `project-images` (5 MB, no SVG). The admin upload checks type and size first. It rejects PDFs with a hint to export to PNG. SVGs are parsed with DOMParser, which decodes entities, and are rejected if they contain `<script>`, `<foreignObject>`, `<iframe>`, `<embed>`, `<object>`, any `on*` attribute, an `href`/`xlink:href`/`src` that isn't `#…` or a raster `data:image/…`, or a `javascript:` value (for example in `<set to>`).

## 5. Changes vs identity-dossier §5
- §5.1 `client?: I18nField` → **`client_label?: I18nField`** (resolved), backed by `client_mode` / `client_alias` / private `client_name` (§8.5).
- §5.1 "lat/lng stored exact" → public `lat/lng` are rounded and derived; exact values live in `project_private` (§8.4).
- New `projects.hide_location` (§8.4).
- §5.2 `client jsonb` column → `client_mode`, `client_alias`, `client_name_public` (+ `project_private.client_name`).
- Drawings use their own bucket and accept JPG/WebP too (§8.6).
- `useProjects` list results skip `chapter_text`, `drawings` and `materials`.
