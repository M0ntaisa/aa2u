import Lenis from 'lenis'

/**
 * Global smooth scroll driven by Lenis, synchronised with GSAP's ticker so
 * ScrollTrigger animations stay accurate. Loads after gsap.client.ts because
 * Nuxt resolves plugins alphabetically (g < l).
 *
 * Touch devices keep native momentum scroll (syncTouch off) — Lenis on touch
 * tends to fight the OS and feels worse than native.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const lenis = new Lenis({
    duration: reduceMotion ? 0 : 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: 'vertical',
    smoothWheel: !reduceMotion,
    wheelMultiplier: 1,
    touchMultiplier: 2,
    syncTouch: false,
  })

  const { $gsap, $ScrollTrigger } = nuxtApp as any

  if ($gsap && $ScrollTrigger) {
    lenis.on('scroll', $ScrollTrigger.update)
    $gsap.ticker.add((time: number) => lenis.raf(time * 1000))
    $gsap.ticker.lagSmoothing(0)
  } else {
    // Fallback rAF loop if GSAP wasn't ready (shouldn't happen, but safe).
    const raf = (time: number) => {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }

  // Reset scroll position when navigating to a new page. We do it during
  // page:finish so it lands while the curtain transition is still covering.
  nuxtApp.hook('page:finish', () => {
    lenis.scrollTo(0, { immediate: true })
    if ($ScrollTrigger) {
      // Refresh after the new page paints so trigger rects are accurate.
      requestAnimationFrame(() => $ScrollTrigger.refresh())
    }
  })

  // Anchor links (#section) — route through Lenis so the scroll matches
  // the rest of the page's easing. Plain `scroll-behavior: smooth` fights
  // with Lenis when smoothWheel is active.
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement)?.closest('a[href^="#"]') as HTMLAnchorElement | null
    if (!link) return
    const href = link.getAttribute('href')
    if (!href || href === '#') return
    const target = document.querySelector(href)
    if (!target) return
    e.preventDefault()
    lenis.scrollTo(target as HTMLElement, { offset: 0 })
  })

  return {
    provide: { lenis },
  }
})
