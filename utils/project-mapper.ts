import type {
  Chapter, DrawingKind, I18nField, ImageLayout, Project, ProjectDrawing,
  ProjectMaterial, ProjectRow,
} from '~/types/content'

/**
 * Single row → Project mapper shared by useProject, useProjects and the
 * dummy data, so Supabase and placeholder mode apply the same public
 * rules (docs/design/api-contract.md). Privacy is enforced in the DB
 * (project_private + trigger); the rounding / hide checks here are a
 * second layer, not the only one.
 */

export const CHAPTERS: Chapter[] = ['site', 'concept', 'plan', 'section', 'material', 'built']
export const IMAGE_LAYOUTS: ImageLayout[] = ['auto', 'full', 'wide', 'inset', 'pair', 'tall']
export const DRAWING_KINDS: DrawingKind[] = ['site_plan', 'plan', 'section', 'elevation', 'diagram', 'axonometric']

export const PRIVATE_CLIENT_LABEL: I18nField = { id: 'Klien pribadi', en: 'Private client' }

/** Public coordinate precision: 2 decimals ≈ 1.1 km. */
export const roundCoord = (n: number) => Math.round(n * 100) / 100

/** Chapter a drawing lands in when the admin didn't override it. */
export const defaultDrawingChapter = (kind: DrawingKind): Chapter => {
  if (kind === 'plan' || kind === 'site_plan') return 'plan'
  if (kind === 'section' || kind === 'elevation') return 'section'
  return 'concept'
}

/** Columns + embeds the public pages read. Never includes project_private. */
const BASE_SELECT = `
  slug, title, year, location, status, partners,
  description, process_note, services_performed,
  cover_image, sort_order, is_featured,
  build_status, area_site_m2, area_built_m2,
  client_mode, client_alias, client_name_public,
  team, photographer, hide_location, lat, lng,
  category:categories(slug, name),
  images:project_images(url, alt, caption, sort_order, chapter, layout, width, height, focal_x, focal_y)`

/** Detail page: everything. */
export const PROJECT_DETAIL_SELECT = `${BASE_SELECT},
  chapter_text,
  drawings:project_drawings(url, kind, caption, alt, scale, level, invert, chapter, sort_order),
  materials:project_materials(name, image, note, sort_order)`

/** Lists (/work, home): no chapter text, drawings or materials. */
export const PROJECT_LIST_SELECT = BASE_SELECT

const hasText = (f?: I18nField | null): f is I18nField =>
  !!f && (!!f.id?.trim() || !!f.en?.trim())

const opt = <T>(v: T | null | undefined): T | undefined => (v ?? undefined)

const posNumber = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const byOrder = (a: { sort_order?: number | null }, b: { sort_order?: number | null }) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0)

function resolveClientLabel(row: ProjectRow): I18nField | undefined {
  switch (row.client_mode) {
    case 'name': {
      const name = row.client_name_public?.trim()
      return name ? { id: name, en: name } : undefined
    }
    case 'alias':
      return hasText(row.client_alias)
        ? { id: row.client_alias.id || row.client_alias.en, en: row.client_alias.en || row.client_alias.id }
        : undefined
    case 'private':
      return { ...PRIVATE_CLIENT_LABEL }
    default:
      return undefined // not set (dummy fallback project): no Client row
  }
}

function resolveCoords(row: ProjectRow): { lat?: number; lng?: number } {
  if (row.hide_location) return {}
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (row.lat == null || row.lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return {}
  return { lat: roundCoord(lat), lng: roundCoord(lng) }
}

function resolveChapterText(row: ProjectRow): Project['chapter_text'] {
  const src = row.chapter_text
  if (!src) return undefined
  const out: NonNullable<Project['chapter_text']> = {}
  for (const c of CHAPTERS) {
    const f = src[c]
    if (hasText(f)) out[c] = { id: f.id ?? '', en: f.en ?? '' }
  }
  return Object.keys(out).length ? out : undefined
}

export function mapProjectRow(row: ProjectRow): Project {
  const team = (row.team ?? []).map(s => s.trim()).filter(Boolean)

  const drawings: ProjectDrawing[] | undefined = row.drawings
    ? row.drawings.slice().sort(byOrder).map((d, i) => ({
        url: d.url,
        kind: d.kind,
        caption: opt(d.caption),
        alt: opt(d.alt),
        scale: opt(d.scale),
        level: opt(d.level),
        invert: !!d.invert,
        chapter: d.chapter ?? defaultDrawingChapter(d.kind),
        sort_order: d.sort_order ?? i,
      }))
    : undefined

  const materials: ProjectMaterial[] | undefined = row.materials
    ? row.materials
        .filter(m => hasText(m.name))
        .sort(byOrder)
        .map((m, i) => ({
          name: m.name,
          image: opt(m.image),
          note: opt(m.note),
          sort_order: m.sort_order ?? i,
        }))
    : undefined

  return {
    slug: row.slug,
    title: row.title,
    year: opt(row.year),
    location: opt(row.location),
    category: row.category
      ? { slug: row.category.slug, name: row.category.name }
      : undefined,
    status: row.status,
    partners: row.partners ?? [],
    description: opt(row.description),
    process_note: opt(row.process_note),
    services_performed: opt(row.services_performed),
    cover_image: row.cover_image ?? '',
    sort_order: row.sort_order,
    is_featured: row.is_featured,
    images: (row.images ?? [])
      .slice()
      .sort(byOrder)
      .map(i => ({
        url: i.url,
        alt: opt(i.alt),
        caption: opt(i.caption),
        chapter: i.chapter ?? 'built',
        layout: i.layout ?? 'auto',
        width: posNumber(i.width),
        height: posNumber(i.height),
        focal_x: opt(i.focal_x),
        focal_y: opt(i.focal_y),
      })),

    build_status: opt(row.build_status),
    area_site_m2: posNumber(row.area_site_m2),
    area_built_m2: posNumber(row.area_built_m2),
    client_label: resolveClientLabel(row),
    team: team.length ? team : undefined,
    photographer: row.photographer?.trim() || undefined,
    ...resolveCoords(row),
    chapter_text: resolveChapterText(row),
    drawings,
    materials,
  }
}
