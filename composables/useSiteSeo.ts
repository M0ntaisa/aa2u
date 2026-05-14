/**
 * Centralized SEO meta helper. Wraps useSeoMeta so every page only
 * supplies what's unique (title, description, optional cover image)
 * while OG/Twitter/canonical/locale tags stay consistent.
 *
 * Canonical URL is built from runtimeConfig.public.siteUrl + the
 * current localized path. The current route's full path already
 * includes the i18n prefix when applicable.
 */

interface SeoOptions {
  title: () => string
  description: () => string
  image?: () => string | undefined | null
  type?: 'website' | 'article'
}

export const useSiteSeo = (opts: SeoOptions) => {
  const route = useRoute()
  const config = useRuntimeConfig()
  const { locale } = useI18n()

  const siteUrl = (config.public as any).siteUrl as string
  const ogLocaleMap: Record<string, string> = { id: 'id_ID', en: 'en_US' }

  const canonical = computed(() => `${siteUrl.replace(/\/$/, '')}${route.path}`)

  const image = computed(() => {
    const provided = opts.image?.()
    if (provided) {
      if (provided.startsWith('http')) return provided
      return `${siteUrl.replace(/\/$/, '')}${provided.startsWith('/') ? '' : '/'}${provided}`
    }
    return `${siteUrl.replace(/\/$/, '')}/og-default.png`
  })

  useSeoMeta({
    title: opts.title,
    description: opts.description,
    ogTitle: opts.title,
    ogDescription: opts.description,
    ogType: opts.type ?? 'website',
    ogImage: () => image.value,
    ogLocale: () => ogLocaleMap[locale.value] ?? 'id_ID',
    ogUrl: () => canonical.value,
    twitterCard: 'summary_large_image',
    twitterTitle: opts.title,
    twitterDescription: opts.description,
    twitterImage: () => image.value,
  })

  useHead({
    link: [
      { rel: 'canonical', href: () => canonical.value },
    ],
  })

  return { canonical, image }
}
