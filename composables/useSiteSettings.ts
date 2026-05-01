import type { SiteSettings } from '~/types/content'

export const useSiteSettings = () => {
  return useAsyncData<SiteSettings>('site-settings', async () => {
    const { isPlaceholder } = useContentSource()

    if (isPlaceholder) {
      const { siteSettings } = await import('~/data/site')
      return siteSettings
    }

    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()

    if (error) throw error
    if (!data) {
      const { siteSettings } = await import('~/data/site')
      return siteSettings
    }

    return {
      studio_name:   data.studio_name,
      tagline:       data.tagline ?? undefined,
      manifesto:     data.manifesto ?? undefined,
      contact_email: data.contact_email ?? undefined,
      contact_phone: data.contact_phone ?? undefined,
      address:       data.address ?? undefined,
      socials:       data.socials ?? {},
    }
  })
}
