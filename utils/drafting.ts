/**
 * Shared constants + formatters for the drawing-led identity
 * (docs/design/identity-dossier.md §1.5, §2.2, §3.2).
 */

/** Motion tokens in seconds, mirroring --d-1…--d-4 in main.css. */
export const MOTION = {
  d1: 0.12,
  d2: 0.24,
  d3: 0.48,
  d4: 0.96,
  stagger: 0.06,
  /** GSAP equivalent of --ease-draft cubic-bezier(0.22, 1, 0.36, 1). */
  ease: 'power4.out',
} as const

/** The studio clock always shows Jakarta, not the visitor's own zone. */
export const STUDIO_TZ = 'Asia/Jakarta'

export interface Dms {
  /** Display string, e.g. `08°49′S 115°05′E`. */
  text: string
  /** Spoken form for aria-label, e.g. `8 degrees 49 minutes south, …`. */
  spoken: string
}

/**
 * Format a (public, already rounded) lat/lng pair as degrees + minutes.
 * Returns null for anything that isn't a finite pair in range, so callers
 * can just omit the coordinate.
 */
export function formatDms(lat: unknown, lng: unknown): Dms | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

  const part = (v: number, pos: string, neg: string, pad: number) => {
    const a = Math.abs(v)
    let d = Math.floor(a)
    let m = Math.round((a - d) * 60)
    if (m === 60) { d += 1; m = 0 }
    const hemi = v < 0 ? neg : pos
    return {
      text: `${String(d).padStart(pad, '0')}°${String(m).padStart(2, '0')}′${hemi}`,
      d, m, hemi,
    }
  }
  const a = part(lat, 'N', 'S', 2)
  const b = part(lng, 'E', 'W', 3)
  const word = { N: 'north', S: 'south', E: 'east', W: 'west' } as Record<string, string>
  return {
    text: `${a.text} ${b.text}`,
    spoken: `${a.d} degrees ${a.m} minutes ${word[a.hemi]}, ${b.d} degrees ${b.m} minutes ${word[b.hemi]}`,
  }
}

/** `07:42` in the studio zone. */
export function studioTime(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: STUDIO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now)
}

export type LightPhase = 'night' | 'dawn' | 'morning' | 'midday' | 'afternoon' | 'dusk'

/** Rough daylight phase in the studio zone (hooks into the #19 light index later). */
export function studioLight(now = new Date()): LightPhase {
  const h = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: STUDIO_TZ,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now))
  if (h < 5) return 'night'
  if (h < 7) return 'dawn'
  if (h < 11) return 'morning'
  if (h < 14) return 'midday'
  if (h < 17) return 'afternoon'
  if (h < 19) return 'dusk'
  return 'night'
}

/** `3` → `03`. */
export const pad2 = (n: number) => String(n).padStart(2, '0')
