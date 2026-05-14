/**
 * Reactive flag that mirrors the user's `prefers-reduced-motion` setting.
 * SSR-safe: defaults to false until the client takes over.
 *
 * Use to gate animations:
 *   const reduced = useReducedMotion()
 *   if (reduced.value) return
 */
export const useReducedMotion = () => {
  const reduced = ref(false)

  if (import.meta.client) {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    reduced.value = mq.matches
    const handler = (e: MediaQueryListEvent) => { reduced.value = e.matches }
    mq.addEventListener('change', handler)
    onScopeDispose(() => mq.removeEventListener('change', handler))
  }

  return reduced
}

/**
 * Imperative check for one-off code paths (e.g. plugins) where you don't
 * need reactivity. SSR returns false.
 */
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
