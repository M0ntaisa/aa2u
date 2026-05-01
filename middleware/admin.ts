/**
 * Admin route guard.
 *
 * Real mode: requires a logged-in Supabase user whose `profiles.is_admin = true`.
 * Placeholder mode (no real Supabase configured): lets you in so you can
 * navigate the UI shell. Write actions are blocked separately in the pages.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Login + auth callback are public entrypoints
  if (to.path.endsWith('/admin/login') || to.path.endsWith('/admin/confirm')) {
    return
  }

  const { isPlaceholder } = useContentSource()
  if (isPlaceholder) return

  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo('/admin/login')
  }

  const supabase = useSupabaseClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.value.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    return navigateTo('/admin/login?error=unauthorized')
  }
})
