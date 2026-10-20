import type { H3Event } from 'h3'
import { serverSupabaseServiceRole } from '#supabase/server'

// Field caps — keep in sync with the CHECK constraints on `inquiries`
// (supabase/schema.sql + migrations/2026-10-20_inquiries_hardening.sql).
const LIMITS = {
  name: 120,
  email: 254,
  phone: 40,
  project_type: 120,
  message: 5000,
} as const

const LOCALES = ['id', 'en'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 5 submissions per IP per 10 minutes. The Map is per server instance
// and resets on restart — good enough to blunt a spam script, not a
// global limiter. Check-and-increment is synchronous, so concurrent
// requests can't race past the limit.
const RATE_LIMIT = 5
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX_KEYS = 5000
const rateBuckets = new Map<string, { count: number, resetAt: number }>()

const badRequest = () => createError({ statusCode: 400, statusMessage: 'Invalid inquiry' })

/** Optional string field: absent/null → '', non-string → 400, else trimmed. */
function optionalString(value: unknown, max: number): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string') throw badRequest()
  const trimmed = value.trim()
  if (trimmed.length > max) throw badRequest()
  return trimmed
}

function requiredString(value: unknown, max: number): string {
  const trimmed = optionalString(value, max)
  if (!trimmed) throw badRequest()
  return trimmed
}

/**
 * Client IP used as the rate-limit key. By default this is the socket
 * address: X-Forwarded-For is client-controlled, so trusting it would
 * give every spoofed value a fresh bucket. Behind a proxy, set
 * NUXT_TRUSTED_IP_HEADER to a header that proxy *overwrites* (e.g.
 * "cf-connecting-ip"); never point it at a header clients can set.
 */
function clientKey(event: H3Event): string {
  const header = String(useRuntimeConfig(event).trustedIpHeader || '').trim().toLowerCase()
  const fromHeader = header ? getRequestHeader(event, header)?.split(',')[0]?.trim() : ''
  const ip = fromHeader || getRequestIP(event) || 'unknown'
  // IPv6 hosts usually own a whole /64 — key by that prefix so rotating
  // addresses within it doesn't dodge the limit.
  if (ip.includes(':') && !ip.startsWith('::ffff:')) return ipv6Prefix64(ip)
  return ip.replace(/^::ffff:/, '')
}

/** First four hextets of an IPv6 address, expanding `::` compression. */
function ipv6Prefix64(ip: string): string {
  const [head = '', tail] = ip.split('%')[0]!.toLowerCase().split('::')
  const left = head ? head.split(':') : []
  const right = tail ? tail.split(':') : []
  const groups = tail === undefined
    ? left
    : [...left, ...Array(Math.max(0, 8 - left.length - right.length)).fill('0'), ...right]
  return groups.slice(0, 4).map(g => g.replace(/^0+(?=.)/, '')).join(':') + '::/64'
}

function enforceRateLimit(key: string) {
  const now = Date.now()
  if (rateBuckets.size >= RATE_MAX_KEYS) {
    for (const [k, v] of rateBuckets) if (v.resetAt <= now) rateBuckets.delete(k)
    // Still full of live entries: drop the oldest-inserted ones.
    for (const k of rateBuckets.keys()) {
      if (rateBuckets.size < RATE_MAX_KEYS) break
      rateBuckets.delete(k)
    }
  }

  const entry = rateBuckets.get(key)
  if (!entry || entry.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return
  }
  if (entry.count >= RATE_LIMIT) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
  entry.count++
}

export default defineEventHandler(async (event) => {
  const contentType = getRequestHeader(event, 'content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw createError({ statusCode: 415, statusMessage: 'Expected application/json' })
  }

  enforceRateLimit(clientKey(event))

  const body = await readBody<Record<string, unknown>>(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw badRequest()

  // Honeypot: real users never see `hp_field`. Respond exactly like a
  // real save so bots can't tell they were filtered.
  if (body.hp_field !== undefined && body.hp_field !== null && body.hp_field !== '') {
    return { ok: true, persisted: true }
  }

  const name = requiredString(body.name, LIMITS.name)
  const email = requiredString(body.email, LIMITS.email)
  const message = requiredString(body.message, LIMITS.message)
  const phone = optionalString(body.phone, LIMITS.phone)
  const projectType = optionalString(body.project_type, LIMITS.project_type)
  if (!EMAIL_RE.test(email)) throw badRequest()

  const rawLocale = optionalString(body.locale, 8) || 'id'
  if (!(LOCALES as readonly string[]).includes(rawLocale)) throw badRequest()

  // Without a service role key we can't persist. Only acceptable in dev
  // or placeholder/demo mode — in a real deployment it's a misconfig.
  // Same source serverSupabaseServiceRole reads the key from.
  const serviceKey = (useRuntimeConfig(event) as any).supabase?.serviceKey
  if (!serviceKey) {
    if (import.meta.dev || isPlaceholderSupabase(event)) {
      return { ok: true, persisted: false }
    }
    console.error('[inquiries] SUPABASE_SERVICE_KEY is not set — inquiry NOT saved. Configure it in the deployment env.')
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const { error } = await supabase.from('inquiries').insert({
    name,
    email,
    phone: phone || null,
    project_type: projectType || null,
    message,
    locale: rawLocale,
  })

  if (error) {
    console.error('[inquiries] insert failed:', error)
    throw createError({ statusCode: 500, statusMessage: 'Server error' })
  }

  return { ok: true, persisted: true }
})
