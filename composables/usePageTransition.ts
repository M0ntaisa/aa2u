/**
 * Page transition driver — subtle fade + vertical drift.
 *
 * Replaces the previous curtain overlay (which felt heavy and ended with
 * an abrupt panel disappearance) with a content-only transition:
 *
 *   leave: fade out + drift up 16px        (0.35s, ease-in)
 *   enter: fade in  + drift up from 20px   (0.55s, ease-out)
 *
 * When useSharedFlip has captured state (project card → detail), we use
 * an even shorter pure fade so the Flip morph stays the dominant motion.
 */

const LEAVE_DURATION = 0.35
const ENTER_DURATION = 0.55

// The admin panel is a working surface, not a showcase: a ~0.9s crossfade
// between list and form pages reads as lag. Keep a short fade there instead.
const ADMIN_LEAVE_DURATION = 0.1
const ADMIN_ENTER_DURATION = 0.16

export const usePageTransition = () => {
  const { isActive: flipIsActive } = useSharedFlip()
  const route = useRoute()
  const isAdmin = () => isAdminPath(route.path)

  function onLeave(el: Element, done: () => void) {
    const { $gsap } = useNuxtApp() as any
    if (!$gsap) return done()
    if (prefersReducedMotion()) return done()

    if (isAdmin()) {
      $gsap.to(el, {
        opacity: 0,
        duration: ADMIN_LEAVE_DURATION,
        ease: 'none',
        onComplete: done,
      })
      return
    }

    if (flipIsActive.value) {
      $gsap.to(el, {
        opacity: 0,
        duration: 0.2,
        ease: 'power2.out',
        onComplete: done,
      })
      return
    }

    $gsap.to(el, {
      opacity: 0,
      y: -16,
      duration: LEAVE_DURATION,
      ease: 'power2.in',
      onComplete: done,
    })
  }

  function onEnter(el: Element, done: () => void) {
    const { $gsap } = useNuxtApp() as any
    if (!$gsap) return done()
    if (prefersReducedMotion()) return done()

    if (isAdmin()) {
      $gsap.set(el, { opacity: 0, y: 0 })
      $gsap.to(el, {
        opacity: 1,
        duration: ADMIN_ENTER_DURATION,
        ease: 'power1.out',
        onComplete: done,
      })
      return
    }

    if (flipIsActive.value) {
      // Flip morph plays from t=0 on the destination element. If we fade
      // the page during it, the user only sees the tail of the morph.
      // Skip the fade — let the Flip animation own the visual transition.
      $gsap.set(el, { opacity: 1, y: 0 })
      done()
      return
    }

    $gsap.set(el, { opacity: 0, y: 20 })
    $gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: ENTER_DURATION,
      ease: 'power3.out',
      onComplete: done,
    })
  }

  return { onLeave, onEnter }
}
