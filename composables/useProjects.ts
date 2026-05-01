import type { Project } from '~/types/content'

interface UseProjectsOpts {
  featured?: boolean
}

/**
 * List published projects. Pass { featured: true } to get only homepage
 * showcase items. Returns useAsyncData ref — reactive across i18n and
 * route changes.
 */
export const useProjects = (opts: UseProjectsOpts = {}) => {
  const key = `projects:${opts.featured ? 'featured' : 'all'}`

  return useAsyncData<Project[]>(key, async () => {
    const { isPlaceholder } = useContentSource()

    if (isPlaceholder) {
      const { publishedProjects, featuredProjects } = await import('~/data/projects')
      return opts.featured ? featuredProjects() : publishedProjects()
    }

    const supabase = useSupabaseClient()
    let query = supabase
      .from('projects')
      .select(`
        slug, title, year, location, status, partners,
        description, process_note, services_performed,
        cover_image, sort_order, is_featured,
        category:categories(slug, name),
        images:project_images(url, alt, caption, sort_order)
      `)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    if (opts.featured) query = query.eq('is_featured', true)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map(mapProject)
  })
}

function mapProject(row: any): Project {
  return {
    slug: row.slug,
    title: row.title,
    year: row.year ?? undefined,
    location: row.location ?? undefined,
    category: row.category
      ? { slug: row.category.slug, name: row.category.name }
      : undefined,
    status: row.status,
    partners: row.partners ?? [],
    description: row.description ?? undefined,
    process_note: row.process_note ?? undefined,
    services_performed: row.services_performed ?? undefined,
    cover_image: row.cover_image ?? '',
    sort_order: row.sort_order,
    is_featured: row.is_featured,
    images: (row.images ?? [])
      .slice()
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i: any) => ({ url: i.url, alt: i.alt ?? undefined, caption: i.caption ?? undefined })),
  }
}
