import type { StudioPrinciple } from '~/types/content'

export const usePrinciples = () => {
  return useAsyncData<StudioPrinciple[]>('principles', async () => {
    const { isPlaceholder } = useContentSource()

    if (isPlaceholder) {
      const { principles } = await import('~/data/principles')
      return principles
    }

    const supabase = useSupabaseClient()
    const { data, error } = await supabase
      .from('studio_principles')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as StudioPrinciple[]
  })
}
