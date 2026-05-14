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

export const usePageTransition = () => {
  const { isActive: flipIsActive } = useSharedFlip()

  function onLeave(el: Element, done: () => void) {
    const { $gsap } = useNuxtApp() as any
    if (!$gsap) return done()
    if (prefersReducedMotion()) return done()

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

    if (flipIsActive.value) {
      $gsap.set(el, { opacity: 0 })
      $gsap.to(el, {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
        onComplete: done,
      })
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
