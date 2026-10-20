import type { H3Event } from 'h3'

/**
 * Server-side twin of composables/useContentSource.ts: true while the
 * configured Supabase URL is still the placeholder we ship (or missing).
 */
export const isPlaceholderSupabase = (event?: H3Event) => {
  const config = useRuntimeConfig(event)
  const url = (config.public as any)?.supabase?.url as string | undefined
  return !url || url.includes('placeholder')
}
