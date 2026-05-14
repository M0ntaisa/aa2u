import { serverSupabaseClient } from '#supabase/server'

interface Route {
  path: string // canonical path WITHOUT locale prefix, e.g. '/work'
  lastmod?: string
  priority?: number
}

const STATIC_ROUTES: Route[] = [
  { path: '/',        priority: 1.0 },
  { path: '/work',    priority: 0.9 },
  { path: '/about',   priority: 0.7 },
  { path: '/contact', priority: 0.7 },
]

const LOCALES = ['id', 'en'] as const
type Locale = typeof LOCALES[number]

// Mirror nuxt.config: strategy 'prefix_except_default' with default 'id'.
// 'id' is the default → no prefix. 'en' → '/en' prefix.
function localized(locale: Locale, path: string): string {
  if (locale === 'id') return path === '/' ? '/' : path
  return path === '/' ? '/en' : `/en${path}`
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const siteUrl = ((config.public as any).siteUrl as string).replace(/\/$/, '')

  // Load published projects. Placeholder mode falls back to dummy data so
  // the sitemap is still useful in local dev.
  const supabaseUrl = process.env.SUPABASE_URL
  const isPlaceholder = !supabaseUrl || supabaseUrl.includes('placeholder')

  let projectSlugs: { slug: string; updated_at?: string }[] = []
  if (isPlaceholder) {
    const { publishedProjects } = await import('~/data/projects')
    projectSlugs = publishedProjects().map(p => ({ slug: p.slug }))
  } else {
    const supabase = await serverSupabaseClient(event)
    const { data } = await supabase
      .from('projects')
      .select('slug, updated_at')
      .eq('status', 'published')
    projectSlugs = data ?? []
  }

  const routes: Route[] = [
    ...STATIC_ROUTES,
    ...projectSlugs.map(p => ({
      path: `/work/${p.slug}`,
      lastmod: p.updated_at,
      priority: 0.8,
    })),
  ]

  const urls = routes.flatMap(route =>
    LOCALES.map(locale => {
      const loc = `${siteUrl}${localized(locale, route.path)}`
      const alternates = LOCALES.map(alt => {
        const altHref = `${siteUrl}${localized(alt, route.path)}`
        return `<xhtml:link rel="alternate" hreflang="${alt}" href="${altHref}" />`
      }).join('\n    ')
      const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${siteUrl}${localized('id', route.path)}" />`
      const lastmod = route.lastmod ? `<lastmod>${new Date(route.lastmod).toISOString()}</lastmod>` : ''
      const priority = route.priority !== undefined ? `<priority>${route.priority.toFixed(1)}</priority>` : ''
      return `  <url>
    <loc>${loc}</loc>
    ${lastmod}
    ${priority}
    ${alternates}
    ${xDefault}
  </url>`
    }),
  )

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`
})
