import type { Project } from '~/types/content'

/**
 * Admin variant — returns ALL projects regardless of status (drafts and
 * in-development included). RLS lets is_admin() see everything; in
 * placeholder mode we read the local dummy file.
 */
export const useAdminProjects = () => {
  return useAsyncData<Project[]>('admin:projects', async () => {
    const { isPlaceholder } = useContentSource()

    if (isPlaceholder) {
      const { projects } = await import('~/data/projects')
      return [...projects].sort((a, b) => a.sort_order - b.sort_order)
    }

    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('projects')
      .select('slug, title, year, status, is_featured, sort_order, cover_image, category:categories(slug, name)')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as Project[]
  })
}
