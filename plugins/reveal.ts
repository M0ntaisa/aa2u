/**
 * Drafting motion primitives as Vue directives (identity-dossier §1.5).
 * They replace the old generic fade-up; the `v-reveal` / `v-reveal-stagger`
 * names are kept so existing pages keep working.
 *
 * Registers on both server and client. Server-side the hooks are no-ops
 * (Vue still needs the directive defined to resolve <div v-reveal>). GSAP
 * only runs in the client `mounted` hook, and every tween + ScrollTrigger
 * is killed again in `unmounted` (previously they leaked across pages).
 *
 *   <div v-reveal>…</div>                       — section plane rises through the block (clip bottom→top)
 *   <h2 v-reveal="{ lines: true }">…</h2>       — text line reveal: each line slides up in its own mask
 *   <ul v-reveal-stagger>…</ul>                 — plane reveal on each child, 60ms stagger
 *   <div v-reveal-stagger="{ selector: '.c' }"> — custom child selector
 *   <figure v-cut>…</figure>                    — section cut: clip left→right with a travelling 1px line
 *   <figure v-cut="{ dir: 'up' }">…</figure>    — bottom→top, for tall images
 *   <svg v-draw>…</svg>                         — strokes draw in (stroke-dashoffset 1→0)
 *
 * All trigger once at 15% in view. Under prefers-reduced-motion nothing is
 * hidden or animated: the element simply stays in its final (SSR) state.
 */

interface RevealOptions {
  /** Text line reveal (display text only). */
  lines?: boolean
  /** Section-cut direction for v-cut. */
  dir?: 'right' | 'up'
  duration?: number
  delay?: number
  start?: string
  stagger?: number
  selector?: string
  /** Legacy fade-up params; accepted and ignored so old call sites still compile. */
  y?: number
  opacity?: number
  ease?: string
}

const { d3: D3, d4: D4, stagger: STAGGER, ease: EASE } = MOTION
const START = 'top 85%' // 15% of the element in view

interface Handle {
  tween?: any
  split?: any
  edge?: HTMLElement
}

const handles = new WeakMap<HTMLElement, Handle>()

function cleanup(el: HTMLElement) {
  const h = handles.get(el)
  if (!h) return
  h.tween?.scrollTrigger?.kill()
  h.tween?.kill()
  h.split?.revert()
  h.edge?.remove()
  handles.delete(el)
}

function motionApi() {
  if (!import.meta.client) return null
  if (prefersReducedMotion()) return null
  const { $gsap, $ScrollTrigger, $SplitText } = useNuxtApp() as any
  if (!$gsap || !$ScrollTrigger) return null
  return { gsap: $gsap, SplitText: $SplitText }
}

/** Plane rising through a block: clip from the top edge down to nothing. */
function planeFrom(extra: Record<string, unknown> = {}) {
  return {
    clipPath: 'inset(100% 0% 0% 0%)',
    y: 16,
    duration: D3,
    ease: EASE,
    clearProps: 'clipPath,transform',
    ...extra,
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const noopSSR = () => ({})

  nuxtApp.vueApp.directive<HTMLElement, RevealOptions>('reveal', {
    getSSRProps: noopSSR,
    mounted(el, binding) {
      const api = motionApi()
      if (!api) return
      const opts = binding.value || {}
      const scrollTrigger = { trigger: el, start: opts.start ?? START, once: true }

      if (opts.lines && api.SplitText) {
        const split = new api.SplitText(el, { type: 'lines', mask: 'lines' })
        const tween = api.gsap.from(split.lines, {
          yPercent: 100,
          duration: opts.duration ?? D3,
          delay: opts.delay ?? 0,
          stagger: opts.stagger ?? STAGGER,
          ease: EASE,
          scrollTrigger,
          onComplete: () => split.revert(),
        })
        handles.set(el, { tween, split })
        return
      }

      const tween = api.gsap.from(el, planeFrom({
        duration: opts.duration ?? D3,
        delay: opts.delay ?? 0,
        scrollTrigger,
      }))
      handles.set(el, { tween })
    },
    unmounted: cleanup,
  })

  nuxtApp.vueApp.directive<HTMLElement, RevealOptions>('reveal-stagger', {
    getSSRProps: noopSSR,
    mounted(el, binding) {
      const api = motionApi()
      if (!api) return
      const opts = binding.value || {}
      const targets = opts.selector ? el.querySelectorAll(opts.selector) : el.children
      if (!targets || targets.length === 0) return

      const tween = api.gsap.from(targets, planeFrom({
        duration: opts.duration ?? D3,
        delay: opts.delay ?? 0,
        stagger: STAGGER,
        scrollTrigger: { trigger: el, start: opts.start ?? START, once: true },
      }))
      handles.set(el, { tween })
    },
    unmounted: cleanup,
  })

  nuxtApp.vueApp.directive<HTMLElement, RevealOptions>('cut', {
    getSSRProps: noopSSR,
    mounted(el, binding) {
      const api = motionApi()
      if (!api) return
      const opts = binding.value || {}
      const up = opts.dir === 'up'

      if (getComputedStyle(el).position === 'static') el.style.position = 'relative'
      const edge = document.createElement('span')
      edge.className = up ? 'cut-edge cut-edge--up' : 'cut-edge'
      edge.setAttribute('aria-hidden', 'true')
      edge.style.opacity = '0'
      el.appendChild(edge)

      const tl = api.gsap.timeline({
        delay: opts.delay ?? 0,
        scrollTrigger: { trigger: el, start: opts.start ?? START, once: true },
        onComplete: () => {
          edge.remove()
          api.gsap.set(el, { clearProps: 'clipPath' })
        },
      })
      const duration = opts.duration ?? D3
      tl.fromTo(el,
        { clipPath: up ? 'inset(100% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration, ease: EASE },
        0,
      )
      tl.set(edge, { opacity: 1 }, 0)
      tl.fromTo(edge,
        up ? { bottom: '0%' } : { left: '0%' },
        { ...(up ? { bottom: '100%' } : { left: '100%' }), duration, ease: EASE },
        0,
      )
      handles.set(el, { tween: tl, edge })
    },
    unmounted: cleanup,
  })

  nuxtApp.vueApp.directive<HTMLElement | SVGElement, RevealOptions>('draw', {
    getSSRProps: noopSSR,
    mounted(el, binding) {
      const api = motionApi()
      if (!api) return
      const opts = binding.value || {}
      const strokes = el.querySelectorAll<SVGGeometryElement>(
        opts.selector ?? 'path, line, polyline, polygon, rect, circle',
      )
      if (!strokes.length) return
      strokes.forEach((s) => {
        s.setAttribute('pathLength', '1')
        s.style.strokeDasharray = '1'
      })
      const tween = api.gsap.fromTo(strokes,
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          duration: opts.duration ?? D4,
          delay: opts.delay ?? 0,
          stagger: opts.stagger ?? STAGGER,
          ease: EASE,
          scrollTrigger: { trigger: el, start: opts.start ?? START, once: true },
        },
      )
      handles.set(el as HTMLElement, { tween })
    },
    unmounted: (el) => cleanup(el as HTMLElement),
  })
})
