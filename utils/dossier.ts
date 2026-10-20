/**
 * Pure helpers for the project dossier page (identity-dossier §3.7):
 * chapter assembly with the fallback for old projects, the `auto` image
 * layout rule, figure numbering and the lightbox sequence.
 */
import type {
  Chapter, I18nField, ImageLayout, Project, ProjectDrawing, ProjectImage, ProjectMaterial,
} from '~/types/content'

import { CHAPTERS } from '~/utils/project-mapper'

/** A resolved layout ('auto' never survives assembly). */
export type FigLayout = Exclude<ImageLayout, 'auto'>

export interface ImageFig {
  type: 'image'
  img: ProjectImage
  /** 1-based figure number across the page, in document order. */
  fig: number
  /** Index into the lightbox sequence. */
  lb: number
}

export interface DrawingFig {
  type: 'drawing'
  drawing: ProjectDrawing
  fig: number
  lb: number
}

export interface ImageBlock {
  layout: FigLayout
  items: ImageFig[]
}

export interface DossierChapter {
  key: Chapter
  /** Position among the visible chapters, 1-based. */
  no: number
  text?: I18nField
  drawings: DrawingFig[]
  blocks: ImageBlock[]
  materials: ProjectMaterial[]
}

export type LightboxEntry =
  | { type: 'image', img: ProjectImage, fig: number }
  | { type: 'drawing', drawing: ProjectDrawing, fig: number }

export interface DossierModel {
  chapters: DossierChapter[]
  /** `description` when it was not used as the Concept text. */
  lead?: I18nField
  lightbox: LightboxEntry[]
}

const hasText = (f?: I18nField | null) => !!f && !!(f.id?.trim() || f.en?.trim())

const isPortrait = (img: ProjectImage) =>
  !!img.width && !!img.height && img.height > img.width

const isAuto = (img?: ProjectImage) => !!img && (!img.layout || img.layout === 'auto')

/**
 * Resolve image layouts for one chapter.
 *
 * Explicit layouts are honoured, with two corrections: `full` only exists in
 * Built (elsewhere it becomes `wide`), and a `pair` takes the following image
 * as its partner when that one is `pair`/`auto` (a lone `pair` becomes `wide`).
 *
 * `auto` (§3.7): portrait → tall; the first image in the chapter → wide; two
 * consecutive landscape `auto` images → pair; anything else alternates
 * inset / wide. Portrait wins over "first is wide" so a portrait shot is
 * never stretched across 9 columns.
 */
export function layoutDossierImages(images: ProjectImage[], chapter: Chapter): ProjectImage[][] & { layouts: FigLayout[] } {
  const groups: ProjectImage[][] = []
  const layouts: FigLayout[] = []
  let alternate = 0

  for (let i = 0; i < images.length; i++) {
    const img = images[i]!
    const next = images[i + 1]
    let layout = (img.layout ?? 'auto') as ImageLayout

    if (layout === 'full' && chapter !== 'built') layout = 'wide'

    if (layout === 'pair') {
      if (next && (next.layout === 'pair' || isAuto(next)) && !isPortrait(next)) {
        groups.push([img, next]); layouts.push('pair'); i++; continue
      }
      layout = 'wide'
    }

    if (layout === 'auto') {
      if (isPortrait(img)) layout = 'tall'
      else if (groups.length === 0) layout = 'wide'
      else if (next && isAuto(next) && !isPortrait(next)) {
        groups.push([img, next]); layouts.push('pair'); i++; continue
      }
      else layout = alternate++ % 2 === 0 ? 'inset' : 'wide'
    }

    groups.push([img]); layouts.push(layout as FigLayout)
  }
  return Object.assign(groups, { layouts })
}

/**
 * Build the visible chapters. Text per chapter comes from `chapter_text`;
 * for projects without it, `process_note` stands in for Site and
 * `description` for Concept (§3.7 fallback). Images already default to
 * the Built chapter in the mapper, so old projects land there. Plan and
 * Section only exist when the project has drawings (§8.6).
 */
export function buildDossier(p: Project): DossierModel {
  const text: Partial<Record<Chapter, I18nField>> = {}
  for (const k of CHAPTERS) {
    const v = p.chapter_text?.[k]
    if (hasText(v)) text[k] = v
  }
  let lead: I18nField | undefined
  if (!text.site && hasText(p.process_note)) text.site = p.process_note
  if (!text.concept && hasText(p.description)) text.concept = p.description
  else if (hasText(p.description)) lead = p.description

  // §8.6: without drawings there are no Plan / Section chapters. Their
  // chapter_text is dropped (it describes drawings that aren't there) and
  // photos tagged plan/section move to Built, keeping their order.
  const hasDrawings = !!p.drawings?.length
  const drawingOnly = (k: Chapter) => k === 'plan' || k === 'section'
  const chapterOf = (img: ProjectImage): Chapter => {
    const c = img.chapter ?? 'built'
    return !hasDrawings && drawingOnly(c) ? 'built' : c
  }

  const lightbox: LightboxEntry[] = []
  const chapters: DossierChapter[] = []
  let fig = 0

  for (const key of CHAPTERS) {
    if (!hasDrawings && drawingOnly(key)) continue
    const drawings = (p.drawings ?? []).filter(d => (d.chapter ?? 'plan') === key)
    const images = (p.images ?? []).filter(img => chapterOf(img) === key)
    const materials = key === 'material' ? (p.materials ?? []) : []
    if (!text[key] && !drawings.length && !images.length && !materials.length) continue

    // Document order inside a chapter: text, drawings, images, materials.
    const drawingFigs: DrawingFig[] = drawings.map((drawing) => {
      fig++
      lightbox.push({ type: 'drawing', drawing, fig })
      return { type: 'drawing', drawing, fig, lb: lightbox.length - 1 }
    })

    const grouped = layoutDossierImages(images, key)
    const blocks: ImageBlock[] = grouped.map((group, gi) => ({
      layout: grouped.layouts[gi]!,
      items: group.map((img) => {
        fig++
        lightbox.push({ type: 'image', img, fig })
        return { type: 'image' as const, img, fig, lb: lightbox.length - 1 }
      }),
    }))

    chapters.push({ key, no: chapters.length + 1, text: text[key], drawings: drawingFigs, blocks, materials })
  }

  return { chapters, lead, lightbox }
}

/** `1240` → `1.240 m²` (id) / `1,240 m²` (en). */
export function formatDossierArea(value: number | undefined, locale: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return ''
  const n = new Intl.NumberFormat(locale === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 1 }).format(value)
  return `${n} m²`
}

/** OpenStreetMap link at the same (already rounded) precision we display. */
export function dossierOsmUrl(lat: number, lng: number): string {
  const la = lat.toFixed(2)
  const lo = lng.toFixed(2)
  return `https://www.openstreetmap.org/?mlat=${la}&mlon=${lo}#map=14/${la}/${lo}`
}

/** Drawing URLs ending in .svg are served raw through <img>, never resized or inlined. */
export function isSvgUrl(url: string): boolean {
  return /\.svg(?:[?#]|$)/i.test(url)
}
