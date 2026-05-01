import type { Project } from '~/types/content'

/**
 * Fetch a single published project by slug, including gallery images
 * and category. Throws 404 if not found.
 */
export const useProject = (slug: MaybeRefOrGetter<string>) => {
  return useAsyncData<Project | null>(
    () => `project:${toValue(slug)}`,
    async () => {
      const slugValue = toValue(slug)
      const { isPlaceholder } = useContentSource()

      if (isPlaceholder) {
        const { projectBySlug } = await import('~/data/projects')
        return projectBySlug(slugValue) ?? null
      }

      const supabase = useSupabaseClient()
      const { data, error } = await supabase
        .from('projects')
        .select(`
          slug, title, year, location, status, partners,
          description, process_note, services_performed,
          cover_image, sort_order, is_featured,
          category:categories(slug, name),
          images:project_images(url, alt, caption, sort_order)
        `)
        .eq('slug', slugValue)
        .eq('status', 'published')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return {
        slug: data.slug,
        title: data.title,
        year: data.year ?? undefined,
        location: data.location ?? undefined,
        category: data.category
          ? { slug: data.category.slug, name: data.category.name }
          : undefined,
        status: data.status,
        partners: data.partners ?? [],
        description: data.description ?? undefined,
        process_note: data.process_note ?? undefined,
        services_performed: data.services_performed ?? undefined,
        cover_image: data.cover_image ?? '',
        sort_order: data.sort_order,
        is_featured: data.is_featured,
        images: (data.images ?? [])
          .slice()
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((i: any) => ({ url: i.url, alt: i.alt ?? undefined, caption: i.caption ?? undefined })),
      }
    },
    { watch: [() => toValue(slug)] },
  )
}
