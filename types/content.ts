// Mirrors the Supabase schema. Translatable fields use I18nField.

export type Locale = 'id' | 'en'

export interface I18nField {
  id: string
  en: string
}

export interface I18nList {
  id: string[]
  en: string[]
}

export type ProjectStatus = 'draft' | 'in_development' | 'published'

/** Public "Status" on the fact sheet. Not the CMS publish state (`status`). */
export type BuildStatus = 'concept' | 'design' | 'construction' | 'completed' | 'unbuilt'
export type Chapter = 'site' | 'concept' | 'plan' | 'section' | 'material' | 'built'
export type ImageLayout = 'auto' | 'full' | 'wide' | 'inset' | 'pair' | 'tall'
export type DrawingKind = 'site_plan' | 'plan' | 'section' | 'elevation' | 'diagram' | 'axonometric'
/** How the client is credited publicly. Admin-side only; the public shape gets `client_label`. */
export type ClientMode = 'name' | 'alias' | 'private'

export interface ProjectImage {
  url: string
  alt?: I18nField
  caption?: I18nField
  chapter?: Chapter            // always set after mapping; default 'built'
  layout?: ImageLayout         // always set after mapping; default 'auto'
  width?: number               // intrinsic px
  height?: number
  focal_x?: number             // 0–1 object-position, default .5
  focal_y?: number
}

export interface ProjectDrawing {
  url: string                  // PNG/JPG/WebP/SVG; render via <img> only
  kind: DrawingKind
  caption?: I18nField
  alt?: I18nField
  scale?: string               // "1:200", display only
  level?: string               // "+3.20" / "Level 1"
  invert?: boolean             // black-on-white export: invert on dark
  chapter?: Chapter            // always set after mapping; default by kind
  sort_order: number
}

export interface ProjectMaterial {
  name: I18nField
  image?: string               // macro photo, square crop
  note?: I18nField             // origin / finish
  sort_order: number
}

export interface Category {
  slug: string
  name: I18nField
}

export interface Project {
  slug: string
  title: I18nField
  year?: number
  location?: I18nField
  category?: Category
  status: ProjectStatus
  partners?: string[]
  description?: I18nField
  process_note?: I18nField
  services_performed?: I18nList
  cover_image: string
  is_featured?: boolean
  sort_order: number
  images?: ProjectImage[]

  // Dossier fields (docs/design/api-contract.md). All optional: a project
  // with none of them renders the fallback layout.
  build_status?: BuildStatus
  area_site_m2?: number
  area_built_m2?: number
  /** Already resolved for display: real name, alias, or "Klien pribadi"/"Private client". */
  client_label?: I18nField
  team?: string[]
  photographer?: string
  /** WGS84, already rounded to 2 decimals (~1 km). Absent when the location is hidden. */
  lat?: number
  lng?: number
  chapter_text?: Partial<Record<Chapter, I18nField>>
  /** Sorted by sort_order. May be absent in list results (useProjects). */
  drawings?: ProjectDrawing[]
  /** Sorted by sort_order. May be absent in list results (useProjects). */
  materials?: ProjectMaterial[]
}

/**
 * Row shape of the PUBLIC `projects` select (plus embeds) — what the anon
 * key can read, and what data/projects.ts stores in placeholder mode.
 * mapProjectRow() turns it into `Project`. Exact coordinates and hidden
 * client names are not in here; they live in `ProjectPrivate`.
 */
export interface ProjectRow {
  id?: string
  slug: string
  title: I18nField
  year?: number | null
  location?: I18nField | null
  category?: Category | null
  status: ProjectStatus
  partners?: string[] | null
  description?: I18nField | null
  process_note?: I18nField | null
  services_performed?: I18nList | null
  cover_image?: string | null
  sort_order: number
  is_featured?: boolean
  build_status?: BuildStatus | null
  area_site_m2?: number | string | null   // numeric(10,1)
  area_built_m2?: number | string | null
  client_mode?: ClientMode | null
  client_alias?: I18nField | null
  client_name_public?: string | null      // derived: set only when client_mode = 'name'
  team?: string[] | null
  photographer?: string | null
  hide_location?: boolean | null
  lat?: number | null                     // derived: rounded, null when hidden
  lng?: number | null
  chapter_text?: Partial<Record<Chapter, I18nField>> | null
  images?: ProjectImageRow[] | null
  drawings?: ProjectDrawingRow[] | null
  materials?: ProjectMaterialRow[] | null
}

export interface ProjectImageRow {
  id?: string
  url: string
  alt?: I18nField | null
  caption?: I18nField | null
  sort_order?: number | null
  chapter?: Chapter | null
  layout?: ImageLayout | null
  width?: number | null
  height?: number | null
  focal_x?: number | null
  focal_y?: number | null
}

export interface ProjectDrawingRow {
  id?: string
  url: string
  kind: DrawingKind
  caption?: I18nField | null
  alt?: I18nField | null
  scale?: string | null
  level?: string | null
  invert?: boolean | null
  chapter?: Chapter | null
  sort_order?: number | null
}

export interface ProjectMaterialRow {
  id?: string
  name: I18nField
  image?: string | null
  note?: I18nField | null
  sort_order?: number | null
}

/** Admin-only `project_private` row (RLS: is_admin()). */
export interface ProjectPrivate {
  project_id: string
  lat_exact: number | null
  lng_exact: number | null
  client_name: string | null
}

export interface TeamMember {
  name: string
  role: I18nField
  bio?: I18nField
  photo_url?: string
  social_linkedin?: string
  social_instagram?: string
  is_active?: boolean
  sort_order: number
}

export interface StudioPrinciple {
  title: I18nField
  description?: I18nField
  sort_order: number
}

export interface SiteSettings {
  studio_name: string
  tagline?: I18nField
  manifesto?: I18nField
  contact_email?: string
  contact_phone?: string
  address?: I18nField
  socials?: {
    instagram?: string
    linkedin?: string
    behance?: string
  }
}
