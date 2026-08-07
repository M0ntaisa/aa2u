/**
 * Small counters the admin shell needs everywhere — currently the unread
 * inquiry badge in the sidebar. Cached in `useState` so navigating between
 * admin pages doesn't refire the query; pages that change the underlying data
 * call `refreshUnread()`.
 */
export const useAdminCounts = () => {
  const supabase = useSupabaseClient()
  const { isPlaceholder } = useContentSource()

  const unreadInquiries = useState<number>('admin-unread-inquiries', () => 0)
  const loaded = useState<boolean>('admin-counts-loaded', () => false)

  async function refreshUnread() {
    if (isPlaceholder) {
      unreadInquiries.value = 0
      loaded.value = true
      return
    }

    const { count, error } = await supabase
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('is_read', false)

    if (!error) unreadInquiries.value = count ?? 0
    loaded.value = true
  }

  /** Fetch once per session unless a page explicitly refreshes. */
  async function ensureLoaded() {
    if (loaded.value) return
    await refreshUnread()
  }

  return { unreadInquiries, refreshUnread, ensureLoaded }
}
