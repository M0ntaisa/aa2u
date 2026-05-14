/**
 * Vue directives for scroll-triggered reveals.
 *
 * Registers on both server and client. Server-side the hooks are no-ops
 * (Vue still needs the directive defined to resolve <div v-reveal>). The
 * GSAP animation only runs in the client `mounted` hook.
 *
 *   <div v-reveal>...</div>                                   — fade up on scroll
 *   <div v-reveal="{ y: 80, delay: 0.2 }">...</div>           — custom params
 *   <ul v-reveal-stagger><li>...</li></ul>                    — stagger children
 *   <div v-reveal-stagger="{ selector: '.card' }">...</div>   — custom selector
 */

interface RevealOptions {
  y?: number
  opacity?: number
  duration?: number
  delay?: number
  ease?: string
  start?: string
  stagger?: number
  selector?: string
}

export default defineNuxtPlugin((nuxtApp) => {
  const noopSSR = () => ({})

  nuxtApp.vueApp.directive<HTMLElement, RevealOptions>('reveal', {
    getSSRProps: noopSSR,
    mounted(el, binding) {
      if (!import.meta.client) return
      if (prefersReducedMotion()) return
      const { $gsap, $ScrollTrigger } = useNuxtApp() as any
      if (!$gsap || !$ScrollTrigger) return

      const opts = binding.value || {}
      $gsap.from(el, {
        y: opts.y ?? 40,
        opacity: opts.opacity ?? 0,
        duration: opts.duration ?? 0.9,
        delay: opts.delay ?? 0,
        ease: opts.ease ?? 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: opts.start ?? 'top 88%',
          once: true,
        },
      })
    },
  })

  nuxtApp.vueApp.directive<HTMLElement, RevealOptions>('reveal-stagger', {
    getSSRProps: noopSSR,
    mounted(el, binding) {
      if (!import.meta.client) return
      if (prefersReducedMotion()) return
      const { $gsap, $ScrollTrigger } = useNuxtApp() as any
      if (!$gsap || !$ScrollTrigger) return

      const opts = binding.value || {}
      const targets = opts.selector
        ? el.querySelectorAll(opts.selector)
        : el.children
      if (!targets || targets.length === 0) return

      $gsap.from(targets, {
        y: opts.y ?? 30,
        opacity: opts.opacity ?? 0,
        duration: opts.duration ?? 0.85,
        stagger: opts.stagger ?? 0.08,
        delay: opts.delay ?? 0,
        ease: opts.ease ?? 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: opts.start ?? 'top 82%',
          once: true,
        },
      })
    },
  })
})
