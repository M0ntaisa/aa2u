import type { Project, ProjectRow } from '~/types/content'
import { PROJECT_LIST_SELECT, mapProjectRow } from '~/utils/project-mapper'

interface UseProjectsOpts {
  featured?: boolean
}

/**
 * List published projects. Pass { featured: true } to get only homepage
 * showcase items. Returns useAsyncData ref — reactive across i18n and
 * route changes. List rows skip chapter_text, drawings and materials;
 * use useProject() for the full dossier.
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
      .select(PROJECT_LIST_SELECT)
      .eq('status', 'published')
      .order('sort_order', { ascending: true })

    if (opts.featured) query = query.eq('is_featured', true)

    const { data, error } = await query
    if (error) throw error

    return ((data ?? []) as unknown as ProjectRow[]).map(mapProjectRow)
  })
}
