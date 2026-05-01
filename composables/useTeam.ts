import type { TeamMember } from '~/types/content'

export const useTeam = () => {
  return useAsyncData<TeamMember[]>('team:active', async () => {
    const { isPlaceholder } = useContentSource()

    if (isPlaceholder) {
      const { team } = await import('~/data/team')
      return team
    }

    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as TeamMember[]
  })
}
