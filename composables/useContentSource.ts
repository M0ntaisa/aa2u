/**
 * Detects whether the configured Supabase URL is the placeholder we ship.
 * Composables use this to decide between live Supabase queries and the
 * static dummy data files in /data, so the site renders content even
 * before the user has connected a real Supabase project.
 */
export const useContentSource = () => {
  const config = useRuntimeConfig()
  const url = (config.public as any)?.supabase?.url as string | undefined
  const isPlaceholder = !url || url.includes('placeholder')
  return { isPlaceholder, url }
}
