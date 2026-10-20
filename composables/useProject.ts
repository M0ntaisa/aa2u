import type { Project, ProjectRow } from '~/types/content'
import { PROJECT_DETAIL_SELECT, mapProjectRow } from '~/utils/project-mapper'

/**
 * Fetch a single published project by slug, including gallery images,
 * drawings, materials and category. Returns null if not found.
 */
export const useProject = (slug: MaybeRefOrGetter<string>) => {
  return useAsyncData<Project | null>(
    () => `project:${toValue(slug)}`,
    async () => {
      const slugValue = toValue(slug)
      const { isPlaceholder } = useContentSource()

      if (isPlaceholder) {
        // Same rule as the live query: unpublished projects are 404.
        const { projectBySlug } = await import('~/data/projects')
        const p = projectBySlug(slugValue)
        return p?.status === 'published' ? p : null
      }

      const supabase = useSupabaseClient()
      const { data, error } = await supabase
        .from('projects')
        .select(PROJECT_DETAIL_SELECT)
        .eq('slug', slugValue)
        .eq('status', 'published')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return mapProjectRow(data as unknown as ProjectRow)
    },
    { watch: [() => toValue(slug)] },
  )
}
