/**
 * Helpers for the /work Index | Atlas | Map views (identity-dossier §3.3–3.6).
 * Pure functions only; the page and components/work/* own the state.
 */
import type { Project } from '~/types/content'

/** A list row with its stable display number (position in the full list). */
export interface WorkItem { project: Project; no: string }

export const WORK_VIEWS = ['index', 'atlas', 'map'] as const
export type WorkView = (typeof WORK_VIEWS)[number]
export const DEFAULT_WORK_VIEW: WorkView = 'index'

export function parseWorkView(v: unknown): WorkView {
  return (WORK_VIEWS as readonly string[]).includes(String(v)) ? (v as WorkView) : DEFAULT_WORK_VIEW
}

/** `1240` → `1.240` (id) / `1,240` (en); one decimal at most. */
export function formatArea(m2: number | undefined, locale: string): string | null {
  if (typeof m2 !== 'number' || !Number.isFinite(m2) || m2 <= 0) return null
  return new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 1 }).format(m2)
}

// ---- Map ----------------------------------------------------------------

/** Fixed bounds of /maps/indonesia.svg (equirectangular, 20 units per degree). */
export const MAP_FULL = { w: 94.5, e: 141.5, n: 6.5, s: -11.5 } as const
export const MAP_UNITS_PER_DEG = 20
/** Default Java–Bali inset (105°–116°E). */
export const MAP_INSET = { w: 105, e: 116, n: -5.5, s: -9.3 } as const

export interface MapBounds { w: number; e: number; n: number; s: number }

export const inBounds = (b: MapBounds, lat: number, lng: number) =>
  lng >= b.w && lng <= b.e && lat <= b.n && lat >= b.s

/** viewBox of a bounds box in the SVG asset's units. */
export function boundsViewBox(b: MapBounds): string {
  const k = MAP_UNITS_PER_DEG
  return `${(b.w - MAP_FULL.w) * k} ${(MAP_FULL.n - b.n) * k} ${(b.e - b.w) * k} ${(b.n - b.s) * k}`
}

/** A project with a public (already rounded) coordinate pair. */
export interface MappedProject {
  project: Project
  no: string
  lat: number
  lng: number
}

/** Only the public lat/lng from the contract; never derived from text. */
export function hasCoords(p: Project): p is Project & { lat: number; lng: number } {
  return typeof p.lat === 'number' && typeof p.lng === 'number'
    && Number.isFinite(p.lat) && Number.isFinite(p.lng)
}

export type MapRegion =
  | 'sumatra' | 'java' | 'bali' | 'nusa_tenggara' | 'kalimantan'
  | 'sulawesi' | 'maluku' | 'papua' | 'other'

/** West → east, the order the list groups appear in. */
export const MAP_REGION_ORDER: MapRegion[] = [
  'sumatra', 'java', 'bali', 'nusa_tenggara', 'kalimantan', 'sulawesi', 'maluku', 'papua', 'other',
]

/** Coarse island group from the public coordinate (list grouping only). */
export function regionOf(lat: number, lng: number): MapRegion {
  if (lng >= 114.4 && lng <= 115.75 && lat <= -7.9 && lat >= -9) return 'bali'
  if (lng >= 105 && lng < 114.6 && lat <= -5.7 && lat >= -9) return 'java'
  if (lng < 106.5 && lat > -6.1 && lat < 6.5) return 'sumatra'
  if (lng >= 115.75 && lng < 127.5 && lat < -7.9) return 'nusa_tenggara'
  if (lng >= 108.5 && lng < 119.2 && lat >= -4.5 && lat <= 7.5) return 'kalimantan'
  if (lng >= 119.2 && lng < 125.5 && lat >= -6.5 && lat <= 4) return 'sulawesi'
  if (lng >= 125.5 && lng < 131 && lat >= -8.5 && lat <= 3) return 'maluku'
  if (lng >= 131 && lng <= 141.5) return 'papua'
  return 'other'
}

export interface MapCluster<T> {
  key: string
  items: T[]
  /** Position in % of the map box. */
  x: number
  y: number
}

/**
 * Greedy clustering in screen pixels: each point joins the first cluster
 * whose seed lies within `radius` px, otherwise starts a new one. The
 * cluster is drawn at the centroid of its members.
 */
export function clusterPoints<T extends { lat: number; lng: number; project: { slug: string } }>(
  points: T[],
  b: MapBounds,
  widthPx: number,
  heightPx: number,
  radius = 14,
): MapCluster<T>[] {
  const seeds: { sx: number; sy: number; items: T[] }[] = []
  for (const p of points) {
    if (!inBounds(b, p.lat, p.lng)) continue
    const sx = (p.lng - b.w) / (b.e - b.w) * widthPx
    const sy = (b.n - p.lat) / (b.n - b.s) * heightPx
    const hit = seeds.find(c => Math.hypot(c.sx - sx, c.sy - sy) < radius)
    if (hit) hit.items.push(p)
    else seeds.push({ sx, sy, items: [p] })
  }
  return seeds.map((c) => {
    const lng = c.items.reduce((a, i) => a + i.lng, 0) / c.items.length
    const lat = c.items.reduce((a, i) => a + i.lat, 0) / c.items.length
    return {
      key: c.items.map(i => i.project.slug).join('|'),
      items: c.items,
      x: (lng - b.w) / (b.e - b.w) * 100,
      y: (b.n - lat) / (b.n - b.s) * 100,
    }
  })
}
